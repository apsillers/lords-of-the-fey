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

socket.on("ready change", function(data) {
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
	    playerItem.append(readyBox);

	    var playerText = $("<span>");
	    playerText.text(i + ": " + data.username + " | ");
	    playerItem.append(playerText);

	    var raceSelector = $("<select>");
	    raceSelector.append('<option value="random">Random</option>')
	    raceSelector.append('<option value="elves">Elves</option>')
	    raceSelector.append('<option value="orcs">Orcs</option>')
	    raceSelector.change(function() {
		socket.emit("change race", { id: roomId, race: raceSelector.value() });
	    });
	    playerItem.append(raceSelector);
	} else {
	    playerItem.text((data.ready?"- ":"+ ") + i + ": " + data.username + " | " + (data.race||"Random"));
	}
	$playerList.append(playerItem);
    });
}
