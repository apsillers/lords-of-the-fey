// run this script inside mongodb:
//  mongo < init.mongo.js
// (or just paste it in?)
use webnoth;
db.games.save({ "id" : 1, "map" : "test_map.map" });
db.units.save({ "x" : 0, "y" : 0, "type" : "scout", "hp" : 17, "xp" : 0, "gameId" : 1, "team" : 1 });
db.units.save({ "x" : 6, "y" : 2, "type" : "grunt", "hp" : 25, "xp" : 0, "gameId" : 1, "team" : 2 });

