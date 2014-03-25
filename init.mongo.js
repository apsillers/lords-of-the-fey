// run this script inside mongodb:
//  mongo < init.mongo.js
// (or just paste it in?)
use webnoth;
db.games.save({
    "id" : 1,
    "map" : "test_map.map",
    "players" : [
	{ "team": 1, "gold": 60, "username": "hello" },
	{ "team": 2, "gold": 40, "username": "goodbye" }
    ],
    "activeTeam": 1
});

// password for each account is "world"
db.users.save({ "username" : "hello", "hash" : "sha1$b622db74$1$24bfe8583b3256bcd69664badb022f6542d81b1c" });
db.users.save({ "username" : "goodbye", "hash" : "sha1$f2717d97$1$b753e89521086d6e026af2c1bc6f3ad3dc932bb9" });

db.units.save({ "x" : 0, "y" : 0, "type" : "scout", "hp" : 17, "xp" : 0, "gameId" : 1, "team" : 1, "moveLeft": 6, "isCommander": true });
db.units.save({ "x" : 6, "y" : 2, "type" : "grunt", "hp" : 25, "xp" : 0, "gameId" : 1, "team" : 2, "moveLeft": 4, "isCommander": true });
