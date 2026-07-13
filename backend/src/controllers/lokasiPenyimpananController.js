const pool = require('../config/db');

// FR-06, UC-02 - Kelola Data Lokasi Penyimpanan
// Catatan revisi final: nilai nama dibatasi CHECK constraint hanya '9113', '9110',
// atau 'Laboratorium Sertifikasi'. Insert/update dengan nilai lain akan ditolak database.

async function getAllLokasi(req, res, next) {
  try {
    const { search, status } = req.query;
    const conditions = [];
    const values = [];
    let idx = 1;
    if (search) { conditions.push(`nama ILIKE $${idx++}`); values.push(`%${search}%`); }
    if (status === 'aktif') conditions.push('is_active = true');
    else if (status === 'arsip') conditions.push('is_active = false');
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(`SELECT * FROM lokasi_penyimpanan ${where} ORDER BY nama ASC`, values);
    res.json(rows);
  } catch (err) { next(err); }
}

async function createLokasi(req, res, next) {
  try {
    const { nama, deskripsi } = req.body;
    if (!nama) return res.status(400).json({ message: 'Nama lokasi wajib diisi' });
    const { rows } = await pool.query(
      'INSERT INTO lokasi_penyimpanan (nama, deskripsi) VALUES ($1,$2) RETURNING *',
      [nama, deskripsi]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
}

async function updateLokasi(req, res, next) {
  try {
    const { id } = req.params;
    const { nama, deskripsi } = req.body;
    const { rows } = await pool.query(
      'UPDATE lokasi_penyimpanan SET nama=$1, deskripsi=$2 WHERE lokasi_penyimpanan_id=$3 RETURNING *',
      [nama, deskripsi, id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Lokasi penyimpanan tidak ditemukan' });
    res.json(rows[0]);
  } catch (err) { next(err); }
}

async function archiveLokasi(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('UPDATE lokasi_penyimpanan SET is_active=false WHERE lokasi_penyimpanan_id=$1 RETURNING *', [id]);
    if (!rows[0]) return res.status(404).json({ message: 'Lokasi penyimpanan tidak ditemukan' });
    res.json({ message: 'Lokasi penyimpanan berhasil diarsipkan', data: rows[0] });
  } catch (err) { next(err); }
}

async function restoreLokasi(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('UPDATE lokasi_penyimpanan SET is_active=true WHERE lokasi_penyimpanan_id=$1 RETURNING *', [id]);
    if (!rows[0]) return res.status(404).json({ message: 'Lokasi penyimpanan tidak ditemukan' });
    res.json({ message: 'Lokasi penyimpanan berhasil dipulihkan', data: rows[0] });
  } catch (err) { next(err); }
}

module.exports = { getAllLokasi, createLokasi, updateLokasi, archiveLokasi, restoreLokasi };
