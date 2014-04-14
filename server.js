var express = require('express')
  , app = express()
  , server = app.listen(8080);
var MongoClient = require('mongodb').MongoClient
  , Server = require('mongodb').Server;
var fs = require('fs');
var io = require('socket.io').listen(server);
var passport = require("passport");
var socketOwnerCanAct = require("./auth").socketOwnerCanAct;
var createUnit = require("./createUnit");
var loadMap = require("./loadUtils").loadMap;
var loadUnitType = require("./loadUtils").loadUnitType;
var initLobbyListeners = require("./lobby").initLobbyListeners;

var mongoClient = new MongoClient(new Server('localhost', 27017));
mongoClient.open(function(err, mongoClient) {
    var mongo = mongoClient.db("webnoth");

    var collections = {};

    mongo.collection("games", function(err, gamesCollection) {
        mongo.collection("units", function(err, unitsCollection) {
	    mongo.collection("users", function(err, usersCollection) {
		collections.games = gamesCollection;
		collections.units = unitsCollection;
		collections.users = usersCollection;
            });
	});
    });

    require("./auth").initAuth(app, mongo, collections);

    io.sockets.on('connection', function (socket) {
        initListeners(socket, collections);
    });

});

app.use(express.static(__dirname + '/static'));
app.use(express.cookieParser());
app.use(express.bodyParser());

var MongoStore = require('connect-mongo-store')(express);
var mongoStore = new MongoStore('mongodb://localhost:27017/webnoth');
app.use(express.session({store: mongoStore, secret: 'keyboard cat'}));

app.use(passport.initialize());
app.use(passport.session());

mongoStore.on('connect', function() {
    console.log('Store is ready to use')
});

mongoStore.on('error', function(err) {
    console.log('Do not ignore me', err)
});

var passportSocketIo = require("passport.socketio");

function onAuthorizeSuccess(data, accept){
    console.log('successful connection to socket.io');

  // The accept-callback still allows us to decide whether to
  // accept the connection or not.
    accept(null, true);
}

function onAuthorizeFail(data, message, error, accept){
    if(error)
	throw new Error(message);
    console.log('failed connection to socket.io:', message);

  // We use this callback to log all of our failed connections.
    accept(null, true);
}

io.set('authorization', passportSocketIo.authorize({
    cookieParser: express.cookieParser,
    secret:      'keyboard cat',    // the session_secret to parse the cookie
    store:       mongoStore,        // we NEED to use a sessionstore. no memorystore please
    success:     onAuthorizeSuccess,  // *optional* callback on success - read more below
    fail:        onAuthorizeFail,     // *optional* callback on fail/error - read more below
}));

