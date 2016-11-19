/*
    Using the Passport.js library for your user authentication with
    social medias, in this case, facebook, via OAuth authentication.

    More info:
    http://passportjs.org/docs/authenticate
    http://passportjs.org/docs/facebook
*/


const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/users.js');
const config = require('../config.js')(process.env.NODE_ENV);

/*
    Once a particular user is authenticated, a session will be established
    The User instance will be serialized and deserialized for subsequent request

    More info: http://passportjs.org/docs/#sessions
*/
passport.serializeUser((user, done) => {
    console.log(`serializing user: ${user}`);
    done(null, user._id);
});
passport.deserializeUser((id, done) => {
    User.getUserById(id)
        .then((user) => {
            console.log(`de-serializing user: ${user}`);
            return done(null, user);
        })
        .catch(err => done(err, null));
});

function init() {
    // Grab facebook obj from your config.js file
    const authFB = config.auth.facebook;

    /*
        Configure Facebook strategy
        See: http://passportjs.org/docs/facebook
    */
    passport.use(new FacebookStrategy({
        clientID: authFB.appId,
        clientSecret: authFB.appSecret,
        callbackURL: authFB.callbackURL,
    }, (accessToken, refreshToken, profile, done) => {
        /*
            Store authId as 'facebook:[id]' format to differentiate from
            'twitter:[id]' or 'google:[id]' if they were ever used
        */
        const authId = `facebook:${profile.id}`;
        // Create a new User record if doesn't exist in the DB yet
        User.getOneUser({ authId })
            .then((user) => {
                if (user) return done(null, user);
                const newUser = User.createUserModel({
                    authId,
                    name: profile.displayName,
                    created: Date.now(),
                    role: 'customer',
                });
                User.saveNewUser.call(newUser)
                    .then(() => done(null, newUser))
                    .catch(err => done(err, null));
            })
            .catch(err => done(err, null));
    }));
}

/*
    Helper function to check if a user has been authenticated
    If not, redirects him to sign up page.
*/
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    // Return error content: res.jsonp(...) or redirect: res.redirect('/login')
    res.render('loginSignUp', { authRedirectUrl: req.originalUrl });
}

/*
    SIDE NOTE: Any objects passed to moduel.exports or exports are CACHED by node!

    See: https://nodejs.org/api/modules.html#modules_caching
*/
module.exports = { init, ensureAuthenticated };
