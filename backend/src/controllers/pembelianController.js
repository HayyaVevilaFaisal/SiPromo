const pool = require('../config/db');
const { checkStockThreshold } = require('../utils/stockNotification');

// FR-13, FR-14, FR-15, FR-16, FR-17, UC-07 - Kelola Pencatatan Pembelian Aset
// Catatan revisi final:
// - "pembelian_aset" -> "detail_pembelian" (kolom aset_id)
// - "pembelian_vendor_tahun" -> "header_pembelian" (struktur sama, hanya berganti nama)

async function getAllPembelian(req, res, next) {
  try {
    const { tahunAjaranId } = req.query;
    const values = [];
    let where = '';
    if (tahunAjaranId) {
      where = 'WHERE hp.tahun_ajaran_id = $1';
      values.push(tahunAjaranId);
    }
    const { rows } = await pool.query(
      `SELECT p.*, v.nama AS vendor_nama, ta.tahun, ta.semester,
         COALESCE(SUM(dp.qty_in * dp.unit_price), 0) AS total_nilai
       FROM pembelian p
       JOIN header_pembelian hp ON hp.pembelian_id = p.pembelian_id
       JOIN vendor v ON v.vendor_id = hp.vendor_id
       JOIN tahun_ajaran ta ON ta.tahun_ajaran_id = hp.tahun_ajaran_id
       LEFT JOIN detail_pembelian dp ON dp.pembelian_id = p.pembelian_id
       ${where}
       GROUP BY p.pembelian_id, v.nama, ta.tahun, ta.semester
       ORDER BY p.tanggal DESC`,
      values
    );
    res.json(rows);
  } catch (err) { next(err); }
}

async function getPembelianDetail(req, res, next) {
  try {
    const { id } = req.params;
    const pembelian = await pool.query(
      `SELECT p.*, v.nama AS vendor_nama, ta.tahun, ta.semester
       FROM pembelian p
       JOIN header_pembelian hp ON hp.pembelian_id = p.pembelian_id
       JOIN vendor v ON v.vendor_id = hp.vendor_id
       JOIN tahun_ajaran ta ON ta.tahun_ajaran_id = hp.tahun_ajaran_id
       WHERE p.pembelian_id = $1`,
      [id]
    );
    if (!pembelian.rows[0]) return res.status(404).json({ message: 'Pembelian tidak ditemukan' });

    const detail = await pool.query(
      `SELECT dp.*, a.nama AS aset_nama
       FROM detail_pembelian dp
       JOIN aset a ON a.aset_id = dp.aset_id
       WHERE dp.pembelian_id = $1`,
      [id]
    );
    res.json({ ...pembelian.rows[0], aset: detail.rows });
  } catch (err) { next(err); }
}

// FR-13, FR-16, FR-17 - Catat pembelian (vendor + tahun ajaran + daftar aset), tambah stok (transaksional)
async function createPembelian(req, res, next) {
  const client = await pool.connect();
  try {
    const { vendor_id, tahun_ajaran_id, tanggal, status, catatan, daftar_aset } = req.body;
    // daftar_aset: [{ aset_id, qty_in, unit_price }]
    if (!vendor_id || !tahun_ajaran_id || !tanggal || !status || !Array.isArray(daftar_aset) || daftar_aset.length === 0) {
      return res.status(400).json({ message: 'Data pembelian dan minimal satu aset wajib diisi' });
    }

    await client.query('BEGIN');

    const pembelianRes = await client.query(
      'INSERT INTO pembelian (tanggal, status, catatan) VALUES ($1,$2,$3) RETURNING *',
      [tanggal, status, catatan]
    );
    const pembelian = pembelianRes.rows[0];

    await client.query(
      'INSERT INTO header_pembelian (pembelian_id, vendor_id, tahun_ajaran_id) VALUES ($1,$2,$3)',
      [pembelian.pembelian_id, vendor_id, tahun_ajaran_id]
    );

    const affectedAset = [];
    for (const item of daftar_aset) {
      await client.query(
        'INSERT INTO detail_pembelian (pembelian_id, aset_id, qty_in, unit_price) VALUES ($1,$2,$3,$4)',
        [pembelian.pembelian_id, item.aset_id, item.qty_in, item.unit_price]
      );
      const updatedRes = await client.query(
        'UPDATE aset SET stok = stok + $1 WHERE aset_id = $2 RETURNING *',
        [item.qty_in, item.aset_id]
      );
      affectedAset.push(updatedRes.rows[0]);
    }

    await client.query('COMMIT');

    for (const aset of affectedAset) {
      await checkStockThreshold(aset);
    }

    res.status(201).json({ pembelian, aset: affectedAset });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// TODO (belum diimplementasikan): updatePembelian.
// Perlu logika: kembalikan (revert) qty_in lama dari stok, baru terapkan qty_in baru (NFR-08).

// FR-15, NFR-12 - Unggah lampiran bon/bukti pembelian
async function uploadBonPembelian(req, res, next) {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ message: 'File bon pembelian wajib diunggah' });

    const { rows } = await pool.query(
      'UPDATE pembelian SET nama_file=$1, url_file=$2 WHERE pembelian_id=$3 RETURNING *',
      [req.file.originalname, `/uploads/${req.file.filename}`, id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Pembelian tidak ditemukan' });
    res.json(rows[0]);
  } catch (err) { next(err); }
}

// FR-14 - Ubah status pembayaran (belum dibayar / DP / sudah dibayar)
async function updateStatusPembelian(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { rows } = await pool.query(
      'UPDATE pembelian SET status=$1 WHERE pembelian_id=$2 RETURNING *',
      [status, id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Pembelian tidak ditemukan' });
    res.json(rows[0]);
  } catch (err) { next(err); }
}

async function archivePembelian(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('UPDATE pembelian SET is_active=false WHERE pembelian_id=$1 RETURNING *', [id]);
    if (!rows[0]) return res.status(404).json({ message: 'Pembelian tidak ditemukan' });
    res.json({ message: 'Pembelian berhasil diarsipkan', data: rows[0] });
  } catch (err) { next(err); }
}

module.exports = {
  getAllPembelian,
  getPembelianDetail,
  createPembelian,
  uploadBonPembelian,
  updateStatusPembelian,
  archivePembelian,
};
