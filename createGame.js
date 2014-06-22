var loadMap = require("./loadUtils").loadMap;
var Unit = require("./static/shared/unit.js").Unit;

exports.initLobby = function(app, collections) {
    app.get('/create', function(req, res) {
	var players = [
	    { username:"hello", race: "elves" },
	    { username:"goodbye", race: "orcs" }
	];
	var mapName = "test_map.map";
	require("./createGame").createNewGame(collections, players, mapName, function(id) {
	    res.redirect("/client/grid.html?game=" + id);
	})
    });
}

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
	"map" : "test_map.map",
	"timeOfDay" : "morning",
	"players" : playerList,
	"villages": {},
	"activeTeam": 1
    };

    for(var i=0; i<playerList.length; ++i) {
	playerList[i].team = i+1;
	playerList[i].alliance = i+1;
	if(!("gold" in playerList[i])) { playerList[i].gold = 100; }
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
		if(index == playerList.length) { console.log("wow, we made a game:", game._id); resolutionCallback(game._id); return; }
		var typeName = playerList[index].race=="elves"?"elven_archer":"grunt";
		var coords = startPositions[playerList[index].team];

		console.log(index, playerList.length, typeName);

		var unit = new Unit({
		    gameId: game._id.toString(),
		    x: +coords[0],
		    y: +coords[1],
		    type: typeName,
		    team: playerList[index].team,
		    isCommander: true
		}, true);

		var data = unit.getStorableObj();

		collections.units.insert(data, {safe:true}, addCommander)
	    })();
	});
    });
}