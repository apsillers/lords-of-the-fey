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
var qStringMatch = location.hash.match(/game=([^&]*)/);
if(qStringMatch == null) {
    window.location.href = "/";
}
var qTokenMatch = location.hash.match(/token=([^&]*)/);
var qTokenMatch = qTokenMatch && qTokenMatch[1];
var gameInfo = {
    gameId: qStringMatch[1],
    anonToken: qTokenMatch
};
var factionList = ["elves", "orcs"];
var factionDict = {};

/**************************/
window.addEventListener("hashchange", function() { window.location.reload(); })

window.addEventListener("load", function() {

    menuControl.init();

    var toMapDict = mapUtils.toMapDict;
    var Terrain = mapUtils.Terrain;

    socket = io();

    socket.on("no game", function() { alert("Game not found"); });

    socket.emit("anon auth", gameInfo);

	    socket.on("anon auth done", function() {

	    socket.emit("join game", gameInfo.gameId);

	    socket.emit("alldata", gameInfo);
	    socket.on("initdata", function(data) {
		gameInfo.players = data.players;
		gameInfo.player = data.player || { username:"Observer", gold:0 };

		$("#top-username").text(gameInfo.player.username);

		gameInfo.alliances = data.alliances;
		gameInfo.activeTeam = data.activeTeam;
		if(gameInfo.activeTeam == gameInfo.player.team) { ui.hasTurn = true; $("#end-turn-button").prop("disabled", false); }

		gameInfo.timeOfDay = data.timeOfDay;
		$("#right_time_of_day").prop("src", "/data/img/schedule/schedule-"+gameInfo.timeOfDay+".png")
		$("#right_time_of_day").prop("title", gameInfo.timeOfDay.replace(/\b./g, function(s) { return s.toUpperCase(); }));

		$("#top-gold-text").text(gameInfo.player.gold);
		$("#top-active-team-text").text(gameInfo.activeTeam);
		$("#top-active-color").css("background-color", ["rgba(0,0,0,0)","#F00","#00F","#F0F", "#444"][gameInfo.activeTeam]);

		gameInfo.villages = data.villages;
		ui.updateVillageStats();

		$("#end-turn-button").on("click", function() {
		    ui.hasTurn = false;
		    socket.emit("endTurn", gameInfo);
		    world.mapContainer.removeChild(ui.pathShape);
                    ui.hideMoveRange();
                    world.stage.update();
                    ui.pathSource = null;
                    $("#end-turn-button").prop("disabled", true);
		});

		$("#load-text").text("Loading units...");

		unitLib.init(function() {
		    $("#load-text").text("Loading terrain...");
		    var queue = new createjs.LoadQueue();
		    queue.on("complete", handleComplete, this);
		    queue.on("progress", function(e) { $("#load-progress").attr("value", e.progress*100); });
		    var factionManifest = factionList.map(function(k){
			return { id:"faction"+k, src:"/data/factions/"+k+".json", type:createjs.LoadQueue.JSON }
		    });
		    queue.loadManifest(factionManifest);
		    queue.loadManifest(
			Object.keys(Terrain.bases).map(function(k){ return {id:"base"+k, src:Terrain.bases[k].img }; })
		    );
		    queue.loadManifest(
			Object.keys(Terrain.overlays).map(function(k){ return {id:"overlay"+k, src:Terrain.overlays[k].img }; })
		    );
		    queue.loadManifest(
			Object.keys(Terrain.transitions).reduce(function(arr,k){
			    var imgBase = Terrain.transitions[k].imgBase;
			    return arr.concat(Terrain.transitions[k].dirs.map(function(d){ return {id:"transition"+k+"-"+d, src:imgBase+"-"+d+".png" }; }));
			}, [])
		    );
		    queue.loadFile({id:"map", src:"/data/maps/"+data.map, type:createjs.LoadQueue.TEXT});

		    function handleComplete() {
			$("#loading-overlay").hide();

			for(var k in Terrain.bases) {
			    Terrain.bases[k].imgObj = queue.getResult("base"+k);
			}
			for(k in Terrain.overlays) {
			    Terrain.overlays[k].imgObj = queue.getResult("overlay"+k);
			}
			console.log("hello complete");
			for(k in Terrain.transitions) {
			    Terrain.transitions[k].imgObjs = {};
			    for(var i=0; i<Terrain.transitions[k].dirs.length; ++i) {
				var d = Terrain.transitions[k].dirs[i];
				Terrain.transitions[k].imgObjs[d] = queue.getResult("transition"+k+"-"+d);
			    }
			}
		
			for(var i = 0; i < factionList.length; ++i) {
			    var factionName = factionList[i];
			    factionDict[factionName] = queue.getResult("faction"+factionName);
			}

			if(gameInfo.player.faction) {
			    gameInfo.player.recruitList = factionDict[gameInfo.player.faction].recruitList;
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

                        ui.updateOwnedUnitsCount();

			for(var unit in world.units) {
			    world.units[unit].drawGem();
			}

			for(var i in data.villages) {
			    world.getSpaceByCoords(i).setVillageFlag(data.villages[i]);
			}

			if(gameInfo.player.advancingUnit) {
			    var thisUnit = world.getUnitAt(gameInfo.player.advancingUnit);
			    ui.showAdvancementPromptFor(thisUnit, function(choiceNum) {
				socket.emit("levelup", { gameId: gameInfo.gameId, choiceNum: choiceNum, anonToken: gameInfo.anonToken });
			    });
			}
		    }
		}, function(e) { $("#load-progress").attr("value", e.progress*100); });
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
		    $("#top-active-color").css("background-color", ["rgba(0,0,0,0)","#F00","#00F","#F0F", "#444"][gameInfo.activeTeam]);
		    if(gameInfo.activeTeam == gameInfo.player.team) { ui.hasTurn = true; $("#end-turn-button").prop("disabled", false); }	

		    gameInfo.timeOfDay = data.timeOfDay;
		    $("#right_time_of_day").text(gameInfo.timeOfDay)
		    $("#right_time_of_day").prop("src", "/data/img/schedule/schedule-"+gameInfo.timeOfDay+".png")
		    $("#right_time_of_day").prop("title", gameInfo.timeOfDay.replace(/\b./g, function(s) { return s.toUpperCase(); }));

		    for(var i in data.updates) {
			var update = data.updates[i];
			world.getUnitAt(i).update(update);
		    }

		    for(var unit in world.units) {
			world.units[unit].drawGem();
			world.units[unit].hasAttacked = false;
		    }

		    world.stage.update();

		    if(ui.hasTurn) {
			for(var c in world.units) {
			    u = world.units[c];
			    if(u.isCommander && u.team == gameInfo.player.team) {
				var cornerX = u.shape.x - world.stage.canvas.width / 2;
				var cornerY = u.shape.y - world.stage.canvas.height / 2;
				scroll.scrollTo(-cornerX, -cornerY);
			    }
			}
		    }

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

// Check if a new cache is available on page load.
window.addEventListener('load', function(e) {

  window.applicationCache.addEventListener('updateready', function(e) {
    if (window.applicationCache.status == window.applicationCache.UPDATEREADY) {
      // Browser downloaded a new app cache.
      if (confirm('A new version of the client is available on page refresh. Reload the page?')) {
        window.location.reload();
      }
    } else {
      // Manifest didn't changed. Nothing new to server.
    }
  }, false);

}, false);
