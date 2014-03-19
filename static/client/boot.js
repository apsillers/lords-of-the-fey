var canvas = document.getElementById("c");
canvas.width = 900;
canvas.height = 500;
var world;
var socket;
var gameInfo = { 
    gameId: location.search.match(/game=([^&]*)/)?+location.search.match(/game=([^&]*)/)[1]:1
};

/**************************/
window.addEventListener("load", function() {

    socket = io.connect('//' + location.host);

    socket.emit("join game", gameInfo.gameId);

    socket.emit("alldata", gameInfo);
    socket.on("initdata", function(data) {
        var queue = new createjs.LoadQueue();

	gameInfo.player = data.player;
	gameInfo.activeTeam = data.activeTeam;

	if(gameInfo.activeTeam == gameInfo.player.team) { ui.hasTurn = true; }

	$("#top-gold-text").text(gameInfo.player.gold);
	$("#top-active-team-text").text(gameInfo.activeTeam);

	$("#end-turn-button").on("click", function() {
	    ui.hasTurn = false;
	    socket.emit("endTurn", gameInfo);
	});

        queue.loadManifest(
            unitLib.protoList.map(function(k){ return { id:k, src:"/data/units/"+k+".json", type:createjs.LoadQueue.JSON } })
        );

        queue.on("fileload", function(e) {
            unitLib.protos[e.item.id] = e.result;
        });
        queue.on("complete", function() {
            var queue = new createjs.LoadQueue();
            queue.on("complete", handleComplete, this);
            queue.loadManifest(
                Object.keys(unitLib.protos).map(function(k){ return {id:k, src:unitLib.protos[k].img }; })
            );
           queue.loadManifest(
                Object.keys(Terrain.types).map(function(k){ return {id:k, src:Terrain.types[k].img }; })
            );
            queue.loadFile({id:"map", src:"/data/maps/"+data.map, type:createjs.LoadQueue.TEXT});

            function handleComplete() {
		for(var k in unitLib.protos) {
		    unitLib.protos[k].imgObj = queue.getResult(k);
		}

		for(k in Terrain.types) {
		    Terrain.types[k].imgObj = queue.getResult(k);
		}

                world = new World("c");
                world.initGrid(toMapDict(queue.getResult("map")));
		world.stage.canvas.addEventListener("contextmenu", function(e) { e.preventDefault(); });

                for(var i=0; i<data.units.length; i++) {
                    var unit = data.units[i];
                    var unitObj = unitLib.create(unit, unitLib.protos[unit.type]);
                    world.addUnit(unitObj, world.getSpaceByCoords(unit.x,unit.y));
                }
            }
        });
    });

    socket.on("newTurn", function(data) {
	gameInfo.activeTeam = data.activeTeam;
	$("#top-active-team-text").text(gameInfo.activeTeam);
	if(gameInfo.activeTeam == gameInfo.player.team) { ui.hasTurn = true; }	
    });

    socket.on("created", function(unit) {
	if(unit.type) {
	    var unitObj = unitLib.create(unit, unitLib.protos[unit.type]);
            world.addUnit(unitObj, world.getSpaceByCoords(unit.x,unit.y));
	}
	ui.moveHappening = false;
    });

    socket.on("moved", ui.animateUnitMove);
});


function toMapDict(map_data) {
    var misc_lines = 0;
    var row = 0;
    var map_array = map_data.split('\n');
    var map_dict = {};

    // read each line in the map file
    for(var line_num = 0; line_num < map_array.length; line_num++) {
        var line = map_array[line_num];
        line = $.trim(line);
        line = line.replace(/\s+/g, ' ');

        // use this line only if it describes terrain
        if(line.indexOf('=') == -1 && line != '') {
            var tiles = line.split(",");

            // place each tile described in the line
            for(var tile_num = 0; tile_num < tiles.length; tile_num++) {
                var tile = tiles[tile_num];
                tile = $.trim(tile);
                var components = tile.split(' ');
                //console.log(components);
                // if the tile describes only its terrain, draw it;
                // otherwise, find the part that describes the terrain
                if(components.length == 1) {
                    map_dict[tile_num+","+row] = { "terrain": Terrain.getTerrainBySymbol(components[0]) };
                } else {
	            map_dict[tile_num+","+row] = { "start": components[0], "terrain": Terrain.getTerrainBySymbol(components[1]) };
                }
            }
            row++;
        } else {
            misc_lines += 1;
        }
    }
    
    return map_dict;
}

