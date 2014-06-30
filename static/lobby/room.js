var socket = io.connect('//' + location.host);

var roomId = location.search.match(/id=([^&]*)/)[1];
var players;
var yourUsername;

socket.emit("enter room", roomId);

socket.on("room data", function(data) {
    players = data.room.players;
    yourUsername = data.you;
    renderPlayerList();
});

socket.on("joined room", function(data) {
    players = data.players;
    renderPlayerList();
});

socket.on("player update", function(data) {
    players = data.players;
    renderPlayerList();
});

function renderPlayerList() {
    var $playerList = $("#room-player-list");
    $playerList.html("");

    $.each(players, function(i, data) {
	var playerItem = $("<div>");	
	if(data.username == yourUsername) {
	    var readyBox = $("<input type='checkbox'>");
	    readyBox.click(function() {
		socket.emit("ready", { ready: $(this).is(':checked'), id: roomId });
	    });
	    readyBox.prop("checked", data.ready);
	    playerItem.append(readyBox);

	    var playerText = $("<span>");
	    playerText.text(i + ": " + data.username + " | ");
	    playerItem.append(playerText);

	    var raceSelector = $("<select>");
	    raceSelector.append('<option value="random">Random</option>')
	    raceSelector.append('<option value="elves">Elves</option>')
	    raceSelector.append('<option value="orcs">Orcs</option>')
	    raceSelector.val(data.race);
	    raceSelector.change(function() {
		socket.emit("set race", { id: roomId, race: raceSelector.val() });
	    });
	    playerItem.append(raceSelector);
	} else {
	    playerItem.text((data.ready?"+ ":"_ ") + i + ": " + data.username + " | " + (data.race||"Random"));
	}
	$playerList.append(playerItem);
    });
}

socket.on("launched room", function(gameId) {
    window.location = "/client/grid.html?game="+gameId;
});

$("#start-game-button").click(function() {
    if(players.every(function(p) { return p.ready; })) {
	socket.emit("launch room", roomId);
    }
});