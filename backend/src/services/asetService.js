// Mengambil koneksi database PostgreSQL.
const pool = require('../config/db');

// Mengambil utility untuk mengecek threshold stok.
const {
  checkStockThreshold,
} = require('../utils/stockNotification');


// FR-03, FR-04, UC-01 - Kelola Data Aset.
// Service menangani query database dan logika bisnis Aset.


// Mengambil seluruh data aset berdasarkan filter.
async function getAllAset(
  search,
  level,
  // status,
  lokasi,
  hargaMin,
  // hargaMax
  hargaMax,
  status
) {

  // Menyimpan kondisi WHERE.
  const conditions = [];

  // Menyimpan nilai parameter query.
  const values = [];

  // Menentukan nomor parameter PostgreSQL.
  let idx = 1;


  // Cocokkan informasi yang terlihat di tabel, termasuk harga berformat Indonesia.
  const formattedPrice = `replace(to_char(trunc(s.harga), 'FM999,999,999,999,990'), ',', '.')
    || CASE WHEN mod(s.harga, 1) <> 0
      THEN ',' || rtrim(split_part(s.harga::text, '.', 2), '0') ELSE '' END`;
//   const searchable = `concat_ws(' ', s.nama, COALESCE(d.nama, '-'),
//     s.stok::text, s.threshold_qty::text, s.harga::text, 'Rp' || (${formattedPrice}),
//     l.nama, CASE WHEN l.is_active = false THEN '(Dihapus)' END,
//     COALESCE(NULLIF(v.nama, ''), '-'),
//     CASE WHEN s.stok < s.threshold_qty THEN 'Kritis' ELSE 'Aman' END,
//     CASE WHEN s.is_active THEN 'Aktif' ELSE 'Terhapus' END)`;
  const searchable = `concat_ws(' ', s.nama, COALESCE(d.nama, '-'),
    s.stok::text, s.threshold_qty::text, s.harga::text, 'Rp' || (${formattedPrice}),
    l.nama, COALESCE(NULLIF(v.nama, ''), '-'),
    CASE WHEN s.stok < s.threshold_qty THEN 'Kritis' ELSE 'Aman' END)`;

  // Kata dapat berada pada kolom berbeda; semua kata harus cocok.
  for (const term of (search || '').trim().split(/\s+/).filter(Boolean)) {
    conditions.push(`${searchable} ILIKE $${idx++}`);
    values.push(`%${term.replace(/[\\%_]/g, '\\$&')}%`);
  }


  // Jika terdapat filter berdasarkan level.
  if (level) {

    conditions.push(
      `s.level_aset_id = $${idx++}`
    );

    values.push(
      level
    );
  }


  // Jika status yang dipilih adalah aktif.
//   if (status === 'aktif') {
//
//     conditions.push(
//       's.is_active = true'
//     );
//   }
//
//   // Jika status yang dipilih adalah aset yang sudah dihapus.
//   else if (status === 'terhapus') {
//
//     conditions.push(
//       's.is_active = false'
//     );
//   }
  if (lokasi) {
    conditions.push(`s.lokasi_penyimpanan_id = $${idx++}`);
    values.push(lokasi);
  }

  // Status stok mengikuti aturan badge pada tabel Kelola Aset.
  if (status === 'kritis') {
    conditions.push('s.stok < s.threshold_qty');
  } else if (status === 'aman') {
    conditions.push('s.stok >= s.threshold_qty');
  }



  // Jika terdapat harga minimum.
  if (hargaMin) {

    conditions.push(
      `s.harga >= $${idx++}`
    );

    values.push(
      hargaMin
    );
  }


  // Jika terdapat harga maksimum.
  if (hargaMax) {

    conditions.push(
      `s.harga <= $${idx++}`
    );

    values.push(
      hargaMax
    );
  }


  // Membentuk WHERE jika terdapat filter.
  const whereClause =
    conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';


  // Mengambil seluruh data aset.
  //
  // Query juga mengambil:
  // - nama level
  // - lokasi penyimpanan
  // - status lokasi
  // - vendor dari transaksi pembelian terbaru
  const { rows } = await pool.query(
    `
      SELECT
        s.*,
        d.nama AS level_nama,
        l.nama AS lokasi_nama,
        -- l.is_active AS lokasi_is_active, -- Kode lama
        v.nama AS vendor_nama

      FROM aset s

      LEFT JOIN level_aset d
        ON d.level_aset_id =
           s.level_aset_id

      LEFT JOIN lokasi_penyimpanan l
        ON l.lokasi_penyimpanan_id =
           s.lokasi_penyimpanan_id

      LEFT JOIN (
        SELECT DISTINCT ON (dp.aset_id)
          dp.aset_id,
          hp.vendor_id

        FROM detail_pembelian dp

        JOIN pembelian p
          ON p.pembelian_id =
             dp.pembelian_id

        JOIN header_pembelian hp
          ON hp.pembelian_id =
             dp.pembelian_id

        -- Sebelumnya semua status pembelian ikut menentukan vendor.
        WHERE p.status = 'Lunas'

        ORDER BY
          dp.aset_id,
          p.tanggal DESC,
          dp.pembelian_id DESC
      ) latest
        ON latest.aset_id =
           s.aset_id

      LEFT JOIN vendor v
        ON v.vendor_id =
        -- COALESCE(s.vendor_id, latest.vendor_id) -- Kode lama
        -- COALESCE(latest.vendor_id, s.vendor_id) -- Relasi langsung dinonaktifkan
           latest.vendor_id

      ${whereClause}

      ORDER BY s.nama ASC
    `,
    values
  );


  // Mengembalikan hasil kepada controller.
  return rows;
}


