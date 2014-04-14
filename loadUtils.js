var fs = require("fs");
var Terrain = require("./static/shared/terrain").Terrain;
var toMapDict = require("./static/shared/terrain").toMapDict;

exports.loadMap = function(filename, callback) {
    fs.readFile('static/data/maps/'+filename, { encoding: "utf8"}, function(err, data) {
        callback(err, toMapDict(data));
    });
};

exports.loadUnitType = function(type, callback) {
    fs.readFile('static/data/units/'+type+".json", { encoding: "utf8"}, function(err, data) {
        callback(err, JSON.parse(data));
    });
};

exports.loadRace = function(race, callback) {
    fs.readFile('static/data/races/'+race+".json", { encoding: "utf8"}, function(err, data) {
        callback(err, JSON.parse(data));
    });
};
