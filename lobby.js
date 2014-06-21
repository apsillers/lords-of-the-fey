var roomIndex = 1;

var rooms = {};
var players = [];

/*module.exports.initLobbyHTTP = function(app, collections) {
    app.get('/lobby/create', function(req, res) {
	var mapName = "test_map.map";
	require("./createGame").createNewGame(collections, players, mapName, function(id) {
	    res.redirect("/client/grid.html?game=" + id);
	})
    });
}*/

module.exports.initLobbyListeners = function(sockets, socket, collections) {

    socket.on("join lobby", function() {
	var user = socket.handshake.user;
	if(!user) { return; }

	players.push(user.username);

	console.log(players);

	sockets.in("lobby").emit("joined lobby", user.username);
	socket.emit("lobby data", { players: players, rooms: rooms, you: user.username });
	socket.join("lobby");
    });

    socket.on("disconnect", function() {
	var user = socket.handshake.user;
	if(!user) { return; }
	var index = players.indexOf(user.username);
	if(index != -1) { players.splice(index, 1); }
	sockets.in("lobby").emit("left lobby", user.username);
    });

    socket.on("create room", function(data) {
	var loadMap = require("./loadUtils").loadMap;

	var user = socket.handshake.user;
	
	loadMap(data.map, function(err, mapData) {
	    var startPositions = require("./createGame").getStartPositions(mapData);
	    var id = roomIndex++;
	    rooms[id] = {
		id: id,
		name: data.name,
		map: data.map,
		totalSlots: startPositions.length - 1,
		filledSlots: 0,
		players:[]
	    };
	    sockets.in("lobby").emit("created room", rooms[id]);
	    joinRoom(user, rooms[id]);
	});
    });

    socket.on("join room", function(data) {
	var room = rooms[+data.id];
	var user = socket.handshake.user;
	joinRoom(user, room);
    });

    function joinRoom(user, room) {
	if(!room || !user || room.players.some(function(o) { return o.username == user.username; }) || room.filledSlots >= room.totalSlots) {
	    return;
	}

	var freeIndex = room.players.indexOf(null);
	if(freeIndex != -1) {
	    freeIndex = room.players.length; 
	}

	room.players[freeIndex] = { username: user.username };
	socket.join("room"+room.id);

	sockets.in("lobby").emit("joined room", { username: user.username, room: room });
    }

    socket.on("leave room", function(data) {
	var room = rooms[+data.id];
	if(!room) { return; }
	var user = socket.handshake.user;
	if(!user) { return; }
	var player = room.players.filter(function(o) { return o.username == user.username; })[0];
	if(!player) { return; }

	room.players.splice(room.players.indexOf(player), 1);
	socket.leave("room"+data.id);

	sockets.in("lobby").emit("left room", { username: user.username, roomId: room.id });
    });

    socket.on("ready", function(data) {
	var room = rooms[+data.id];
	if(!room) { return; }
	var user = socket.handshake.user;
	if(!user) { return; }
	var player = room.players.filter(function(o) { return o.username == user.username; })[0];
	if(!player) { return; }

	player.ready = !!data.ready;

	if(room.players.every(function(p) { return p.ready; })) {
	    require("./createGame").createNewGame(collections, players, mapName, function(id) {
		sockets.in("room"+data.id).emit("launch game", id);
		// sockets.in("room"+data.id).leave("room"+data.id);
	    });
	};

	sockets.in("room"+data.id).emit("ready change", { username: user.username, roomId: data.id, ready: !!data.ready });
    });
}