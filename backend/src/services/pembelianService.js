const pool = require('../config/db');
const { canEditSql, assertPeriodeEdit, editError } = require('../utils/periodeEdit');

const {
  checkStockThreshold,
} = require('../utils/stockNotification');


// Harga dibatasi mengikuti DECIMAL(12,2), sebelum transaksi dimulai.
function validateDaftarAset(daftarAset) {
  const ids = new Set();
  if (!Array.isArray(daftarAset) || !daftarAset.length) {
    const error = new Error('Minimal satu aset wajib diisi');
    error.statusCode = 400;
    throw error;
  }
  for (const item of daftarAset) {
    const price = item?.unit_price;
    const invalidPrice = price !== undefined &&
      ((typeof price !== 'number' && typeof price !== 'string') ||
       !/^\d+(?:\.\d{1,2})?$/.test(String(price)) ||
       !Number.isFinite(Number(price)) || Number(price) > 9999999999.99);
    if (!item || !Number.isSafeInteger(Number(item.aset_id)) || Number(item.aset_id) <= 0 ||
        !Number.isSafeInteger(Number(item.qty_in)) || Number(item.qty_in) <= 0 ||
        ids.has(Number(item.aset_id)) || invalidPrice) {
      const error = new Error('Aset, jumlah, atau harga satuan tidak valid; aset tidak boleh duplikat');
      error.statusCode = 400;
      throw error;
    }
    ids.add(Number(item.aset_id));
  }
}

// FR-13, FR-14, FR-15, FR-16, FR-17, UC-07
// Service menangani query database dan logika bisnis Pembelian.


// Mengambil seluruh pencatatan pembelian.
async function getAllPembelian(
  tahunAjaranId,
  search,
  statusPembelian
) {

  const conditions = [];

  const values = [];

  let idx = 1;


  // Filter berdasarkan Tahun Ajaran.
  if (tahunAjaranId) {

    conditions.push(
      `hp.tahun_ajaran_id = $${idx++}`
    );

    values.push(tahunAjaranId);
  }


  // Pencarian berdasarkan nama vendor
  // catatan pembelian, atau nama aset.
  if (search) {

    conditions.push(
      `(v.nama ILIKE $${idx} OR p.catatan ILIKE $${idx} OR EXISTS (
        SELECT 1
        FROM detail_pembelian search_dp
        JOIN aset search_a ON search_a.aset_id = search_dp.aset_id
        WHERE search_dp.pembelian_id = p.pembelian_id
          AND search_a.nama ILIKE $${idx}
      ))`
    );

    values.push(`%${search}%`);

    idx++;
  }


  // Filter berdasarkan status pembayaran.
  if (statusPembelian) {

    conditions.push(
      `p.status = $${idx++}`
    );

    values.push(statusPembelian);
  }


  const where =
    conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';


  // Mengambil pencatatan pembelian beserta
  // vendor, Tahun Ajaran, total nilai,
  // dan daftar aset yang dibeli.
  const { rows } = await pool.query(
    `
      SELECT
        p.*,
        hp.vendor_id,
        hp.tahun_ajaran_id,
        ${canEditSql('hp.tahun_ajaran_id')} AS can_edit,
        v.nama AS vendor_nama,
        ta.tahun,
        ta.semester,

        COALESCE(
          SUM(dp.qty_in * dp.unit_price),
          0
        ) AS total_nilai,

        COALESCE(
          json_agg(
            json_build_object(
              'aset_id', a.aset_id,
              'aset_nama', a.nama,
              'level_nama', d.nama,
              'qty_in', dp.qty_in,
              'unit_price', dp.unit_price
            )
            ORDER BY a.nama
          )
          FILTER (
            WHERE dp.aset_id IS NOT NULL
          ),
          '[]'
        ) AS daftar_aset

      FROM pembelian p

      JOIN header_pembelian hp
        ON hp.pembelian_id =
           p.pembelian_id

      JOIN vendor v
        ON v.vendor_id =
           hp.vendor_id

      JOIN tahun_ajaran ta
        ON ta.tahun_ajaran_id =
           hp.tahun_ajaran_id

      LEFT JOIN detail_pembelian dp
        ON dp.pembelian_id =
           p.pembelian_id

      LEFT JOIN aset a
        ON a.aset_id =
           dp.aset_id

      LEFT JOIN level_aset d
        ON d.level_aset_id =
           a.level_aset_id

      ${where}

      GROUP BY
        p.pembelian_id,
        hp.vendor_id,
        hp.tahun_ajaran_id,
        v.nama,
        ta.tahun,
        ta.semester

      ORDER BY p.tanggal DESC
    `,
    values
  );


  return rows;
}


