var castlePathExists = require("./static/shared/castlePathExists");
var Unit = require("./static/shared/unit.js").Unit;

module.exports = function(data, mapData, collections, game, player, callback) {
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

		    data.team = player.team;
		    var unit = new Unit(data, true);

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
