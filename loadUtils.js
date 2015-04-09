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
	try {
            var dataObj = JSON.parse(data);
        } catch(e) {
            console.log("!! ERROR in unit type " + type + ": " + e);
        }
        callback(err, dataObj);
    });
};

exports.loadFaction = function(factionName, callback) {
    fs.readFile('static/data/factions/'+factionName+".json", { encoding: "utf8"}, function(err, data) {
        callback(err, JSON.parse(data));
    });
};
