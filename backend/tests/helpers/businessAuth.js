// Test controller bisnis mengisolasi lookup pengguna agar antrean mock query bisnis
// tidak dikonsumsi middleware. Autentikasi database asli diuji di auth.test.js/pic.test.js.
const jwt = require('jsonwebtoken');
module.exports = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ message: 'Token tidak ditemukan' });
  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    if (req.user.auth !== 'password') throw new Error('invalid');
    next();
  } catch {
    res.status(401).json({ message: 'Token tidak valid atau sudah kedaluwarsa' });
  }
};
