// run this script inside mongodb:
//  mongo < init.mongo.js
// (or just paste it in?)
use webnoth;
db.dropDatabase();

// password for each account is "world"
db.users.save({ "username" : "hello", "hash" : "sha1$b622db74$1$24bfe8583b3256bcd69664badb022f6542d81b1c" });
db.users.save({ "username" : "goodbye", "hash" : "sha1$f2717d97$1$b753e89521086d6e026af2c1bc6f3ad3dc932bb9" });

