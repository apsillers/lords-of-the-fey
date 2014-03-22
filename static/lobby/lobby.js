var socket = io.connect('//' + location.host);
var games = {};

socket.emit("lobby");

socket.on("games", function(data) {
    for(gameId in data) {
	games[gameId] = data[gameId];
    }

    renderGames();
});

function renderGames() {
    $.each(games, function(gameId, data) {
	var gameItem = $("<div>");
	gameItem.text(gameId + ": ");
    })
}