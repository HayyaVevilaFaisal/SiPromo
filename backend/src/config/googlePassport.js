const { randomBytes } = require('node:crypto');
const { Passport } = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { findGoogleUser } = require('../services/authService');
const { sessionOptions } = require('../utils/authCookies');

const passport = new Passport();
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } = process.env;
const googleConfigured = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_CALLBACK_URL);

const stateCookie = 'sipromo_google_state';
const stateOptions = () => ({ ...sessionOptions(), path: '/api/auth/google' });

// Passport menyimpan state sebelum redirect dan memeriksanya sebelum menukar code.
const stateStore = {
  store(req, done) {
    const state = randomBytes(32).toString('hex');
    req.res.cookie(stateCookie, state, { ...stateOptions(), signed: true, maxAge: 10 * 60 * 1000 });
    done(null, state);
  },
  verify(req, state, done) {
    done(null, typeof state === 'string' && req.signedCookies[stateCookie] === state);
  },
};

function clearGoogleState(res) {
  res.clearCookie(stateCookie, stateOptions());
}

if (googleConfigured) {
  passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: GOOGLE_CALLBACK_URL,
    scope: ['openid', 'email', 'profile'],
    store: stateStore,
  }, async (_accessToken, _refreshToken, profile, done) => {
    try {
      const user = await findGoogleUser(profile._json);
      done(null, user || false);
    } catch (err) {
      done(err);
    }
  }));
}

module.exports = { passport, googleConfigured, clearGoogleState };
