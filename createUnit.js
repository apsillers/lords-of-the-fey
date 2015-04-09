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
var castlePathExists = require("./static/shared/castlePathExists").castlePathExists;
var Unit = require("./static/shared/unit.js").Unit;
var ObjectID = require('mongodb').ObjectID;

/**
    @param {Object} data - object of unit properties (x, y, type)
    @mapData {Object}
*/
module.exports = function(data, mapData, collections, game, player, callback) {
    var gameId = ObjectID(data.gameId);
    var loadUnitType = require("./loadUtils").loadUnitType;
    var loadFaction = require("./loadUtils").loadFaction;
    
    loadFaction(player.faction, function(err, faction) {
	if(faction.recruitList.indexOf(data.type) == -1) { callback({}); }

	collections.units.findOne({ gameId: gameId, x: data.x, y: data.y }, function(err, occupant) {
	    // if the space is populated, abort
	    if(occupant) {
		callback({});
		return;
	    }
	    
	    collections.units.find({ gameId: gameId, team: player.team, isCommander: true }, function(err, commanderCursor) {
		commanderCursor.toArray(function(err, commanders) {
		    var createValid = false;
		    
		    for(var i=0; i < commanders.length; ++i) {
			var commander = commanders[i];
			
			if(mapData[commander.x+","+commander.y].terrain.properties.indexOf("keep") != -1 && // check that the commander is on a keep
			   mapData[data.x+","+data.y].terrain.properties.indexOf("castle") != -1 && // check target is a castle
			   castlePathExists(commander, data, mapData) // find a castle-only path from commander to target
			  ) { createValid = true; }
		    }
		    
		    if(!createValid) { callback({}); return; }

		    data.team = player.team;
		    
		    var sanatizedData = {};
		    sanatizedData.x = data.x;
		    sanatizedData.y = data.y;
		    sanatizedData.team = data.team;
		    sanatizedData.type = data.type;
		    sanatizedData.gameId = gameId;

		    var unit = new Unit(sanatizedData, true);

		    data = unit.getStorableObj();

		    if(player.gold < unit.cost) { callback({}); return; }

		    player.gold -= unit.cost;
		    
		    collections.games.save(game, { safe: true }, function() {
			collections.units.insert(data, function(err) {
			    if(!err) {
				callback(data);
			    }
			});
		    });
		});
	    });
	});
    });
};
