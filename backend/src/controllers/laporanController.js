const pool = require('../config/db');
const PDFDocument = require('pdfkit');

// FR-18, UC-09 - Laporan penggunaan & pembelian per tahun ajaran
async function getLaporan(req, res, next) {
  try {
    const { tahunAjaranId } = req.query;
    if (!tahunAjaranId) return res.status(400).json({ message: 'Parameter tahunAjaranId wajib diisi' });

    const pembelian = await pool.query(
      `SELECT v.nama AS vendor, a.nama AS aset, dp.qty_in, dp.unit_price, (dp.qty_in * dp.unit_price) AS total
       FROM detail_pembelian dp
       JOIN header_pembelian hp ON hp.pembelian_id = dp.pembelian_id
       JOIN vendor v ON v.vendor_id = hp.vendor_id
       JOIN aset a ON a.aset_id = dp.aset_id
       WHERE hp.tahun_ajaran_id = $1`,
      [tahunAjaranId]
    );

    const penggunaan = await pool.query(
      `SELECT k.nama AS kegiatan, a.nama AS aset, ak.qty_out
       FROM aset_keluar ak
       JOIN kegiatan k ON k.kegiatan_id = ak.kegiatan_id
       JOIN aset a ON a.aset_id = ak.aset_id
       WHERE k.tahun_ajaran_id = $1`,
      [tahunAjaranId]
    );

    const stok = await pool.query('SELECT nama, stok, threshold_qty FROM aset WHERE is_active = true');

    res.json({
      rincian_pembelian: pembelian.rows,
      rincian_penggunaan: penggunaan.rows,
      rekap_stok: stok.rows,
    });
  } catch (err) { next(err); }
}

// FR-19, NFR-14, UC-10 - Ekspor laporan ke PDF
async function exportLaporanPdf(req, res, next) {
  try {
    const { tahunAjaranId } = req.query;
    if (!tahunAjaranId) return res.status(400).json({ message: 'Parameter tahunAjaranId wajib diisi' });

    const ta = await pool.query('SELECT * FROM tahun_ajaran WHERE tahun_ajaran_id = $1', [tahunAjaranId]);
    const pembelian = await pool.query(
      `SELECT v.nama AS vendor, a.nama AS aset, dp.qty_in, dp.unit_price
       FROM detail_pembelian dp
       JOIN header_pembelian hp ON hp.pembelian_id = dp.pembelian_id
       JOIN vendor v ON v.vendor_id = hp.vendor_id
       JOIN aset a ON a.aset_id = dp.aset_id
       WHERE hp.tahun_ajaran_id = $1`,
      [tahunAjaranId]
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=laporan-aset-promosi.pdf');

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    doc.fontSize(16).text('Laporan Aset Promosi', { align: 'center' });
    doc.fontSize(11).text('Program Studi Informatika UNPAR', { align: 'center' });
    if (ta.rows[0]) {
      doc.moveDown().fontSize(11).text(`Tahun Ajaran: ${ta.rows[0].tahun} - Semester ${ta.rows[0].semester}`);
    }
    doc.moveDown().fontSize(13).text('Rincian Pembelian', { underline: true });
    pembelian.rows.forEach((row) => {
      doc.fontSize(10).text(`${row.vendor} - ${row.aset} - Qty: ${row.qty_in} - Harga Satuan: Rp${row.unit_price}`);
    });

    doc.end();
  } catch (err) { next(err); }
}

module.exports = { getLaporan, exportLaporanPdf };
