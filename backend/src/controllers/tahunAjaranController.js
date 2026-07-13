const pool = require('../config/db');

// FR-07, UC-04 - Kelola Data Tahun Ajaran
async function getAllTahunAjaran(req, res, next) {
  try {
    const { status } = req.query;
    const conditions = [];
    if (status === 'aktif') conditions.push('is_active = true');
    else if (status === 'arsip') conditions.push('is_active = false');
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(`SELECT * FROM tahun_ajaran ${where} ORDER BY tanggal_mulai DESC`);
    res.json(rows);
  } catch (err) { next(err); }
}

async function createTahunAjaran(req, res, next) {
  try {
    const { tahun, semester, tanggal_mulai, tanggal_selesai } = req.body;
    if (!tahun || !semester || !tanggal_mulai || !tanggal_selesai) {
      return res.status(400).json({ message: 'Data tahun ajaran belum lengkap' });
    }
    if (new Date(tanggal_selesai) < new Date(tanggal_mulai)) {
      return res.status(400).json({ message: 'Tanggal selesai harus setelah tanggal mulai' });
    }
    const { rows } = await pool.query(
      'INSERT INTO tahun_ajaran (tahun, semester, tanggal_mulai, tanggal_selesai) VALUES ($1,$2,$3,$4) RETURNING *',
      [tahun, semester, tanggal_mulai, tanggal_selesai]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
}

async function updateTahunAjaran(req, res, next) {
  try {
    const { id } = req.params;
    const { tahun, semester, tanggal_mulai, tanggal_selesai } = req.body;
    if (new Date(tanggal_selesai) < new Date(tanggal_mulai)) {
      return res.status(400).json({ message: 'Tanggal selesai harus setelah tanggal mulai' });
    }
    const { rows } = await pool.query(
      'UPDATE tahun_ajaran SET tahun=$1, semester=$2, tanggal_mulai=$3, tanggal_selesai=$4 WHERE tahun_ajaran_id=$5 RETURNING *',
      [tahun, semester, tanggal_mulai, tanggal_selesai, id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Tahun ajaran tidak ditemukan' });
    res.json(rows[0]);
  } catch (err) { next(err); }
}

async function archiveTahunAjaran(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('UPDATE tahun_ajaran SET is_active=false WHERE tahun_ajaran_id=$1 RETURNING *', [id]);
    if (!rows[0]) return res.status(404).json({ message: 'Tahun ajaran tidak ditemukan' });
    res.json({ message: 'Tahun ajaran berhasil diarsipkan', data: rows[0] });
  } catch (err) { next(err); }
}

async function restoreTahunAjaran(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('UPDATE tahun_ajaran SET is_active=true WHERE tahun_ajaran_id=$1 RETURNING *', [id]);
    if (!rows[0]) return res.status(404).json({ message: 'Tahun ajaran tidak ditemukan' });
    res.json({ message: 'Tahun ajaran berhasil dipulihkan', data: rows[0] });
  } catch (err) { next(err); }
}

module.exports = {
  getAllTahunAjaran, createTahunAjaran, updateTahunAjaran, archiveTahunAjaran, restoreTahunAjaran,
};
