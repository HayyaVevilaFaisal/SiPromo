// Mengambil koneksi database PostgreSQL.
const pool = require('../config/db');
const { canEditSql, assertPeriodeEdit } = require('../utils/periodeEdit');

// Mengambil fungsi untuk mengecek threshold stok aset.
const {
  checkStockThreshold,
} = require('../utils/stockNotification');


// FR-10, FR-11, FR-12, UC-06
// Service menangani proses database dan logika bisnis
// pada pencatatan penggunaan aset.


// Mengambil seluruh kegiatan penggunaan.
async function getAllKegiatan(
  tahunAjaranId,
  search,
  levelAsetId,
) {

  // Menyimpan kondisi WHERE.
  const conditions = [];

  // Menyimpan nilai parameter query.
  const values = [];

  // Menentukan nomor parameter PostgreSQL.
  let idx = 1;


  // Jika terdapat filter Tahun Ajaran.
  if (tahunAjaranId) {

    conditions.push(
      `k.tahun_ajaran_id = $${idx++}`
    );

    values.push(tahunAjaranId);
  }


  // Cari nama kegiatan atau nama aset, sambil tetap menampilkan seluruh aset kegiatan.
  if (search) {
    const searchParam = `$${idx++}`;

    conditions.push(
      `(k.nama ILIKE ${searchParam} OR EXISTS (
        SELECT 1
        FROM aset_keluar search_ak
        JOIN aset search_a ON search_a.aset_id = search_ak.aset_id
        WHERE search_ak.kegiatan_id = k.kegiatan_id
          AND search_a.nama ILIKE ${searchParam}
      ))`
    );

    values.push(
      `%${search}%`
    );
  }

  // Pilih kegiatan yang menggunakan aset pada level ini tanpa memotong daftar asetnya.
  if (levelAsetId) {
    conditions.push(`EXISTS (
      SELECT 1
      FROM aset_keluar level_ak
      JOIN aset level_a ON level_a.aset_id = level_ak.aset_id
      WHERE level_ak.kegiatan_id = k.kegiatan_id
        AND level_a.level_aset_id = $${idx++}
    )`);
    values.push(levelAsetId);
  }

  // Membentuk bagian WHERE.
  const where =
    conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';


  // Mengambil seluruh kegiatan beserta daftar aset
  // yang digunakan pada kegiatan tersebut.
  //
  // daftar_aset langsung diagregasi dalam query
  // untuk menghindari N+1 request.
  const { rows } = await pool.query(
    `
      SELECT
        k.*,
        ${canEditSql('k.tahun_ajaran_id')} AS can_edit,
        ta.tahun,
        ta.semester,

        COALESCE(
          SUM(ak.qty_out),
          0
        ) AS total_qty_out,

        COALESCE(
          json_agg(
            json_build_object(
              'aset_id', a.aset_id,
              'aset_nama', a.nama,
              'level_nama', d.nama,
              'qty_out', ak.qty_out,
              'vendor_nama', v.nama,
              'lokasi_nama', l.nama
            )
            ORDER BY a.nama
          )
          FILTER (
            WHERE ak.aset_id IS NOT NULL
          ),
          '[]'
        ) AS daftar_aset

      FROM kegiatan k

      LEFT JOIN tahun_ajaran ta
        ON ta.tahun_ajaran_id =
           k.tahun_ajaran_id

      LEFT JOIN aset_keluar ak
        ON ak.kegiatan_id =
           k.kegiatan_id

      LEFT JOIN aset a
        ON a.aset_id =
           ak.aset_id

      LEFT JOIN level_aset d
        ON d.level_aset_id =
           a.level_aset_id

      LEFT JOIN lokasi_penyimpanan l
        ON l.lokasi_penyimpanan_id =
           a.lokasi_penyimpanan_id

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
           a.aset_id

      LEFT JOIN vendor v
        ON v.vendor_id =
           latest.vendor_id

      ${where}

      GROUP BY
        k.kegiatan_id,
        ta.tahun,
        ta.semester

      ORDER BY k.tanggal DESC
    `,
    values
  );


  // Mengembalikan hasil kepada controller.
  return rows;
}


