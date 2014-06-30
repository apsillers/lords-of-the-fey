exports.checkForVictory = function checkForVictory(game, collections, callback) {
    var result = { victory: false };
    var teamsWithCommanders = {};
    collections.units.find({ gameId: game._id.toString(), isCommander: true }, function(err, cursor) {
	cursor.next(function indexCommanderTeam(err, commander) {
	    if(!commander) { produceResult(); return; }
	    teamsWithCommanders[commander.team] = true;
	    cursor.next(indexCommanderTeam);
	});

	function produceResult() {
	    var winningAlliance = null;
	    var survivingTeamList = Object.getOwnPropertyNames(teamsWithCommanders);
	    console.log(survivingTeamList);
	    for(var i=0; i < survivingTeamList.length; ++i) {
		var team = survivingTeamList[i];
		var thisAlliance = game.players[team-1].alliance;
		if(winningAlliance == null) { winningAlliance = thisAlliance }
		if(thisAlliance != winningAlliance) {
		    winningAlliance = null;
		    break;
		}
	    }

	    if(winningAlliance !== null) {
		result.victory = true;
		result.alliance = winningAlliance;
	    }

	    callback(result);
	}
    });	
}

exports.concludeGame = function(result, game, collections, callback) {
    game.over = true;
    game.winner = result.alliance;
    collections.units.find({ gameId: game._id.toString() }, function(unitCursor) {
	unitCursor.next(function stripGameId(u) {
	    if(!u) { collections.units.save(unitCursor); }
	    else {
		delete u.gameId;
	    }
	});
    });
}