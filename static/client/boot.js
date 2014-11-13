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
var canvas = document.getElementById("c");
canvas.width = 900;
canvas.height = 600;
var world;
var socket;
var qStringMatch = location.search.match(/game=([^&]*)/);
if(qStringMatch == null) {
    window.location.href = "/";
}
var gameInfo = { 
    gameId: qStringMatch[1]
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
	gameInfo.player = data.player || { username:"Observer", gold:0 };

	$("#top-username").text(gameInfo.player.username);

	gameInfo.alliances = data.alliances;
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

		if(gameInfo.player.race) {
		    gameInfo.player.recruitList = raceDict[gameInfo.player.race].recruitList;
		}

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
	    newUnit.update({ xp: newUnit.xp });

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