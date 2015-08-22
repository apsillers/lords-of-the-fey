/**
    Copyright 2014, 2015 Andrew P. Sillers

    This file is part of Lords of the Fey.

    Lords of the Fey is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Lords of the Fey is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with Lords of the Fey.  If not, see <http://www.gnu.org/licenses/>.
*/
var config = require("./config");
var express = require('express')
  , app = express()
  , server = app.listen(config.port);
var MongoClient = require('mongodb').MongoClient
  , Server = require('mongodb').Server
, ObjectID = function(input) { if(input.length!=12 && input.length!=24) { return; } return require('mongodb').ObjectID.apply(this, arguments); }
var fs = require('fs');
var io = require('socket.io')(server);
var passport = require("passport");
var socketOwnerCanAct = require("./auth").socketOwnerCanAct;
var createUnit = require("./createUnit");
var loadMap = require("./loadUtils").loadMap;
var loadUnitType = require("./loadUtils").loadUnitType;
var initLobbyListeners = require("./lobby").initLobbyListeners;
var Unit = require("./static/shared/unit.js").Unit;
var unitLib = require("./static/shared/unit.js").unitLib;
var executeAttack = require("./executeAttack");
var Terrain = require("./static/shared/terrain.js").Terrain;
var socketList = [];

new MongoClient.connect(config.mongoString, function(err, mongo) {
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
    require("./createGame").initLobby(app, collections);
    require("./gameList").initListing(app, collections);

    app.get("/", function(req, res) {
	var user = req.user || {};
	res.render("index", { username: user.username });
    });

    unitLib.init(function() {
	io.sockets.on('connection', function (socket) {
            initListeners(socket, collections);
	});
    });

});

app.set('view engine', 'hbs');
express.static.mime.define({'text/html': ['hbs'], 'text/cache-manifest': ['appcache']});
app.set('views', __dirname + '/views');
require("hbs").registerPartials(__dirname + '/views/partials');
app.use(express.static(__dirname + '/static'));
app.use(require("cookie-parser")());
app.use(require("body-parser")({ extended: true }));

var MongoStore = require('connect-mongo')(require("express-session"));
var mongoStore = new MongoStore({ url: config.mongoString });
app.use(require("express-session")({
    store: mongoStore,
    secret: config.sessionSecret,
    saveUninitialized: true,
    resave: true
}));

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
    accept();
}

function onAuthorizeFail(data, message, error, accept){
    if(error)
	throw new Error(message);
    console.log('failed connection to socket.io:', message);

  // We use this callback to log all of our failed connections.
  //accept(new Error("Unknown error in Passport authentication"));
  accept();
}

io.use(passportSocketIo.authorize({
    cookieParser: require("cookie-parser"),
    secret:      config.sessionSecret, // the session_secret to parse the cookie
    store:       mongoStore,           // we NEED to use a sessionstore. no memorystore please
    success:     onAuthorizeSuccess,   // *optional* callback on success - read more below
    fail:        onAuthorizeFail      // *optional* callback on fail/error - read more below
}));
//io.set('log level', 0);
//setInterval(function() { console.log(socketList.map(function(o) { return o.username; })); }, 1000);

