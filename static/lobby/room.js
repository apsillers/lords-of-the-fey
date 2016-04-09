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
var socket = io();

var roomId = location.search.match(/id=([^&]*)/)[1];
var players;
var yourUsername;
var room;

socket.emit("enter room", roomId);

socket.on("room data", function(data) {
    if(data.room == undefined) {
        window.removeEventListener("beforeunload", confirmLeave);
        window.location.href = "/lobby"
    }

    players = data.room.players;
    room = data.room;
    yourUsername = data.you;

    if(data.you == data.room.owner) { $("#add-anon-button").prop("disabled", false); }
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
    $("#room-player-list tr:not(:nth-child(1))").remove();

    if(players.filter(function(p){ return !p.empty; }).length > 1 &&
       players.every(function(p) { return p.empty || p.ready; })) {
        $("#start-game-button").prop("disabled", false);
    } else {
        $("#start-game-button").prop("disabled", true);
    }

    if(!players.some(function(p) { return p.username == yourUsername; })) {
        window.removeEventListener("beforeunload", confirmLeave);
        window.location = "/lobby";
    }

    $.each(players, function(i, data) {
        data.alliance = data.alliance || i+1;

        var playerItem = $("<tr>");
        if(data.empty) {
            playerItem.append($("<td>", {colspan: 4}).text("-- empty --").css({ "text-align":"center" }).addClass("empty"));
        } else if(data.username == yourUsername || yourUsername == room.owner) {
            var readyBox;
            if(data.username == yourUsername) {
                readyBox = $("<input type='checkbox'>");
                readyBox.click(function() {
                    socket.emit("ready", { ready: $(this).is(':checked'), id: roomId });
                });
                readyBox.prop("checked", data.ready);
            } else {
                readyBox = data.ready?"✓":"_";
            }
            playerItem.append($("<td>").append(readyBox));

            var playerText = $("<span>");
            playerText.text((i+1) + ": " + data.username);
            playerItem.append($("<td>").append(playerText));

            var factionSelector = $("<select>");
            factionSelector.append('<option value="Random">Random</option>')
            factionSelector.append('<option value="Elves">Elves</option>')
            factionSelector.append('<option value="Orcs">Orcs</option>')
            factionSelector.val(data.faction || "Random");
            factionSelector.change(function(slotNum) {
                socket.emit("set faction", { id: roomId, faction: factionSelector.val(), slot: slotNum });
            }.bind(null, i));
            playerItem.append($("<td>").append(factionSelector));

            var allianceSelector = $("<select>");
            for(var j=0; j<room.totalSlots; ++j) {
                allianceSelector.append('<option value="'+(j+1)+'">'+(j+1)+'</option>');
            }
            allianceSelector.val(data.alliance || (i+1));
            allianceSelector.change(function(slotNum) {
                socket.emit("set alliance", { id: roomId, alliance: allianceSelector.val(), slot: slotNum });
            }.bind(null, i));
            playerItem.append($("<td>").append(allianceSelector));

            if(yourUsername == room.owner && data.username != yourUsername) {
                var kickLink = $("<a>", {text:"x", title:"Kick"}).click(function(slotNum) {
                    socket.emit("kick", { id: roomId, slot: slotNum });
                }.bind(null, i)).css({"text-decoration":"underline", "cursor":"pointer" });
                playerItem.append($("<td>").append(kickLink));
            }
        } else {
            playerItem.append($("<td>").text(data.ready?"✓ ":"_ "));
            playerItem.append($("<td>").text((i+1) + ": " + data.username));
            playerItem.append($("<td>").text(data.faction||"Random"));
            playerItem.append($("<td>").text(data.alliance));
        }
        $playerList.append(playerItem);
    });
}

socket.on("kicked", function(roomId) {
    window.removeEventListener("beforeunload", confirmLeave);
    window.location = "/lobby";
});

socket.on("launched room", function(gameId) {
    window.removeEventListener("beforeunload", confirmLeave);
    window.location = "/client/#game="+gameId;
});

socket.on("chatmsg", function(data) {
    $("#chat-messages").append(
        $("<div>").append([ $("<span>").text(data.from).css("font-weight","bold"), $("<span>").text(": " + data.msg)])
    );
    $('#chat-messages').scrollTop($('#chat-messages')[0].scrollHeight);
});

$("#start-game-button").click(function() {
    if(players.filter(function(p) { return !p.empty; }).every(function(p) { return p.ready; })) {
        socket.emit("launch room", roomId);
    }
});

$("#add-anon-button").click(function() {
    socket.emit("add anon to room", { id: roomId });
});

$("#chat-input").keyup(function(e) {
    if(e.keyCode == 13) {
        socket.emit("chat", { msg: $("#chat-input").val(), id:roomId });
        $("#chat-input").val("");
    }
});
function confirmLeave(e) {
    var confirmationMessage = 'You are about to leave this room. If you are the owner, the room will be closed.';

    e.returnValue = confirmationMessage;
    return confirmationMessage;
}
//window.addEventListener("beforeunload", confirmLeave);
