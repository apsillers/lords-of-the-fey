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

/** @module castlePathExists */

(function() {
    var exports;
    if(typeof module != "undefined") {
	exports = module.exports;
    } else {
	exports = window.utils = window.utils || {};
    }

    /** 
	Decide if a path of castle tiles exists between a commander and some
	target space

	@param {Object} commander - object with `x` and `y` properties for the
	commander location
	@param {Object} target - object with `x` and `y` properties for the
	target location
	@param {module:terrain~MapData} mapData - MapData dictionary
     */
    exports.castlePathExists = function(commander, target, mapData) {
	
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
		return (s.terrain.properties.indexOf("castle") != -1 || s.terrain.properties.indexOf("keep") != -1) &&
		    openSet.indexOf(s) == -1 &&
		    closedSet.indexOf(s) == -1
	    }));
	    
	    closedSet.push(currentSpace);
	}
	
	return false;
    }
}());
