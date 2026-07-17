const pool = require('../config/db');

const BULAN_LABEL = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

// Tahun ajaran yang dipakai sebagai konteks dashboard: parameter eksplisit kalau ada,
// kalau tidak pakai tahun ajaran yang ditandai "sedang berjalan" (is_active), kalau tidak
// ada sama sekali fallback ke tahun ajaran dengan tanggal_mulai paling baru.
async function resolveTahunAjaran(tahunAjaranId) {
  if (tahunAjaranId) {
    const { rows } = await pool.query('SELECT * FROM tahun_ajaran WHERE tahun_ajaran_id = $1', [tahunAjaranId]);
    return rows[0] || null;
  }
  const aktif = await pool.query(
    'SELECT * FROM tahun_ajaran WHERE is_active = true ORDER BY tanggal_mulai DESC LIMIT 1'
  );
  if (aktif.rows[0]) return aktif.rows[0];
  const fallback = await pool.query('SELECT * FROM tahun_ajaran ORDER BY tanggal_mulai DESC LIMIT 1');
  return fallback.rows[0] || null;
}

function buildBulanRange(tanggalMulai, tanggalSelesai, totalPerBulan) {
  const bulan = [];
  const cursor = new Date(tanggalMulai);
  cursor.setDate(1);
  const end = new Date(tanggalSelesai);
  let guard = 0;
  while (cursor <= end && guard < 24) {
    bulan.push({ label: BULAN_LABEL[cursor.getMonth()], total_unit: totalPerBulan.get(cursor.getMonth()) || 0 });
    cursor.setMonth(cursor.getMonth() + 1);
    guard += 1;
  }
  return bulan;
}

