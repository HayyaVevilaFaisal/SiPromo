const pool = require('../config/db');
const { canEditSql, assertPeriodeEdit } = require('../utils/periodeEdit');
const { checkStockThreshold } = require('../utils/stockNotification');

function buatError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function getAllStokOpname(tahunAjaranId) {
  const values = [];
  let where = '';
  if (tahunAjaranId) {
    where = 'WHERE so.tahun_ajaran_id = $1';
    values.push(tahunAjaranId);
  }
  const { rows } = await pool.query(`
    SELECT so.stok_opname_id, so.tanggal::text AS tanggal, so.catatan,
           so.tahun_ajaran_id, ta.tahun, ta.semester,
           ${canEditSql('so.tahun_ajaran_id')} AS can_edit,
           COUNT(d.aset_id)::integer AS jumlah_aset,
           COUNT(d.aset_id) FILTER (WHERE d.stok_fisik <> d.stok_sistem)::integer AS jumlah_selisih,
           COALESCE(SUM(d.stok_fisik - d.stok_sistem), 0)::integer AS total_selisih
    FROM stok_opname so
    JOIN tahun_ajaran ta ON ta.tahun_ajaran_id = so.tahun_ajaran_id
    JOIN detail_stok_opname d ON d.stok_opname_id = so.stok_opname_id
    ${where}
    GROUP BY so.stok_opname_id, ta.tahun, ta.semester
    ORDER BY so.tanggal DESC, so.stok_opname_id DESC
  `, values);
  return rows;
}

async function getStokOpnameDetail(id) {
  const { rows } = await pool.query(`
    SELECT so.stok_opname_id, so.tanggal::text AS tanggal, so.catatan,
           so.tahun_ajaran_id, ta.tahun, ta.semester,
           ${canEditSql('so.tahun_ajaran_id')} AS can_edit,
           ta.tanggal_mulai::text AS tanggal_mulai, ta.tanggal_selesai::text AS tanggal_selesai
    FROM stok_opname so
    JOIN tahun_ajaran ta ON ta.tahun_ajaran_id = so.tahun_ajaran_id
    WHERE so.stok_opname_id = $1
  `, [id]);
  if (!rows.length) return null;

  const detail = await pool.query(`
    SELECT d.aset_id, a.nama AS aset_nama, l.nama AS lokasi_nama,
           d.stok_sistem, d.stok_fisik,
           (d.stok_fisik - d.stok_sistem) AS selisih
    FROM detail_stok_opname d
    JOIN aset a ON a.aset_id = d.aset_id
    LEFT JOIN lokasi_penyimpanan l ON l.lokasi_penyimpanan_id = a.lokasi_penyimpanan_id
    WHERE d.stok_opname_id = $1
    ORDER BY a.nama, a.aset_id
  `, [id]);
  return { ...rows[0], daftar_aset: detail.rows };
}

