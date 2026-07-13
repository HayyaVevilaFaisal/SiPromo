const pool = require('../config/db');

// FR-05, UC-03 - Kelola Data Vendor
// Catatan revisi final: kolom "catatan" berganti nama menjadi "alamat" dan sekarang WAJIB diisi
// (bisa berupa alamat fisik atau tautan toko online, sesuai constraint ck_vendor_alamat_tidak_kosong).

async function getAllVendor(req, res, next) {
  try {
    const { search, status } = req.query;
    const conditions = [];
    const values = [];
    let idx = 1;
    if (search) { conditions.push(`nama ILIKE $${idx++}`); values.push(`%${search}%`); }
    if (status === 'aktif') conditions.push('is_active = true');
    else if (status === 'arsip') conditions.push('is_active = false');
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(`SELECT * FROM vendor ${where} ORDER BY nama ASC`, values);
    res.json(rows);
  } catch (err) { next(err); }
}

async function createVendor(req, res, next) {
  try {
    const { nama, alamat, nomor_handphone, email } = req.body;
    if (!nama || !alamat || !alamat.trim()) {
      return res.status(400).json({ message: 'Nama dan alamat/tautan toko vendor wajib diisi' });
    }
    const { rows } = await pool.query(
      'INSERT INTO vendor (nama, alamat, nomor_handphone, email) VALUES ($1,$2,$3,$4) RETURNING *',
      [nama, alamat, nomor_handphone, email]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
}

async function updateVendor(req, res, next) {
  try {
    const { id } = req.params;
    const { nama, alamat, nomor_handphone, email } = req.body;
    if (!alamat || !alamat.trim()) {
      return res.status(400).json({ message: 'Alamat/tautan toko vendor wajib diisi' });
    }
    const { rows } = await pool.query(
      'UPDATE vendor SET nama=$1, alamat=$2, nomor_handphone=$3, email=$4 WHERE vendor_id=$5 RETURNING *',
      [nama, alamat, nomor_handphone, email, id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Vendor tidak ditemukan' });
    res.json(rows[0]);
  } catch (err) { next(err); }
}

async function archiveVendor(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('UPDATE vendor SET is_active=false WHERE vendor_id=$1 RETURNING *', [id]);
    if (!rows[0]) return res.status(404).json({ message: 'Vendor tidak ditemukan' });
    res.json({ message: 'Vendor berhasil diarsipkan', data: rows[0] });
  } catch (err) { next(err); }
}

async function restoreVendor(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('UPDATE vendor SET is_active=true WHERE vendor_id=$1 RETURNING *', [id]);
    if (!rows[0]) return res.status(404).json({ message: 'Vendor tidak ditemukan' });
    res.json({ message: 'Vendor berhasil dipulihkan', data: rows[0] });
  } catch (err) { next(err); }
}

module.exports = { getAllVendor, createVendor, updateVendor, archiveVendor, restoreVendor };