// Mengambil detail satu pencatatan pembelian.
async function getPembelianDetail(id) {

  const pembelianResult =
    await pool.query(
      `
        SELECT
          p.*,
          hp.tahun_ajaran_id,
          ${canEditSql('hp.tahun_ajaran_id')} AS can_edit,
          v.nama AS vendor_nama,
          ta.tahun,
          ta.semester

        FROM pembelian p

        JOIN header_pembelian hp
          ON hp.pembelian_id =
             p.pembelian_id

        JOIN vendor v
          ON v.vendor_id =
             hp.vendor_id

        JOIN tahun_ajaran ta
          ON ta.tahun_ajaran_id =
             hp.tahun_ajaran_id

        WHERE p.pembelian_id = $1
      `,
      [id]
    );


  const pembelian =
    pembelianResult.rows[0];


  if (!pembelian) {

    return null;
  }


  const detailResult =
    await pool.query(
      `
        SELECT
          dp.*,
          a.nama AS aset_nama

        FROM detail_pembelian dp

        JOIN aset a
          ON a.aset_id =
             dp.aset_id

        WHERE dp.pembelian_id = $1
      `,
      [id]
    );


  return {
    ...pembelian,
    aset: detailResult.rows,
  };
}


// Implementasi lama, dipertahankan untuk penggunaan kembali:
// // Membuat pencatatan pembelian baru.
// async function createPembelian(
//   vendorId,
//   tahunAjaranId,
//   tanggal,
//   status,
//   catatan,
//   daftarAset
// ) {
// 
//   validateDaftarAset(daftarAset);
//   const client =
//     await pool.connect();
// 
// 
//   try {
// 
//     await client.query('BEGIN');
// 
// 
//     // Membuat header utama pembelian.
//     const pembelianResult =
//       await client.query(
//         `
//           INSERT INTO pembelian (
//             tanggal,
//             status,
//             catatan
//           )
// 
//           VALUES (
//             $1,
//             $2,
//             $3
//           )
// 
//           RETURNING *
//         `,
//         [
//           tanggal,
//           status,
//           catatan,
//         ]
//       );
// 
// 
//     const pembelian =
//       pembelianResult.rows[0];
// 
// 
//     // Menyimpan relasi pembelian
//     // dengan vendor dan Tahun Ajaran.
//     await client.query(
//       `
//         INSERT INTO header_pembelian (
//           pembelian_id,
//           vendor_id,
//           tahun_ajaran_id
//         )
// 
//         VALUES (
//           $1,
//           $2,
//           $3
//         )
//       `,
//       [
//         pembelian.pembelian_id,
//         vendorId,
//         tahunAjaranId,
//       ]
//     );
// 
// 
//     const affectedAset = [];
// 
// 
//     // Memproses setiap aset yang dibeli.
//     for (const item of daftarAset) {
// 
//       // Mengambil data aset sekaligus
//       // mengunci row selama transaction.
//       const asetResult =
//         await client.query(
//           `
//             SELECT *
//             FROM aset
// 
//             WHERE aset_id = $1
// 
//             FOR UPDATE
//           `,
//           [item.aset_id]
//         );
// 
// 
//       const aset =
//         asetResult.rows[0];
// 
// 
//       if (!aset) {
// 
//         throw new Error(
//           `Aset dengan id ${item.aset_id} tidak ditemukan`
//         );
//       }
// 
// 
//       const unitPrice = item.unit_price === undefined ? aset.harga : item.unit_price;
// 
//       // Simpan harga transaksi agar riwayat pembelian tetap akurat.
//       await client.query(
//         `
//           INSERT INTO detail_pembelian (
//             pembelian_id,
//             aset_id,
//             qty_in,
//             unit_price
//           )
// 
//           VALUES (
//             $1,
//             $2,
//             $3,
//             $4
//           )
//         `,
//         [
//           pembelian.pembelian_id,
//           item.aset_id,
//           item.qty_in,
//           unitPrice,
//         ]
//       );
// 
// 
//       // Menambahkan stok sesuai jumlah pembelian.
//       const updatedResult =
//         await client.query(
//           `
//             UPDATE aset
// 
//             SET stok = stok + $1, harga = $3
// 
//             WHERE aset_id = $2
// 
//             RETURNING *
//           `,
//           [
//             item.qty_in,
//             item.aset_id,
//             unitPrice,
//           ]
//         );
// 
// 
//       affectedAset.push(
//         updatedResult.rows[0]
//       );
//     }
// 
// 
//     await client.query('COMMIT');
// 
// 
//     // Mengecek threshold setelah transaction selesai.
//     for (const aset of affectedAset) {
// 
//       try { await checkStockThreshold(aset); }
//       catch (error) { console.error('Gagal memperbarui notifikasi stok:', error); }
//     }
// 
// 
//     return {
//       pembelian,
//       aset: affectedAset,
//     };
// 
//   } catch (err) {
// 
//     await client.query('ROLLBACK');
// 
//     throw err;
// 
//   } finally {
// 
//     client.release();
//   }
// }
// 
// 
// // Mengubah pencatatan pembelian.
// async function updatePembelian(
//   id,
//   vendorId,
//   tahunAjaranId,
//   tanggal,
//   status,
//   catatan,
//   daftarAset
// ) {
// 
//   validateDaftarAset(daftarAset);
//   const client =
//     await pool.connect();
// 
// 
//   try {
// 
//     await client.query('BEGIN');
// 
// 
//     // Mengambil dan mengunci pembelian lama.
//     const existingResult =
//       await client.query(
//         `
//           SELECT p.*, hp.tahun_ajaran_id
//           FROM pembelian p
//           JOIN header_pembelian hp ON hp.pembelian_id = p.pembelian_id
//           WHERE p.pembelian_id = $1
//           FOR UPDATE OF p, hp
//         `,
//         [id]
//       );
// 
// 
//     if (!existingResult.rows[0]) {
// 
//       await client.query('ROLLBACK');
// 
//       return null;
//     }
// 
// 
//     await assertPeriodeEdit(client, existingResult.rows[0].tahun_ajaran_id, tahunAjaranId, tanggal);
// 
//     // Mengambil detail pembelian lama.
//     const oldRows =
//       await client.query(
//         `
//           SELECT *
//           FROM detail_pembelian
// 
//           WHERE pembelian_id = $1
//         `,
//         [id]
//       );
// 
// 
//     // Kunci seluruh aset terdampak dalam urutan tetap, lalu hitung perubahan bersih.
//     const oldById = new Map(oldRows.rows.map(row => [Number(row.aset_id), row]));
//     const newById = new Map(daftarAset.map(row => [Number(row.aset_id), row]));
//     const affectedIds = [...new Set([...oldById.keys(), ...newById.keys()])].sort((a, b) => a - b);
//     const lockedAset = new Map();
//     const affectedAset = [];
//     for (const asetId of affectedIds) {
//       const result = await client.query(`SELECT * FROM aset WHERE aset_id = $1 FOR UPDATE`, [asetId]);
//       const aset = result.rows[0];
//       if (!aset) {
//         const error = new Error(`Aset dengan id ${asetId} tidak ditemukan`);
//         error.statusCode = 400;
//         throw error;
//       }
//       const delta = Number(newById.get(asetId)?.qty_in || 0) - Number(oldById.get(asetId)?.qty_in || 0);
//       if (Number(aset.stok) + delta < 0) {
//         const error = new Error(`Stok ${aset.nama} tidak mencukupi untuk mengurangi jumlah pembelian (tersedia ${aset.stok}, pengurangan ${-delta})`);
//         error.statusCode = 400;
//         throw error;
//       }
//       lockedAset.set(asetId, aset);
//     }
// 
//     // Aset yang dihapus dari pembelian juga perlu dikoreksi stoknya.
//     for (const asetId of affectedIds.filter(asetId => !newById.has(asetId))) {
//       const result = await client.query(`UPDATE aset SET stok = stok - $1 WHERE aset_id = $2 RETURNING *`,
//         [Number(oldById.get(asetId).qty_in), asetId]);
//       affectedAset.push(result.rows[0]);
//     }
// 
//     // Menghapus detail pembelian lama.
//     await client.query(
//       `
//         DELETE FROM detail_pembelian
// 
//         WHERE pembelian_id = $1
//       `,
//       [id]
//     );
// 
// 
//     // Mengubah data utama pembelian.
//     const pembelianResult =
//       await client.query(
//         `
//           UPDATE pembelian
// 
//           SET
//             tanggal = $1,
//             status = $2,
//             catatan = $3
// 
//           WHERE pembelian_id = $4
// 
//           RETURNING *
//         `,
//         [
//           tanggal,
//           status,
//           catatan,
//           id,
//         ]
//       );
// 
// 
//     const pembelian =
//       pembelianResult.rows[0];
// 
// 
//     // Mengubah vendor dan Tahun Ajaran.
//     await client.query(
//       `
//         UPDATE header_pembelian
// 
//         SET
//           vendor_id = $1,
//           tahun_ajaran_id = $2
// 
//         WHERE pembelian_id = $3
//       `,
//       [
//         vendorId,
//         tahunAjaranId,
//         id,
//       ]
//     );
// 
// 
//     // Simpan detail baru, memakai selisih jumlah untuk menyesuaikan stok.
//     for (const item of daftarAset) {
//       const aset = lockedAset.get(Number(item.aset_id));
// 
//       const oldDetail = oldRows.rows.find(row => Number(row.aset_id) === Number(item.aset_id));
//       const unitPrice = item.unit_price === undefined ? (oldDetail?.unit_price ?? aset.harga) : item.unit_price;
//       const updateHarga = !oldDetail || Number(unitPrice) !== Number(oldDetail.unit_price);
// 
//       // Edit metadata saja tidak mengembalikan harga aset ke harga transaksi lama.
//       await client.query(
//         `
//           INSERT INTO detail_pembelian (
//             pembelian_id,
//             aset_id,
//             qty_in,
//             unit_price
//           )
// 
//           VALUES (
//             $1,
//             $2,
//             $3,
//             $4
//           )
//         `,
//         [
//           id,
//           item.aset_id,
//           item.qty_in,
//           unitPrice,
//         ]
//       );
// 
// 
//       // Menambahkan stok berdasarkan
//       // qty pembelian terbaru.
//       const updatedResult =
//         await client.query(
//           `
//             UPDATE aset
// 
//             SET stok = stok + $1, harga = $3
// 
//             WHERE aset_id = $2
// 
//             RETURNING *
//           `,
//           [
//             Number(item.qty_in) - Number(oldDetail?.qty_in || 0),
//             item.aset_id,
//             updateHarga ? unitPrice : aset.harga,
//           ]
//         );
// 
// 
//       affectedAset.push(
//         updatedResult.rows[0]
//       );
//     }
// 
// 
//     await client.query('COMMIT');
// 
// 
//     for (const aset of affectedAset) {
// 
//       try { await checkStockThreshold(aset); }
//       catch (error) { console.error('Gagal memperbarui notifikasi stok:', error); }
//     }
// 
// 
//     return {
//       pembelian,
//       aset: affectedAset,
//     };
// 
//   } catch (err) {
// 
//     await client.query('ROLLBACK');
// 
//     throw err;
// 
//   } finally {
// 
//     client.release();
//   }
// }
// 
// 

