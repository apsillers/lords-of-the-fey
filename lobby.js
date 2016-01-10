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

module.exports.initLobbyListeners = function(sockets, socket, collections, app) {
    var emptySlot = { empty: true };

    socket.on("join lobby", function() {
        var user = socket.request.user;
        if(!user) { return; }

        players.push(user.username);

        sockets.in("lobby").emit("joined lobby", user.username);
        socket.emit("lobby data", { players: players, rooms: rooms, you: user.username });
        socket.join("lobby");

        socket.on("disconnect", function() {
            var user = socket.request.user;
            if(!user) { return; }
            var index = players.indexOf(user.username);
            if(index != -1) { players.splice(index, 1); }
            sockets.in("lobby").emit("left lobby", user.username);
        });
    });

    socket.on("create room", function(data) {
        var user = socket.request.user;
        if(!user) { return; }

        var loadMap = require("./loadUtils").loadMap;

        var user = socket.request.user;
        
        loadMap(data.map, function(err, mapData) {
            var startPositions = require("./createGame").getStartPositions(mapData);
            var id = roomIndex++;
            rooms[id] = {
                id: id,
                name: data.name,
                map: data.map,
                totalSlots: startPositions.length - 1,
                filledSlots: 0,
                players: [],
                owner:user.username
            };
            for(var i=0; i < rooms[id].totalSlots; i++) { rooms[id].players[i] = emptySlot; }
            sockets.in("lobby").emit("created room", rooms[id]);
            joinRoom(user, rooms[id]);
        });
    });

    socket.on("join room", function(data) {
        var room = rooms[+data.id];
        var user = socket.request.user;
        joinRoom(user, room);
    });

    socket.on("add anon to room", function(data) {
        var room = rooms[+data.id];
        var user = socket.request.user;
        if(!room || room.owner != user.username) { return; }

        var token = (""+Math.random()).substr(2);
        joinRoom({
            username: "anon"+token.substr(0,6),
            ready: true,
            anonToken: token
        }, room);
    });

    socket.on("enter room", function(id) {
        var user = socket.request.user;
        socket.join("room"+id);
        socket.emit("room data", { you: user.username, room: rooms[+id] });

        socket.on("disconnect", function() {
            var user = socket.request.user;
            if(!user) { return; }

            leaveRoom(+id, user.username);

            for(var roomId in rooms) {
                if(rooms[roomId].owner == user.username) {
                    sockets.in("lobby").emit("room destroyed", roomId);
                    sockets.in("room"+roomId).emit("kicked", roomId);

                    for(var i=0; i<rooms[roomId].players.length; i++) {        
                        leaveRoom(roomId, rooms[roomId].players[i].username);
                    }

                    delete rooms[roomId];
                }
            }
        });
    });

    function joinRoom(user, room) {
        if(!room || !user || room.players.some(function(o) { return o.username == user.username; }) || room.filledSlots >= room.totalSlots) {
            return;
        }

        // keep setting freeIndex until we find an empty slot, then stop
        var freeIndex;
        room.players.some(function(p,idx) { freeIndex = idx; return p.empty; });

        room.players[freeIndex] = { username: user.username, ready: user.ready };
        if(user.anonToken) { room.players[freeIndex].anonToken = user.anonToken; }
        else { Object.defineProperty(room.players[freeIndex], "socket", { value: socket }); }
        room.filledSlots++;

        sockets.in("room"+room.id).emit("joined room", { username: user.username, players: room.players });
        socket.join("room"+room.id);

        sockets.in("lobby").emit("joined room", { username: user.username, room: room });
    }

    function leaveRoom(id, username) {
        var room = rooms[+id];
        if(!room) { return; }
        if(!username) { return; }
        var player = room.players.filter(function(o) { return o.username == username; })[0];
        if(!player) { return; }

console.log(username, "leaving room!");

        room.filledSlots--;

        room.players.splice(room.players.indexOf(player), 1, emptySlot);

        if(!player.anonToken) { player.socket.leave("room"+id); }

        sockets.in("lobby").emit("left room", { username: username, roomId: room.id });
        sockets.in("room"+id).emit("left room", { username: username, players: room.players, roomId: id });
    };

    socket.on("ready", function(data) {
        var room = rooms[+data.id];
        if(!room) { return; }
        var user = socket.request.user;
        if(!user) { return; }
        var player = room.players.filter(function(o) { return o.username == user.username; })[0];
        if(!player) { return; }

        player.ready = !!data.ready;

        sockets.in("room"+data.id).emit("player update", { players: room.players, roomId: data.id });

//        sockets.in("room"+data.id).emit("ready change", { players: room.players, username: user.username, roomId: data.id, ready: !!data.ready });
    });

    socket.on("launch room", function(roomId) {
        var room = rooms[+roomId];
        if(!room) { return; }

        var filledSlots = room.players.filter(function(o) { return !o.empty; });
        if(filledSlots.length < 2) { return; }
        if(filledSlots.every(function(p) { return p.ready; })) {
            require("./createGame").createNewGame(collections, room.players, room.map, function(gameId) {
                sockets.in("room"+roomId).emit("launched room", gameId);
                // sockets.in("room"+data.id).leave("room"+data.id);
                sockets.in("lobby").emit("room destroyed", room.id);
                delete room;
            });
        };
    });

    socket.on("kick", function(data) {
        var room = rooms[+data.id];
        if(!room) { return; }
        var user = socket.request.user;
        if(!user) { return; }
        var player = room.players[data.slot];
        if(!player) { return; }

        if(player && user.username == room.owner) {

            if(!player.anonToken) { player.socket.emit("kicked", +data.id); }
            leaveRoom(+data.id, player.username);
        }
    });

    socket.on("set faction", function(data) {
        var room = rooms[+data.id];
        if(!room) { return; }
        var user = socket.request.user;
        if(!user) { return; }

        if(["Elves", "Orcs"].indexOf(data.faction) == -1) { return; }

        if(room.players[data.slot] && (room.players[data.slot].username == user.username || user.username == room.owner)) {
            room.players[data.slot].faction = data.faction;

            sockets.in("room"+data.id).emit("player update", { players: room.players, roomId: data.id });
        }
    });

    socket.on("set alliance", function(data) {
        var room = rooms[+data.id];
        if(!room) { return; }
        var user = socket.request.user;
        if(!user) { return; }

        if(parseInt(data.alliance) != data.alliance || data.alliance < 0 || data.alliance > room.totalSlots) { return; }

        if(room.players[data.slot] && (room.players[data.slot].username == user.username || user.username == room.owner)) {
            room.players[data.slot].alliance = data.alliance;

            sockets.in("room"+data.id).emit("player update", { players: room.players, roomId: data.id });
        }
    });

    socket.on("chat", function(data) {
        var room = rooms[+data.id];
        var user = socket.request.user;
        if(!user) { return; }

        var target;
        if(room && room.players.some(function(p){ return p.username == user.username; })) {
            target = sockets.in("room"+room.id);
        } else if(!room && data.id=="lobby" && players.indexOf(user.username)!=-1) {
            target = sockets.in("lobby");
        }
        if(target) { target.emit("chatmsg", { from: user.username, msg: data.msg }); }
    });
}
