var express = require('express')
  , app = express()
  , server = app.listen(8080);
var MongoClient = require('mongodb').MongoClient
  , Server = require('mongodb').Server;
var fs = require('fs');
var io = require('socket.io').listen(server);

var mongoClient = new MongoClient(new Server('localhost', 27017));
mongoClient.open(function(err, mongoClient) {
    var mongo = mongoClient.db("webnoth");

    var collections = {};

    mongo.collection("games", function(err, gamesCollection) {
        mongo.collection("units", function(err, unitsCollection) {
            collections.games = gamesCollection;
            collections.units = unitsCollection;
        });
    });

    io.sockets.on('connection', function (socket) {
        initListeners(socket, mongo, collections);
    });

});

app.use(express.directory('static'));
app.use(express.static(__dirname + '/static'));

function initListeners(socket, mongo, collections) {

    socket.on("alldata", function(data, callback) {
        var gameId = data.gameId;
        collections.units.find({ gameId:gameId }, function(err, cursor) {
            collections.games.findOne({ id:gameId }, function(err, game) {
                cursor.toArray(function(err, docs) {
                    callback({map: game.map, units: docs});
                });
            });
        });
    });

    socket.on("join game", function(gameId) {
        socket.join("game"+gameId);
    });

    socket.on("new game", function(data) {
        // data.opponentList
        // 
    });

    socket.on("move", function(data) {
        var gameId = data.gameId;
        var path = data.path;

        collections.games.findOne({id:gameId}, function(err, game) {
            loadMap(game.map, function(err, mapData) {
                var unit = collections.units.findOne({ x:path[0].x, y:path[0].y, gameId:gameId }, function(err, unit) {
                    loadUnit(unit.type, function(err, type) {
                        collections.units.find({ gameId: gameId }, function(err, cursor) {
                            cursor.toArray(function(err, unitArray) { 
                                var moveResult = executePath(path, unit, type, mapData);
                                var endPoint = moveResult.path[moveResult.path.length-1];
                                unit.x = endPoint.x;
                                unit.y = endPoint.y;
                                collections.units.save(unit, {safe:true}, function() {
                                    io.sockets.in("game"+gameId).emit("moved", { path: moveResult.path, revealedUnits: moveResult.revealedUnits });
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    socket.on("create", function(data) {
        var gameId = data.gameId;
        var location = data.location.split(",");

        mongo.units.findOne({ x:path[0].x, y:path[0].y, gameId:gameId });
    });
}

function executePath(path) {
    return { path: path, revealedUnits: [] };
}

function loadMap(filename, callback) {
    fs.readFile('static/data/maps/'+filename, { encoding: "ascii"}, function(err, data) {
        callback(err, toMapDict(data));
    });
}


function loadUnit(type, callback) {
    fs.readFile('static/data/units/'+type+".json", { encoding: "ascii"}, function(err, data) {
        callback(err, JSON.parse(data));
    });
}

function toMapDict(map_data) {
    var misc_lines = 0;
    var row = 0;
    var map_array = map_data.split('\n');
    var map_dict = {};

    // read each line in the map file
    for(var line_num = 0; line_num < map_array.length; line_num++) {
        var line = map_array[line_num];
        line = line.trim();
        line = line.replace(/\s+/g, ' ');

        // use this line only if it describes terrain
        if(line.indexOf('=') == -1 && line != '') {
            var tiles = line.split(",");

            // place each tile described in the line
            for(var tile_num = 0; tile_num < tiles.length; tile_num++) {
                var tile = tiles[tile_num];
                tile = tile.trim();
                var components = tile.split(' ');
                //console.log(components);
                // if the tile describes only its terrain, draw it;
                // otherwise, find the part that describes the terrain
                if(components.length == 1) {
                    map_dict[tile_num+","+row] = { "terrain": Terrain.getTerrainBySymbol(components[0]) };
                } else {
	                map_dict[tile_num+","+row] = { "start": components[0], "terrain": Terrain.getTerrainBySymbol(components[1]) };
                }
            }
            row++;
        } else {
            misc_lines += 1;
        }
    }
    
    return map_dict;
}

var Terrain = {
    types: {
        GRASS: { symbol: "Gg", name: "grass", img: "/data/img/terrain/green.png", toString: function() { return this.name; } },
        SWAMP: { symbol: "Sw", name: "swamp", img: "/data/img/terrain/water.png", toString: function() { return this.name; } },
        DIRT: { symbol: "Re", name: "dirt", img: "/data/img/terrain/dirt.png", toString: function() { return this.name; } },
    },

    getTerrainBySymbol: function(symbol) {
        for(var prop in this.types) {
            if(this.types[prop].symbol == symbol) {
                return this.types[prop];
            }
        }
    }
}
