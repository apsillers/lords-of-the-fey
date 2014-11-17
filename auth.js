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
var config = require("./config.json"),
    FacebookStrategy = require('passport-facebook').Strategy;

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

    app.get('/login.html', function(req, res) {
	res.render("login.hbs", { config: config });
    });

    app.post('/login',
	     passport.authenticate('local', { failureRedirect: '/login.html' }),
	     function(req, res) {
		 res.redirect('/');
	     });

    app.get('/logout', function(req, res){
	req.logout();
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

    /* Facebook auth */
    if(config.facebook && config.facebook.enabled) {
	passport.use(new FacebookStrategy({
	    clientID: config.facebook.app_id,
	    clientSecret: config.facebook.app_secret,
	    callbackURL: config.origin + "/auth/facebook/callback"
	},
	function(accessToken, refreshToken, profile, done) {
	    collections.users.findOne({ fbProfileId : profile.id },function(err,user){
		if (err) { return done(err); }
		
		if(!user) {
		    user = { fbProfileId: profile.id, username: "facebook-"+profile.id };
		    collections.users.save(user, { safe: true }, function(err) {
			done(null, user);
		    });
		} else {
		    done(null, user);
		}
	    });
	}));

	app.get('/login/facebook', passport.authenticate('facebook'));
	app.get('/auth/facebook/callback',
		passport.authenticate('facebook', { successRedirect: '/',
						    failureRedirect: '/login' }));
    }


    passport.serializeUser(function(user, done) {
	done(null, user.username);
    });

    passport.deserializeUser(function(username, done) {
	collections.users.findOne({username: username}, function (err, user) {
	    done(err, user);
	});
    });
}
