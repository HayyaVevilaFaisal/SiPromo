//mengatur cookie untuk sesi 
const SESSION_COOKIE = 'sipromo_session';
function sessionOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api' };
}

//mengambil alamat frontend 
function frontendOrigin() {
  return new URL(process.env.FRONTEND_ORIGIN || 'http://localhost:5173').origin;
}
module.exports = { SESSION_COOKIE, sessionOptions, frontendOrigin };
