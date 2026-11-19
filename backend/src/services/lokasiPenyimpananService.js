// Mengambil koneksi database PostgreSQL.
const pool = require('../config/db');


// Mengambil seluruh lokasi penyimpanan
// berdasarkan pencarian dan status.
// async function getAllLokasi(search, status) {
async function getAllLokasi(search) {

  // Menyimpan kondisi WHERE.
  const conditions = [];

  // Menyimpan nilai parameter query.
  const values = [];

  // Menentukan nomor parameter PostgreSQL.
  let idx = 1;


  // Jika terdapat pencarian nama lokasi.
  if (search) {

    // Menambahkan kondisi pencarian.
    conditions.push(
      `l.nama ILIKE $${idx++}`
    );

    // Menambahkan nilai pencarian.
    values.push(
      `%${search}%`
    );
  }


  // Jika user memilih lokasi aktif.
//   if (status === 'aktif') {
//
//     conditions.push(
//       'l.is_active = true'
//     );
//   }
//
//   // Jika user memilih lokasi terhapus.
//   else if (status === 'terhapus') {
//
//     conditions.push(
//       'l.is_active = false'
//     );
//   }


  // Membuat bagian WHERE.
  const where =
    conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';


  // Mengambil data lokasi beserta jumlah aset aktif
  // pada masing-masing lokasi.
  const { rows } = await pool.query(
    `
      SELECT
        l.*,
        COALESCE(a.jumlah, 0) AS jumlah_aset
      FROM lokasi_penyimpanan l

      LEFT JOIN (
        SELECT
          lokasi_penyimpanan_id,
          COUNT(*) AS jumlah
        FROM aset
        -- WHERE is_active = true -- Aturan lama
        GROUP BY lokasi_penyimpanan_id
      ) a
        ON a.lokasi_penyimpanan_id =
           l.lokasi_penyimpanan_id

      ${where}

      ORDER BY l.nama ASC
    `,
    values
  );


  // Mengembalikan hasil kepada controller.
  return rows;
}


// Menambahkan lokasi penyimpanan baru.
async function createLokasi(
  nama,
  deskripsi
) {

  // Menambahkan data lokasi baru.
  const { rows } = await pool.query(
    `
      INSERT INTO lokasi_penyimpanan (
        nama,
        deskripsi
      )
      VALUES ($1, $2)
      RETURNING *
    `,
    [
      nama,
      deskripsi,
    ]
  );


  // Mengembalikan lokasi yang berhasil dibuat.
  return rows[0];
}


// Mengubah data lokasi penyimpanan.
async function updateLokasi(
  id,
  nama,
  deskripsi
) {

  // Memperbarui data lokasi yang masih aktif.
  const { rows } = await pool.query(
    `
      UPDATE lokasi_penyimpanan
      SET
        nama = $1,
        deskripsi = $2
      WHERE lokasi_penyimpanan_id = $3
        -- AND is_active = true -- Aturan lama
      RETURNING *
    `,
    [
      nama,
      deskripsi,
      id,
    ]
  );


  // Mengembalikan lokasi yang berhasil diperbarui.
  return rows[0];
}


// Menghapus lokasi secara soft delete.
// async function deleteLokasi(id) {
//
//   // Lokasi tidak benar-benar dihapus dari database.
//   // Status lokasi hanya diubah menjadi tidak aktif.
//   const { rows } = await pool.query(
//     `
//       UPDATE lokasi_penyimpanan
//       SET is_active = false
//       WHERE lokasi_penyimpanan_id = $1
//         AND is_active = true
//       RETURNING *
//     `,
//     [id]
//   );
//
//
//   // Mengembalikan lokasi yang berhasil dihapus.
//   return rows[0];
// }


// Mengekspor seluruh fungsi service.
module.exports = {
  getAllLokasi,
  createLokasi,
  updateLokasi,
  // deleteLokasi,
};
