// Menangani autentikasi pengguna dan pembuatan sesi JWT.
const pool = require('../config/db');
const jwt = require('jsonwebtoken');

function createSessionToken(user) {
  return jwt.sign({ id: user.id, auth: 'google' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    algorithm: 'HS256',
  });
}

async function findGoogleUser({ email, email_verified: verified, hd, name } = {}) {
  if (typeof email !== 'string' || verified !== true) return null;
  const normalizedEmail = email.trim().toLowerCase();
  // Google berwenang memverifikasi kepemilikan email Gmail dan Google Workspace.
  if (!normalizedEmail.endsWith('@gmail.com') && !hd) return null;

  const { rows: [row] } = await pool.query(`
    SELECT pengguna_id, email, nama_lengkap, role FROM pengguna
    WHERE LOWER(email) = $1 AND is_active = TRUE
      AND role IN ('PIC Promosi', 'Kaprodi')
  `, [normalizedEmail]);
  if (!row) return null;

  const profileName = typeof name === 'string' ? name.trim() : '';
  if (row.nama_lengkap === row.email && profileName) {
    const { rows: [updated] } = await pool.query(`
      UPDATE pengguna
      SET nama_lengkap = LEFT($2, 150)
      WHERE pengguna_id = $1 AND nama_lengkap = email AND is_active = TRUE
      RETURNING pengguna_id, email, nama_lengkap, role
    `, [row.pengguna_id, profileName]);
    if (updated) return toUser(updated);
  }
  return toUser(row);
}

function toUser(row) {
  return { id: row.pengguna_id, email: row.email, nama: row.nama_lengkap, role: row.role };
}

function createSession(user) {
  const token = createSessionToken(user);
  const { exp } = jwt.decode(token);
  return { user, token, expiresAt: exp * 1000 };
}

module.exports = { createSession, findGoogleUser };