// initialize all socket.io listeners on a socket
function initListeners(socket, collections) {
    initLobbyListeners(io.sockets, socket, collections);

    socket.on("anon auth", function(data) {
	collections.games.findOne({ _id:ObjectID(data.gameId) }, function(err, game) {
	    if(!game) { socket.emit("no game"); return; }
	    if(data.anonToken) { var player = game.players.filter(function(p) { return p.anonToken == data.anonToken })[0]; }
	    if(player) {
		socket.request.user = { username: player.username };
	    }
	    socket.emit("anon auth done");
        });
    });

    // request for all game data
    socket.on("alldata", function(data) {
	console.log("serving data to", socket.request.user.username);
        var gameId = ObjectID(data.gameId);
	var user = socket.request.user;

        collections.units.find({ gameId:gameId }, function(err, cursor) {
            collections.games.findOne({ _id:gameId }, function(err, game) {
		if(!game) { socket.emit("no game"); return; }
		var player = game.players.filter(function(p) { return p.username == user.username })[0];
		var players = game.players.map(function(p) {
		    var ret = { username: p.username, team: p.team, alliance: p.alliance };
		    if(player.team == 1) { ret.anonToken = p.anonToken; }
		    return ret;
		});
                cursor.toArray(function(err, units) {
		    units = units.filter(function(u) { return !u.conditions || u.conditions.indexOf("hidden")==-1 || u.team==(player||{}).team; });
                    socket.emit("initdata", {map: game.map, units: units, player: player, players: players, activeTeam: game.activeTeam, villages:game.villages, timeOfDay: game.timeOfDay, alliances: game.alliances });
                });
            });
        });
    });

    // subscribe to a game channel
    socket.on("join game", function(gameId) {
	var gameId = ObjectID(gameId);
        socket.join("game"+gameId);
	if(socket.request.user) {
	    socketList.push({ gameId: gameId, username: socket.request.user.username, socket: socket });
	}
    });

    socket.on("disconnect", function() {
	var socketData = socketList.filter(function(o) {
	    return o.socket == socket;
	})[0];
	if(socketList.indexOf(socketData) != -1) {
	    socketList.splice(socketList.indexOf(socketData), 1);
	}
    });

    // move a unit
    socket.on("move", function(data) {
        var gameId = ObjectID(data.gameId);
        var path = data.path;
	var attackIndex = data.attackIndex;
	var user = socket.request.user;

        collections.games.findOne({_id:gameId}, function(err, game) {
	    if(!game) { socket.emit("no game"); return; }
            loadMap(game.map, function(err, mapData) {
                collections.units.findOne({ x:path[0].x, y:path[0].y, gameId:gameId }, function(err, unit) {

		    // ensure that the logged-in user has the right to move this unit
		    var player = game.players.filter(function(p) { return p.username == user.username })[0];
		    if(!socketOwnerCanAct(socket, game) && player && player.team != unit.team) {
			socket.emit("moved", { path:[path[0]] });
			return;
		    }

		    unit = new Unit(unit);

                    collections.units.find({ gameId: gameId }, function(err, cursor) {
                        cursor.toArray(function(err, unitArray) {
			    unitArray = unitArray.map(function(u) { return new Unit(u); });

                            var isInitiallyHidden = unit.hasCondition("hidden");

			    // make the move
                            var moveResult = require("./executePath")(path, unit, unitArray, mapData, game);

                            var endPoint = moveResult.path[moveResult.path.length-1];
                            unit.x = endPoint.x;
                            unit.y = endPoint.y;
			    unit.moveLeft -= moveResult.moveCost || 0;

                            if(isInitiallyHidden) { moveResult.unit = unit.getStorableObj(); }

			    if(moveResult.hide) {
				unit.addCondition("hidden");
			    } else {
				unit.removeCondition("hidden");
			    }

			    if(moveResult.revealedUnits.length) {
				moveResult.revealedUnits = moveResult.revealedUnits.map(function(u) { u.removeCondition("hidden"); return u.getStorableObj(); });
			    }

			    // if there is a village here and
			    // if the village is not co-team with the unit, capture it
			    if(mapData[endPoint.x+","+endPoint.y].terrain.properties.indexOf("village") != -1 &&
			       game.villages[endPoint.x+","+endPoint.y] != unit.team) {
				game.villages[endPoint.x+","+endPoint.y] = unit.team;
				moveResult.capture = true;
				unit.moveLeft = 0;
				collections.games.save(game, {safe: true}, saveRevealedUnits);
			    } else {
				saveRevealedUnits();
			    }

			    function saveRevealedUnits() {
				(function saveRevealedUnit(index) {
				    if(!moveResult.revealedUnits[index]) { return concludeMove(); }
				    collections.units.save(moveResult.revealedUnits[index], {safe:true}, function() { saveRevealedUnit(index+1); });
				}(0))
			    }
			    
			    function concludeMove() {
                                var emitMove = function() {
					var alliedUsernames = game.players.filter(function(p) { return p.alliance == game.players[game.activeTeam-1].alliance; }).map(function(p) { return p.username; });
					var alliedPlayerSocketData = socketList.filter(function(o) {
					    return o.gameId.equals(gameId) &&
					    alliedUsernames.indexOf(o.username) != -1;
					});

					alliedPlayerSocketData.forEach(function(s) {
					    s.socket.emit("moved", moveResult);
					});

					moveResult.path = moveResult.publicPath || moveResult.path;
					var unalliedPlayerSocketData = socketList.filter(function(o){ return alliedPlayerSocketData.indexOf(o)==-1; });
					unalliedPlayerSocketData.forEach(function(s) {
					    s.socket.emit("moved", moveResult);
					});
                                };
				
				// perform the attack
				if(moveResult.attack && !unit.hasAttacked) {
				    var targetCoords = path[path.length-1];
				    collections.units.findOne({ x:targetCoords.x, y:targetCoords.y, gameId:gameId }, function(err, defender) {
					defender = new Unit(defender);

					if(defender == null || defender.getAlliance(game) == unit.getAlliance(game)) { 
					    collections.units.save(unit.getStorableObj(), {safe:true}, emitMove);
					    return;
					}

					unit.hasAttacked = true;
					unit.moveLeft = 0;

					// resolve combat
                                        var attackSpace = moveResult.path[moveResult.path.length-1];
					if(unit.hasCondition("hidden")) {
					     unit.removeCondition("hidden");
					}
					moveResult.combat = executeAttack(unit, attackIndex, attackSpace, defender, unitArray, mapData, game);

					collections.games.save(game, { safe: true }, function() {
					    // injure/kill units models
					    var updateUnitDamage = function(unit, callback) {
						if(unit.hp <= 0) {
						    collections.units.remove({ _id: unit._id }, function() {
							if(unit.isCommander) {
							    collections.units.findOne({
								gameId: unit.gameId,
								isCommander: true,
								team: unit.team
							    }, function(err, commander) {
								if(!commander) {
								    console.log("COMMANDER DEATH");
								    checkForVictory(game, collections, function(victoryResult) {
									callback();
									console.log("VICTORY: ", victoryResult);
								    });
								} else {
								    callback();
								}
							    });
							} else {
							    callback();
							}
						    });
						}
						else { collections.units.save(unit.getStorableObj(), {safe: true}, callback); }
					    }

					    var handleDefender = function() {
						updateUnitDamage(defender, emitMove);
					    }
					
					    updateUnitDamage(unit, handleDefender);
					});
				    });
				} else {
                                    collections.units.save(unit.getStorableObj(), {safe:true}, emitMove);
				}
			    }
                        });
                    });
                });
            });
        });
    });


    // create a new unit
    socket.on("create", function(data) {
	var gameId = ObjectID(data.gameId);
	var user = socket.request.user;

        collections.games.findOne({_id:gameId}, function(err, game) {
	    if(!game) { socket.emit("no game"); return; }
            loadMap(game.map, function(err, mapData) {
		var player = game.players.filter(function(p) { return p.username == user.username })[0];

		if(socketOwnerCanAct(socket, game)) {
		    createUnit(data, mapData, collections, game, player, function(createResult) {
			io.sockets.in("game"+gameId).emit("created", createResult);
			socket.emit("playerUpdate", { gold: player.gold });
		    });
		} else {
		    socket.emit("created", {});
		}
	    });
	});
    });

    socket.on("levelup", function(data) {
        var gameId = ObjectID(data.gameId);
        var choiceNum = data.choiceNum;
	var user = socket.request.user;

        collections.games.findOne({_id:gameId}, function(err, game) {
	    if(!game) { socket.emit("no game"); return; }

	    // ensure that the logged-in user has the right to act
	    if(!socketOwnerCanAct(socket, game, true)) {
		return;
	    }

	    var player = game.players.filter(function(p) { return p.username == user.username })[0];
	    if(!player || !player.advancingUnit) { return; }

	    var coords = player.advancingUnit.split(",").map(function(i) { return parseInt(i); });
            collections.units.findOne({ x:coords[0], y:coords[1], gameId:gameId }, function(err, unit) {
		unit = new Unit(unit);

		choiceNum = Math.round(choiceNum);
		if(choiceNum >= unit.advancesTo.length || choiceNum < 0) { choiceNum = 0; }

		var unit = unit.levelUp(choiceNum);

		delete player.advancingUnit;

		// continue leveling up with unspent over-max XP
		while(unit.xp >= unit.maxXp) {
		    console.log("advanced unit after choice", unit);
		    var oldXp = unit.xp;
		    unit = require("./levelUp").getLevelUp(unit, player, true);
		    
		    // if the XP is above leveling threshold but did not decrease, we hit a branching prompt
		    if(oldXp == unit.xp) { break; }
		}		

		collections.games.save(game, { safe: true }, function() {
		    collections.units.save(unit.getStorableObj(), { safe: true }, function() {
			io.sockets.in("game"+gameId).emit("leveledup", { x: coords[0], y: coords[1], choiceNum: choiceNum });
		    });
		});
	    });
	});
    });
	    

    socket.on("endTurn", function(data) {
	var gameId = ObjectID(data.gameId);

        collections.games.findOne({_id:gameId}, function(err, game) {
	    if(!game) { socket.emit("no game"); return; }

	    if(!socketOwnerCanAct(socket, game)) {
		return;
	    }

	    var oldActiveTeam = game.activeTeam;
	    do {
		game.activeTeam %= (game.players.length);
		game.activeTeam++;
	    } while(game.players[game.activeTeam - 1] == undefined);

	    var villageCount = 0;
	    for(var coords in game.villages) {
		if(game.villages[coords] == game.activeTeam) {
		    villageCount++;
		}
	    }

	    // if all players have taken a turn and active player num is now less than previous player num (because it wrapped around)
	    if(oldActiveTeam > game.activeTeam) {
		var times = ["morning", "afternoon", "dusk", "first watch", "second watch", "dawn"];
		game.timeOfDay = times[(times.indexOf(game.timeOfDay) + 1) % times.length];
	    }

	    // find all units owned by the newly active player
	    collections.units.find({ gameId: gameId, team: game.activeTeam }, function(err, unitCursor) {
		unitCursor.toArray(doUpdates);
	    });
	    function doUpdates(err, unitList) {
		unitList = unitList.map(function(u) { return new Unit(u); });
		var unitsIndexedBySpace = unitList.reduce(function(result, u) { result[u.x+","+u.y] = u; return result; }, {});

		var costlyUnitCount = 0;
		for(var n in unitList) {
		    var unit = unitList[n];
		    // costly units are non-commander, non-loyal units
		    if(unit.team == game.activeTeam &&
		       !unit.isCommander &&
		       (!unit.attributes || unit.attributes.indexOf("loyal") == -1)
		    ) {
			costlyUnitCount++;
		    }
		}
		game.players[game.activeTeam - 1].gold += 2 + villageCount*2 - costlyUnitCount;
		//console.log("gold", game.players[game.activeTeam - 1].gold, 2 + villageCount*2 - costlyUnitCount);

		collections.games.save(game, { safe: true }, function() {
		    var updates = {};
		    var finishUpdates = function() {
			(function saveUnitFromList (i) {
			    if(unitList[i] == undefined) { sendUpdates(); return; }
			    collections.units.save(unitList[i].getStorableObj(), {safe:true}, function() {
				saveUnitFromList(i+1);
			    });
			})(0);

			function sendUpdates() {
			    var hiddenUpdates = {};
			    var publicUpdates = {};
			    for(var updateCoord in updates) {
				if(unitsIndexedBySpace[updateCoord].hasCondition("hidden")) { hiddenUpdates[updateCoord] = updates[updateCoord]; }
			    }
			    for(updateCoord in updates) {
				if(!hiddenUpdates[updateCoord]) { publicUpdates[updateCoord] = updates[updateCoord]; }
			    }

			    io.sockets.in("game"+gameId).emit("newTurn", { activeTeam: game.activeTeam,
									   updates: publicUpdates,
									   timeOfDay: game.timeOfDay });

			    var activePlayerSocketData = socketList.filter(function(o) {
			        return o.gameId.equals(gameId) && o.username == game.players[game.activeTeam-1].username;
			    })[0];

			    if(activePlayerSocketData) {
			        activePlayerSocketData.socket.emit("playerUpdate", { gold: game.players[game.activeTeam-1].gold });
			    }

			    var alliedUsernames = game.players.filter(function(p) { return p.alliance == game.players[game.activeTeam-1].alliance; }).map(function(p) { return p.username; });
			    var alliedPlayerSocketData = socketList.filter(function(o) {
			        return o.gameId.equals(gameId) &&
				       alliedUsernames.indexOf(o.username) != -1;
			    });
			    alliedPlayerSocketData.forEach(function(s) {
				s.socket.emit("newTurn", { activeTeam: game.activeTeam,
								     updates: hiddenUpdates,
								     timeOfDay: game.timeOfDay });
			    });
			}
		    };
		    
		    loadMap(game.map, function(err, mapData) {
			unitList.forEach(function updateUnitForNewTurn(unit) {
			    var update = updates[unit.x+","+unit.y] || {};
			    var healedHp = update.healedHp || 0;
			    // heal unmoved units
			    if(unit.moveLeft == unit.move && !unit.hasAttacked) {
				unit.hp = Math.min(unit.hp+2, unit.maxHp);
				update.hp = unit.hp;
			    }
			    // TODO: unmoved slowed units don't have full move
			
			    // countdown and possibly remove slowed
			    if(unit.hasCondition("slowed")) {
				update.conditionChanges = update.conditionChanges || {};

				var slowedCondition = unit.getCondition("slowed");
				slowedCondition.countdown--;
				if(slowedCondition.countdown <= 0) {
				    update.conditionChanges.slowed = false;
				    unit.removeCondition("slowed");
				} else {
				    update.conditionChanges.slowed = slowedCondition;
				}
			    }
	
			    // refill move points
			    if(unit.hasCondition("slowed")) {
				unit.moveLeft = Math.ceil(unit.move / 2);
			    } else {
				unit.moveLeft = unit.move;
			    }

			    update.moveLeft = unit.moveLeft;
			    unit.hasAttacked = false;

			    // if on a village and/or has regeneration, heal and/or cure poison
			    // (both at once causes both effects, but healing is capped at 8)
			    function villageHeal() {
				if(unit.hasCondition("poisoned")) {
				    unit.removeCondition("poisoned");
				    update.conditionChanges = update.conditionChanges || {};
				    update.conditionChanges.poisoned = false;
				} else {
				    healedHp = 8;
				}
			    }
			    if(mapData[unit.x+","+unit.y].terrain.properties.indexOf("village") != -1 || 
			       unit.attributes.indexOf("regenerates") != -1){
				villageHeal();
			    }

			    // TODO: heal allied off-team units as well (currently we only get same-team units from Mongo)
			    var healingHp = 0;
			    for(var i=0; i<(unit.attributes||[]).length; ++i) {
				var abilityProps = unitLib.abilityDict[unit.attributes[i]];
				if(abilityProps && abilityProps.heals) {
				    healingHp += abilityProps.heals;
				}
			    }
			    if(healingHp > 0) {
				var coords = Terrain.getNeighborCoords(unit);
				for(var i=0; i<coords.length; ++i) {
				    var coord = coords[i];
				    var healedUnit = unitsIndexedBySpace[coord.x+","+coord.y];
				    if(healedUnit) {
					var healedUpdate = updates[coord.x+","+coord.y] || {};
					healedUpdate.healedHp = healedUpdate.healedHp || 0;
				        healingHp = Math.min(healingHp, 8 - healedUpdate.healedHp);
					healedUnit.hp = Math.min(healedUnit.hp+healingHp, healedUnit.maxHp);
					healedUpdate.healedHp += healingHp;
					healedUpdate.hp = healedUnit.hp;
					updates[coord.x+","+coord.y] = healedUpdate;
				    }
				}
			    }

			    if(unit.hasCondition("poisoned")) {
				unit.hp = Math.max(1, unit.hp-8);
				update.hp = unit.hp;
			    }

			    if(healedHp != 0) {
				update.healedHp = Math.max(healedHp, 8);
				unit.hp = Math.min(unit.hp+healedHp, unit.maxHp);
				update.hp = unit.hp;
			    }

			    updates[unit.x+","+unit.y] = update;
			});
			finishUpdates();
		    });
		});
	    };
	});
    });
};
