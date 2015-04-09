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
var socket = io.connect('//' + location.host);

var roomId = location.search.match(/id=([^&]*)/)[1];
var players;
var yourUsername;
var room;

socket.emit("enter room", roomId);

socket.on("room data", function(data) {
    if(data.room == undefined) {
        window.location.href = "/lobby"
    }

    players = data.room.players;
    room = data.room;
    yourUsername = data.you;
    renderPlayerList();
});

socket.on("joined room", function(data) {
    players = data.players;
    renderPlayerList();
});

socket.on("left room", function(data) {
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
	data.alliance = data.alliance || i+1;

	var playerItem = $("<div>");	
	if(data.username == yourUsername) {
	    var readyBox = $("<input type='checkbox'>");
	    readyBox.click(function() {
		socket.emit("ready", { ready: $(this).is(':checked'), id: roomId });
	    });
	    readyBox.prop("checked", data.ready);
	    playerItem.append(readyBox);

	    var playerText = $("<span>");
	    playerText.text((i+1) + ": " + data.username + " | ");
	    playerItem.append(playerText);

	    var factionSelector = $("<select>");
	    factionSelector.append('<option value="random">Random</option>')
	    factionSelector.append('<option value="elves">Elves</option>')
	    factionSelector.append('<option value="orcs">Orcs</option>')
	    factionSelector.val(data.faction || "random");
	    factionSelector.change(function() {
		socket.emit("set faction", { id: roomId, faction: factionSelector.val() });
	    });
	    playerItem.append(factionSelector);

	    var allianceSelector = $("<select>");
	    for(var j=0; j<room.totalSlots; ++j) {
		allianceSelector.append('<option value="'+(j+1)+'">'+(j+1)+'</option>');
	    }
	    allianceSelector.val(data.alliance || (i+1));
	    allianceSelector.change(function() {
		socket.emit("set alliance", { id: roomId, alliance: allianceSelector.val() });
	    });
	    playerItem.append(allianceSelector);
	} else {
	    playerItem.text((data.ready?"✓ ":"_ ") + (i+1) + ": " + data.username + " | " + (data.faction||"Random") + " | " + data.alliance);
	}
	$playerList.append(playerItem);
    });
}

socket.on("kicked", function(roomId) {
    window.location = "/lobby";
});

socket.on("launched room", function(gameId) {
    window.location = "/client/grid.html?game="+gameId;
});

$("#start-game-button").click(function() {
    if(players.every(function(p) { return p.ready; })) {
	socket.emit("launch room", roomId);
    }
});
