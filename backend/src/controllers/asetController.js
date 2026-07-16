const pool = require('../config/db');
const { checkStockThreshold } = require('../utils/stockNotification');

// FR-03, FR-04, UC-01 - Kelola Data Aset
// vendor_id sudah TIDAK ada di tabel aset (vendor kini hanya terhubung lewat transaksi pembelian
// melalui header_pembelian), dan dimensi_aset_id sekarang boleh NULL (opsional).

async function getAllAset(req, res, next) {
  try {
    const { search, dimensi, status, hargaMin, hargaMax } = req.query;
    const conditions = [];
    const values = [];
    let idx = 1;

    if (search) {
      conditions.push(`s.nama ILIKE $${idx++}`);
      values.push(`%${search}%`);
    }
    if (dimensi) {
      conditions.push(`s.dimensi_aset_id = $${idx++}`);
      values.push(dimensi);
    }
    if (status === 'aktif') conditions.push('s.is_active = true');
    else if (status === 'arsip') conditions.push('s.is_active = false');
    if (hargaMin) {
      conditions.push(`s.harga >= $${idx++}`);
      values.push(hargaMin);
    }
    if (hargaMax) {
      conditions.push(`s.harga <= $${idx++}`);
      values.push(hargaMax);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT s.*, d.nama AS dimensi_nama, l.nama AS lokasi_nama, l.is_active AS lokasi_is_active, v.nama AS vendor_nama
       FROM aset s
       LEFT JOIN dimensi_aset d ON d.dimensi_aset_id = s.dimensi_aset_id
       LEFT JOIN lokasi_penyimpanan l ON l.lokasi_penyimpanan_id = s.lokasi_penyimpanan_id
       LEFT JOIN (
         SELECT DISTINCT ON (dp.aset_id) dp.aset_id, hp.vendor_id
         FROM detail_pembelian dp
         JOIN pembelian p ON p.pembelian_id = dp.pembelian_id
         JOIN header_pembelian hp ON hp.pembelian_id = dp.pembelian_id
         ORDER BY dp.aset_id, p.tanggal DESC, dp.pembelian_id DESC
       ) latest ON latest.aset_id = s.aset_id
       LEFT JOIN vendor v ON v.vendor_id = latest.vendor_id
       ${whereClause}
       ORDER BY s.nama ASC`,
      values
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function getAsetById(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM aset WHERE aset_id = $1', [id]);
    if (!rows[0]) return res.status(404).json({ message: 'Aset tidak ditemukan' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

async function createAset(req, res, next) {
  try {
    const { nama, dimensi_aset_id, lokasi_penyimpanan_id, harga, stok, threshold_qty } = req.body;
    if (!nama || !lokasi_penyimpanan_id || harga == null) {
      return res.status(400).json({ message: 'Data aset belum lengkap' });
    }

    const { rows } = await pool.query(
      `INSERT INTO aset (nama, dimensi_aset_id, lokasi_penyimpanan_id, harga, stok, threshold_qty)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [nama, dimensi_aset_id || null, lokasi_penyimpanan_id, harga, stok || 0, threshold_qty || 0]
    );

    await checkStockThreshold(rows[0]);
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
}

async function updateAset(req, res, next) {
  try {
    const { id } = req.params;
    const { nama, dimensi_aset_id, lokasi_penyimpanan_id, harga, stok, threshold_qty } = req.body;

    const { rows } = await pool.query(
      `UPDATE aset
       SET nama=$1, dimensi_aset_id=$2, lokasi_penyimpanan_id=$3, harga=$4, stok=$5, threshold_qty=$6
       WHERE aset_id=$7 RETURNING *`,
      [nama, dimensi_aset_id || null, lokasi_penyimpanan_id, harga, stok, threshold_qty, id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Aset tidak ditemukan' });

    await checkStockThreshold(rows[0]);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

async function archiveAset(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      'UPDATE aset SET is_active = false WHERE aset_id = $1 RETURNING *',
      [id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Aset tidak ditemukan' });
    res.json({ message: 'Aset berhasil diarsipkan', data: rows[0] });
  } catch (err) {
    next(err);
  }
}

async function restoreAset(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      'UPDATE aset SET is_active = true WHERE aset_id = $1 RETURNING *',
      [id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Aset tidak ditemukan' });
    res.json({ message: 'Aset berhasil dipulihkan', data: rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllAset,
  getAsetById,
  createAset,
  updateAset,
  archiveAset,
  restoreAset,
};
