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
	var user = socket.handshake.user;
	if(!user) { return; }

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
		players:[],
		owner:user.username
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

    socket.on("enter room", function(id) {
	var user = socket.handshake.user;
	socket.join("room"+id);
	socket.emit("room data", { you: user.username, room: rooms[+id] });
    });

    function joinRoom(user, room) {
	if(!room || !user || room.players.some(function(o) { return o.username == user.username; }) || room.filledSlots >= room.totalSlots) {
	    return;
	}

	var freeIndex = room.players.indexOf(null);
	if(freeIndex == -1) {
	    freeIndex = room.players.length; 
	}

	room.players[freeIndex] = { username: user.username };
	room.filledSlots++;

	sockets.in("room"+room.id).emit("joined room", { username: user.username, players: room.players });
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
	sockets.in("room"+data.id).emit("left room", { username: user.username, players: room.players, roomId: data.id });
    });

    socket.on("ready", function(data) {
	var room = rooms[+data.id];
	if(!room) { return; }
	var user = socket.handshake.user;
	if(!user) { return; }
	var player = room.players.filter(function(o) { return o.username == user.username; })[0];
	if(!player) { return; }

	player.ready = !!data.ready;

	sockets.in("room"+data.id).emit("player update", { players: room.players, roomId: data.id });

//	sockets.in("room"+data.id).emit("ready change", { players: room.players, username: user.username, roomId: data.id, ready: !!data.ready });
    });

    socket.on("launch room", function(roomId) {
	var room = rooms[+roomId];
	if(!room) { return; }

	console.log("maybe launching " + roomId);

	if(room.players.filter(function(o) { return o != null; }).length < 2) { return; }
	if(room.players.every(function(p) { return p.ready; })) {
	    console.log("yes launching " + roomId);
	    require("./createGame").createNewGame(collections, room.players, room.map, function(gameId) {
		sockets.in("room"+roomId).emit("launched room", gameId);
		// sockets.in("room"+data.id).leave("room"+data.id);
	    });
	};
    });

    socket.on("set race", function(data) {
	var room = rooms[+data.id];
	if(!room) { return; }
	var user = socket.handshake.user;
	if(!user) { return; }
	var player = room.players.filter(function(o) { return o.username == user.username; })[0];
	if(!player) { return; }

	player.race = data.race;

	sockets.in("room"+data.id).emit("player update", { players: room.players, roomId: data.id });
    });

    socket.on("set alliance", function(data) {
	var room = rooms[+data.id];
	if(!room) { return; }
	var user = socket.handshake.user;
	if(!user) { return; }
	var player = room.players.filter(function(o) { return o.username == user.username; })[0];
	if(!player) { return; }

	player.race = data.race;

	sockets.in("room"+data.id).emit("player update", { players: room.players, roomId: data.id });
    });
}