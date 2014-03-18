var express = require('express')
  , app = express()
  , server = app.listen(8080);
var MongoClient = require('mongodb').MongoClient
  , Server = require('mongodb').Server;
var fs = require('fs');
var io = require('socket.io').listen(server);
var passwordHash = require('password-hash');
var passport = require("passport");
var LocalStrategy = require('passport-local').Strategy;

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

    initAuth(mongo, collections);

    io.sockets.on('connection', function (socket) {
        initListeners(socket, mongo, collections);
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
    accept(null, false);
}

io.set('authorization', passportSocketIo.authorize({
    cookieParser: express.cookieParser,
//    key:         'express.sid',       // the name of the cookie where express/connect stores its session_id
    secret:      'keyboard cat',    // the session_secret to parse the cookie
    store:       mongoStore,        // we NEED to use a sessionstore. no memorystore please
    success:     onAuthorizeSuccess,  // *optional* callback on success - read more below
    fail:        onAuthorizeFail,     // *optional* callback on fail/error - read more below
}));

function initAuth(mongo, collections) {

    passport.use(new LocalStrategy(function(username, password, done){
	collections.users.findOne({ username : username},function(err,user){
            if(err) { return done(err); }
            if(!user){
		return done(null, false, { message: 'Incorrect username.' });
            }
            
	    if (passwordHash.verify(password, user.hash)) return done(null, user);
	    done(null, false, { message: 'Incorrect password.' });
        
	});
    }));

    app.post('/login',
	     passport.authenticate('local', { failureRedirect: '/login.html' }),
	     function(req, res) {
		 res.redirect('/');
	     });


    app.post('/signup', function(req, res) {
	var username = req.body.username;
	var password = req.body.password;
	var passConfirm = req.body.passconfirm

	collections.users.findOne({ username: username }, function (err, user) {
	    if (!user) {

		if(password == passConfirm) {
		    var hashedPassword = passwordHash.generate(password);

		    collections.users.save({ username: username, hash: hashedPassword }, { safe: true }, function(err) {
			passport.authenticate('local')(req, res, function () {
			    res.redirect('/');
			});
		    });
		} else {
		    res.redirect("/signup.html");
		}
	    } else {
		res.redirect("/signup.html");
	    }
	});
    });

    passport.serializeUser(function(user, done) {
	done(null, user.username);
    });

    passport.deserializeUser(function(username, done) {
	collections.users.findOne({username: username}, function (err, user) {
	    done(err, user);
	});
    });
}

// initialize all socket.io listeners on a socket
function initListeners(socket, mongo, collections) {
    // request for all game data
    socket.on("alldata", function(data, callback) {
	console.log("serving data to", socket.handshake.user.username);
        var gameId = data.gameId;
	var user = socket.handshake.user;

        collections.units.find({ gameId:gameId }, function(err, cursor) {
            collections.games.findOne({ id:gameId }, function(err, game) {
		var player = game.players.filter(function(p) { return p.username == user.username })[0];
                cursor.toArray(function(err, docs) {
                    callback({map: game.map, units: docs, player: player });
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
		    if(player && player.team != unit.team) {
			socket.emit("moved", { path:[path[0]] });
			return;
		    }

                    loadUnit(unit.type, function(err, type) {
                        collections.units.find({ gameId: gameId }, function(err, cursor) {
                            cursor.toArray(function(err, unitArray) {
				// make the move
                                var moveResult = executePath(path, unit, type, unitArray, mapData);

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
				        loadUnit(defender.type, function(err, defenderType) {
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
	collections.units.find({ gameId: gameId, x: data.x, y: data.y }, function(err, cursor) {
	    cursor.nextObject(function(err, o) {
		// if the space is populated, abort
		if(o) { 			    
		    socket.emit("created", {});
		    return;
		}

		loadUnit(data.type, function(err, type) {
		    data["xp"] = 0;
		    data["hp"] = type.maxHp;
		    data["moveLeft"] = type.move;
		    collections.units.insert(data, function(err) {
			if(!err) {
			    socket.emit("created", data);
			}
		    });
		});
	    });
	});
    });
}

// attempt to move a unit through a given path
function executePath(path, unit, type, unitArray, mapData) {
    var actualPath = [path[0]];
    var standingClear = true;
    var totalMoveCost = 0;

    for(var i=1; i<path.length; ++i) {
	var coords = path[i];
	var isLastSpace = (i == path.length-1);

	var occupant = unitArray.filter(function(u) { return u.x == coords.x && u.y == coords.y; })[0];
	if(occupant) {
	    if(occupant.team != unit.team) {
		if(isLastSpace && standingClear) {
		    return { path:actualPath, revealedUnits:[], attack: true };
		}
		return { path:[path[0]], revealedUnits:[] };
	    } else {
		// invalid move; ending space must be clear
		if(isLastSpace) return { path:[path[0]], revealedUnits: [] };
	    }

	    standingClear = false;
	} else {
	    standingClear = true;
	}

	// add cost to move on this sapce
	totalMoveCost += type.moveCost[mapData[coords.x+","+coords.y].terrain];

	// if the move is too costly, abort
	if(totalMoveCost > unit.moveLeft) {
	    return { path:[path[0]], revealedUnits: [] };
	}

	actualPath.push(path[i]);
    }

    return { path: actualPath, revealedUnits: [] };
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
    var defenderCover = defenderType.cover[defenderTerrain];
    var offenderTerrain = mapData[offender.x+","+offender.y].terrain;
    var offenderCover = offenderType.cover[offenderTerrain];
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

function loadMap(filename, callback) {
    fs.readFile('static/data/maps/'+filename, { encoding: "utf8"}, function(err, data) {
        callback(err, toMapDict(data));
    });
}

function loadUnit(type, callback) {
    fs.readFile('static/data/units/'+type+".json", { encoding: "utf8"}, function(err, data) {
        callback(err, JSON.parse(data));
    });
}

function toMapDict(map_data) {
    var misc_lines = 0;
    var row = 0;
    var map_array = map_data.split('\n');
    var map_dict = {};

    // read each line in the map file
    for(var line_num = 0; line_num < map_array.length; line_num++) {
        var line = map_array[line_num];
        line = line.trim();
        line = line.replace(/\s+/g, ' ');

        // use this line only if it describes terrain
        if(line.indexOf('=') == -1 && line != '') {
            var tiles = line.split(",");

            // place each tile described in the line
            for(var tile_num = 0; tile_num < tiles.length; tile_num++) {
                var tile = tiles[tile_num];
                tile = tile.trim();
                var components = tile.split(' ');
                //console.log(components);
                // if the tile describes only its terrain, draw it;
                // otherwise, find the part that describes the terrain
                if(components.length == 1) {
                    map_dict[tile_num+","+row] = { "terrain": Terrain.getTerrainBySymbol(components[0]) };
                } else {
	            map_dict[tile_num+","+row] = { "start": components[0], "terrain": Terrain.getTerrainBySymbol(components[1]) };
                }
            }
            row++;
        } else {
            misc_lines += 1;
        }
    }
    
    return map_dict;
}

var Terrain = {
    types: {
        GRASS: { symbol: "Gg", name: "grass", img: "/data/img/terrain/green.png", toString: function() { return this.name; } },
        SWAMP: { symbol: "Sw", name: "swamp", img: "/data/img/terrain/water.png", toString: function() { return this.name; } },
        DIRT: { symbol: "Re", name: "dirt", img: "/data/img/terrain/dirt.png", toString: function() { return this.name; } },
    },

    getTerrainBySymbol: function(symbol) {
        for(var prop in this.types) {
            if(this.types[prop].symbol == symbol) {
                return this.types[prop];
            }
        }
    }
}
