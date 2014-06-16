var canvas = document.getElementById("c");
canvas.width = 900;
canvas.height = 600;
var world;
var socket;
var gameInfo = { 
    gameId: +location.search.match(/game=([^&]*)/)?+location.search.match(/game=([^&]*)/)[1]:location.search.match(/game=([^&]*)/)[1]
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
	gameInfo.player = data.player;
	gameInfo.activeTeam = data.activeTeam;
	if(gameInfo.activeTeam == gameInfo.player.team) { ui.hasTurn = true; }

	gameInfo.timeOfDay = data.timeOfDay;
	$("#right_time_of_day").prop("src", "/data/img/schedule/schedule-"+gameInfo.timeOfDay+".png")
	$("#right_time_of_day").prop("title", gameInfo.timeOfDay.replace(/\b./g, function(s) { return s.toUpperCase(); }));

	$("#top-gold-text").text(gameInfo.player.gold);
	$("#top-active-team-text").text(gameInfo.activeTeam);

	$("#end-turn-button").on("click", function() {
	    ui.hasTurn = false;
	    socket.emit("endTurn", gameInfo);
	});

	unitLib.init(function() {
            var queue = new createjs.LoadQueue();
            queue.on("complete", handleComplete, this);
	    var raceManifest = raceList.map(function(k){
		return { id:"race"+k, src:"/data/races/"+k+".json", type:createjs.LoadQueue.JSON }
	    });
            queue.loadManifest(raceManifest);
            queue.loadManifest(
		Object.keys(Terrain.bases).map(function(k){ return {id:"base"+k, src:Terrain.bases[k].img }; })
            );
            queue.loadManifest(
		Object.keys(Terrain.overlays).map(function(k){ return {id:"overlay"+k, src:Terrain.overlays[k].img }; })
            );
            queue.loadFile({id:"map", src:"/data/maps/"+data.map, type:createjs.LoadQueue.TEXT});

            function handleComplete() {
		for(k in Terrain.bases) {
		    Terrain.bases[k].imgObj = queue.getResult("base"+k);
		}
		for(k in Terrain.overlays) {
		    Terrain.overlays[k].imgObj = queue.getResult("overlay"+k);
		}
		
		for(var i = 0; i < raceList.length; ++i) {
		    var raceName = raceList[i];
		    raceDict[raceName] = queue.getResult("race"+raceName);
		}
		gameInfo.player.recruitList = raceDict[gameInfo.player.race].recruitList;

		world = new World("c");
		world.initGrid(toMapDict(queue.getResult("map")));
		world.stage.canvas.addEventListener("contextmenu", function(e) { e.preventDefault(); });
		window.addEventListener("resize", function() { world.resizeCanvasToWindow(); });
		scroll.addScroll();

		for(var i=0; i<data.units.length; i++) {
                    var unitData = data.units[i];
                    var unitObj = new Unit(unitData);
                    world.addUnit(unitObj, world.getSpaceByCoords(unitData.x,unitData.y));
		}

		for(var unit in world.units) {
		    world.units[unit].drawGem();
		}

		for(var i in data.villages) {
		    world.getSpaceByCoords(i).setVillageFlag(data.villages[i]);
		}

		if(gameInfo.player.advancingUnit) {
		    var thisUnit = world.getUnitAt(gameInfo.player.advancingUnit);
		    ui.showAdvancementPromptFor(thisUnit, function(choiceNum) {
			socket.emit("levelup", { gameId: gameInfo.gameId, choiceNum: choiceNum });
		    });
		}
            }
	});
    });

    socket.on("leveledup", function(data) {
	actionQueue.addAction(function() {
	    var thisUnit = world.getUnitAt(data);
	    var newUnit = thisUnit.levelUp(data.choiceNum);
	    
	    world.removeUnit(thisUnit);
	    world.addUnit(newUnit, world.getSpaceByCoords(data));
	    delete gameInfo.player.advancingUnit;
	    
	    // trigger another level-up or prompt
	    var newUnit = newUnit.update({ xp: newUnit.xp });

	    ui.finishAnimation();
	});
    });

    socket.on("newTurn", function(data) {
	actionQueue.addAction(function() {
	    gameInfo.activeTeam = data.activeTeam;
	    $("#top-active-team-text").text(gameInfo.activeTeam);
	    if(gameInfo.activeTeam == gameInfo.player.team) { ui.hasTurn = true; }	

	    gameInfo.timeOfDay = data.timeOfDay;
	    $("#right_time_of_day").text(gameInfo.timeOfDay)
	    $("#right_time_of_day").prop("src", "/data/img/schedule/schedule-"+gameInfo.timeOfDay+".png")
	    $("#right_time_of_day").prop("title", gameInfo.timeOfDay.replace(/\b./g, function(s) { return s.toUpperCase(); }));

	    for(var i=0; i<data.updates.length; ++i) {
		var update = data.updates[i];
		world.getUnitAt(update).update(update);
	    }

	    for(var unit in world.units) {
		world.units[unit].drawGem();
		world.units[unit].hasAttacked = false;
	    }

	    world.stage.update();

	    ui.finishAnimation();
	});
    });

    socket.on("created", function(unitData) {
	actionQueue.addAction(function() {
	    if(unitData.type) {
		var unitObj = new Unit(unitData);
		world.addUnit(unitObj, world.getSpaceByCoords(unitData.x,unitData.y));
	    }
	    ui.finishAnimation();
	});
    });

    socket.on("moved", function(data) {
	actionQueue.addAction(function() {
	    ui.animateUnitMove(data);
	});
    });

    socket.on("playerUpdate", function(data) {
	actionQueue.addAction(function() {
	    ui.updatePlayer(data);
	});

	
    });
});

var actionQueue = {
    queue: [],
    addAction: function(func) {
	this.queue.push(func);
	if(!ui.moveAnimating) { this.doNext(); }
    },
    doNext: function() {
	if(!ui.moveAnimating) { (this.queue.shift()||function(){})(); }
    }
}