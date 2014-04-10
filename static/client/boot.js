var canvas = document.getElementById("c");
canvas.width = 900;
canvas.height = 500;
var world;
var socket;
var gameInfo = { 
    gameId: location.search.match(/game=([^&]*)/)?+location.search.match(/game=([^&]*)/)[1]:1
};
var raceList = ["elves", "orcs"];
var raceDict = {};

/**************************/
window.addEventListener("load", function() {

    var toMapDict = mapUtils.toMapDict;

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

	var unitManifest = unitLib.protoList.map(function(k){
	    return { id:"unit"+k, src:"/data/units/"+k+".json", type:createjs.LoadQueue.JSON }
	});

	var raceManifest = raceList.map(function(k){
	    return { id:"race"+k, src:"/data/races/"+k+".json", type:createjs.LoadQueue.JSON }
	});

        queue.loadManifest(unitManifest);
        queue.loadManifest(raceManifest);

        queue.on("fileload", function(e) {
	    if(e.item.id.indexOf("unit") == 0) {
		unitLib.protos[e.item.id.substr(4)] = e.result;
	    } else if(e.item.id.indexOf("race") == 0) {
		raceDict[e.item.id.substr(4)] = e.result;
	    }
        });
        queue.on("complete", function() {
	    gameInfo.player.recruitList = raceDict[gameInfo.player.race].recruitList;

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
		    var img = queue.getResult(k);
		    unitLib.protos[k].imgObj = img;
		    unitLib.protos[k].colorImgList = [img];

		    var colorCanvas = document.createElement("canvas");
		    colorCanvas.width = img.width;
		    colorCanvas.height = img.height;
		    colorContext = colorCanvas.getContext("2d");
		    var teamColors = [[255,255,0], [0,255,255], [255,255,255]]

		    for(var j=0; j<teamColors.length; ++j) {
			colorContext.drawImage(img, 0, 0);
			var imgd = colorContext.getImageData(0,0,img.width,img.height);
			var pix = imgd.data;

			for(var i=0, n=pix.length; i < n; i += 4) {
			    if(pix[i] > pix[i+1] && pix[i+2] > pix[i+1]) {
				pix[i] = pix[i] & teamColors[j][0];
				pix[i+1] = pix[i+1] & teamColors[j][1];
				pix[i+2] = pix[i+2] & teamColors[j][2];
			    }
			}

			colorContext.putImageData(imgd, 0, 0);
			var coloredImg = new Image();
			coloredImg.src = colorCanvas.toDataURL();
			unitLib.protos[k].colorImgList.push(coloredImg);
		    }
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

	for(var i=0; i<data.updates.length; ++i) {
	    var update = data.updates[i];
	    unitLib.update(world.getUnitAt(update), update);
	}
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