// Mengambil detail satu kegiatan penggunaan.
async function getKegiatanDetail(id) {

  // Mengambil data kegiatan.
  const kegiatanResult = await pool.query(
    `
      SELECT *, ${canEditSql('kegiatan.tahun_ajaran_id')} AS can_edit
      FROM kegiatan
      WHERE kegiatan_id = $1
    `,
    [id]
  );


  // Menyimpan kegiatan yang ditemukan.
  const kegiatan = kegiatanResult.rows[0];


  // Jika kegiatan tidak ditemukan.
  if (!kegiatan) {

    return null;
  }


  // Mengambil seluruh aset yang digunakan
  // pada kegiatan tersebut.
  const detailResult = await pool.query(
    `
      SELECT
        ak.*,
        a.nama AS aset_nama,
        a.harga

      FROM aset_keluar ak

      JOIN aset a
        ON a.aset_id =
           ak.aset_id

      WHERE ak.kegiatan_id = $1
    `,
    [id]
  );


  // Menggabungkan data kegiatan
  // dengan daftar aset yang digunakan.
  return {
    ...kegiatan,
    aset: detailResult.rows,
  };
}


// Membuat pencatatan penggunaan baru.
async function createPenggunaan(
  tahunAjaranId,
  nama,
  tanggal,
  catatan,
  daftarAset
) {

  // Mengambil satu koneksi khusus
  // karena proses ini menggunakan transaction.
  const client = await pool.connect();


  try {

    // Memulai transaction.
    await client.query('BEGIN');


    // Menambahkan data kegiatan.
    const kegiatanResult = await client.query(
      `
        INSERT INTO kegiatan (
          tahun_ajaran_id,
          nama,
          tanggal,
          catatan
        )

        VALUES (
          $1,
          $2,
          $3,
          $4
        )

        RETURNING *
      `,
      [
        tahunAjaranId,
        nama,
        tanggal,
        catatan,
      ]
    );


    // Menyimpan kegiatan yang baru dibuat.
    const kegiatan =
      kegiatanResult.rows[0];


    // Menyimpan seluruh aset
    // yang stoknya berubah.
    const affectedAset = [];


    // Memproses setiap aset yang digunakan.
    for (const item of daftarAset) {

      // Mengambil aset dan mengunci row
      // selama transaction berlangsung.
      const asetResult = await client.query(
        `
          SELECT *
          FROM aset
          WHERE aset_id = $1
          FOR UPDATE
        `,
        [item.aset_id]
      );


      // Mengambil data aset.
      const aset =
        asetResult.rows[0];


      // Jika aset tidak ditemukan.
      if (!aset) {

        throw new Error(
          `Aset dengan id ${item.aset_id} tidak ditemukan`
        );
      }


      // Memastikan stok mencukupi.
      if (aset.stok < item.qty_out) {

        throw new Error(
          `Stok ${aset.nama} tidak mencukupi (tersedia ${aset.stok})`
        );
      }


      // Menambahkan detail penggunaan aset.
      await client.query(
        `
          INSERT INTO aset_keluar (
            kegiatan_id,
            aset_id,
            qty_out
          )

          VALUES (
            $1,
            $2,
            $3
          )
        `,
        [
          kegiatan.kegiatan_id,
          item.aset_id,
          item.qty_out,
        ]
      );


      // Mengurangi stok aset.
      const updatedResult =
        await client.query(
          `
            UPDATE aset

            SET stok = stok - $1

            WHERE aset_id = $2

            RETURNING *
          `,
          [
            item.qty_out,
            item.aset_id,
          ]
        );


      // Menyimpan aset yang stoknya berubah.
      affectedAset.push(
        updatedResult.rows[0]
      );
    }


    // Menyelesaikan transaction.
    await client.query('COMMIT');


    // Setelah transaction berhasil,
    // cek threshold setiap aset yang stoknya berubah.
    for (const aset of affectedAset) {

      await checkStockThreshold(aset);
    }


    // Mengembalikan hasil kepada controller.
    return {
      kegiatan,
      aset: affectedAset,
    };

  } catch (err) {

    // Membatalkan seluruh perubahan
    // jika salah satu proses gagal.
    await client.query('ROLLBACK');


    // Melempar error kembali kepada controller.
    throw err;

  } finally {

    // Mengembalikan koneksi ke connection pool.
    client.release();
  }
}


