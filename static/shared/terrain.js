var Terrain = {
    bases: {
        GRASS: { symbol: "Gg", name: "grass", img: "/data/img/terrain/green.png", properties: ["flat"], color:"#0F0" },
        SEMI_GRASS: { symbol: "Gs", name: "semi-dry grass", img: "/data/img/terrain/semi-dry.png", properties: ["flat"], color:"#0F0" },
        DRY_GRASS: { symbol: "Gd", name: "dry grass", img: "/data/img/terrain/dry.png", properties: ["flat"], color:"#0F0" },
        LITTER: { symbol: "Gll", name: "leaf litter", img: "/data/img/terrain/green.png", properties: ["flat"], color:"#0F0" },

        DIRT: { symbol: "Re", name: "dirt", img: "/data/img/terrain/dirt.png", properties:["flat"], color:"#573B0C" },
        DARK_DIRT: { symbol: "Rb", name: "dark dirt", img: "/data/img/terrain/dirt-dark.png", properties:["flat"], color:"#573B0C" },
        DRY_DIRT: { symbol: "Rd", name: "dry dirt", img: "/data/img/terrain/desert-road.png", properties:["flat"], color:"#573B0C" },

        COBBLES: { symbol: "Rr", name: "cobbles", img: "/data/img/terrain/road.png", properties:["flat"], color:"#573B0C" },
        GRAY_COBBLES: { symbol: "Rrc", name: "cobbles", img: "/data/img/terrain/road-clean.png", properties:["flat"], color:"#573B0C" },
        OVERGROW_COBBLES: { symbol: "Rp", name: "cobbles", img: "/data/img/terrain/stone-path.png", properties:["flat"], color:"#573B0C" },

        HUMAN_CASTLE: { symbol: "Ch", name: "human castle", img: "/data/img/terrain/castle.png", properties:["castle"], color:"#AAA" },
        HUMAN_KEEP: { symbol: "Kh", name: "human keep", img: "/data/img/terrain/keep.png", properties:["castle", "keep"], color:"#999" },
        ENCAMPMENT_CASTLE: { symbol: "Ce", name: "encampment castle", img: "/data/img/terrain/castle.png", properties:["castle"], color:"#AAA" },
        ENCAMPMENT_KEEP: { symbol: "Ke", name: "encampment keep", img: "/data/img/terrain/keep.png", properties:["castle", "keep"], color:"#999" },

        GRAY_DEEP_WATER: { symbol: "Wog", name: "gray deep water", img: "/data/img/terrain/ocean-grey-tile.png", properties:["deep_water"], color:"#00A" },
        TOPICAL_DEEP_WATER: { symbol: "Wot", name: "tropical deep water", img: "/data/img/terrain/ocean-tropical-tile.png", properties:["deep_water"], color:"#00A" },
        DEEP_WATER: { symbol: "Wo", name: "deep water", img: "/data/img/terrain/ocean-tile.png", properties:["deep_water"], color:"#00A" },
        TOPICAL_SHALLOW_WATER: { symbol: "Wwt", name: "tropical shallow water", img: "/data/img/terrain/coast-grey-tile.png", properties:["shallow_water"], color:"#00D" },
        GRAY_SHALLOW_WATER: { symbol: "Wwg", name: "gray shallow water", img: "/data/img/terrain/coast-grey-tile.png", properties:["shallow_water"], color:"#00D" },
        SHALLOW_WATER: { symbol: "Ww", name: "shallow water", img: "/data/img/terrain/coast-tile.png", properties:["shallow_water"], color:"#00D" },
        FORD: { symbol: "Wwf", name: "ford", img: "/data/img/terrain/ford-tile.png", properties:["shallow_water", "flat"], color:"#00D" },

        SWAMP: { symbol: "Sw", name: "swamp", img: "/data/img/terrain/swamp.png", properties: ["swamp"], color:"#079" },
        MUD: { symbol: "Ss", name: "mud", img: "/data/img/terrain/mud-tile.png", properties: ["flat"], color:"#079" },

        ICE: { symbol: "Ai", name: "ice", img: "/data/img/terrain/ice.png", properties:["frozen"], color:"#99E" },
        SNOW: { symbol: "Aa", name: "snow", img: "/data/img/terrain/snow.png", properties:["frozen"], color:"#99D" },

        HILLS: { symbol: "Hh", name: "hills", img: "/data/img/terrain/hills.png", properties:["hills"], color:"#3A3" },
        SNOW_HILLS: { symbol: "Ha", name: "snow hills", img: "/data/img/terrain/snow-hills.png", properties:["hills", "frozen"], color:"#99D" },
        DRY_HILLS: { symbol: "Hhd", name: "dry hills", img: "/data/img/terrain/dry-hills.png", properties:["hills"], color:"#3A3" },
        DUNES: { symbol: "Hd", name: "dunes", img: "/data/img/terrain/dunes.png", properties:["hills"], color:"#EDC9AF" },

        MOUNTAINS: { symbol: "Mm", name: "mountains", img: "/data/img/terrain/mountains.png", properties:["mountains"], color:"#AAA" },
        DRY_MOUNTAINS: { symbol: "Md", name: "dry mountains", img: "/data/img/terrain/dry-mountains.png", properties:["mountains"], color:"#AAA" },
        SNOWY_MOUNTAINS: { symbol: "Mm", name: "snowy mountains", img: "/data/img/terrain/snow-mountains.png", properties:["mountains", "frozen"], color:"#99D" },

        DESERT: { symbol: "Dd", name: "desert", img: "/data/img/terrain/desert.png", properties:["sand"], color:"#EDC9AF" },
        BEACH: { symbol: "Ds", name: "beach", img: "/data/img/terrain/desert.png", properties:["sand"], color:"#EDC9AF" },

        CAVE_PATH: { symbol: "Ur", name: "cave path", img: "/data/img/terrain/cave-path.png", properties:["cave", "flat"], color:"#666" },
        CAVE_FLOOR: { symbol: "Uu", name: "cave floor", img: "/data/img/terrain/cave-floor.png", properties:["cave"], color:"#666" },
        ROCKBOUND_CAVE: { symbol: "Uh", name: "rockbound cave", img: "/data/img/terrain/rockbound-cave.png", properties:["cave"], color:"#666" },

        VOLCANO: { symbol: "Mv", name: "volcano", img: "/data/img/terrain/volcano-tile.png", properties:["impassable"], color:"#666" },
    },
    overlays: {
        FOREST: { symbol: "Fd", name: "summer forest", img: "/data/img/terrain/forest.png", properties: ["forest"], color:"#090" },
        MUSHROOM_GROVE: { symbol: "Uf", name: "mushroom grove", img: "/data/img/terrain/mushrooms-tile.png", properties: ["fungus"], color:"#A75" },
        ELVEN_VILLAGE: { symbol: "Ve", name: "elven village", img: "/data/img/terrain/village.png", properties: ["village"], color:"#DDD" },
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

            if(terrainObj.properties.length == 0) {
                terrainObj = { properties: ["flat"], img: "/data/img/terrain/void-editor.png", color: "#000" };

                if(overlaySymbol) { terrainObj.overlayImg = "/data/img/terrain/forest.png"; }
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
    },

    getDirection: function(s1, s2) {
        if(s1.x == s2.x) {
            return s1.y > s2.y ? "n" : "s";
        }

        // is a high space on a row
        var isHigh = (s1.x % 2);
        var result = "";
        
        if((isHigh && s1.y == s2.y) || (!isHigh && s1.y < s2.y)) {
            result = "s";
        } else {
            result = "n";
        }

        if(s1.x > s2.x) { result += "w"; }
        else { result += "e"; }

        return result;
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
