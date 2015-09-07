/**
    Copyright 2014, 2015 Andrew P. Sillers

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
var config = require("./config");
var express = require('express')
  , app = express()
  , server = app.listen(config.port, config.listeningIP);
var MongoClient = require('mongodb').MongoClient
  , Server = require('mongodb').Server
, ObjectID = function(input) { if(input.length!=12 && input.length!=24) { return; } return require('mongodb').ObjectID.apply(this, arguments); }
var fs = require('fs');
var io = require('socket.io')(server);
var passport = require("passport");
var socketOwnerCanAct = require("./auth").socketOwnerCanAct;
var initLobbyListeners = require("./lobby").initLobbyListeners;
var Unit = require("./static/shared/unit.js").Unit;
var unitLib = require("./static/shared/unit.js").unitLib;
var socketList = [];

new MongoClient.connect(config.mongoString, function(err, mongo) {
    var collections = {};

    mongo.collection("games", function(err, gamesCollection) {
        mongo.collection("units", function(err, unitsCollection) {
	    mongo.collection("users", function(err, usersCollection) {
		collections.games = gamesCollection;
		collections.units = unitsCollection;
		collections.users = usersCollection;
            });
	});
    });

    require("./auth").initAuth(app, mongo, collections);
    require("./gameList").initListing(app, collections);

    app.get("/", function(req, res) {
	var user = req.user || {};
	res.render("index", { username: user.username });
    });

    unitLib.init(function() {
	io.sockets.on('connection', function (socket) {
            initListeners(socket, collections);
	});
    });

});

app.set('view engine', 'hbs');
express.static.mime.define({'text/html': ['hbs'], 'text/cache-manifest': ['appcache']});
app.set('views', __dirname + '/views');
require("hbs").registerPartials(__dirname + '/views/partials');
app.use(express.static(__dirname + '/static'));
app.use(require("cookie-parser")());
app.use(require("body-parser")({ extended: true }));

var MongoStore = require('connect-mongo')(require("express-session"));
var mongoStore = new MongoStore({ url: config.mongoString });
app.use(require("express-session")({
    store: mongoStore,
    secret: config.sessionSecret,
    saveUninitialized: true,
    resave: true
}));

app.use(passport.initialize());
app.use(passport.session());

mongoStore.on('connect', function() {
    console.log('Store is ready to use')
});

mongoStore.on('error', function(err) {
    console.log('Do not ignore me', err)
});

var passportSocketIo = require("passport.socketio");

function onAuthorizeSuccess(data, accept){
    console.log('successful connection to socket.io');

  // The accept-callback still allows us to decide whether to
  // accept the connection or not.
    accept();
}

function onAuthorizeFail(data, message, error, accept){
    if(error)
	throw new Error(message);
    console.log('failed connection to socket.io:', message);

  // We use this callback to log all of our failed connections.
  //accept(new Error("Unknown error in Passport authentication"));
  accept();
}

io.use(passportSocketIo.authorize({
    cookieParser: require("cookie-parser"),
    secret:      config.sessionSecret, // the session_secret to parse the cookie
    store:       mongoStore,           // we NEED to use a sessionstore. no memorystore please
    success:     onAuthorizeSuccess,   // *optional* callback on success - read more below
    fail:        onAuthorizeFail      // *optional* callback on fail/error - read more below
}));
//io.set('log level', 0);
//setInterval(function() { console.log(socketList.map(function(o) { return o.username; })); }, 1000);

// initialize all socket.io listeners on a socket
function initListeners(socket, collections) {
    initLobbyListeners(io.sockets, socket, collections);

    socket.on("anon auth", function(data) {
	collections.games.findOne({ _id:ObjectID(data.gameId) }, function(err, game) {
	    if(!game) { socket.emit("no game"); return; }
	    if(data.anonToken) { var player = game.players.filter(function(p) { return p.anonToken == data.anonToken })[0]; }
	    if(player) {
		socket.request.user = { username: player.username };
	    }
	    socket.emit("anon auth done");
        });
    });

    // request for all game data
    socket.on("alldata", function(data) {
	console.log("serving data to", socket.request.user.username);
        var gameId = ObjectID(data.gameId);
	var user = socket.request.user;

        collections.units.find({ gameId:gameId }, function(err, cursor) {
            collections.games.findOne({ _id:gameId }, function(err, game) {
		if(!game) { socket.emit("no game"); return; }
		var player = game.players.filter(function(p) { return p.username == user.username })[0];
		var players = game.players.map(function(p) {
		    var ret = { username: p.username, team: p.team, alliance: p.alliance };
		    if(player && player.team == 1) { ret.anonToken = p.anonToken; }
		    return ret;
		});
                cursor.toArray(function(err, units) {
		    units = units.filter(function(u) { return !u.conditions || u.conditions.indexOf("hidden")==-1 || u.team==(player||{}).team; });
                    socket.emit("initdata", {map: game.map, units: units, player: player, players: players, activeTeam: game.activeTeam, villages:game.villages, timeOfDay: game.timeOfDay, alliances: game.alliances });
                });
            });
        });
    });

    // subscribe to a game channel
    socket.on("join game", function(gameId) {
	var gameId = ObjectID(gameId);
        socket.join("game"+gameId);
	if(socket.request.user) {
	    socketList.push({ gameId: gameId, username: socket.request.user.username, socket: socket });
	} else {
            socketList.push({ gameId: gameId, socket: socket });
        }
    });

    socket.on("disconnect", function() {
	var socketData = socketList.filter(function(o) {
	    return o.socket == socket;
	})[0];
	if(socketList.indexOf(socketData) != -1) {
	    socketList.splice(socketList.indexOf(socketData), 1);
	}
    });

    // move a unit
    socket.on("move", function(data) {
        require("./executePath")(collections, data, socket, socketList);
    });


    // create a new unit
    socket.on("create", function(data) {
        require("./createUnit")(collections, data, socket, socketList);
    });

    socket.on("levelup", function(data) {
        require("./levelUp").levelUp(collections, data, socket, socketList);
    });
	    

    socket.on("endTurn", function(data) {
        require("./endTurn")(collections, data, socket, socketList, io);
    });
};
