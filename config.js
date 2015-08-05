module.exports = {
    "mongoString":"mongodb://mongoUser:mongoPasswrd@mongodb.example.com:27017/databaseName",
    "port": "8080",

    "sessionSecret":"!! <replace this with a random secret> !!",

    "origin":"http://example.com:8080",

    "facebook": {
        "enabled": false,
        "app_id":"<use tokens from https://developers.facebook.com>",
	"app_secret":"<use tokens from https://developers.facebook.com>"
    },

    "sourceLink":"https://github.com/apsillers/lords-of-the-fey"
}