// Stok dan harga hanya berasal dari pembelian Lunas.
// Semua perubahan status/detail dilakukan dalam transaksi yang sama dengan aset.
async function withPembelianTransaction(work) {
  const client = await pool.connect();
  let result;
  try {
    await client.query('BEGIN');
    result = await work(client);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  for (const aset of result?.aset || []) {
    try { await checkStockThreshold(aset); }
    catch (error) { console.error('Gagal memperbarui notifikasi stok:', error); }
  }
  return result;
}

async function lockAset(client, ids) {
  const locked = new Map();
  for (const id of [...new Set(ids.map(Number))].sort((a, b) => a - b)) {
    const { rows } = await client.query('SELECT * FROM aset WHERE aset_id = $1 FOR UPDATE', [id]);
    if (!rows[0]) {
      const error = new Error(`Aset dengan id ${id} tidak ditemukan`);
      error.statusCode = 400;
      throw error;
    }
    locked.set(id, rows[0]);
  }
  return locked;
}

async function insertDetail(client, id, item, unitPrice) {
  await client.query(`INSERT INTO detail_pembelian (pembelian_id, aset_id, qty_in, unit_price)
    VALUES ($1, $2, $3, $4)`, [id, item.aset_id, item.qty_in, unitPrice]);
}

async function applyPaidStock(client, asetId, delta) {
  // Harga mengikuti tanggal pembelian Lunas terbaru; ID memecah tanggal yang sama.
  // Jika seluruh pembelian Lunas dibatalkan, harga kembali 0 (belum ada harga pembelian).
  const { rows } = await client.query(`
    UPDATE aset SET stok = stok + $1,
      harga = COALESCE((
        SELECT dp.unit_price FROM detail_pembelian dp
        JOIN pembelian p ON p.pembelian_id = dp.pembelian_id
        WHERE dp.aset_id = $2 AND p.status = 'Lunas'
        ORDER BY p.tanggal DESC, p.pembelian_id DESC LIMIT 1
      ), 0)
    WHERE aset_id = $2 RETURNING *
  `, [delta, asetId]);
  return rows[0];
}

async function createPembelian(vendorId, tahunAjaranId, tanggal, status, catatan, daftarAset) {
  validateDaftarAset(daftarAset);
  return withPembelianTransaction(async client => {
    const { rows } = await client.query(`INSERT INTO pembelian (tanggal, status, catatan)
      VALUES ($1, $2, $3) RETURNING *`, [tanggal, status, catatan]);
    const pembelian = rows[0];
    await client.query(`INSERT INTO header_pembelian (pembelian_id, vendor_id, tahun_ajaran_id)
      VALUES ($1, $2, $3)`, [pembelian.pembelian_id, vendorId, tahunAjaranId]);
    const locked = await lockAset(client, daftarAset.map(item => item.aset_id));
    const affected = [];
    for (const item of daftarAset) {
      const aset = locked.get(Number(item.aset_id));
      await insertDetail(client, pembelian.pembelian_id, item, item.unit_price ?? aset.harga);
      if (status === 'Lunas') affected.push(await applyPaidStock(client, Number(item.aset_id), Number(item.qty_in)));
    }
    return { pembelian, aset: affected };
  });
}

async function lockPembelian(client, id) {
  const { rows } = await client.query(`
    SELECT p.*, hp.tahun_ajaran_id, hp.vendor_id FROM pembelian p
    JOIN header_pembelian hp ON hp.pembelian_id = p.pembelian_id
    WHERE p.pembelian_id = $1 FOR UPDATE OF p, hp
  `, [id]);
  return rows[0];
}

async function changePembelian(client, existing, vendorId, tahunAjaranId, tanggal, status, catatan, daftarAset, oldRows) {
  const id = existing.pembelian_id;
  const oldPaid = existing.status === 'Lunas';
  const newPaid = status === 'Lunas';
  const oldById = new Map(oldRows.map(row => [Number(row.aset_id), row]));
  const newById = new Map(daftarAset.map(row => [Number(row.aset_id), row]));
  const locked = await lockAset(client, [...oldById.keys(), ...newById.keys()]);
  const deltas = new Map();
  for (const [asetId, aset] of locked) {
    const delta = (newPaid ? Number(newById.get(asetId)?.qty_in || 0) : 0)
      - (oldPaid ? Number(oldById.get(asetId)?.qty_in || 0) : 0);
    if (Number(aset.stok) + delta < 0) {
      const error = new Error(`Stok ${aset.nama} tidak mencukupi untuk membatalkan atau mengurangi pembelian (tersedia ${aset.stok}, pengurangan ${-delta})`);
      error.statusCode = 400;
      throw error;
    }
    deltas.set(asetId, delta);
  }
  await client.query('DELETE FROM detail_pembelian WHERE pembelian_id = $1', [id]);
  const { rows } = await client.query(`UPDATE pembelian SET tanggal = $1, status = $2, catatan = $3
    WHERE pembelian_id = $4 RETURNING *`, [tanggal, status, catatan, id]);
  await client.query(`UPDATE header_pembelian SET vendor_id = $1, tahun_ajaran_id = $2
    WHERE pembelian_id = $3`, [vendorId, tahunAjaranId, id]);
  for (const item of daftarAset) {
    const asetId = Number(item.aset_id);
    const price = item.unit_price ?? oldById.get(asetId)?.unit_price ?? locked.get(asetId).harga;
    await insertDetail(client, id, item, price);
  }
  const affected = [];
  // Pembelian yang tetap belum lunas tidak menyentuh stok, harga, maupun notifikasi aset.
  for (const asetId of locked.keys()) {
    if ((oldPaid && oldById.has(asetId)) || (newPaid && newById.has(asetId))) {
      affected.push(await applyPaidStock(client, asetId, deltas.get(asetId)));
    }
  }
  return { pembelian: rows[0], aset: affected };
}

async function updatePembelian(id, vendorId, tahunAjaranId, tanggal, status, catatan, daftarAset) {
  validateDaftarAset(daftarAset);
  return withPembelianTransaction(async client => {
    const existing = await lockPembelian(client, id);
    if (!existing) return null;
    await assertPeriodeEdit(client, existing.tahun_ajaran_id, tahunAjaranId, tanggal);
    const { rows } = await client.query('SELECT * FROM detail_pembelian WHERE pembelian_id = $1', [id]);
    return changePembelian(client, existing, vendorId, tahunAjaranId, tanggal, status, catatan, daftarAset, rows);
  });
}

// Menyimpan informasi file bon pembelian.
async function uploadBonPembelian(
  id,
  originalName,
  fileName
) {

  const { rows } =
    await pool.query(
      `
        UPDATE pembelian

        SET
          nama_file = $1,
          url_file = $2

        WHERE pembelian_id = $3
          AND ${canEditSql('(SELECT hp.tahun_ajaran_id FROM header_pembelian hp WHERE hp.pembelian_id = pembelian.pembelian_id)')}

        RETURNING *
      `,
      [
        originalName,
        `/uploads/${fileName}`,
        id,
      ]
    );


  if (!rows.length) {
    const existing = await pool.query('SELECT 1 FROM pembelian WHERE pembelian_id = $1', [id]);
    if (existing.rows.length) throw editError();
  }
  return rows[0];
}


// Implementasi status lama, dipertahankan untuk penggunaan kembali:
// // Mengubah status pembayaran pembelian.
// async function updateStatusPembelian(
//   id,
//   status
// ) {
// 
//   const { rows } =
//     await pool.query(
//       `
//         UPDATE pembelian
// 
//         SET status = $1
// 
//         WHERE pembelian_id = $2
//           AND ${canEditSql('(SELECT hp.tahun_ajaran_id FROM header_pembelian hp WHERE hp.pembelian_id = pembelian.pembelian_id)')}
// 
//         RETURNING *
//       `,
//       [
//         status,
//         id,
//       ]
//     );
// 
// 
//   if (!rows.length) {
//     const existing = await pool.query('SELECT 1 FROM pembelian WHERE pembelian_id = $1', [id]);
//     if (existing.rows.length) throw editError();
//   }
//   return rows[0];
// }
// 

async function updateStatusPembelian(id, status) {
  const result = await withPembelianTransaction(async client => {
    const existing = await lockPembelian(client, id);
    if (!existing) return null;
    await assertPeriodeEdit(client, existing.tahun_ajaran_id);
    const { rows } = await client.query('SELECT * FROM detail_pembelian WHERE pembelian_id = $1', [id]);
    // Memakai alur transaksi yang sama agar PATCH status juga memperbarui aset tepat sekali.
    return changePembelian(client, existing, existing.vendor_id, existing.tahun_ajaran_id,
      existing.tanggal, status, existing.catatan, rows, rows);
  });
  return result?.pembelian;
}

module.exports = {
  getAllPembelian,
  getPembelianDetail,
  createPembelian,
  updatePembelian,
  uploadBonPembelian,
  updateStatusPembelian,
};
