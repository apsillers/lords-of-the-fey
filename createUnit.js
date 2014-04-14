var castlePathExists = require("./static/shared/castlePathExists");

module.exports = function(data, mapData, collections, player, callback) {
    var gameId = data.gameId;
    var loadUnitType = require("./loadUtils").loadUnitType;
    var loadRace = require("./loadUtils").loadRace;
    
    loadRace(player.race, function(err, race) {
	if(race.recruitList.indexOf(data.type) == -1) { callback({}); }

	collections.units.findOne({ gameId: gameId, x: data.x, y: data.y }, function(err, occupant) {
	    // if the space is populated, abort
	    if(occupant) {
		callback({});
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
		    
		    loadUnitType(data.type, function(err, type) {
			data["xp"] = 0;
			data["hp"] = type.maxHp;
			data["moveLeft"] = type.move;
			data["team"] = player.team;
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
