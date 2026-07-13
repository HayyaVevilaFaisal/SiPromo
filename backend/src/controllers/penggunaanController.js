const pool = require('../config/db');
const { checkStockThreshold } = require('../utils/stockNotification');

// FR-10, FR-11, FR-12, UC-06 - Kelola Pencatatan Penggunaan Suvenir
// Catatan revisi final: tabel penghubung "kegiatan_suvenir" berganti nama menjadi "aset_keluar"
// dengan kolom "aset_id" (dahulu suvenir_id). Kolom "skala" pada tabel kegiatan DIHAPUS pada
// revisi final, sehingga tidak lagi dikirim/disimpan di sini.

async function getAllKegiatan(req, res, next) {
  try {
    const { tahunAjaranId } = req.query;
    const values = [];
    let where = '';
    if (tahunAjaranId) {
      where = 'WHERE k.tahun_ajaran_id = $1';
      values.push(tahunAjaranId);
    }
    const { rows } = await pool.query(
      `SELECT k.*, ta.tahun, ta.semester, COALESCE(SUM(ak.qty_out), 0) AS total_qty_out
       FROM kegiatan k
       LEFT JOIN tahun_ajaran ta ON ta.tahun_ajaran_id = k.tahun_ajaran_id
       LEFT JOIN aset_keluar ak ON ak.kegiatan_id = k.kegiatan_id
       ${where}
       GROUP BY k.kegiatan_id, ta.tahun, ta.semester
       ORDER BY k.tanggal DESC`,
      values
    );
    res.json(rows);
  } catch (err) { next(err); }
}

async function getKegiatanDetail(req, res, next) {
  try {
    const { id } = req.params;
    const kegiatan = await pool.query('SELECT * FROM kegiatan WHERE kegiatan_id = $1', [id]);
    if (!kegiatan.rows[0]) return res.status(404).json({ message: 'Kegiatan tidak ditemukan' });
    const detail = await pool.query(
      `SELECT ak.*, a.nama AS aset_nama, a.harga
       FROM aset_keluar ak
       JOIN aset a ON a.aset_id = ak.aset_id
       WHERE ak.kegiatan_id = $1`,
      [id]
    );
    res.json({ ...kegiatan.rows[0], aset: detail.rows });
  } catch (err) { next(err); }
}

// FR-10, FR-11 - Catat kegiatan + daftar aset yang digunakan, lalu kurangi stok (transaksional)
async function createPenggunaan(req, res, next) {
  const client = await pool.connect();
  try {
    const { tahun_ajaran_id, nama, tanggal, catatan, daftar_aset } = req.body;
    // daftar_aset: [{ aset_id, qty_out }]
    if (!nama || !tanggal || !Array.isArray(daftar_aset) || daftar_aset.length === 0) {
      return res.status(400).json({ message: 'Data kegiatan dan minimal satu aset wajib diisi' });
    }

    await client.query('BEGIN');

    const kegiatanResult = await client.query(
      `INSERT INTO kegiatan (tahun_ajaran_id, nama, tanggal, catatan)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [tahun_ajaran_id, nama, tanggal, catatan]
    );
    const kegiatan = kegiatanResult.rows[0];

    const affectedAset = [];
    for (const item of daftar_aset) {
      const asetRes = await client.query(
        'SELECT * FROM aset WHERE aset_id = $1 FOR UPDATE',
        [item.aset_id]
      );
      const aset = asetRes.rows[0];
      if (!aset) throw new Error(`Aset dengan id ${item.aset_id} tidak ditemukan`);
      if (aset.stok < item.qty_out) {
        throw new Error(`Stok ${aset.nama} tidak mencukupi (tersedia ${aset.stok})`);
      }

      await client.query(
        'INSERT INTO aset_keluar (kegiatan_id, aset_id, qty_out) VALUES ($1,$2,$3)',
        [kegiatan.kegiatan_id, item.aset_id, item.qty_out]
      );

      const updatedRes = await client.query(
        'UPDATE aset SET stok = stok - $1 WHERE aset_id = $2 RETURNING *',
        [item.qty_out, item.aset_id]
      );
      affectedAset.push(updatedRes.rows[0]);
    }

    await client.query('COMMIT');

    // NFR-08, NFR-09, FR-09 - cek threshold setelah transaksi berhasil
    for (const aset of affectedAset) {
      await checkStockThreshold(aset);
    }

    res.status(201).json({ kegiatan, aset: affectedAset });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// TODO (belum diimplementasikan): updatePenggunaan.
// Perlu logika: kembalikan (revert) qty_out lama ke stok, baru terapkan qty_out baru,
// semuanya dalam satu transaksi agar stok tetap konsisten (NFR-08).

async function archiveKegiatan(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('UPDATE kegiatan SET is_active=false WHERE kegiatan_id=$1 RETURNING *', [id]);
    if (!rows[0]) return res.status(404).json({ message: 'Kegiatan tidak ditemukan' });
    res.json({ message: 'Pencatatan penggunaan berhasil diarsipkan', data: rows[0] });
  } catch (err) { next(err); }
}

module.exports = { getAllKegiatan, getKegiatanDetail, createPenggunaan, archiveKegiatan };
