// Jalankan hanya dengan database PostgreSQL sementara yang khusus dibuat untuk tes ini.
// PEMBELIAN_TEST_DATABASE_URL=postgresql://... npm test -- --runInBand tests/integration/pembelianPaid.pg.test.js
jest.mock('../../src/config/db', () => {
  const { Pool } = require('pg');
  return new Pool({ connectionString: process.env.PEMBELIAN_TEST_DATABASE_URL });
});
jest.mock('../../src/utils/stockNotification', () => ({ checkStockThreshold: jest.fn() }));
const pool = require('../../src/config/db');
const service = require('../../src/services/pembelianService');
const asetService = require('../../src/services/asetService');
const suite = process.env.PEMBELIAN_TEST_DATABASE_URL ? describe : describe.skip;

suite('pembelian Lunas dengan PostgreSQL asli (database uji terpisah)', () => {
  beforeAll(async () => {
    await pool.query(`
      CREATE TABLE tahun_ajaran (tahun_ajaran_id int PRIMARY KEY, tanggal_mulai date, tanggal_selesai date);
      CREATE TABLE vendor (vendor_id int PRIMARY KEY, nama text);
      CREATE TABLE level_aset (level_aset_id int PRIMARY KEY, nama text);
      CREATE TABLE lokasi_penyimpanan (lokasi_penyimpanan_id int PRIMARY KEY, nama text);
      CREATE TABLE aset (aset_id int PRIMARY KEY, nama text, stok int CHECK (stok >= 0), harga numeric(12,2), threshold_qty int DEFAULT 0,
        vendor_id int, level_aset_id int, lokasi_penyimpanan_id int);
      CREATE TABLE pembelian (pembelian_id serial PRIMARY KEY, tanggal date, status text, catatan text);
      CREATE TABLE header_pembelian (pembelian_id int PRIMARY KEY REFERENCES pembelian, vendor_id int, tahun_ajaran_id int);
      CREATE TABLE detail_pembelian (pembelian_id int REFERENCES pembelian, aset_id int REFERENCES aset, qty_in int, unit_price numeric(12,2));
      INSERT INTO tahun_ajaran VALUES (1, '2000-01-01', '2100-12-31');
      INSERT INTO vendor VALUES (1, 'Vendor A'), (2, 'Vendor B');
    `);
  });
  beforeEach(async () => {
    await pool.query(`TRUNCATE detail_pembelian, header_pembelian, pembelian, aset RESTART IDENTITY CASCADE;
      INSERT INTO aset (aset_id, nama, stok, harga) VALUES (1, 'Pin', 0, 0), (2, 'Tas', 0, 0);`);
  });
  afterAll(async () => { await pool.end(); });
  const buy = (status, qty = 3, price = 6000, date = '2026-10-05', vendor = 1) =>
    service.createPembelian(vendor, 1, date, status, '', [{ aset_id: 1, qty_in: qty, unit_price: price }]);
  const asset = async (id = 1) => (await pool.query('SELECT * FROM aset WHERE aset_id = $1', [id])).rows[0];

  test.each(['DP', 'Belum Bayar'])('%s tidak memasukkan stok, harga, atau vendor', async status => {
    await buy(status);
    expect(await asset()).toMatchObject({ stok: 0, harga: '0.00' });
    expect((await asetService.getAllAset()).find(row => row.aset_id === 1).vendor_nama).toBeNull();
  });
  test('Lunas memasukkan stok dan harga; vendor hanya berubah setelah Lunas', async () => {
    const first = await buy('Lunas');
    const pending = await buy('DP', 2, 7000, '2026-10-06', 2);
    expect(await asset()).toMatchObject({ stok: 3, harga: '6000.00' });
    expect((await asetService.getAllAset()).find(row => row.aset_id === 1).vendor_nama).toBe('Vendor A');
    await service.updateStatusPembelian(pending.pembelian.pembelian_id, 'Lunas');
    expect(await asset()).toMatchObject({ stok: 5, harga: '7000.00' });
    expect((await asetService.getAllAset()).find(row => row.aset_id === 1).vendor_nama).toBe('Vendor B');
    await service.updateStatusPembelian(pending.pembelian.pembelian_id, 'DP');
    expect(await asset()).toMatchObject({ stok: 3, harga: '6000.00' });
    await service.updateStatusPembelian(first.pembelian.pembelian_id, 'Belum Bayar');
    expect(await asset()).toMatchObject({ stok: 0, harga: '0.00' });
  });
  test('tanggal mundur dan edit catatan pembelian lama tidak menimpa harga terbaru', async () => {
    await buy('Lunas', 2, 9000, '2026-10-10');
    const older = await buy('Lunas', 4, 4000, '2026-10-01');
    expect(await asset()).toMatchObject({ stok: 6, harga: '9000.00' });
    await service.updatePembelian(older.pembelian.pembelian_id, 1, 1, '2026-10-01', 'Lunas', 'Koreksi', [{ aset_id: 1, qty_in: 4, unit_price: 5000 }]);
    expect(await asset()).toMatchObject({ stok: 6, harga: '9000.00' });
  });
  test('harga sama tanggal mengikuti ID pembelian terbaru', async () => {
    await buy('Lunas', 1, 4000);
    await buy('Lunas', 2, 7000);
    expect(await asset()).toMatchObject({ stok: 3, harga: '7000.00' });
  });
  test('dua PATCH Lunas bersamaan tidak menghitung stok dua kali', async () => {
    const { pembelian } = await buy('DP');
    await Promise.all([service.updateStatusPembelian(pembelian.pembelian_id, 'Lunas'), service.updateStatusPembelian(pembelian.pembelian_id, 'Lunas')]);
    expect(await asset()).toMatchObject({ stok: 3, harga: '6000.00' });
  });
  test('edit daftar dan status sekaligus menghitung kontribusi stok yang benar', async () => {
    const { pembelian } = await buy('DP');
    await service.updatePembelian(pembelian.pembelian_id, 1, 1, '2026-10-05', 'Lunas', '', [{ aset_id: 1, qty_in: 5, unit_price: 8000 }]);
    expect(await asset()).toMatchObject({ stok: 5, harga: '8000.00' });
    await service.updatePembelian(pembelian.pembelian_id, 1, 1, '2026-10-05', 'Lunas', '', [{ aset_id: 2, qty_in: 2, unit_price: 3000 }]);
    expect(await asset()).toMatchObject({ stok: 0, harga: '0.00' });
    expect(await asset(2)).toMatchObject({ stok: 2, harga: '3000.00' });
  });
  test('pembatalan setelah stok dipakai rollback status, stok, harga, dan detail', async () => {
    const { pembelian } = await buy('Lunas');
    await pool.query('UPDATE aset SET stok = 1 WHERE aset_id = 1');
    await expect(service.updateStatusPembelian(pembelian.pembelian_id, 'DP')).rejects.toMatchObject({ statusCode: 400 });
    expect(await asset()).toMatchObject({ stok: 1, harga: '6000.00' });
    expect((await pool.query('SELECT status FROM pembelian WHERE pembelian_id = $1', [pembelian.pembelian_id])).rows[0].status).toBe('Lunas');
    expect((await pool.query('SELECT qty_in FROM detail_pembelian')).rows[0].qty_in).toBe(3);
  });
});
