const pool = require('../config/db');

// FR-07, UC-04 - Kelola Data Tahun Ajaran
// "tahun" seharusnya diturunkan di frontend dari tanggal_mulai + semester (lihat
// frontend/src/pages/TahunAjaran/deriveTahun.js); validasi di sini cuma jaring pengaman
// kalau ada klien lain yang mengirim nilai tidak konsisten langsung ke API.
function deriveTahun(tanggalMulai, tanggalSelesai, semester) {
  const year = new Date(tanggalMulai).getFullYear();
  if (Number.isNaN(year)) return null;
  if (tanggalSelesai && tanggalMulai === tanggalSelesai) return `${year}/${year}`;
  return semester === 'Ganjil' ? `${year}/${year + 1}` : `${year - 1}/${year}`;
}
async function getAllTahunAjaran(req, res, next) {
  try {
    const { search, status } = req.query;
    const conditions = [];
    const values = [];
    let idx = 1;
    if (search) { conditions.push(`ta.tahun ILIKE $${idx++}`); values.push(`%${search}%`); }
    if (status === 'aktif') conditions.push('ta.is_active = true');
    else if (status === 'arsip') conditions.push('ta.is_active = false');
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT ta.*, COALESCE(k.jumlah, 0) AS jumlah_kegiatan
       FROM tahun_ajaran ta
       LEFT JOIN (
         SELECT tahun_ajaran_id, COUNT(*) AS jumlah
         FROM kegiatan
         WHERE is_active = true
         GROUP BY tahun_ajaran_id
       ) k ON k.tahun_ajaran_id = ta.tahun_ajaran_id
       ${where}
       ORDER BY ta.tanggal_mulai DESC`,
      values
    );
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
    const expectedTahun = deriveTahun(tanggal_mulai, tanggal_selesai, semester);
    if (expectedTahun && tahun !== expectedTahun) {
      return res.status(400).json({ message: `Tahun ajaran tidak konsisten dengan tanggal mulai & semester (seharusnya "${expectedTahun}")` });
    }
    const { rows } = await pool.query(
      'INSERT INTO tahun_ajaran (tahun, semester, tanggal_mulai, tanggal_selesai) VALUES ($1,$2,$3,$4) RETURNING *',
      [tahun, semester, tanggal_mulai, tanggal_selesai]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ message: 'Tahun ajaran dengan tahun & semester ini sudah ada' });
    }
    next(err);
  }
}

async function updateTahunAjaran(req, res, next) {
  try {
    const { id } = req.params;
    const { tahun, semester, tanggal_mulai, tanggal_selesai } = req.body;
    if (new Date(tanggal_selesai) < new Date(tanggal_mulai)) {
      return res.status(400).json({ message: 'Tanggal selesai harus setelah tanggal mulai' });
    }
    const expectedTahun = deriveTahun(tanggal_mulai, tanggal_selesai, semester);
    if (expectedTahun && tahun !== expectedTahun) {
      return res.status(400).json({ message: `Tahun ajaran tidak konsisten dengan tanggal mulai & semester (seharusnya "${expectedTahun}")` });
    }
    const { rows } = await pool.query(
      'UPDATE tahun_ajaran SET tahun=$1, semester=$2, tanggal_mulai=$3, tanggal_selesai=$4 WHERE tahun_ajaran_id=$5 RETURNING *',
      [tahun, semester, tanggal_mulai, tanggal_selesai, id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Tahun ajaran tidak ditemukan' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ message: 'Tahun ajaran dengan tahun & semester ini sudah ada' });
    }
    next(err);
  }
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
