var socketOwnerCanAct = require("./auth").socketOwnerCanAct;
var loadMap = require("./loadUtils").loadMap;
var Unit = require("./static/shared/unit.js").Unit;
var ObjectID = function(input) { if(input.length!=12 && input.length!=24) { return; } return require('mongodb').ObjectID.apply(this, arguments); }
var unitLib = require("./static/shared/unit.js").unitLib;
var Terrain = require("./static/shared/terrain.js").Terrain;

module.exports = function(collections, data, socket, socketList) {
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

                            socketList.filter(function(o) { console.log(o.gameId, gameId); return o.gameId.equals(gameId); }).forEach(function(o) {
                                o.socket.emit("newTurn", { activeTeam: game.activeTeam,
                                                    updates: publicUpdates,
                                                    timeOfDay: game.timeOfDay });
                            });

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
}