// initialize all socket.io listeners on a socket
function initListeners(socket, collections) {
    initLobbyListeners(socket, collections);

    // request for all game data
    socket.on("alldata", function(data) {
	console.log("serving data to", socket.handshake.user.username);
        var gameId = data.gameId;
	var user = socket.handshake.user;

        collections.units.find({ gameId:gameId }, function(err, cursor) {
            collections.games.findOne({ id:gameId }, function(err, game) {
		var player = game.players.filter(function(p) { return p.username == user.username })[0];
                cursor.toArray(function(err, docs) {
                    socket.emit("initdata", {map: game.map, units: docs, player: player, activeTeam: game.activeTeam });
                });
            });
        });
    });

    // subscribe to a game channel
    socket.on("join game", function(gameId) {
        socket.join("game"+gameId);
    });

    // create a new game
    socket.on("new game", function(data) {
        collections.games.insert({ }, {safe: true}, function(err, item) {
	    
	});
    });

    // create a new game
    socket.on("launch game", function(data) {
        // data.opponentList
        // 
    });

    // move a unit
    socket.on("move", function(data) {
        var gameId = data.gameId;
        var path = data.path;
	var attackIndex = data.attackIndex;
	var user = socket.handshake.user;

        collections.games.findOne({id:gameId}, function(err, game) {
            loadMap(game.map, function(err, mapData) {
                collections.units.findOne({ x:path[0].x, y:path[0].y, gameId:gameId }, function(err, unit) {
		    // ensure that the logged-in user has the right to move this unit
		    var player = game.players.filter(function(p) { return p.username == user.username })[0];
		    if(!socketOwnerCanAct(socket, game) && player && player.team != unit.team) {
			socket.emit("moved", { path:[path[0]] });
			return;
		    }

                    loadUnitType(unit.type, function(err, type) {
                        collections.units.find({ gameId: gameId }, function(err, cursor) {
                            cursor.toArray(function(err, unitArray) {
				// make the move
                                var moveResult = require("./executePath")(path, unit, type, unitArray, mapData);

                                var endPoint = moveResult.path[moveResult.path.length-1];
                                unit.x = endPoint.x;
                                unit.y = endPoint.y;

                                var emitMove = function() {
				    io.sockets.in("game"+gameId).emit("moved", moveResult);
                                };

				// perform the attack
				if(moveResult.attack) {
				    var targetCoords = path[path.length-1];
				    collections.units.findOne({ x:targetCoords.x, y:targetCoords.y, gameId:gameId }, function(err, defender) {
				        loadUnitType(defender.type, function(err, defenderType) {
					    // resolve combat
					    moveResult.combat = executeAttack(unit, type, attackIndex, defender, defenderType, unitArray, mapData);
					    // injure/kill units models
					    var handleDefender = function() {
						if(defender.hp < 0) { collections.units.remove({ _id: defender._id }, emitMove); }
						else { collections.units.save(defender, {safe: true}, emitMove); }
					    }
	
					    if(unit.hp < 0) { collections.units.remove({ _id: unit._id}, handleDefender); }
					    else { collections.units.save(unit, {safe: true}, handleDefender); }
				
					});
				    });
				} else {
                                    collections.units.save(unit, {safe:true}, emitMove);
				}
                            });
                        });
                    });
                });
            });
        });
    });

    // create a new unit
    socket.on("create", function(data) {
	var gameId = data.gameId;
	var user = socket.handshake.user;

        collections.games.findOne({id:gameId}, function(err, game) {
            loadMap(game.map, function(err, mapData) {
		var player = game.players.filter(function(p) { return p.username == user.username })[0];

		if(socketOwnerCanAct(socket, game)) {
		    createUnit(data, mapData, collections, player, function(createResult) {
			socket.emit("created", createResult);
		    });
		} else {
		    socket.emit("created", {});
		}
	    });
	});
    });

    socket.on("endTurn", function(data) {
	console.log("ending turn");
	var gameId = data.gameId;

        collections.games.findOne({id:gameId}, function(err, game) {
	    if(!socketOwnerCanAct(socket, game)) {
		return;
	    }

	    game.activeTeam %= (game.players.length);
	    game.activeTeam++;
	    collections.games.save(game, { safe: true }, function() {
		
		// find all units owned by the newly active player
		collections.units.find({ gameId: gameId, team: game.activeTeam }, function(err, unitCursor) { 
		    var updates = [];
		    var sendUpdates = function() {
			io.sockets.in("game"+gameId).emit("newTurn", { activeTeam: game.activeTeam, updates: updates });
		    };
		    
		    unitCursor.next(function updateUnitForNewTurn(err, unit) {
			if(unit == null) { sendUpdates(); return; }
			
			var update = { x: unit.x, y: unit.y };
			
			loadUnitType(unit.type, function(err, type) {
			    // heal unmoved units
			    if(unit.moveLeft == type.move) {
				unit.hp = Math.min(unit.hp+2, type.maxHp);
				update.hp = unit.hp;
			    }
			    
			    // refill move points
			    unit.moveLeft = type.move;
			    update.moveLeft = unit.moveLeft;
			    
			    // TODO: if on a village, heal and remove poison
			    // TODO: if poisoned, hurt
			    // TODO: remove slow
			    
			    updates.push(update);
			    
			    collections.units.save(unit, {safe:true}, function() {
				unitCursor.next(updateUnitForNewTurn);
			    });
			});
		    });
		});
	    });
	});
    });
}

// offender attacks defender with the attack of the given index
// returns an array of objects representing swings
// [ {
//     "offense": Boolean, (is swing by initiator)
//     "event": "hit"/"miss",
//     "damage": Number,
//     "kill": Boolean
//   }, ...]
function executeAttack(offender, offenderType, attackIndex, defender, defenderType, units, mapData) {
    var battleRecord = [];
    var swingResult;
    var defenseIndex;

    var defense = null, offense = offenderType.attacks[attackIndex];

    for(var j=0; j < defenderType.attacks.length; ++j){
	if(offense.type == defenderType.attacks[j].type) {
	    defenseIndex = j;
	    defense = defenderType.attacks[j];
	}
    }

    var defenderTerrain = mapData[defender.x+","+defender.y].terrain;
    var defenderCover = Math.min.apply(Math, defenderTerrain.properties.map(function(i) { return defenderType.cover[i]; }));
    var offenderTerrain = mapData[offender.x+","+offender.y].terrain;
    var offenderCover = Math.min.apply(Math, offenderTerrain.properties.map(function(i) { return offenderType.cover[i]; }));
    for(var round = 0; round < offense.number || (defense && round < defense.number); round++) {
	if(round < offense.number) {
	    swingResult = attackSwing(true, offense, offender, offenderType, defender, defenderType, defenderCover, units);
	    battleRecord.push(swingResult);
	    if(swingResult.kill) { break; }
	}

	if(defense && round < defense.number) {
	    swingResult = attackSwing(false, defense, defender, defenderType, offender, offenderType, offenderCover, units);
	    battleRecord.push(swingResult);
	    if(swingResult.kill) { break; }
	}
    }

    return { record: battleRecord, offender: {x: offender.x, y: offender.y}, defender: {x: defender.x, y: defender.y}, offenseIndex: attackIndex, defenseIndex: defenseIndex };
}

// perform one swing of an attack, by the hitter, on the hittee
// return a swing record object
function attackSwing(isOffense, attack, hitter, hitterType, hittee, hitteeType, hitteeCover, units) {
    var swingRecord;

    hitteeCover = attack.magic ? Math.min(hitteeCover, .3) : hitteeCover;

    if(Math.random() > hitteeCover) {
	hittee.hp -= attack.damage;
	swingRecord = { event: "hit", offense: isOffense, damage: attack.damage };
	
	if(hittee.hp < 0) {
	    swingRecord.kill = true;
	}
    } else {
	swingRecord = { event: "miss", offense: isOffense };
    }

    return swingRecord;
}



