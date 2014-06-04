exports.socketOwnerCanAct = function(socket, game, allowAdvancement) {
    var user = socket.handshake.user;
    if(!user) { return false; }
    var player = game.players.filter(function(p) { return p.username == user.username })[0];    
    if(!player) { return false; }

    // if the player must resolve a branching level-up
    // and this is not an attempt to resolve that
    if(player.advancingUnit && !allowAdvancement) { return false; }

    return player.team == game.activeTeam;
}

exports.initAuth = function(app, mongo, collections) {

    var passport = require("passport");
    var passwordHash = require("password-hash");
    var LocalStrategy = require("passport-local").Strategy;

    passport.use(new LocalStrategy(function(username, password, done){
	collections.users.findOne({ username : username},function(err,user){
            if(err) { return done(err); }
            if(!user){
		return done(null, false, { message: 'Incorrect username.' });
            }
            
	    if (passwordHash.verify(password, user.hash)) return done(null, user);
	    done(null, false, { message: 'Incorrect password.' });
        
	});
    }));

    app.post('/login',
	     passport.authenticate('local', { failureRedirect: '/login.html' }),
	     function(req, res) {
		 res.redirect('/');
	     });


    app.post('/signup', function(req, res) {
	var username = req.body.username;
	var password = req.body.password;
	var passConfirm = req.body.passconfirm

	collections.users.findOne({ username: username }, function (err, user) {
	    if (!user) {

		if(password == passConfirm) {
		    var hashedPassword = passwordHash.generate(password);

		    collections.users.save({ username: username, hash: hashedPassword }, { safe: true }, function(err) {
			passport.authenticate('local')(req, res, function () {
			    res.redirect('/');
			});
		    });
		} else {
		    res.redirect("/signup.html");
		}
	    } else {
		res.redirect("/signup.html");
	    }
	});
    });

    passport.serializeUser(function(user, done) {
	done(null, user.username);
    });

    passport.deserializeUser(function(username, done) {
	collections.users.findOne({username: username}, function (err, user) {
	    done(err, user);
	});
    });
}