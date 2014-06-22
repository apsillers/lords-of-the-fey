var Terrain = {
    bases: {
        GRASS: { symbol: "Gg", name: "grass", img: "/data/img/terrain/green.png", properties: ["flat"], color:"#0F0" },
        SWAMP: { symbol: "Sw", name: "swamp", img: "/data/img/terrain/water.png", properties: ["swamp"], color:"#079" },
        DIRT: { symbol: "Re", name: "dirt", img: "/data/img/terrain/dirt.png", properties:["flat"], color:"#573B0C" },
	HUMAN_CASTLE: { symbol: "Ch", name: "human castle", img: "/data/img/terrain/castle.png", properties:["castle"], color:"#AAA" },
	HUMAN_KEEP: { symbol: "Kh", name: "human keep", img: "/data/img/terrain/keep.png", properties:["castle", "keep"], color:"#999" }
    },
    overlays: {
        FOREST: { symbol: "Fd", name: "Summer Forest", img: "/data/img/terrain/forest.png", properties: ["forest"], color:"#090" },
        ELVEN_VILLAGE: { symbol: "Ve", name: "Elven Village", img: "/data/img/terrain/village.png", properties: ["village"], color:"#DDD" },
    },

    getTerrainBySymbol: function(baseSymbol, overlaySymbol) {
	var terrainObj = { properties:[] };
        for(var prop in this.bases) {
            if(this.bases[prop].symbol == baseSymbol) {
                var base = this.bases[prop];
		terrainObj.properties = terrainObj.properties.concat(base.properties);
		terrainObj.img = base.img;
		terrainObj.imgObj = base.imgObj;
		terrainObj.color = base.color;
            }
        }
        for(var prop in this.overlays) {
            if(this.overlays[prop].symbol == overlaySymbol) {
                var overlay = this.overlays[prop];
		
		// overlays that confer terrain properties eliminate the "flat" terrain type from the base terrain
		// e.g., green grass overlayed with forest is "forest"-type only, not "forest" and "flat"
		if(overlay.properties.length > 0) {
		    var flatIndex = terrainObj.properties.indexOf("flat");
		    if(flatIndex != -1) { terrainObj.properties.splice(flatIndex, 1); }
		}

		terrainObj.properties = terrainObj.properties.concat(overlay.properties);
		terrainObj.overlayImg = overlay.img;
		terrainObj.overlayImgObj = overlay.imgObj;
		terrainObj.color = overlay.color;
            }
        }

	return terrainObj;
    },

    getNeighborCoords: function(space) {
        var x = space.x, y = space.y;
        
        // -1 if odd, +1 if even
        var offset = 1 - (x % 2) * 2;
        return [{ x: x-1, y: y+offset },
		{ x: x,   y: y+offset },
		{ x: x+1, y: y+offset },
		{ x: x-1, y: y },
		{ x: x,   y: y-offset },
		{ x: x+1, y: y }];
    }
}

var terrainToString = function() { return this.name; };
for(var i in Terrain.bases) {
    Terrain.bases[i].toString = terrainToString;
}
for(var i in Terrain.overlays) {
    Terrain.overlays[i].toString = terrainToString;
}

function toMapDict(map_data) {
    var misc_lines = 0;
    var row = 0;
    var map_array = map_data.split('\n');
    var map_dict = {};

    // read each line in the map file
    for(var line_num = 0; line_num < map_array.length; line_num++) {
        var line = map_array[line_num];
        line = line.trim();
        line = line.replace(/\s+/g, ' ');

        // use this line only if it describes terrain
        if(line.indexOf('=') == -1 && line != '') {
            var tiles = line.split(",");

            // place each tile described in the line
            for(var tile_num = 0; tile_num < tiles.length; tile_num++) {
                var tile = tiles[tile_num];
                tile = tile.trim();
		var tileObj = { x:tile_num, y:row,  }
                var componentsBySpace = tile.split(' ');

		// if the tile has a start position, add it
                if(componentsBySpace.length == 2) {
                    tileObj.start = componentsBySpace[0];
                }

		var componentsByCarret = componentsBySpace.pop().split("^");
		var base = componentsByCarret[0];
		var overlay = componentsByCarret[1];

		var terrain = Terrain.getTerrainBySymbol(base, overlay);
		tileObj.terrain = terrain;

		map_dict[tile_num+","+row] = tileObj;

            }
            row++;
        } else {
            misc_lines += 1;
        }
    }
    
    return map_dict;
}

if(typeof module != "undefined") {
    module.exports = { Terrain: Terrain, toMapDict: toMapDict };
} else {
    window.mapUtils = { Terrain: Terrain, toMapDict: toMapDict };
}