// FR-02, UC-08 - Dashboard Ringkasan Aset
async function getRingkasan(req, res, next) {
  try {
    const { tahunAjaranId } = req.query;
    const ta = await resolveTahunAjaran(tahunAjaranId);

    const totalStokRes = await pool.query(
      'SELECT COALESCE(SUM(stok),0) AS total_unit, COUNT(*) AS jenis FROM aset WHERE is_active = true'
    );
    const perluRestockRes = await pool.query(
      'SELECT COUNT(*) AS total FROM aset WHERE stok < threshold_qty AND is_active = true'
    );

    let totalPenggunaan = 0;
    let jumlahKegiatan = 0;
    let nilaiPembelian = 0;
    let jumlahTransaksi = 0;
    let chartPenggunaanBulanan = [];
    let asetTerbanyakDigunakan = [];
    let penggunaanTerbaru = [];
    let pembelianTerbaru = [];

    if (ta) {
      const penggunaanRes = await pool.query(
        `SELECT COALESCE(SUM(ak.qty_out),0) AS total_unit, COUNT(DISTINCT k.kegiatan_id) AS jumlah_kegiatan
         FROM aset_keluar ak JOIN kegiatan k ON k.kegiatan_id = ak.kegiatan_id
         WHERE k.tahun_ajaran_id = $1 AND k.is_active = true`,
        [ta.tahun_ajaran_id]
      );
      totalPenggunaan = Number(penggunaanRes.rows[0].total_unit);
      jumlahKegiatan = Number(penggunaanRes.rows[0].jumlah_kegiatan);

      const pembelianRes = await pool.query(
        `SELECT COALESCE(SUM(dp.qty_in * dp.unit_price),0) AS total_nilai, COUNT(DISTINCT p.pembelian_id) AS jumlah_transaksi
         FROM detail_pembelian dp
         JOIN pembelian p ON p.pembelian_id = dp.pembelian_id
         JOIN header_pembelian hp ON hp.pembelian_id = dp.pembelian_id
         WHERE hp.tahun_ajaran_id = $1 AND p.is_active = true`,
        [ta.tahun_ajaran_id]
      );
      nilaiPembelian = Number(pembelianRes.rows[0].total_nilai);
      jumlahTransaksi = Number(pembelianRes.rows[0].jumlah_transaksi);

      const chartRes = await pool.query(
        `SELECT DATE_TRUNC('month', k.tanggal) AS bulan, COALESCE(SUM(ak.qty_out),0) AS total_unit
         FROM aset_keluar ak JOIN kegiatan k ON k.kegiatan_id = ak.kegiatan_id
         WHERE k.tahun_ajaran_id = $1 AND k.is_active = true
         GROUP BY bulan ORDER BY bulan ASC`,
        [ta.tahun_ajaran_id]
      );
      const totalPerBulan = new Map(chartRes.rows.map((r) => [new Date(r.bulan).getMonth(), Number(r.total_unit)]));
      chartPenggunaanBulanan = buildBulanRange(ta.tanggal_mulai, ta.tanggal_selesai, totalPerBulan);

      const terbanyakRes = await pool.query(
        `SELECT a.nama, SUM(ak.qty_out) AS total_qty
         FROM aset_keluar ak
         JOIN aset a ON a.aset_id = ak.aset_id
         JOIN kegiatan k ON k.kegiatan_id = ak.kegiatan_id
         WHERE k.tahun_ajaran_id = $1 AND k.is_active = true
         GROUP BY a.nama ORDER BY total_qty DESC LIMIT 4`,
        [ta.tahun_ajaran_id]
      );
      asetTerbanyakDigunakan = terbanyakRes.rows.map((r) => ({ nama: r.nama, total_qty: Number(r.total_qty) }));

      const penggunaanTerbaruRes = await pool.query(
        `SELECT a.nama AS aset_nama, k.nama AS kegiatan_nama, ak.qty_out, k.tanggal
         FROM aset_keluar ak
         JOIN aset a ON a.aset_id = ak.aset_id
         JOIN kegiatan k ON k.kegiatan_id = ak.kegiatan_id
         WHERE k.tahun_ajaran_id = $1 AND k.is_active = true
         ORDER BY k.tanggal DESC, k.kegiatan_id DESC, a.nama ASC LIMIT 4`,
        [ta.tahun_ajaran_id]
      );
      penggunaanTerbaru = penggunaanTerbaruRes.rows;

      const pembelianTerbaruRes = await pool.query(
        `SELECT a.nama AS aset_nama, dp.qty_in, (dp.qty_in * dp.unit_price) AS total_harga, p.status, p.tanggal
         FROM detail_pembelian dp
         JOIN pembelian p ON p.pembelian_id = dp.pembelian_id
         JOIN header_pembelian hp ON hp.pembelian_id = dp.pembelian_id
         JOIN aset a ON a.aset_id = dp.aset_id
         WHERE hp.tahun_ajaran_id = $1 AND p.is_active = true
         ORDER BY p.tanggal DESC, p.pembelian_id DESC, a.nama ASC LIMIT 4`,
        [ta.tahun_ajaran_id]
      );
      pembelianTerbaru = pembelianTerbaruRes.rows;
    }

    res.json({
      tahun_ajaran: ta ? { tahun_ajaran_id: ta.tahun_ajaran_id, semester: ta.semester, tahun: ta.tahun } : null,
      total_stok: Number(totalStokRes.rows[0].total_unit),
      jenis_aset: Number(totalStokRes.rows[0].jenis),
      perlu_restock: Number(perluRestockRes.rows[0].total),
      total_penggunaan: totalPenggunaan,
      jumlah_kegiatan: jumlahKegiatan,
      nilai_pembelian: nilaiPembelian,
      jumlah_transaksi: jumlahTransaksi,
      chart_penggunaan_bulanan: chartPenggunaanBulanan,
      aset_terbanyak_digunakan: asetTerbanyakDigunakan,
      penggunaan_terbaru: penggunaanTerbaru,
      pembelian_terbaru: pembelianTerbaru,
    });
  } catch (err) { next(err); }
}

module.exports = { getRingkasan };
