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

/** @module executePath */

var socketOwnerCanAct = require("./auth").socketOwnerCanAct;
var loadMap = require("./loadUtils").loadMap;
var Unit = require("./static/shared/unit.js").Unit;
var executeAttack = require("./executeAttack");
var Terrain = require("./static/shared/terrain.js").Terrain;
var executeAttack = require("./executeAttack");
var ObjectID = function(input) { if(input.length!=12 && input.length!=24) { return; } return require('mongodb').ObjectID.apply(this, arguments); }
var checkForVictory = require("./endGame").checkForVictory;

module.exports = function(collections, data, socket, socketList) {
        var gameId = ObjectID(data.gameId),
            path = data.path,
            attackIndex = data.attackIndex,
            user = socket.request.user;
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
                            var moveResult = executePath(path, unit, unitArray, mapData, game);

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
                                var victoryResult = {};

                                var emitMove = function(victory) {
                                        var alliedUsernames = game.players.filter(function(p) { return p.alliance == game.players[game.activeTeam-1].alliance; }).map(function(p) { return p.username; });
                                        var alliedPlayerSocketData = socketList.filter(function(o) {
                                            return o.username && o.gameId.equals(gameId) &&
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

                                        if(victoryResult.victory) {
                                            socketList.filter(function(o) { return o.gameId.equals(gameId) }).forEach(function(s) { s.socket.emit("victory", victoryResult); })
                                        }
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
                                                                    checkForVictory(game, collections, function(victoryState) {
                                                                        victoryResult = victoryState;
                                                                        callback();
                                                                        console.log("VICTORY: ", victoryState);
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
}

var getNeighborCoords = require("./static/shared/terrain.js").Terrain.getNeighborCoords;

/** Given two spaces, descide if they are neighbors */
function areNeighbors(space1, space2) {
    var neighbors = getNeighborCoords(space1);
    for(var i=0; i<neighbors.length; ++i) {
        if(space2.x == neighbors[i].x && space2.y == neighbors[i].y) { return true; }
    }
    return false;
}

/**
Attempt to move a unit through a given path and report result

@param path - array of (x,y) spaces
@param {Unit} unit - Unit attempting to move
@param {Array.<Unit>} unitArray - array of Units in the current game
@param {Object} mapData - object with "x,y" keys and tile values (see toMapDict in terrain.js)
@param game - game object

@return {{path:Array, moveCost:number}|boolean} object with actual path taken and move points spent, or false (on failed move)
*/

function executePath(path, unit, unitArray, mapData, game) {
    var actualPath = [path[0]];
    var standingClear = true;
    var totalMoveCost = 0;
    var revealedUnits = [];

    for(var i=1; i<path.length; ++i) {
        var coords = path[i];
        var isLastSpace = (i == path.length-1);

        if(!areNeighbors(path[i], path[i-1])) { return { path:[path[0]], revealedUnits:[] }; }

        var occupant = unitArray.filter(function(u) { return u.x == coords.x && u.y == coords.y; })[0];
        if(occupant) {
            if(occupant.getAlliance(game) != unit.getAlliance(game)) {
                if(isLastSpace && standingClear) {
                    // attack if the unit is not hidden (we couldn't have planned to attack a hidden unit)
                    return concludePathing(!occupant.hasCondition("hidden"));
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

        if(totalMoveCost == unit.moveLeft) {
            return concludePathing();
        }

        // add cost to move on this sapce
        totalMoveCost += unit.getMoveCostForSpace(mapData[coords.x+","+coords.y]);
        // Math.min.apply(Math, mapData[coords.x+","+coords.y].terrain.properties.map(function(i) { return unit.terrain[i].cost || Infinity; }));

        // if the move is too costly, abort
        if(totalMoveCost > unit.moveLeft) {
            return { path:[path[0]], revealedUnits: [] };
        }

        actualPath.push(path[i]);

        // if any enemy is adjacent to this space, end the path now
        var adjacentEnemies = getAdjacentEnemies(coords);
        if(adjacentEnemies.length > 0) {
            totalMoveCost = unit.moveLeft;
            var hiddenEnemies = adjacentEnemies.filter(function(e) { return e.hasCondition("hidden"); });
            revealedUnits = revealedUnits.concat(hiddenEnemies);
        }
    }

    return concludePathing();

    function concludePathing(isAttack) {
        if(unit.attributes && unit.attributes.indexOf("ambush") != -1) {
            var prevSpaceHidden = null;
            var publicPath = actualPath.map(function(s,i) {
                var result;
                // if you started visible on forest, you're visible
                if(!unit.hasCondition("hidden") && i==0) { return s; }
                // if you ended adjacent to enemies on forset, you're visible
                if(adjacentEnemies.length>0 && i==actualPath.length-1) { return s; }

                if(mapData[s.x+","+s.y].terrain.properties.indexOf("forest")!=-1) {
                    return { x: s.x, y: s.y, hidden: true };
                }
                return s;
            }).map(function (s,i,array) {
                var prev = array[i-1],
                    next = array[i+1];
                // if unit is hidden on this tile, and will be hidden on the
                //  surrounding tiles, do not publish the x/y coords
                // (if the other tiles are non-hidden, we need them to animate transition)
                if(s.hidden &&
                   (!prev || (prev && prev.hidden)) &&
                   (!next || (next && next.hidden))) {
                    return { hidden: true };
                }
                return s;
            });
        } else {
            publicPath = actualPath;
        }

        console.log(publicPath);

        return {
                 path: actualPath,
                 publicPath: publicPath,
                 moveCost: totalMoveCost,
                 revealedUnits: revealedUnits,
                 hide: publicPath[publicPath.length-1].hidden,
                 attack: isAttack
               };
    }

    function getAdjacentEnemies(coords) {
        var neighborSpaces = getNeighborCoords(coords);
        var adjacentEnemies = unitArray.filter(function(u) {
            for(var i=0; i<neighborSpaces.length; ++i) {
                if(u.x == neighborSpaces[i].x && u.y == neighborSpaces[i].y && u.getAlliance(game) != unit.getAlliance(game)) { return true; }
            }
            return false;
        });
        return adjacentEnemies;
    }
}
