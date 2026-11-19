//verifikasi jwt; memastikan pengguna yang mengakses endpoint adalah pengguna yang sah
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { SESSION_COOKIE } = require('../utils/authCookies');

async function authMiddleware(req, res, next) {
  //mengambil token
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return res.status(401).json({ message: 'Sesi tidak ditemukan' });

  //verifikasi token jwt
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (decoded.auth !== 'google' || !Number.isInteger(decoded.id)) throw new Error('Invalid session');
  } catch {
    return res.status(401).json({ message: 'Token tidak valid atau sudah kedaluwarsa' });
  }
  try {
    //memeriksa pengguna di db
    const { rows } = await pool.query(`
      SELECT pengguna_id, email, nama_lengkap, role FROM pengguna
      WHERE pengguna_id = $1 AND is_active = TRUE
        AND role IN ('PIC Promosi', 'Kaprodi')
    `, [decoded.id]);
    if (!rows[0]) return res.status(401).json({ message: 'Akun tidak aktif atau tidak terdaftar' });
    const row = rows[0];
    req.user = { id: row.pengguna_id, email: row.email, nama: row.nama_lengkap, role: row.role };
    next();
  } catch (err) { next(err); }
}
module.exports = authMiddleware;
