// SEED_TEST_DATABASE_URL=postgresql://... npm test -- --runInBand tests/integration/seed.pg.test.js
// Menggunakan schema uji unik; tidak mereset tabel aplikasi pada public.
jest.mock('../../src/config/db', () => {
  const { Pool } = require('pg');
  const schema = `seed_verify_${process.pid}_${Date.now()}`;
  const pool = new Pool({ connectionString: process.env.SEED_TEST_DATABASE_URL, options: `-c search_path=${schema}`, max: 1 });
  pool.testSchema = schema;
  return pool;
});
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const pool = require('../../src/config/db');
const dashboard = require('../../src/services/dashboardService');
const laporan = require('../../src/services/laporanService');
const aset = require('../../src/services/asetService');
const pembelian = require('../../src/services/pembelianService');
const penggunaan = require('../../src/services/penggunaanService');
const opname = require('../../src/services/stokOpnameService');
const auth = require('../../src/services/authService');
const vendorService = require('../../src/services/vendorService');
const suite = process.env.SEED_TEST_DATABASE_URL ? describe : describe.skip;
const seed = fs.readFileSync(path.join(__dirname, '../../src/db/seed.sql'), 'utf8');

suite('seed demo pada PostgreSQL asli', () => {
  let admin;
  let latest;
  beforeAll(async () => {
    admin = new Pool({ connectionString: process.env.SEED_TEST_DATABASE_URL });
    await admin.query(`CREATE SCHEMA ${pool.testSchema}`);
    await pool.query(fs.readFileSync(path.join(__dirname, '../../src/db/schema.sql'), 'utf8'));
    await pool.query(seed);
    latest = (await pool.query('SELECT * FROM tahun_ajaran ORDER BY tanggal_mulai DESC LIMIT 1')).rows[0];
  });
  afterAll(async () => {
    await pool.query('ROLLBACK');
    await pool.end();
    await admin.query(`DROP SCHEMA ${pool.testSchema} CASCADE`);
    await admin.end();
  });

  test('akun Google seed aktif sesuai peran dan akun nonaktif ditolak', async () => {
    const profile = email => ({ email, email_verified: true, hd: 'unpar.ac.id' });
    expect(await auth.findGoogleUser(profile('maria.veronica@unpar.ac.id'))).toMatchObject({ role: 'PIC Promosi' });
    expect(await auth.findGoogleUser(profile('mariskha@unpar.ac.id'))).toMatchObject({ role: 'Kaprodi' });
    expect(await auth.findGoogleUser(profile('nonaktif@example.test'))).toBeNull();
    expect(await auth.findGoogleUser(profile('belum-terdaftar@unpar.ac.id'))).toBeNull();
  });

  test('riwayat aset vendor unik, lintas vendor, hanya Lunas, dan dapat dicari', async () => {
    await pool.query('BEGIN');
    try {
      const { rows: vendors } = await pool.query(`INSERT INTO vendor (nama, alamat)
        VALUES ('Vendor Uji Riwayat A', 'Bandung'), ('Vendor Uji Riwayat B', 'Bandung'),
               ('Vendor Uji Riwayat Kosong', 'Bandung') RETURNING vendor_id, nama`);
      const { rows: items } = await pool.query('SELECT aset_id, nama FROM aset ORDER BY aset_id LIMIT 3');
      const a = vendors[0].vendor_id, b = vendors[1].vendor_id;
      for (const [vendorId, status, item] of [
        [a, 'Lunas', items[0]], [a, 'Lunas', items[0]],
        [a, 'DP', items[1]], [a, 'Belum Bayar', items[2]], [b, 'Lunas', items[0]],
      ]) {
        const { rows: [purchase] } = await pool.query(`INSERT INTO pembelian (tanggal, status)
          VALUES (CURRENT_DATE, $1) RETURNING pembelian_id`, [status]);
        await pool.query('INSERT INTO header_pembelian VALUES ($1, $2, $3)', [purchase.pembelian_id, vendorId, latest.tahun_ajaran_id]);
        await pool.query('INSERT INTO detail_pembelian VALUES ($1, $2, 1, 1000)', [purchase.pembelian_id, item.aset_id]);
      }
      const rows = await vendorService.getAllVendor('Vendor Uji Riwayat');
      expect(rows).toHaveLength(3);
      expect(rows.find(v => v.vendor_id === a).aset_dibeli).toEqual([items[0]]);
      expect(rows.find(v => v.vendor_id === b).aset_dibeli).toEqual([items[0]]);
      expect(rows.find(v => v.vendor_id === vendors[2].vendor_id).aset_dibeli).toEqual([]);
      const filtered = await vendorService.getAllVendor(`Vendor Uji Riwayat ${items[0].nama}`);
      expect(filtered.map(v => v.vendor_id).sort()).toEqual([a, b].sort());
      expect(await vendorService.getAllVendor('Vendor Uji Riwayat %_')).toEqual([]);
    } finally { await pool.query('ROLLBACK'); }
  });

  test('filter aset: level/lokasi/harga gabungan, kritis, aman, batas nol, dan tanpa hasil', async () => {
    const all = await aset.getAllAset();
    expect(all).toHaveLength(10);
    const critical = await aset.getAllAset('', '', '', '', '', 'kritis');
    const safe = await aset.getAllAset('', '', '', '', '', 'aman');
    expect(critical.length).toBeGreaterThan(0);
    expect(safe.length + critical.length).toBe(10);
    expect(safe.some(a => a.stok === a.threshold_qty)).toBe(true);
    const sample = all.find(a => a.nama === 'Payung Informatika');
    const filtered = await aset.getAllAset('Payung Informatika', sample.level_aset_id, sample.lokasi_penyimpanan_id, 50000, 50000, 'aman');
    expect(filtered.map(a => a.nama)).toEqual([sample.nama]);
    expect(await aset.getAllAset('tidak-ada-data-xyz')).toEqual([]);
    expect(all.some(a => a.level_aset_id === null && a.vendor_nama === null)).toBe(true);
    expect(all.some(a => Number(a.harga) === 0)).toBe(true);
  });

  test('filter transaksi dan penggunaan tetap memiliki seluruh detail lintas level', async () => {
    for (const status of ['Lunas','DP','Belum Bayar']) {
      const rows = await pembelian.getAllPembelian(latest.tahun_ajaran_id, '', status);
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every(row => row.status === status && row.can_edit)).toBe(true);
    }
    const sample = (await pembelian.getAllPembelian(latest.tahun_ajaran_id))[0].daftar_aset[0].aset_nama;
    const rows = await pembelian.getAllPembelian(latest.tahun_ajaran_id, sample);
    expect(rows.length).toBeGreaterThan(0);
    const original = await pembelian.getAllPembelian(latest.tahun_ajaran_id);
    expect(rows.every(row => row.daftar_aset.length === original.find(item => item.pembelian_id === row.pembelian_id).daftar_aset.length)).toBe(true);
    const level = (await pool.query("SELECT level_aset_id FROM level_aset WHERE nama='Sederhana'")).rows[0].level_aset_id;
    const uses = await penggunaan.getAllKegiatan(latest.tahun_ajaran_id, '', level);
    expect(uses.length).toBeGreaterThan(0);
    expect(uses.some(row => row.daftar_aset.some(item => item.level_nama !== 'Sederhana'))).toBe(true);
    const all = await pembelian.getAllPembelian();
    expect(all.some(row => !row.can_edit)).toBe(true);
    expect(all.some(row => row.url_file)).toBe(true);
    expect(all.some(row => !row.url_file)).toBe(true);
  });

  test('volume ringkas dan lima bon semester berjalan siap dilengkapi foto', async () => {
    const all = await pembelian.getAllPembelian();
    expect(all).toHaveLength(6);
    const current = all.filter(row => row.can_edit);
    expect(current).toHaveLength(5);
    expect(current.every(row => !row.url_file && !row.nama_file)).toBe(true);
    expect(current.some(row => row.daftar_aset.length === 1)).toBe(true);
    expect(current.some(row => row.daftar_aset.length > 1)).toBe(true);
    expect(await penggunaan.getAllKegiatan()).toHaveLength(5);
    expect(await opname.getAllStokOpname()).toHaveLength(4);
    expect((await pool.query('SELECT count(*)::int AS n FROM tahun_ajaran')).rows[0].n).toBe(4);
    const pen = (await aset.getAllAset()).find(row => row.nama === 'Pulpen Informatika');
    expect(Number(pen.harga)).toBe(6000);
    expect(pen.vendor_nama).toBe('Toko Kreatif Jaya');
  });

  test('dashboard default terisi; periode kosong mengembalikan nol tanpa menghilangkan master stok', async () => {
    const data = await dashboard.getRingkasan();
    expect(data.jenis_aset).toBe(10);
    expect(data.total_penggunaan).toBeGreaterThan(0);
    expect(data.perlu_restock).toBeGreaterThan(0);
    expect(data.aset_terbanyak_digunakan).toHaveLength(4);
    expect(data.pembelian_terbaru).toHaveLength(4);
    const empty = (await pool.query("SELECT tahun_ajaran_id FROM tahun_ajaran WHERE semester='SP' ORDER BY tanggal_mulai LIMIT 1")).rows[0].tahun_ajaran_id;
    expect(await dashboard.getRingkasan(empty)).toMatchObject({ total_penggunaan: 0, jumlah_transaksi: 0, jenis_aset: 10 });
    const report = await laporan.buildLaporan(empty);
    expect(report.ringkasan.total_aset_hilang).toBe(0);
    expect(report.rincian_stok_opname).toEqual([]);
  });

  test('opname tanggal sama, hilang/berlebih/sesuai, laporan dan PDF lintas halaman', async () => {
    const rows = await opname.getAllStokOpname(latest.tahun_ajaran_id);
    expect(rows[0].tanggal).toBe(rows[1].tanggal);
    expect(rows[0].jumlah_selisih).toBe(0);
    expect(rows[1].jumlah_selisih).toBeGreaterThan(0);
    const report = await laporan.buildLaporan(latest.tahun_ajaran_id);
    expect(report.ringkasan.total_aset_hilang).toBeGreaterThan(0);
    expect(report.ringkasan.total_aset_berlebih).toBeGreaterThan(0);
    expect(report.rekap_stok).toHaveLength(10);
    const doc = laporan.createLaporanPdf(report);
    expect(doc.bufferedPageRange().count).toBeGreaterThan(1);
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    await new Promise(resolve => { doc.on('end', resolve); doc.end(); });
    expect(Buffer.concat(chunks).subarray(0,5).toString()).toBe('%PDF-');
    const notifications = (await pool.query('SELECT * FROM pesan_notifikasi')).rows;
    expect(notifications.some(n => n.is_resolved)).toBe(true);
    expect(notifications.filter(n => !n.is_resolved)).toHaveLength((await dashboard.getRingkasan()).perlu_restock);
  });

  test('snapshot opname cocok dengan seluruh event sebelum pemeriksaan', async () => {
    const { rows } = await pool.query(`
      WITH events AS (
        SELECT d.aset_id,p.tanggal,1 AS jenis,p.pembelian_id AS id,d.qty_in AS delta,NULL::int AS snapshot
        FROM detail_pembelian d JOIN pembelian p USING(pembelian_id) WHERE p.status='Lunas'
        UNION ALL
        SELECT d.aset_id,k.tanggal,2,k.kegiatan_id,-d.qty_out,NULL::int
        FROM aset_keluar d JOIN kegiatan k USING(kegiatan_id)
        UNION ALL
        SELECT d.aset_id,so.tanggal,3,so.stok_opname_id,d.stok_fisik-d.stok_sistem,d.stok_sistem
        FROM detail_stok_opname d JOIN stok_opname so USING(stok_opname_id)
      ), saldo AS (
        SELECT e.*, CASE a.nama WHEN 'Pulpen Informatika' THEN 80 WHEN 'Stiker Informatika' THEN 100 WHEN 'Brosur Informatika' THEN 150 WHEN 'Totebag Informatika' THEN 60 WHEN 'Tumbler Premium' THEN 30 WHEN 'Lanyard Informatika' THEN 60 ELSE 50 END
          + COALESCE(SUM(delta) OVER (PARTITION BY e.aset_id ORDER BY tanggal,jenis,id ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING),0) AS sebelum
        FROM events e JOIN aset a USING(aset_id)
      ) SELECT * FROM saldo WHERE jenis=3 AND snapshot<>sebelum
    `);
    expect(rows).toEqual([]);
  });

  test.each(['2026-01-01','2026-07-01','2026-08-01','2026-12-31'])('seed valid pada batas semester %s', async date => {
    const client = await admin.connect();
    const schema = `${pool.testSchema}_date_${date.replaceAll('-', '')}`;
    try {
      await client.query(`CREATE SCHEMA ${schema}; SET search_path TO ${schema}`);
      await client.query(fs.readFileSync(path.join(__dirname, '../../src/db/schema.sql'), 'utf8'));
      await client.query(seed.replace(/current_date/gi, `DATE '${date}'`));
      expect((await client.query('SELECT count(*)::int AS n FROM aset')).rows[0].n).toBe(10);
      const latestDate = (await client.query('SELECT max(tanggal)::text AS tanggal FROM stok_opname')).rows[0].tanggal;
      expect(latestDate).toBe(date);
    } finally {
      await client.query(`ROLLBACK; RESET search_path; DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      client.release();
    }
  });

  test('pengulangan seed ditolak tanpa menghapus data', async () => {
    await expect(pool.query(seed)).rejects.toThrow('memerlukan database kosong');
    await pool.query('ROLLBACK');
    expect((await pool.query('SELECT count(*)::int AS n FROM aset')).rows[0].n).toBe(10);
  });
});