async function createStokOpname({ tahun_ajaran_id, tanggal, catatan, daftar_aset }) {
  if (!Number.isInteger(Number(tahun_ajaran_id)) || Number(tahun_ajaran_id) <= 0 ||
      typeof tanggal !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal) ||
      !Array.isArray(daftar_aset) || daftar_aset.length === 0) {
    throw buatError('Tahun ajaran, tanggal, dan minimal satu aset wajib diisi.');
  }
  if (catatan != null && typeof catatan !== 'string') {
    throw buatError('Catatan tidak valid.');
  }

  const ids = new Set();
  for (const item of daftar_aset) {
    const id = Number(item.aset_id);
    const fisik = Number(item.stok_fisik);
    const sistem = Number(item.stok_sistem);
    if (!Number.isSafeInteger(id) || id <= 0 ||
        item.stok_fisik === '' || item.stok_fisik == null ||
        !Number.isSafeInteger(fisik) || fisik < 0 ||
        item.stok_sistem === '' || item.stok_sistem == null ||
        !Number.isSafeInteger(sistem) || sistem < 0 || ids.has(id)) {
      throw buatError('Daftar aset tidak valid, ada aset duplikat, atau stok belum diisi.');
    }
    ids.add(id);
  }

  const client = await pool.connect();
  let committed = false;
  const affectedAset = [];
  let opname;
  try {
    await client.query('BEGIN');
    const ta = await client.query(`
      SELECT tahun_ajaran_id FROM tahun_ajaran
      WHERE tahun_ajaran_id = $1 -- AND is_active = true -- Aturan master lama
        AND $2::date BETWEEN tanggal_mulai AND tanggal_selesai
    `, [tahun_ajaran_id, tanggal]);
    if (!ta.rowCount) {
//       throw buatError('Tanggal tidak termasuk tahun ajaran aktif yang dipilih.');
      throw buatError('Tanggal tidak termasuk tahun ajaran yang dipilih.');
    }

    // Kunci aset dalam urutan tetap supaya pembelian/penggunaan lain tidak mengubah stok saat opname.
    const asetRows = await client.query(`
      SELECT * FROM aset
      WHERE aset_id = ANY($1::integer[]) -- AND is_active = true -- Aturan master lama
      ORDER BY aset_id FOR UPDATE
    `, [[...ids].sort((a, b) => a - b)]);
    if (asetRows.rowCount !== ids.size) {
//       throw buatError('Ada aset yang tidak ditemukan atau sudah nonaktif.');
      throw buatError('Ada aset yang tidak ditemukan.');
    }
    const asetById = new Map(asetRows.rows.map((aset) => [aset.aset_id, aset]));

    // Minta pengguna memuat ulang jika stok berubah sejak form dibuka.
    for (const item of daftar_aset) {
      const aset = asetById.get(Number(item.aset_id));
      if (aset.stok !== Number(item.stok_sistem)) {
        throw buatError(`Stok ${aset.nama} telah berubah. Muat ulang form sebelum menyimpan.`, 409);
      }
    }

    const header = await client.query(`
      INSERT INTO stok_opname (tahun_ajaran_id, tanggal, catatan)
      VALUES ($1, $2, $3) RETURNING stok_opname_id
    `, [tahun_ajaran_id, tanggal, catatan?.trim() || null]);
    const idOpname = header.rows[0].stok_opname_id;

    for (const item of daftar_aset) {
      const aset = asetById.get(Number(item.aset_id));
      const stokFisik = Number(item.stok_fisik);
      await client.query(`
        INSERT INTO detail_stok_opname (stok_opname_id, aset_id, stok_sistem, stok_fisik)
        VALUES ($1, $2, $3, $4)
      `, [idOpname, aset.aset_id, aset.stok, stokFisik]);
      if (aset.stok !== stokFisik) {
        const updated = await client.query(`
          UPDATE aset SET stok = $1 WHERE aset_id = $2 RETURNING *
        `, [stokFisik, aset.aset_id]);
        affectedAset.push(updated.rows[0]);
      }
    }
    await client.query('COMMIT');
    committed = true;
    opname = await getStokOpnameDetail(idOpname);
  } catch (error) {
    if (!committed) await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  // Notifikasi diperbarui setelah transaksi selesai; kegagalannya tidak membatalkan opname.
  for (const aset of affectedAset) {
    try {
      await checkStockThreshold(aset);
    } catch (error) {
      console.error('Gagal memperbarui notifikasi stok:', error);
    }
  }
  return opname;
}

