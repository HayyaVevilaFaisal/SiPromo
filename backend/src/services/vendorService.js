const pool = require('../config/db');


// Mengambil seluruh vendor.
// Secara default hanya mengambil vendor yang masih aktif.
// async function getAllVendor(search, status) {
async function getAllVendor(search) {

  // Menyimpan kondisi WHERE.
  const conditions = [];

  // Menyimpan parameter query.
  const values = [];

  // Menentukan nomor parameter PostgreSQL.
  let idx = 1;


  // Cari seluruh informasi vendor yang ditampilkan, termasuk penanda data kosong.
//   const searchable = `concat_ws(' ', nama, alamat,
//     COALESCE(NULLIF(nomor_handphone, ''), '-'),
//     COALESCE(NULLIF(email, ''), '-'),
//     CASE WHEN is_active THEN 'Aktif' ELSE 'Terhapus' END)`;
//   const searchable = `concat_ws(' ', nama, alamat,
//     COALESCE(NULLIF(nomor_handphone, ''), '-'),
//     COALESCE(NULLIF(email, ''), '-'))`;
  const searchable = `concat_ws(' ', v.nama, v.alamat,
    COALESCE(NULLIF(v.nomor_handphone, ''), '-'),
    COALESCE(NULLIF(v.email, ''), '-'), riwayat.nama_aset)`;

  // Semua kata harus cocok; kata dapat berada pada kolom yang berbeda.
  for (const term of (search || '').trim().split(/\s+/).filter(Boolean)) {
    conditions.push(`${searchable} ILIKE $${idx++}`);
    // Perlakukan karakter wildcard sebagai teks yang diketik pengguna.
    values.push(`%${term.replace(/[\\%_]/g, '\\$&')}%`);
  }


  // Jika user memilih status Aktif.
//   if (status === 'aktif') {
//
//     // Hanya mengambil vendor aktif.
//     conditions.push(
//       'is_active = true'
//     );
//   }
//
//
//   // Jika user memilih status Terhapus.
//   else if (status === 'terhapus') {
//
//     // Hanya mengambil vendor yang sudah dihapus.
//     conditions.push(
//       'is_active = false'
//     );
//   }


  // Membuat WHERE jika terdapat kondisi.
  const where =
    conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';


  // Query lama sebelum penambahan riwayat aset:
  // SELECT *
  // FROM vendor
  // ${where}
  // ORDER BY nama ASC
  // Menjalankan query.
  const { rows } = await pool.query(
    `
      SELECT v.*, COALESCE(riwayat.aset_dibeli, '[]'::jsonb) AS aset_dibeli
      FROM vendor v
      LEFT JOIN (
        SELECT unik.vendor_id,
          jsonb_agg(jsonb_build_object('aset_id', unik.aset_id, 'nama', unik.nama)
            ORDER BY unik.nama, unik.aset_id) AS aset_dibeli,
          string_agg(unik.nama, ' ' ORDER BY unik.nama, unik.aset_id) AS nama_aset
        FROM (
          -- Seluruh riwayat Lunas, bukan hanya vendor pembelian terbaru suatu aset.
          -- DISTINCT menghindari pengulangan aset pada pembelian yang berbeda.
          SELECT DISTINCT hp.vendor_id, a.aset_id, a.nama
          FROM header_pembelian hp
          JOIN pembelian p ON p.pembelian_id = hp.pembelian_id
          JOIN detail_pembelian dp ON dp.pembelian_id = p.pembelian_id
          JOIN aset a ON a.aset_id = dp.aset_id
          WHERE p.status = 'Lunas'
        ) unik
        GROUP BY unik.vendor_id
      ) riwayat ON riwayat.vendor_id = v.vendor_id
      ${where}
      ORDER BY v.nama ASC
    `,
    values
  );


  // Mengembalikan data vendor.
  return rows;
}


// Menambahkan vendor baru.
async function createVendor(
  nama,
  alamat,
  nomorHandphone,
  email
) {

  // Menambahkan vendor dengan status aktif.
  const { rows } = await pool.query(
    `
--       INSERT INTO vendor (
--         nama,
--         alamat,
--         nomor_handphone,
--         email,
--         is_active
--       )
--       VALUES ($1, $2, $3, $4, true)
      INSERT INTO vendor (nama, alamat, nomor_handphone, email)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
    [
      nama,
      alamat,
      nomorHandphone,
      email,
    ]
  );


  // Mengembalikan vendor yang baru dibuat.
  return rows[0];
}


// Mengubah data vendor.
async function updateVendor(
  id,
  nama,
  alamat,
  nomorHandphone,
  email
) {

  // Memperbarui vendor yang masih aktif.
  const { rows } = await pool.query(
    `
      UPDATE vendor
      SET
        nama = $1,
        alamat = $2,
        nomor_handphone = $3,
        email = $4
      WHERE vendor_id = $5
        -- AND is_active = true -- Aturan lama
      RETURNING *
    `,
    [
      nama,
      alamat,
      nomorHandphone,
      email,
      id,
    ]
  );


  // Mengembalikan vendor yang berhasil diperbarui.
  return rows[0];
}


// Menghapus vendor secara soft delete.
// async function deleteVendor(id) {
//
//   // Vendor tidak benar-benar dihapus.
//   // Statusnya hanya diubah menjadi tidak aktif.
//   const { rows } = await pool.query(
//     `
//       UPDATE vendor
//       SET is_active = false
//       WHERE vendor_id = $1
//         AND is_active = true
//       RETURNING *
//     `,
//     [id]
//   );
//
//
//   // Mengembalikan vendor yang berhasil dinonaktifkan.
//   return rows[0];
// }


// Mengekspor fungsi service.
module.exports = {
  getAllVendor,
  createVendor,
  updateVendor,
  // deleteVendor,
};
