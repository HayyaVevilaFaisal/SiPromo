const pool = require('../config/db');

const BULAN_LABEL = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];


// Menentukan Tahun Ajaran yang digunakan
// sebagai konteks Dashboard.
async function resolveTahunAjaran(tahunAjaranId) {

  // Jika ID Tahun Ajaran dikirim secara eksplisit.
  if (tahunAjaranId) {

    const { rows } = await pool.query(
      `
        SELECT *
        FROM tahun_ajaran
        WHERE tahun_ajaran_id = $1
      `,
      [tahunAjaranId]
    );

    return rows[0] || null;
  }


  // Jika tidak ada ID yang dikirim,
  // gunakan Tahun Ajaran yang masih aktif.
  const aktif = await pool.query(
    `
      SELECT *
      FROM tahun_ajaran
      -- WHERE is_active = true -- Aturan master lama
      ORDER BY tanggal_mulai DESC
      LIMIT 1
    `
  );


  if (aktif.rows[0]) {

    return aktif.rows[0];
  }


  // Jika tidak ada Tahun Ajaran aktif,
  // gunakan Tahun Ajaran terbaru sebagai fallback.
  const fallback = await pool.query(
    `
      SELECT *
      FROM tahun_ajaran
      ORDER BY tanggal_mulai DESC
      LIMIT 1
    `
  );


  return fallback.rows[0] || null;
}


// Membentuk daftar bulan sesuai rentang Tahun Ajaran.
function buildBulanRange(
  tanggalMulai,
  tanggalSelesai,
  totalPerBulan
) {

  const bulan = [];
  const sekarang = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: 'numeric',
  }).formatToParts(new Date());
  const tahunAktif = Number(sekarang.find(part => part.type === 'year').value);
  const bulanAktif = Number(sekarang.find(part => part.type === 'month').value) - 1;

  const cursor = new Date(tanggalMulai);

  cursor.setDate(1);

  const end = new Date(tanggalSelesai);

  let guard = 0;


  // Membentuk daftar bulan maksimal 24 bulan
  // untuk mencegah loop tidak berhenti.
  while (
    cursor <= end &&
    guard < 24
  ) {

    bulan.push({
      is_bulan_aktif: cursor.getFullYear() === tahunAktif && cursor.getMonth() === bulanAktif,
      label:
        BULAN_LABEL[cursor.getMonth()],

      total_unit:
        totalPerBulan.get(
          cursor.getMonth()
        ) || 0,
    });


    cursor.setMonth(
      cursor.getMonth() + 1
    );

    guard += 1;
  }


  return bulan;
}


