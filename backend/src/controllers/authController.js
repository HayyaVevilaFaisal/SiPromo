const { createSession } = require('../services/authService');
const { SESSION_COOKIE, sessionOptions, frontendOrigin } = require('../utils/authCookies');
const { passport, googleConfigured, clearGoogleState } = require('../config/googlePassport');

function setSessionCookie(res, { token, expiresAt }) {
  res.cookie(SESSION_COOKIE, token, { ...sessionOptions(), maxAge: Math.max(0, expiresAt - Date.now()) });
}

function startGoogleLogin(req, res, next) {
  if (!googleConfigured) return res.redirect(`${frontendOrigin()}/login?google=unavailable`);
  return passport.authenticate('google', { session: false })(req, res, next);
}

function googleCallback(req, res, next) {
  const loginUrl = `${frontendOrigin()}/login`;
  if (!googleConfigured) return res.redirect(`${loginUrl}?google=unavailable`);

  clearGoogleState(res);
  const failureUrl = `${loginUrl}?google=failed`;
  if (typeof req.query.code !== 'string' || !req.query.code) return res.redirect(failureUrl);

  return passport.authenticate('google', { session: false }, (err, user) => {
    if (err || !user) return res.redirect(failureUrl);
    setSessionCookie(res, createSession(user));
    return res.redirect(loginUrl);
  })(req, res, next);
}

function me(req, res) { res.json({ user: req.user }); }

function logout(req, res) {
  res.clearCookie(SESSION_COOKIE, sessionOptions());
  res.status(204).end();
}
module.exports = { startGoogleLogin, googleCallback, me, logout };