// Koreksi selisih lama, dengan tetap mempertahankan transaksi stok setelah opname.
async function updateStokOpname(id, { tanggal, catatan, daftar_aset, original }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal || '') ||
      (catatan != null && typeof catatan !== 'string') ||
      !Array.isArray(daftar_aset) || !daftar_aset.length ||
      !original || !Array.isArray(original.daftar_aset)) {
    throw buatError('Data perubahan stok opname tidak valid.');
  }
  const ids = new Set();
  for (const item of daftar_aset) {
    if (!item || !Number.isSafeInteger(Number(item.aset_id)) || Number(item.aset_id) <= 0 ||
        item.stok_fisik === '' || item.stok_fisik == null ||
        !Number.isSafeInteger(Number(item.stok_fisik)) || Number(item.stok_fisik) < 0 ||
        ids.has(Number(item.aset_id))) {
      throw buatError('Daftar aset tidak valid, ada aset duplikat, atau stok belum diisi.');
    }
    ids.add(Number(item.aset_id));
  }
  const client = await pool.connect();
  let committed = false;
  const affectedAset = [];
  try {
    await client.query('BEGIN');
    const header = await client.query(`
      SELECT so.*, so.tanggal::text AS tanggal
      FROM stok_opname so WHERE stok_opname_id = $1 FOR UPDATE
    `, [id]);
    if (!header.rowCount) throw buatError('Stok opname tidak ditemukan.', 404);
    const opname = header.rows[0];
    await assertPeriodeEdit(client, opname.tahun_ajaran_id, opname.tahun_ajaran_id, tanggal);
    const detail = await client.query(`
      SELECT aset_id, stok_sistem, stok_fisik FROM detail_stok_opname
      WHERE stok_opname_id = $1 ORDER BY aset_id FOR UPDATE
    `, [id]);
    const originalById = new Map(original.daftar_aset.map(item => [Number(item?.aset_id), item]));
    if (opname.tanggal !== original.tanggal || (opname.catatan || '') !== (original.catatan || '') ||
        original.daftar_aset.length !== detail.rows.length || originalById.size !== detail.rows.length ||
        detail.rows.some(item => {
          const previous = originalById.get(item.aset_id);
          return !previous || Number(previous.stok_fisik) !== item.stok_fisik ||
            Number(previous.stok_sistem) !== item.stok_sistem;
        })) {
      throw buatError('Catatan stok opname telah berubah. Buka ulang form sebelum menyimpan.', 409);
    }
    if (ids.size !== detail.rows.length || detail.rows.some(item => !ids.has(item.aset_id))) {
      throw buatError('Daftar aset harus sama dengan pencatatan stok opname awal.');
    }
    const ta = await client.query(`
      SELECT tahun_ajaran_id FROM tahun_ajaran
      WHERE tahun_ajaran_id = $1 AND $2::date BETWEEN tanggal_mulai AND tanggal_selesai
    `, [opname.tahun_ajaran_id, tanggal]);
    if (!ta.rowCount) throw buatError('Tanggal tidak termasuk tahun ajaran pencatatan ini.');
    const asetRows = await client.query(`
      SELECT * FROM aset WHERE aset_id = ANY($1::integer[])
      ORDER BY aset_id FOR UPDATE
    `, [[...ids].sort((a, b) => a - b)]);
    if (asetRows.rowCount !== ids.size) throw buatError('Ada aset yang tidak ditemukan.');
    const asetById = new Map(asetRows.rows.map(item => [item.aset_id, item]));
    const detailById = new Map(detail.rows.map(item => [item.aset_id, item]));
    for (const item of daftar_aset) {
      const asetId = Number(item.aset_id);
      const aset = asetById.get(asetId);
      const previous = detailById.get(asetId);
      const stokFisik = Number(item.stok_fisik);
      // Baseline stok_sistem tetap: selisih baru - selisih lama = fisik baru - fisik lama.
      const koreksi = stokFisik - previous.stok_fisik;
      const stokBaru = aset.stok + koreksi;
      if (!Number.isSafeInteger(stokBaru) || stokBaru < 0 || stokBaru > 2147483647) {
        throw buatError(`Koreksi stok ${aset.nama} menghasilkan stok sistem tidak valid (${stokBaru}).`);
      }
      await client.query(`
        UPDATE detail_stok_opname SET stok_fisik = $1
        WHERE stok_opname_id = $2 AND aset_id = $3
      `, [stokFisik, id, asetId]);
      if (koreksi !== 0) {
        const updated = await client.query(`
          UPDATE aset SET stok = $1 WHERE aset_id = $2 RETURNING *
        `, [stokBaru, asetId]);
        affectedAset.push(updated.rows[0]);
      }
    }
    await client.query(`
      UPDATE stok_opname SET tanggal = $1, catatan = $2 WHERE stok_opname_id = $3
    `, [tanggal, catatan?.trim() || null, id]);
    await client.query('COMMIT');
    committed = true;
  } catch (error) {
    if (!committed) await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  for (const aset of affectedAset) {
    try { await checkStockThreshold(aset); }
    catch (error) { console.error('Gagal memperbarui notifikasi stok:', error); }
  }
  return getStokOpnameDetail(id);
}

module.exports = { 
    getAllStokOpname,
    getStokOpnameDetail, 
    createStokOpname,
    updateStokOpname
};