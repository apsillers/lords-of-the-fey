module.exports = {
    "mongoString":"mongodb://mongoUser:mongoPasswrd@mongodb.example.com:27017/databaseName",

    "port": "8080",
    "listeningIP":"0.0.0.0",

    "sessionSecret":"!! <replace this with a random secret> !!",

    "origin":"http://example.com:8080",

    "facebook": {
        "enabled": false,
        "app_id":"<use tokens from https://developers.facebook.com>",
	"app_secret":"<use tokens from https://developers.facebook.com>"
    },
    "twitter": {
        "enabled": false,
        "consumer_key":"<use tokens from https://apps.twitter.com>",
	"consumer_secret":"<use tokens from https://apps.twitter.com>"
    },
    "google": {
        "enabled": false,
        "clientID": "<use tokens from https://console.developers.google.com>",
        "clientSecret": "<use tokens from https://console.developers.google.com>"
    },

    "sourceLink":"https://github.com/apsillers/lords-of-the-fey"
}
