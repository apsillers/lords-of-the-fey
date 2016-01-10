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
module.exports.initListing = function(app, collections) {
    app.get("/gamelist", function(req, res) {
        var user = req.user;
        if(!user) { res.redirect("/"); return; }
        collections.games.find({ players: { $elemMatch: { username: user.username} } }, function(err, games) {
            games.toArray(function(err, gameArray) {
                gameArray.forEach(function(elm) {
                    if(user.username == elm.players[elm.activeTeam-1].username) {
                        elm.isYourTurn = true;
                    }
                });
                gameArray.sort(function(a,b) { return !!b.isYourTurn - !!a.isYourTurn });
                res.render("gamelist.hbs", { games: gameArray, username: user.username });
            });
        });
    });
}
