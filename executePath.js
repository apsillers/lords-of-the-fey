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
module.exports = function executePath(path, unit, unitArray, mapData, game) {
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
