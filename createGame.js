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
var loadMap = require("./loadUtils").loadMap;
var Unit = require("./static/shared/unit.js").Unit;

/*exports.initLobby = function(app, collections) {
    app.get('/create', function(req, res) {
	var players = [
	    { username:"hello", faction: "elves" },
            { username:"goodbye", faction: "orcs" }
	];
	var mapName = "test_map.map";
	require("./createGame").createNewGame(collections, players, mapName, function(id) {
           res.redirect("/client/#game=" + id);
	})
    });
};*/

exports.getStartPositions = function(mapData) {
    var startPositions = [];
    for(var pos in mapData) {
	if(mapData[pos].start != undefined) {
	    var coords = pos.split(",");
	    startPositions[mapData[pos].start] = coords;
	}
    }
    
    return startPositions;
};


exports.createNewGame = function(collections, playerList, map, resolutionCallback) {
    // TODO: ensure that the player creating the game is on the playerList

    var gameData = {
	"map" : map,
	"timeOfDay" : "morning",
	"players" : playerList,
	"villages": {},
	"activeTeam": 1,
	"alliances": {}
    };

    for(var i=0; i<playerList.length; ++i) {
	var playerItem = playerList[i];

        if(playerItem.empty) { continue; }

	playerItem.team = i+1;
	if(!("alliance" in playerItem)) { playerItem.alliance = i+1; }

	gameData.alliances[playerItem.team] = playerItem.alliance;

	if(!("gold" in playerItem)) { playerItem.gold = 100; }
	if(!("faction" in playerItem) || playerItem.faction == "random") { playerItem.faction = Math.random()>0.5?"elves":"orcs"; }
        else { playerItem.faction = playerItem.faction.toLowerCase(); }
    }

    loadMap(map, function(err, mapData) {
	if(err) { resolutionCallback(false); return; }    

	var startPositions = require("./createGame").getStartPositions(mapData);

	for(var pos in mapData) {
    	    if(mapData[pos].terrain.properties.indexOf("village") != -1) {
		gameData.villages[pos] = 0;
	    }
	}

	if(playerList.length > startPositions.length - 1) { resolutionCallback(false); return; }
	
	collections.games.insert(gameData, {safe: true}, function(err, items) {    
	    var game = items[0];
	    var index = -1;
	    (function addCommander() {
		index++;
		if(index == playerList.length) { resolutionCallback(game._id); return; }
                if(playerList[index].empty) { addCommander(); return; }
		var typeName = playerList[index].faction=="elves"?"elvish_ranger":"orcish_warrior";
		var coords = startPositions[playerList[index].team];

		var unit = new Unit({
		    gameId: game._id,
		    x: +coords[0],
		    y: +coords[1],
		    type: typeName,
		    team: playerList[index].team,
		    isCommander: true
		}, true);
		unit.moveLeft = unit.move;

		var data = unit.getStorableObj();

		collections.units.insert(data, {safe:true}, addCommander)
	    })();
	});
    });
}
