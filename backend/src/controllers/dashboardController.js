const pool = require('../config/db');

// FR-02, UC-08 - Dashboard Ringkasan Aset
async function getRingkasan(req, res, next) {
  try {
    const { tahunAjaranId } = req.query;

    const totalStok = await pool.query(
      'SELECT COALESCE(SUM(stok),0) AS total FROM aset WHERE is_active = true'
    );
    const perluRestock = await pool.query(
      'SELECT COUNT(*) AS total FROM aset WHERE stok < threshold_qty AND is_active = true'
    );

    const values = tahunAjaranId ? [tahunAjaranId] : [];
    const whereKegiatan = tahunAjaranId ? 'WHERE k.tahun_ajaran_id = $1' : '';
    const wherePembelian = tahunAjaranId ? 'WHERE hp.tahun_ajaran_id = $1' : '';

    const totalPenggunaan = await pool.query(
      `SELECT COALESCE(SUM(ak.qty_out),0) AS total
       FROM aset_keluar ak JOIN kegiatan k ON k.kegiatan_id = ak.kegiatan_id
       ${whereKegiatan}`,
      values
    );

    const nilaiPembelian = await pool.query(
      `SELECT COALESCE(SUM(dp.qty_in * dp.unit_price),0) AS total
       FROM detail_pembelian dp
       JOIN header_pembelian hp ON hp.pembelian_id = dp.pembelian_id
       ${wherePembelian}`,
      values
    );

    const terbanyakDigunakan = await pool.query(
      `SELECT a.nama, SUM(ak.qty_out) AS total_qty
       FROM aset_keluar ak
       JOIN aset a ON a.aset_id = ak.aset_id
       JOIN kegiatan k ON k.kegiatan_id = ak.kegiatan_id
       ${whereKegiatan}
       GROUP BY a.nama ORDER BY total_qty DESC LIMIT 5`,
      values
    );

    res.json({
      total_stok: Number(totalStok.rows[0].total),
      perlu_restock: Number(perluRestock.rows[0].total),
      total_penggunaan: Number(totalPenggunaan.rows[0].total),
      nilai_pembelian: Number(nilaiPembelian.rows[0].total),
      suvenir_terbanyak_digunakan: terbanyakDigunakan.rows,
    });
  } catch (err) { next(err); }
}

module.exports = { getRingkasan };
