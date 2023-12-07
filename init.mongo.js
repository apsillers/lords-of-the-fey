//    Copyright 2014 Andrew P. Sillers
//
//    This file is part of Lords of the Fey.
//
//    Lords of the Fey is free software: you can redistribute it and/or modify
//    it under the terms of the GNU Affero General Public License as published by
//    the Free Software Foundation, either version 3 of the License, or
//    (at your option) any later version.
//
//    Lords of the Fey is distributed in the hope that it will be useful,
//    but WITHOUT ANY WARRANTY; without even the implied warranty of
//    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//    GNU Affero General Public License for more details.
//
//    You should have received a copy of the GNU Affero General Public License
//    along with Lords of the Fey.  If not, see <http://www.gnu.org/licenses/>.

// run this script inside mongodb:
//  mongo < init.mongo.js
// (or just paste it in?)
use databaseName;
db.dropDatabase();

// password for each account is "world"
db.users.insertOne({ "username" : "hello", "hash" : "sha1$b622db74$1$24bfe8583b3256bcd69664badb022f6542d81b1c" });
db.users.insertOne({ "username" : "goodbye", "hash" : "sha1$f2717d97$1$b753e89521086d6e026af2c1bc6f3ad3dc932bb9" });

