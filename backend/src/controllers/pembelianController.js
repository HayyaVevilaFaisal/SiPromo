const pool = require('../config/db');
const { checkStockThreshold } = require('../utils/stockNotification');

// FR-13, FR-14, FR-15, FR-16, FR-17, UC-07 - Kelola Pencatatan Pembelian Aset
// Catatan revisi final:
// - "pembelian_aset" -> "detail_pembelian" (kolom aset_id)
// - "pembelian_vendor_tahun" -> "header_pembelian" (struktur sama, hanya berganti nama)

// Status pembayaran hanya boleh salah satu dari tiga nilai ini (ck_pembelian_status di schema.sql)
const STATUS_PEMBELIAN = ['Belum Bayar', 'DP', 'Lunas'];

async function getAllPembelian(req, res, next) {
  try {
    const { tahunAjaranId, search, status, statusPembelian } = req.query;
    const conditions = [];
    const values = [];
    let idx = 1;
    if (tahunAjaranId) {
      conditions.push(`hp.tahun_ajaran_id = $${idx++}`);
      values.push(tahunAjaranId);
    }
    if (search) {
      conditions.push(`(v.nama ILIKE $${idx} OR p.catatan ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }
    if (status === 'aktif') conditions.push('p.is_active = true');
    else if (status === 'arsip') conditions.push('p.is_active = false');
    if (statusPembelian) {
      conditions.push(`p.status = $${idx++}`);
      values.push(statusPembelian);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    // daftar_aset diagregasi langsung di sini (pola sama seperti getAllKegiatan) supaya
    // daftar item tiap pembelian bisa langsung ditampilkan di halaman daftar tanpa N+1 request.
    const { rows } = await pool.query(
      `SELECT p.*, hp.vendor_id, hp.tahun_ajaran_id, v.nama AS vendor_nama, ta.tahun, ta.semester,
         COALESCE(SUM(dp.qty_in * dp.unit_price), 0) AS total_nilai,
         COALESCE(
           json_agg(
             json_build_object(
               'aset_id', a.aset_id,
               'aset_nama', a.nama,
               'dimensi_nama', d.nama,
               'qty_in', dp.qty_in,
               'unit_price', dp.unit_price
             ) ORDER BY a.nama
           ) FILTER (WHERE dp.aset_id IS NOT NULL), '[]'
         ) AS daftar_aset
       FROM pembelian p
       JOIN header_pembelian hp ON hp.pembelian_id = p.pembelian_id
       JOIN vendor v ON v.vendor_id = hp.vendor_id
       JOIN tahun_ajaran ta ON ta.tahun_ajaran_id = hp.tahun_ajaran_id
       LEFT JOIN detail_pembelian dp ON dp.pembelian_id = p.pembelian_id
       LEFT JOIN aset a ON a.aset_id = dp.aset_id
       LEFT JOIN dimensi_aset d ON d.dimensi_aset_id = a.dimensi_aset_id
       ${where}
       GROUP BY p.pembelian_id, hp.vendor_id, hp.tahun_ajaran_id, v.nama, ta.tahun, ta.semester
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
    // daftar_aset: [{ aset_id, qty_in }] - unit_price TIDAK diambil dari klien, selalu
    // diturunkan dari harga aset saat ini (kolom aset.harga) agar tidak bisa dimanipulasi
    // dan konsisten dengan katalog harga.
    if (!vendor_id || !tahun_ajaran_id || !tanggal || !status || !Array.isArray(daftar_aset) || daftar_aset.length === 0) {
      return res.status(400).json({ message: 'Data pembelian dan minimal satu aset wajib diisi' });
    }
    if (!STATUS_PEMBELIAN.includes(status)) {
      return res.status(400).json({ message: `Status pembelian tidak valid (harus salah satu dari: ${STATUS_PEMBELIAN.join(', ')})` });
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
      const asetRes = await client.query('SELECT * FROM aset WHERE aset_id = $1 FOR UPDATE', [item.aset_id]);
      const asetRow = asetRes.rows[0];
      if (!asetRow) throw new Error(`Aset dengan id ${item.aset_id} tidak ditemukan`);

      await client.query(
        'INSERT INTO detail_pembelian (pembelian_id, aset_id, qty_in, unit_price) VALUES ($1,$2,$3,$4)',
        [pembelian.pembelian_id, item.aset_id, item.qty_in, asetRow.harga]
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

// FR-13, FR-16, FR-17 - Ubah pembelian + daftar aset: qty_in lama dikembalikan (dikurangkan)
// dari stok dulu, baru qty_in baru diterapkan, semuanya dalam satu transaksi (NFR-08).
async function updatePembelian(req, res, next) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { vendor_id, tahun_ajaran_id, tanggal, status, catatan, daftar_aset } = req.body;
    if (!vendor_id || !tahun_ajaran_id || !tanggal || !status || !Array.isArray(daftar_aset) || daftar_aset.length === 0) {
      return res.status(400).json({ message: 'Data pembelian dan minimal satu aset wajib diisi' });
    }
    if (!STATUS_PEMBELIAN.includes(status)) {
      return res.status(400).json({ message: `Status pembelian tidak valid (harus salah satu dari: ${STATUS_PEMBELIAN.join(', ')})` });
    }

    await client.query('BEGIN');

    const existing = await client.query('SELECT * FROM pembelian WHERE pembelian_id = $1 FOR UPDATE', [id]);
    if (!existing.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Pembelian tidak ditemukan' });
    }

    const oldRows = await client.query('SELECT * FROM detail_pembelian WHERE pembelian_id = $1', [id]);
    for (const row of oldRows.rows) {
      const asetRes = await client.query('SELECT * FROM aset WHERE aset_id = $1 FOR UPDATE', [row.aset_id]);
      const aset = asetRes.rows[0];
      if (aset && aset.stok < row.qty_in) {
        throw new Error(`Stok ${aset.nama} tidak mencukupi untuk membatalkan pembelian lama (tersedia ${aset.stok}, dibutuhkan ${row.qty_in})`);
      }
      await client.query('UPDATE aset SET stok = stok - $1 WHERE aset_id = $2', [row.qty_in, row.aset_id]);
    }
    await client.query('DELETE FROM detail_pembelian WHERE pembelian_id = $1', [id]);

    const pembelianRes = await client.query(
      'UPDATE pembelian SET tanggal=$1, status=$2, catatan=$3 WHERE pembelian_id=$4 RETURNING *',
      [tanggal, status, catatan, id]
    );
    const pembelian = pembelianRes.rows[0];

    await client.query(
      'UPDATE header_pembelian SET vendor_id=$1, tahun_ajaran_id=$2 WHERE pembelian_id=$3',
      [vendor_id, tahun_ajaran_id, id]
    );

    const affectedAset = [];
    for (const item of daftar_aset) {
      const newAsetRes = await client.query('SELECT * FROM aset WHERE aset_id = $1 FOR UPDATE', [item.aset_id]);
      const newAsetRow = newAsetRes.rows[0];
      if (!newAsetRow) throw new Error(`Aset dengan id ${item.aset_id} tidak ditemukan`);

      await client.query(
        'INSERT INTO detail_pembelian (pembelian_id, aset_id, qty_in, unit_price) VALUES ($1,$2,$3,$4)',
        [id, item.aset_id, item.qty_in, newAsetRow.harga]
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

    res.json({ pembelian, aset: affectedAset });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

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
    if (!STATUS_PEMBELIAN.includes(status)) {
      return res.status(400).json({ message: `Status pembelian tidak valid (harus salah satu dari: ${STATUS_PEMBELIAN.join(', ')})` });
    }
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
  updatePembelian,
  uploadBonPembelian,
  updateStatusPembelian,
  archivePembelian,
};