// Mengambil satu aset berdasarkan ID.
async function getAsetById(id) {

  // Menjalankan query pencarian aset.
  const { rows } = await pool.query(
    `
      SELECT *
      FROM aset
      WHERE aset_id = $1
    `,
    [id]
  );


  // Mengembalikan aset jika ditemukan.
  return rows[0];
}


// Menambahkan aset baru.
async function createAset(
  nama,
  levelAsetId,
  lokasiPenyimpananId,
  harga,
  stok,
  thresholdQty
  // vendorId -- Relasi langsung aset-vendor dinonaktifkan
) {

  // Menambahkan aset baru ke database.
  const { rows } = await pool.query(
    `
      INSERT INTO aset (
        nama,
        level_aset_id,
        lokasi_penyimpanan_id,
        harga,
        stok,
        threshold_qty
        -- vendor_id -- Relasi langsung aset-vendor dinonaktifkan
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6
        -- $7 -- vendor_id dinonaktifkan
      )
      RETURNING *
    `,
    [
      nama,
      levelAsetId || null,
      lokasiPenyimpananId,
      harga,
      stok || 0,
      thresholdQty || 0,
      // vendorId || null,
    ]
  );


  // Menyimpan aset yang baru dibuat.
  const aset = rows[0];


  // Mengecek apakah stok berada di bawah threshold.
  await checkStockThreshold(aset);


  // Mengembalikan aset kepada controller.
  return aset;
}


// Mengubah data aset.
async function updateAset(
  id,
  nama,
  levelAsetId,
  lokasiPenyimpananId,
  harga,
  stok,
  thresholdQty
) {

  // Memperbarui data aset.
  const { rows } = await pool.query(
    `
      UPDATE aset

      SET
        nama = $1,
        level_aset_id = $2,
        lokasi_penyimpanan_id = $3,
        harga = $4,
        stok = $5,
        threshold_qty = $6

      WHERE aset_id = $7

      RETURNING *
    `,
    [
      nama,
      levelAsetId || null,
      lokasiPenyimpananId,
      harga,
      stok,
      thresholdQty,
      id,
    ]
  );


  // Menyimpan hasil update.
  const aset = rows[0];


  // Jika aset tidak ditemukan,
  // langsung kembalikan undefined.
  if (!aset) {

    return undefined;
  }


  // Mengecek kembali kondisi stok
  // setelah data aset diubah.
  await checkStockThreshold(aset);


  // Mengembalikan aset kepada controller.
  return aset;
}


// Menghapus aset secara soft delete.
// async function deleteAset(id) {
//
//   // Aset tidak benar-benar dihapus dari database.
//   // Statusnya hanya diubah menjadi tidak aktif.
//   const { rows } = await pool.query(
//     `
//       UPDATE aset
//
//       SET is_active = false
//
//       WHERE aset_id = $1
//         AND is_active = true
//
//       RETURNING *
//     `,
//     [id]
//   );
//
//
//   // Mengembalikan aset yang berhasil dihapus.
//   return rows[0];
// }


// Mengekspor seluruh fungsi service.
module.exports = {
  getAllAset,
  getAsetById,
  createAset,
  updateAset,
  // deleteAset,
};