// Mengubah pencatatan penggunaan.
async function updatePenggunaan(
  id,
  tahunAjaranId,
  nama,
  tanggal,
  catatan,
  daftarAset
) {

  // Mengambil satu koneksi khusus
  // untuk menjalankan transaction.
  const client = await pool.connect();


  try {

    // Memulai transaction.
    await client.query('BEGIN');


    // Mengambil dan mengunci kegiatan yang akan diubah.
    const existingResult =
      await client.query(
        `
          SELECT *
          FROM kegiatan

          WHERE kegiatan_id = $1

          FOR UPDATE
        `,
        [id]
      );


    // Jika kegiatan tidak ditemukan.
    if (!existingResult.rows[0]) {

      // Membatalkan transaction.
      await client.query('ROLLBACK');


      // Mengembalikan null sebagai tanda
      // bahwa kegiatan tidak ditemukan.
      return null;
    }


    await assertPeriodeEdit(client, existingResult.rows[0].tahun_ajaran_id, tahunAjaranId, tanggal);

    // Mengambil detail penggunaan lama.
    const oldRows =
      await client.query(
        `
          SELECT *
          FROM aset_keluar

          WHERE kegiatan_id = $1
        `,
        [id]
      );


    // Mengembalikan seluruh qty_out lama
    // ke stok aset terlebih dahulu.
    for (const row of oldRows.rows) {

      await client.query(
        `
          UPDATE aset

          SET stok = stok + $1

          WHERE aset_id = $2
        `,
        [
          row.qty_out,
          row.aset_id,
        ]
      );
    }


    // Menghapus detail penggunaan lama.
    await client.query(
      `
        DELETE FROM aset_keluar

        WHERE kegiatan_id = $1
      `,
      [id]
    );


    // Memperbarui data kegiatan.
    const kegiatanResult =
      await client.query(
        `
          UPDATE kegiatan

          SET
            tahun_ajaran_id = $1,
            nama = $2,
            tanggal = $3,
            catatan = $4

          WHERE kegiatan_id = $5

          RETURNING *
        `,
        [
          tahunAjaranId,
          nama,
          tanggal,
          catatan,
          id,
        ]
      );


    // Menyimpan kegiatan yang diperbarui.
    const kegiatan =
      kegiatanResult.rows[0];


    // Menyimpan aset yang stoknya berubah
    // setelah detail baru diterapkan.
    const affectedAset = [];


    // Menambahkan detail penggunaan baru.
    for (const item of daftarAset) {

      // Mengambil dan mengunci aset.
      const asetResult =
        await client.query(
          `
            SELECT *
            FROM aset

            WHERE aset_id = $1

            FOR UPDATE
          `,
          [item.aset_id]
        );


      // Mengambil aset.
      const aset =
        asetResult.rows[0];


      // Jika aset tidak ditemukan.
      if (!aset) {

        throw new Error(
          `Aset dengan id ${item.aset_id} tidak ditemukan`
        );
      }


      // Memastikan stok mencukupi.
      if (aset.stok < item.qty_out) {

        throw new Error(
          `Stok ${aset.nama} tidak mencukupi (tersedia ${aset.stok})`
        );
      }


      // Menambahkan detail penggunaan baru.
      await client.query(
        `
          INSERT INTO aset_keluar (
            kegiatan_id,
            aset_id,
            qty_out
          )

          VALUES (
            $1,
            $2,
            $3
          )
        `,
        [
          id,
          item.aset_id,
          item.qty_out,
        ]
      );


      // Mengurangi stok sesuai qty_out baru.
      const updatedResult =
        await client.query(
          `
            UPDATE aset

            SET stok = stok - $1

            WHERE aset_id = $2

            RETURNING *
          `,
          [
            item.qty_out,
            item.aset_id,
          ]
        );


      // Menyimpan aset yang stoknya berubah.
      affectedAset.push(
        updatedResult.rows[0]
      );
    }


    // Menyelesaikan transaction.
    await client.query('COMMIT');


    // Mengecek threshold aset
    // setelah transaction berhasil.
    for (const aset of affectedAset) {

      await checkStockThreshold(aset);
    }


    // Mengembalikan hasil kepada controller.
    return {
      kegiatan,
      aset: affectedAset,
    };

  } catch (err) {

    // Membatalkan transaction
    // jika terjadi kesalahan.
    await client.query('ROLLBACK');


    // Melempar error kembali.
    throw err;

  } finally {

    // Mengembalikan koneksi.
    client.release();
  }
}

// Mengekspor seluruh fungsi service.
module.exports = {
  getAllKegiatan,
  getKegiatanDetail,
  createPenggunaan,
  updatePenggunaan,
};
