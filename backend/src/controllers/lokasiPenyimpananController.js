const pool = require('../config/db');

// FR-06, UC-02 - Kelola Data Lokasi Penyimpanan
// Default terisi 3 lokasi (9113, 9110, Laboratorium Sertifikasi) lewat seed.sql, tapi nama lokasi
// baru bebas ditambahkan (tidak lagi dibatasi CHECK constraint sejak nama lokasi bisa berkembang).

async function getAllLokasi(req, res, next) {
  try {
    const { search, status } = req.query;
    const conditions = [];
    const values = [];
    let idx = 1;
    if (search) { conditions.push(`l.nama ILIKE $${idx++}`); values.push(`%${search}%`); }
    if (status === 'aktif') conditions.push('l.is_active = true');
    else if (status === 'arsip') conditions.push('l.is_active = false');
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT l.*, COALESCE(a.jumlah, 0) AS jumlah_aset
       FROM lokasi_penyimpanan l
       LEFT JOIN (
         SELECT lokasi_penyimpanan_id, COUNT(*) AS jumlah
         FROM aset
         WHERE is_active = true
         GROUP BY lokasi_penyimpanan_id
       ) a ON a.lokasi_penyimpanan_id = l.lokasi_penyimpanan_id
       ${where}
       ORDER BY l.nama ASC`,
      values
    );
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
