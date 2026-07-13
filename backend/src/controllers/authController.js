const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// FR-01, NFR-11, UC (login) - Login PIC Promosi & Kaprodi
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email dan password wajib diisi' });
    }

    const { rows } = await pool.query(
      'SELECT * FROM pengguna WHERE email = $1 AND status_aktif = true',
      [email]
    );
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ message: 'Email atau password salah' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: 'Email atau password salah' });
    }

    const token = jwt.sign(
      { id: user.pengguna_id, email: user.email, nama: user.nama_lengkap },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );

    res.json({
      token,
      user: { id: user.pengguna_id, nama: user.nama_lengkap, email: user.email },
    });
  } catch (err) {
    next(err);
  }
}

async function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { login, me };
