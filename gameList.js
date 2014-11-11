module.exports.initListing = function(app, collections) {
    app.get("/gamelist", function(req, res) {
	var user = req.user;
	collections.games.find({ players: { $elemMatch: { username: user.username} } }, function(err, games) {
	    games.toArray(function(err, gameArray) {
		res.render("gamelist.hbs", { games: gameArray, username: user.username });
	    });
	});
    });
}
