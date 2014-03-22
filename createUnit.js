module.exports = function(data, mapData, collections, player, callback) {
    var gameId = data.gameId;
    var loadUnitType = require("./loadUtils").loadUnitType;

    collections.units.findOne({ gameId: gameId, x: data.x, y: data.y }, function(err, occupant) {
	// if the space is populated, or it is not the user's turn, abort
	if(occupant) {
	    callback({});
	}
	
	collections.units.find({ gameId: gameId, team: player.team, isCommander: true }, function(err, commanderCursor) {
	    commanderCursor.toArray(function(err, commanders) {
		var createValid = false;
		
		for(var i=0; i < commanders.length; ++i) {
		    var commander = commanders[i];
		    
		    if(mapData[commander.x+","+commander.y].terrain.name == "keep" && // check that the commander is on a keep
		       ["keep","castle"].indexOf(mapData[data.x+","+data.y].terrain.name) != -1 && // check target is a castle
		       castlePathExists(commander, data, mapData) // find a castle-only path from commander to target
		      ) { createValid = true; }
		}
		
		if(!createValid) { socket.emit("created", {}); return; }
		
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
}

function castlePathExists(commander, target, mapData) {
    
    function getNeighbors(space) {
        var neighbors = [];
        
        var x = space.x, y = space.y;
        
        // -1 if odd, +1 if even
        var offset = 1 - (x % 2) * 2;
        var coords = [(x-1)+","+(y+offset), x+","+(y+offset), (x+1)+","+(y+offset), (x-1)+","+y, x+","+(y-offset), (x+1)+","+y];
        
        for(var i=0; i<coords.length; ++i) {
	    var prospect = mapData[coords[i]];
	    if(prospect && prospect != space) { neighbors.push(prospect); }
        }
        return neighbors;
    }
    
    var openSet = [commander];
    var closedSet = [];
    var currentSpace = null;
    
    while(currentSpace = openSet.pop()) {
	
	if(currentSpace.x == target.x && currentSpace.y == target.y) { return true; }
	
	openSet = openSet.concat(getNeighbors(currentSpace).filter(function(s) {
	    return ["keep", "castle"].indexOf(s.terrain.name) != -1 &&
		openSet.indexOf(s) == -1 &&
		closedSet.indexOf(s) == -1
	}));
	
	closedSet.push(currentSpace);
    }
    
    return false;
}