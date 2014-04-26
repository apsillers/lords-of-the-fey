function areNeighbors(space1, space2) {
    var neighbors = require("./static/shared/terrain.js").Terrain.getNeighborCoords(space1);
    for(var i=0; i<neighbors.length; ++i) {
	if(space2.x == neighbors[i].x && space2.y == neighbors[i].y) { return true; }
    }
    return false;
}

// attempt to move a unit through a given path
module.exports = function executePath(path, unit, unitArray, mapData) {
    var actualPath = [path[0]];
    var standingClear = true;
    var totalMoveCost = 0;

    for(var i=1; i<path.length; ++i) {
	var coords = path[i];
	var isLastSpace = (i == path.length-1);

	if(!areNeighbors(path[i], path[i-1])) { return { path:[path[0]], revealedUnits:[] }; }

	var occupant = unitArray.filter(function(u) { return u.x == coords.x && u.y == coords.y; })[0];
	if(occupant) {
	    if(occupant.team != unit.team) {
		if(isLastSpace && standingClear) {
		    return { path:actualPath, revealedUnits:[], attack: true, moveCost: totalMoveCost };
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
	totalMoveCost += Math.min.apply(Math, mapData[coords.x+","+coords.y].terrain.properties.map(function(i) { return unit.moveCost[i] || Infinity; }));

	// if the move is too costly, abort
	if(totalMoveCost > unit.moveLeft) {
	    return { path:[path[0]], revealedUnits: [] };
	}

	actualPath.push(path[i]);
    }

    return { path: actualPath, revealedUnits: [], moveCost: totalMoveCost };
}