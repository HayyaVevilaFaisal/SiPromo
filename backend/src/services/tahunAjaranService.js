// Mengambil koneksi database PostgreSQL.
const pool = require('../config/db');


// FR-07, UC-04 - Kelola Data Tahun Ajaran.
// Service menangani proses database untuk Tahun Ajaran.


// Mengambil seluruh data Tahun Ajaran
// berdasarkan pencarian dan status.
// async function getAllTahunAjaran(search, status) {
async function getAllTahunAjaran(search) {

  // Menyimpan kondisi WHERE yang digunakan pada query.
  const conditions = [];

  // Menyimpan nilai parameter query PostgreSQL.
  const values = [];

  // Menentukan nomor parameter PostgreSQL.
  let idx = 1;


  // Cocokkan setiap kata dengan tahun, semester, atau tanggal mulai/selesai.
  // Nama bulan ditentukan sendiri agar tidak bergantung pada locale PostgreSQL.
  const months = `ARRAY['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']`;
  const dateSearch = (column) => `concat_ws(' ',
    to_char(${column}, 'YYYY-MM-DD'),
    to_char(${column}, 'DD/MM/YYYY'),
    to_char(${column}, 'FMDD'),
    (${months})[EXTRACT(MONTH FROM ${column})::int],
    to_char(${column}, 'YYYY'))`;
  const searchable = `concat_ws(' ', ta.tahun, ta.semester,
    ${dateSearch('ta.tanggal_mulai')}, ${dateSearch('ta.tanggal_selesai')})`;

  for (const term of (search || '').trim().split(/\s+/).filter(Boolean)) {
    conditions.push(`${searchable} ILIKE $${idx++}`);
    values.push(`%${term}%`);
  }


  // Jika user memilih status aktif.
//   if (status === 'aktif') {
//
//     conditions.push(
//       'ta.is_active = true'
//     );
//   }
//
//   // Jika user memilih status terhapus.
//   else if (status === 'terhapus') {
//     conditions.push(
//       'ta.is_active = false'
//     );
//   }


  // Membuat WHERE jika terdapat kondisi.
  const where =
    conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';


  // Mengambil seluruh data Tahun Ajaran
  // beserta jumlah kegiatan aktif pada setiap Tahun Ajaran.
  const { rows } = await pool.query(
    `
      SELECT
        ta.*,
        COALESCE(k.jumlah, 0) AS jumlah_kegiatan
      FROM tahun_ajaran ta

      LEFT JOIN (
        SELECT
          tahun_ajaran_id,
          COUNT(*) AS jumlah
        FROM kegiatan
        GROUP BY tahun_ajaran_id
      ) k
        ON k.tahun_ajaran_id = ta.tahun_ajaran_id

      ${where}

      ORDER BY ta.tanggal_mulai DESC
    `,
    values
  );


  // Mengembalikan hasil kepada controller.
  return rows;
}


// Menambahkan Tahun Ajaran baru.
async function createTahunAjaran(
  tahun,
  semester,
  tanggalMulai,
  tanggalSelesai
) {

  // Mencari Tahun Ajaran dengan tahun dan semester yang sama.
  const existingResult = await pool.query(
    `
      SELECT *
      FROM tahun_ajaran
      WHERE tahun = $1
        AND semester = $2
    `,
    [
      tahun,
      semester,
    ]
  );


  // Mengambil data Tahun Ajaran yang ditemukan.
  const existing =
    existingResult.rows[0];


//   // Jika Tahun Ajaran sudah ada dan masih aktif.
//   if (
//     existing &&
//     existing.is_active
//   ) {
//
//     // Membuat error khusus agar dapat ditangani controller.
//     const error =
//       new Error(
//         'Tahun ajaran dengan tahun & semester ini sudah ada'
//       );
//
//     error.statusCode = 400;
//
//     throw error;
//   }
//
//
//   // Jika Tahun Ajaran sudah pernah ada
//   // tetapi sudah dihapus.
//   if (
//     existing &&
//     !existing.is_active
//   ) {
//
//     // Mengaktifkan kembali data lama
//     // sekaligus memperbarui tanggal.
//     const { rows } = await pool.query(
//       `
//         UPDATE tahun_ajaran
//         SET
//           tanggal_mulai = $1,
//           tanggal_selesai = $2,
//           is_active = true
//         WHERE tahun_ajaran_id = $3
//         RETURNING *
//       `,
//       [
//         tanggalMulai,
//         tanggalSelesai,
//         existing.tahun_ajaran_id,
//       ]
//     );
//
//
//     // Mengembalikan data yang diaktifkan kembali.
//     return rows[0];
//   }
//
//
  // Semua kombinasi tahun dan semester yang sudah ada ditolak sebagai duplikat.
  if (existing) {
    const error = new Error('Tahun ajaran dengan tahun & semester ini sudah ada');
    error.statusCode = 400;
    throw error;
  }

  // Jika Tahun Ajaran benar-benar belum pernah ada.
  const { rows } = await pool.query(
    `
      INSERT INTO tahun_ajaran (
        tahun,
        semester,
        tanggal_mulai,
        tanggal_selesai
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
    [
      tahun,
      semester,
      tanggalMulai,
      tanggalSelesai,
    ]
  );


  // Mengembalikan Tahun Ajaran baru.
  return rows[0];
}


// Mengubah data Tahun Ajaran.
async function updateTahunAjaran(
  id,
  tahun,
  semester,
  tanggalMulai,
  tanggalSelesai
) {

  // Memperbarui Tahun Ajaran yang masih aktif.
  const { rows } = await pool.query(
    `
      UPDATE tahun_ajaran
      SET
        tahun = $1,
        semester = $2,
        tanggal_mulai = $3,
        tanggal_selesai = $4
      WHERE tahun_ajaran_id = $5
        -- AND is_active = true -- Aturan lama
      RETURNING *
    `,
    [
      tahun,
      semester,
      tanggalMulai,
      tanggalSelesai,
      id,
    ]
  );


  // Mengembalikan Tahun Ajaran yang berhasil diperbarui.
  return rows[0];
}


// Menghapus Tahun Ajaran secara soft delete.
// async function deleteTahunAjaran(id) {
//
//   // Data tidak benar-benar dihapus.
//   // Status hanya diubah menjadi tidak aktif.
//   const { rows } = await pool.query(
//     `
//       UPDATE tahun_ajaran
//       SET is_active = false
//       WHERE tahun_ajaran_id = $1
//         AND is_active = true
//       RETURNING *
//     `,
//     [id]
//   );
//
//
//   // Mengembalikan Tahun Ajaran yang berhasil dihapus.
//   return rows[0];
// }


// Mengekspor seluruh fungsi service.
module.exports = {
  getAllTahunAjaran,
  createTahunAjaran,
  updateTahunAjaran,
  // deleteTahunAjaran,
};
