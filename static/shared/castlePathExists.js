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

if(typeof module != "undefined") {
    module.exports = castlePathExists;
} else {
    var utils = utils || {};
    utils.castlePathExists = castlePathExists;
}
