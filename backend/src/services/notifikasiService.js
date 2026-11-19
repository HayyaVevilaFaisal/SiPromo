// Mengambil koneksi database PostgreSQL.
const pool = require('../config/db');


// Service menangani proses database
// yang berhubungan dengan notifikasi stok.


// Mengambil seluruh notifikasi yang belum selesai.
async function getNotifikasi() {

  // Mengambil notifikasi yang masih aktif
  // serta informasi aset yang terkait.
  const { rows } = await pool.query(
    `
      SELECT
        n.*,
        a.nama AS aset_nama,
        a.stok,
        a.threshold_qty

      FROM pesan_notifikasi n

      JOIN aset a
        ON a.aset_id = n.aset_id

      WHERE n.is_resolved = false
        -- AND a.is_active = true -- Aturan master lama

      ORDER BY n.created_at DESC
    `
  );


  // Mengembalikan data notifikasi kepada controller.
  return rows;
}


// Menandai notifikasi sebagai selesai.
async function resolveNotifikasi(id) {

  // Mengubah status notifikasi menjadi resolved.
  const { rows } = await pool.query(
    `
      UPDATE pesan_notifikasi

      SET is_resolved = true

      WHERE pesan_notifikasi_id = $1

      RETURNING *
    `,
    [id]
  );


  // Mengembalikan notifikasi yang berhasil diselesaikan.
  return rows[0];
}


// Mengekspor seluruh fungsi service.
module.exports = {
  getNotifikasi,
  resolveNotifikasi,
};