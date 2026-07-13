const pool = require('../config/db');

// FR-09, UC-05 - Lihat Notifikasi Stok
// Catatan revisi final: tabel pesan_notifikasi sekarang punya kolom aset_id (FK ke aset),
// jadi notifikasi bisa langsung menunjukkan nama aset yang memicunya.

async function getNotifikasi(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT n.*, a.nama AS aset_nama, a.stok, a.threshold_qty
       FROM pesan_notifikasi n
       JOIN aset a ON a.aset_id = n.aset_id
       WHERE n.is_resolved = false
       ORDER BY n.created_at DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
}

async function resolveNotifikasi(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      'UPDATE pesan_notifikasi SET is_resolved = true WHERE pesan_notifikasi_id = $1 RETURNING *',
      [id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Notifikasi tidak ditemukan' });
    res.json(rows[0]);
  } catch (err) { next(err); }
}

module.exports = { getNotifikasi, resolveNotifikasi };
