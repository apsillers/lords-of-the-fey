/**
    Copyright 2014 Andrew P. Sillers

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
var socketOwnerCanAct = require("./auth").socketOwnerCanAct;
var Unit = require("./static/shared/unit.js").Unit;
var ObjectID = function(input) { if(input.length!=12 && input.length!=24) { return; } return require('mongodb').ObjectID.apply(this, arguments); }

exports.levelUp = function(collections, data, socket, socketList) {
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
                    unit = exports.getLevelUp(unit, player, true);
                    
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
};

exports.getLevelUp = function(thisUnit, owner, isOffender) {
    var leveledUnit;

    if(!thisUnit.advancesTo || thisUnit.advancesTo.length < 2) {
        leveledUnit = thisUnit.levelUp(0);
    } else if(thisUnit.advancesTo && thisUnit.advancesTo.length > 1) {
        if(isOffender) {
            // if offender, user must choose advancement path
            // so mark this player as requiring a choice; client should show prompt
            owner.advancingUnit = thisUnit.x + "," + thisUnit.y;
            console.log("expecting choice");
            leveledUnit = thisUnit;
        } else {
            // defending unit level-up does not offer a choice to player
            leveledUnit = thisUnit.levelUp(0);
        };
    }
    
    return leveledUnit;
};

exports.applyNewProperties = function(thisUnit, leveledUnit) {
    // modify unit with new properties after level-up
    var leveledOwnProps = leveledUnit.getStorableObj();
    for(var prop in leveledOwnProps) {
        thisUnit[prop] = leveledOwnProps[prop]; 
    }     
};
