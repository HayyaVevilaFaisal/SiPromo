const express = require('express');
const pool = require('../config/db');
const auth = require('../middlewares/authMiddleware');
const { normalizeEmail, isValidEmail } = require('../utils/email');
const router = express.Router();
router.use(auth);
router.use((req, res, next) => {
  if (req.user.role !== 'Kaprodi') return res.status(403).json({ message: 'Hanya Kaprodi yang dapat mengelola PIC' });
  next();
});
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT pengguna_id, email, nama_lengkap, is_active
      FROM pengguna WHERE role = 'PIC Promosi' ORDER BY nama_lengkap, pengguna_id`);
    res.json(rows);
  } catch (err) { next(err); }
});
router.post('/', async (req, res, next) => {
  const email = normalizeEmail(req.body.email);
  const nama = typeof req.body.nama_lengkap === 'string' ? req.body.nama_lengkap.trim() : '';
  if (!isValidEmail(email) || email.length > 255 || !nama || nama.length > 150) {
    return res.status(400).json({ message: 'Isi nama (maksimal 150 karakter) dan email yang valid' });
  }
  if (req.body.is_active !== undefined && typeof req.body.is_active !== 'boolean') return res.status(400).json({ message: 'Status aktif tidak valid' });
  try {
    const { rows } = await pool.query(`INSERT INTO pengguna (email, nama_lengkap, is_active, password, role)
      VALUES ($1, $2, $3, '', 'PIC Promosi') RETURNING pengguna_id, email, nama_lengkap, is_active`, [email, nama, req.body.is_active ?? true]);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Email sudah terdaftar' });
    next(err);
  }
});
router.patch('/:id', async (req, res, next) => {
  if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(Number(req.params.id))
      || typeof req.body.is_active !== 'boolean') {
    return res.status(400).json({ message: 'ID PIC dan status aktif tidak valid' });
  }
  const nama = typeof req.body.nama_lengkap === 'string' ? req.body.nama_lengkap.trim() : null;
  const email = req.body.email === undefined ? null : normalizeEmail(req.body.email);
  if ((nama !== null && (!nama || nama.length > 150)) || (email !== null && !isValidEmail(email))) return res.status(400).json({ message: 'Nama atau email tidak valid' });
  try {
    const { rows } = await pool.query(`UPDATE pengguna SET is_active = $1, nama_lengkap = COALESCE($3, nama_lengkap),
      email = COALESCE($4, email)
      WHERE pengguna_id = $2 AND role = 'PIC Promosi'
      RETURNING pengguna_id, email, nama_lengkap, is_active`, [req.body.is_active, req.params.id, nama, email]);
    if (!rows[0]) return res.status(404).json({ message: 'PIC tidak ditemukan' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Email sudah terdaftar' });
    next(err);
  }
});
module.exports = router;

