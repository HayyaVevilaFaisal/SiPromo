const pool = require('../config/db');

// PBI-08 - Kelola Data Dimensi Aset
// Catatan revisi final: nilai nama dibatasi CHECK constraint hanya 'Kecil', 'Sedang', 'Besar'.
// Data dasarnya sudah diisi lewat seed.sql, endpoint create disediakan hanya untuk jaga-jaga
// (mis. re-seed manual) - insert dengan nilai di luar tiga itu akan ditolak oleh database.

async function getAllDimensi(req, res, next) {
  try {
    const { rows } = await pool.query('SELECT * FROM dimensi_aset ORDER BY dimensi_aset_id ASC');
    res.json(rows);
  } catch (err) { next(err); }
}

async function createDimensi(req, res, next) {
  try {
    const { nama } = req.body;
    if (!nama) return res.status(400).json({ message: 'Nama dimensi wajib diisi' });
    const { rows } = await pool.query(
      'INSERT INTO dimensi_aset (nama) VALUES ($1) RETURNING *',
      [nama]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
}

module.exports = { getAllDimensi, createDimensi };