// Mengambil seluruh data ringkasan Dashboard.
async function getRingkasan(tahunAjaranId) {

  // Menentukan Tahun Ajaran yang digunakan.
  const ta =
    await resolveTahunAjaran(
      tahunAjaranId
    );


  // ID eksplisit dapat menunjuk semester berjalan juga; hanya semester lain
  // yang menggunakan peringkat jumlah/nilai pada kartu riwayat.
  const current = tahunAjaranId && ta ? await resolveTahunAjaran() : ta;
  const isHistory = Boolean(ta && current && String(ta.tahun_ajaran_id) !== String(current.tahun_ajaran_id));

  // Mengambil total stok dan jumlah jenis aset aktif.
  const totalStokRes =
    await pool.query(
      `
        SELECT
          COALESCE(SUM(stok), 0) AS total_unit,
          COUNT(*) AS jenis

        FROM aset

        -- WHERE is_active = true -- Aturan master lama
      `
    );


  // Mengambil jumlah aset yang perlu restock.
  const perluRestockRes =
    await pool.query(
      `
        SELECT
          COUNT(*) AS total

        FROM aset

        WHERE stok < threshold_qty
          -- AND is_active = true -- Aturan master lama
      `
    );


  // Nilai default jika belum ada Tahun Ajaran.
  let totalPenggunaan = 0;

  let jumlahKegiatan = 0;

  let nilaiPembelian = 0;

  let jumlahTransaksi = 0;

  let chartPenggunaanBulanan = [];

  let asetTerbanyakDigunakan = [];

  let penggunaanTerbaru = [];

  let pembelianTerbaru = [];


  // Data berikut hanya diambil
  // jika terdapat Tahun Ajaran.
  if (ta) {

    // Mengambil total penggunaan aset
    // dan jumlah kegiatan.
    const penggunaanRes =
      await pool.query(
        `
          SELECT
            COALESCE(
              SUM(ak.qty_out),
              0
            ) AS total_unit,

            COUNT(
              DISTINCT k.kegiatan_id
            ) AS jumlah_kegiatan

          FROM aset_keluar ak

          JOIN kegiatan k
            ON k.kegiatan_id =
               ak.kegiatan_id

          WHERE k.tahun_ajaran_id = $1
        `,
        [ta.tahun_ajaran_id]
      );


    totalPenggunaan =
      Number(
        penggunaanRes.rows[0]
          .total_unit
      );


    jumlahKegiatan =
      Number(
        penggunaanRes.rows[0]
          .jumlah_kegiatan
      );


    // Mengambil total nilai pembelian
    // dan jumlah transaksi.
    const pembelianRes =
      await pool.query(
        `
          SELECT
            COALESCE(
              SUM(
                dp.qty_in *
                dp.unit_price
              ),
              0
            ) AS total_nilai,

            COUNT(
              DISTINCT p.pembelian_id
            ) AS jumlah_transaksi

          FROM detail_pembelian dp

          JOIN pembelian p
            ON p.pembelian_id =
               dp.pembelian_id

          JOIN header_pembelian hp
            ON hp.pembelian_id =
               dp.pembelian_id

          WHERE hp.tahun_ajaran_id = $1
        `,
        [ta.tahun_ajaran_id]
      );


    nilaiPembelian =
      Number(
        pembelianRes.rows[0]
          .total_nilai
      );


    jumlahTransaksi =
      Number(
        pembelianRes.rows[0]
          .jumlah_transaksi
      );


    // Mengambil penggunaan aset per bulan.
    const chartRes =
      await pool.query(
        `
          SELECT
            DATE_TRUNC(
              'month',
              k.tanggal
            ) AS bulan,

            COALESCE(
              SUM(ak.qty_out),
              0
            ) AS total_unit

          FROM aset_keluar ak

          JOIN kegiatan k
            ON k.kegiatan_id =
               ak.kegiatan_id

          WHERE k.tahun_ajaran_id = $1

          GROUP BY bulan

          ORDER BY bulan ASC
        `,
        [ta.tahun_ajaran_id]
      );


    // Mengubah hasil query menjadi Map
    // agar lebih mudah dicocokkan dengan bulan.
    const totalPerBulan =
      new Map(
        chartRes.rows.map(
          (row) => [
            new Date(
              row.bulan
            ).getMonth(),

            Number(
              row.total_unit
            ),
          ]
        )
      );


    // Membentuk daftar bulan sesuai
    // periode Tahun Ajaran.
    chartPenggunaanBulanan =
      buildBulanRange(
        ta.tanggal_mulai,
        ta.tanggal_selesai,
        totalPerBulan
      );


    // Mengambil 4 unit yang
    // paling banyak digunakan.
    const terbanyakRes =
      await pool.query(
        `
          SELECT
            a.nama,
            SUM(ak.qty_out) AS total_qty

          FROM aset_keluar ak

          JOIN aset a
            ON a.aset_id =
               ak.aset_id

          JOIN kegiatan k
            ON k.kegiatan_id =
               ak.kegiatan_id

          WHERE k.tahun_ajaran_id = $1

          GROUP BY a.nama

          ORDER BY total_qty DESC

          LIMIT 4
        `,
        [ta.tahun_ajaran_id]
      );


    asetTerbanyakDigunakan =
      terbanyakRes.rows.map(
        (row) => ({
          nama: row.nama,

          total_qty:
            Number(
              row.total_qty
            ),
        })
      );


    // Riwayat: tampilkan satu kegiatan dengan total penggunaan terbesar.
    // Semester berjalan: 4 penggunaan terbaru.
    const penggunaanTerbaruRes =
      await pool.query(
        isHistory ? `
          SELECT k.kegiatan_id, k.nama AS kegiatan_nama, k.tanggal,
            SUM(ak.qty_out) AS qty_out,
            COUNT(DISTINCT ak.aset_id) AS jenis_aset,
            (SELECT json_agg(detail ORDER BY detail.qty_out DESC, detail.aset_nama ASC, detail.aset_id ASC)
             FROM (
               SELECT a.aset_id, a.nama AS aset_nama, SUM(item.qty_out) AS qty_out
               FROM aset_keluar item
               JOIN aset a ON a.aset_id = item.aset_id
               WHERE item.kegiatan_id = k.kegiatan_id
               GROUP BY a.aset_id, a.nama
             ) detail) AS aset_detail
          FROM aset_keluar ak
          JOIN kegiatan k ON k.kegiatan_id = ak.kegiatan_id
          WHERE k.tahun_ajaran_id = $1
          GROUP BY k.kegiatan_id, k.nama, k.tanggal
          ORDER BY qty_out DESC, k.tanggal DESC, k.kegiatan_id DESC
          LIMIT 1
        ` : `
          SELECT
            a.nama AS aset_nama,
            k.nama AS kegiatan_nama,
            ak.qty_out,
            k.tanggal

          FROM aset_keluar ak

          JOIN aset a
            ON a.aset_id =
               ak.aset_id

          JOIN kegiatan k
            ON k.kegiatan_id =
               ak.kegiatan_id

          WHERE k.tahun_ajaran_id = $1

          ORDER BY
            k.tanggal DESC,
            k.kegiatan_id DESC,
            a.nama ASC

          LIMIT 4
        `,
        [ta.tahun_ajaran_id]
      );


    penggunaanTerbaru =
      penggunaanTerbaruRes.rows;


    // Riwayat: tampilkan satu transaksi dengan total nilai pembelian terbesar.
    // Semester berjalan: 4 pembelian terbaru.
    const pembelianTerbaruRes =
      await pool.query(
        isHistory ? `
          SELECT p.pembelian_id, v.nama AS vendor_nama, p.status, p.tanggal,
            SUM(dp.qty_in) AS qty_in,
            SUM(dp.qty_in * dp.unit_price) AS total_harga,
            (SELECT json_agg(detail ORDER BY detail.total_harga DESC, detail.aset_nama ASC, detail.aset_id ASC)
             FROM (
               SELECT a.aset_id, a.nama AS aset_nama, SUM(item.qty_in) AS qty_in,
                 SUM(item.qty_in * item.unit_price) AS total_harga
               FROM detail_pembelian item
               JOIN aset a ON a.aset_id = item.aset_id
               WHERE item.pembelian_id = p.pembelian_id
               GROUP BY a.aset_id, a.nama
             ) detail) AS aset_detail
          FROM detail_pembelian dp
          JOIN pembelian p ON p.pembelian_id = dp.pembelian_id
          JOIN header_pembelian hp ON hp.pembelian_id = p.pembelian_id
          JOIN vendor v ON v.vendor_id = hp.vendor_id
          WHERE hp.tahun_ajaran_id = $1
          GROUP BY p.pembelian_id, v.vendor_id, v.nama, p.status, p.tanggal
          ORDER BY total_harga DESC, p.tanggal DESC, p.pembelian_id DESC
          LIMIT 1
        ` : `
          SELECT
            a.nama AS aset_nama,
            dp.qty_in,

            (
              dp.qty_in *
              dp.unit_price
            ) AS total_harga,

            p.status,
            p.tanggal

          FROM detail_pembelian dp

          JOIN pembelian p
            ON p.pembelian_id =
               dp.pembelian_id

          JOIN header_pembelian hp
            ON hp.pembelian_id =
               dp.pembelian_id

          JOIN aset a
            ON a.aset_id =
               dp.aset_id

          WHERE hp.tahun_ajaran_id = $1

          ORDER BY
            p.tanggal DESC,
            p.pembelian_id DESC,
            a.nama ASC

          LIMIT 4
        `,
        [ta.tahun_ajaran_id]
      );


    pembelianTerbaru =
      pembelianTerbaruRes.rows;
  }


  // Mengembalikan object dengan struktur
  // yang sama seperti response Dashboard sebelumnya.
  return {

    tahun_ajaran: ta
      ? {
          tahun_ajaran_id:
            ta.tahun_ajaran_id,

          semester:
            ta.semester,

          tahun:
            ta.tahun,
        }
      : null,


    total_stok:
      Number(
        totalStokRes.rows[0]
          .total_unit
      ),


    jenis_aset:
      Number(
        totalStokRes.rows[0]
          .jenis
      ),


    perlu_restock:
      Number(
        perluRestockRes.rows[0]
          .total
      ),


    total_penggunaan:
      totalPenggunaan,


    jumlah_kegiatan:
      jumlahKegiatan,


    nilai_pembelian:
      nilaiPembelian,


    jumlah_transaksi:
      jumlahTransaksi,


    chart_penggunaan_bulanan:
      chartPenggunaanBulanan,


    aset_terbanyak_digunakan:
      asetTerbanyakDigunakan,


    penggunaan_terbaru:
      penggunaanTerbaru,


    pembelian_terbaru:
      pembelianTerbaru,
  };
}


// Mengekspor fungsi service.
module.exports = {
  getRingkasan,
};