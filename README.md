Lords of the Fey
=======

![Lords of the Fey screenshot](https://apsillers.github.io/images/projects/fey.png)

A multiplayer turn-based strategy game that you can play in your browser using HTML5 technologies. The game's rules and artwork are taken from [Battle for Wesnoth](http://www.wesnoth.org).

# Demo

To see a live demo, visit [https://lotf--apsillers.repl.co/](https://lotf--apsillers.repl.co/). Note that some parts of the the code are very experimental, so please feel free to [file a bug report](https://github.com/apsillers/lords-of-the-fey/issues).

# Features

Development is currently focused on implementing Wesnoth-style multiplayer without fog-of-war. The game currently supports many features of Wesnoth gameplay: unit recruiting, villages, single-turn movement, combat with partial animation support, unit level-up advancement, and some Wesnoth units, including some unit attibutes (e.g., quick, strong) and some unit abilities (e.g., slow, poison).

Due to its centralized architecture, Lords of the Fey multiplayer differs from multiplayer in Battle for Wesnoth by having persistent games on the server: players can quit and resume games freely without needing to save the game state and reload. Instead, players have a persistent list of their ongoing games. A player can select any ongoing game to view the game and make moves (on that player's turn), even when other players are offline.

If you're interested in contributing, have a look at the [issue tracker](https://github.com/apsillers/lords-of-the-fey/issues). The game is currently playable, so most development work is directed toward:

 * implementing new game content (adding more terrain and unit types)
 * adding ability-specific logic (e.g., making the "*drains*" ability actually drain life on attack, etc.)
 * cosmetic improvements (unit animations and map rendering)
 * adding features outside of actual gameplay (lobby improvements, OAuth-based login, inviting friends to join new games, etc.)

For information about how to get started, check out [the project wiki](https://github.com/apsillers/lords-of-the-fey/wiki).

# Running the Code

The server requires:

 * [MongoDB](https://www.mongodb.org/)
 * [Node.js](http://nodejs.org/) (and npm, but that is bundled with Node > 0.6.3)

The browser client only requires a modern browser that supports the [canvas API](http://caniuse.com/canvas). Both touch and mouse input are supported (but mouse input is given development priority).

To set up a test environment, clone the repository and do:

    npm install
    mongosh < init.mongo.js

Also edit the `/config.js` file. At minimum, you will need to edit the `mongoString` field to a valid [MongoDB connection string](http://docs.mongodb.org/manual/reference/connection-string/). You can also edit the other fields, e.g., to enable Facebook auth or change the port.

To run the server, do:

    node server.js

This will run a local server on port 8080 (or another port, if you have changed the port in `config.js`). If you navigate to `http://127.0.0.1:8080/` in your browser, you can log in as either `hello` or `goodbye`, both with the password "`world`".

To run a game, log in, and then click the link to create a new game. To play against an opponent, have the opponent log in as the other player and then visit the URL of the newly-created game. If testing both players on one computer, ensure you use some way to have both sets of credentials simultaneously (different browsers, Chrome incognito, etc.)

To learn more, check out [the project wiki](https://github.com/apsillers/lords-of-the-fey/wiki).

# Licenses

The project as whole is licensed under the GNU Affero General Public License (AGPL) version 3, or (at your option) any later version. In addition to normal GNU GPL requirements, this means that, if you modify the software and host it on a network, you must offer your version's source code to anyone who interacts with the program over a network.

All art assets (in `/static/data/img/`) are taken directly from Battle for Wesnoth and are licensed under the GNU General Public License (GPL), version 3 or (at your option) any later version. A full list of Wesnoth art credits (some of which may not apply to the particular artwork used in this project) is here: http://wiki.wesnoth.org/Credits#Artwork_and_Graphics

The project uses some libraries released under the MIT (X11) license:

  * jQuery
  * EaselJS
  * PreloadJS

Those libraries are included in /static/client/ and include their own licensing and copyright headers within each file.

Utilities included in the /tools directory are licensed under the MIT (X11) license.
