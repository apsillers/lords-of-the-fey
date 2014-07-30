Lords of the Fey
=======

A multiplayer fantasy-themed turn-based strategy game that you can play in your browser using HTML5 technologies. The game's rules and artwork are taken from [Battle for Wesnoth](http://www.wesnoth.org).

The server requires:

 * [MongoDB](https://www.mongodb.org/)
 * [Node.js](http://nodejs.org/) (and npm, but that is bundled with Node > 0.6.3)

The browser client only requires a modern browser that supports the [canvas API](http://caniuse.com/canvas). Both touch and mouse input are supported (but mouse input is given development priority).

To set up a test environment, clone the repository and do:

    npm install
    mongo < init.mongo.js

To run the server, do:

    node server.js

This will run a local server on port 8080. If you navigate to `http://127.0.0.1:8080/` in your browser, you can log in as either `hello` or `goodbye`, both with the password "`world`".

To run a game, log in, and then click the link to create a new game. To play against an opponent, have the opponent log in as the other player and then visit the URL of the newly-created game. If testing both players on one computer, ensure you use some way to have both sets of credentials simultaneously (different browsers, Chrome incognito, etc.)

To learn more, check out [the project wiki](https://github.com/apsillers/lords-of-the-fey/wiki).