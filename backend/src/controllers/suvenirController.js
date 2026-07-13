const pool = require('../config/db');
const { checkStockThreshold } = require('../utils/stockNotification');

// FR-03, FR-04, UC-01 - Kelola Data Suvenir
// Catatan revisi final: tabel fisik bernama "aset" (dahulu "suvenir"), primary key "aset_id".
// vendor_id sudah TIDAK ada di tabel aset (vendor kini hanya terhubung lewat transaksi pembelian
// melalui header_pembelian), dan dimensi_suvenir_id sekarang boleh NULL (opsional).

async function getAllSuvenir(req, res, next) {
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
      conditions.push(`s.dimensi_suvenir_id = $${idx++}`);
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
      `SELECT s.*, d.nama AS dimensi_nama, l.nama AS lokasi_nama
       FROM aset s
       LEFT JOIN dimensi_suvenir d ON d.dimensi_suvenir_id = s.dimensi_suvenir_id
       LEFT JOIN lokasi_penyimpanan l ON l.lokasi_penyimpanan_id = s.lokasi_penyimpanan_id
       ${whereClause}
       ORDER BY s.nama ASC`,
      values
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function getSuvenirById(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM aset WHERE aset_id = $1', [id]);
    if (!rows[0]) return res.status(404).json({ message: 'Suvenir tidak ditemukan' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

async function createSuvenir(req, res, next) {
  try {
    const { nama, dimensi_suvenir_id, lokasi_penyimpanan_id, harga, stok, threshold_qty } = req.body;
    if (!nama || !lokasi_penyimpanan_id || harga == null) {
      return res.status(400).json({ message: 'Data suvenir belum lengkap' });
    }

    const { rows } = await pool.query(
      `INSERT INTO aset (nama, dimensi_suvenir_id, lokasi_penyimpanan_id, harga, stok, threshold_qty)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [nama, dimensi_suvenir_id || null, lokasi_penyimpanan_id, harga, stok || 0, threshold_qty || 0]
    );

    await checkStockThreshold(rows[0]);
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
}

async function updateSuvenir(req, res, next) {
  try {
    const { id } = req.params;
    const { nama, dimensi_suvenir_id, lokasi_penyimpanan_id, harga, stok, threshold_qty } = req.body;

    const { rows } = await pool.query(
      `UPDATE aset
       SET nama=$1, dimensi_suvenir_id=$2, lokasi_penyimpanan_id=$3, harga=$4, stok=$5, threshold_qty=$6
       WHERE aset_id=$7 RETURNING *`,
      [nama, dimensi_suvenir_id || null, lokasi_penyimpanan_id, harga, stok, threshold_qty, id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Suvenir tidak ditemukan' });

    await checkStockThreshold(rows[0]);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

async function archiveSuvenir(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      'UPDATE aset SET is_active = false WHERE aset_id = $1 RETURNING *',
      [id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Suvenir tidak ditemukan' });
    res.json({ message: 'Suvenir berhasil diarsipkan', data: rows[0] });
  } catch (err) {
    next(err);
  }
}

async function restoreSuvenir(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      'UPDATE aset SET is_active = true WHERE aset_id = $1 RETURNING *',
      [id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Suvenir tidak ditemukan' });
    res.json({ message: 'Suvenir berhasil dipulihkan', data: rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllSuvenir,
  getSuvenirById,
  createSuvenir,
  updateSuvenir,
  archiveSuvenir,
  restoreSuvenir,
};
