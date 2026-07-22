// Functional test - endpoint /api/pembelian-aset (FR-13 s.d. FR-17, UC-07).
// Untuk createPembelian/updatePembelian (transaksional, pakai pool.connect), dipakai
// helper createMockClient dari tests/helpers/mockPool.js. Middleware upload multer di-mock
// supaya test PATCH /:id/bon tidak benar-benar menulis file ke disk (backend/uploads/ berisi
// file milik pengguna sungguhan, tidak boleh tersentuh oleh test).

jest.mock('../../src/config/db', () => ({ query: jest.fn(), connect: jest.fn() }));
jest.mock('../../src/utils/stockNotification', () => ({ checkStockThreshold: jest.fn() }));
jest.mock('../../src/middlewares/upload', () => ({
  single: () => (req, res, next) => next(), // tidak pernah mengisi req.file -> mensimulasikan "tidak ada file"
}));

const request = require('supertest');
const pool = require('../../src/config/db');
const app = require('../../src/app');
const { authHeader, createMockClient } = require('../helpers/mockPool');

const validBody = {
  vendor_id: 1,
  tahun_ajaran_id: 2,
  tanggal: '2025-05-15',
  status: 'Lunas',
  catatan: '',
  daftar_aset: [{ aset_id: 5, qty_in: 10 }],
};

describe('/api/pembelian-aset', () => {
  test('tanpa token -> 401', async () => {
    const res = await request(app).get('/api/pembelian-aset');
    expect(res.status).toBe(401);
  });

  test('GET / -> 200 daftar pembelian', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ pembelian_id: 1, status: 'Lunas' }] });
    const res = await request(app).get('/api/pembelian-aset').set('Authorization', authHeader());
    expect(res.status).toBe(200);
  });

  test('GET /:id -> 404 jika tidak ditemukan', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/pembelian-aset/999').set('Authorization', authHeader());
    expect(res.status).toBe(404);
  });

  test('POST / -> 400 jika status pembayaran tidak valid', async () => {
    const client = createMockClient([]);
    pool.connect.mockResolvedValue(client);
    const res = await request(app).post('/api/pembelian-aset').set('Authorization', authHeader()).send({ ...validBody, status: 'Draft' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Status pembelian tidak valid (harus salah satu dari: Belum Bayar, DP, Lunas)' });
  });

  test('POST / -> 201 sukses, harga satuan diambil dari aset (bukan dari body klien)', async () => {
    const asetRow = { aset_id: 5, nama: 'Pulpen Informatika', harga: '4500.00', stok: 200 };
    const client = createMockClient([
      {}, // BEGIN
      { rows: [{ pembelian_id: 9, status: 'Lunas' }] }, // INSERT pembelian
      {}, // INSERT header_pembelian
      { rows: [asetRow] }, // SELECT aset FOR UPDATE
      {}, // INSERT detail_pembelian
      { rows: [{ ...asetRow, stok: 210 }] }, // UPDATE aset stok
      {}, // COMMIT
    ]);
    pool.connect.mockResolvedValue(client);

    const res = await request(app).post('/api/pembelian-aset').set('Authorization', authHeader())
      .send({ ...validBody, daftar_aset: [{ aset_id: 5, qty_in: 10, unit_price: 1 }] }); // unit_price klien harus diabaikan

    expect(res.status).toBe(201);
    expect(res.body.pembelian).toEqual({ pembelian_id: 9, status: 'Lunas' });
    expect(res.body.aset[0].stok).toBe(210);
    expect(client.query.mock.calls.find((c) => String(c[0]).includes('INSERT INTO detail_pembelian'))[1]).toEqual([9, 5, 10, '4500.00']);
  });

  test('PATCH /:id/bon -> 400 jika tidak ada file (middleware upload di-mock tidak pernah mengisi req.file)', async () => {
    const res = await request(app).patch('/api/pembelian-aset/1/bon').set('Authorization', authHeader());
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'File bon pembelian wajib diunggah' });
  });

  test('PATCH /:id/status -> 400 jika status tidak valid', async () => {
    const res = await request(app).patch('/api/pembelian-aset/1/status').set('Authorization', authHeader()).send({ status: 'Selesai' });
    expect(res.status).toBe(400);
  });

  test('PATCH /:id/status -> 200 jika status valid', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ pembelian_id: 1, status: 'DP' }] });
    const res = await request(app).patch('/api/pembelian-aset/1/status').set('Authorization', authHeader()).send({ status: 'DP' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('DP');
  });

  test('PATCH /:id/arsip -> 404 jika tidak ditemukan', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).patch('/api/pembelian-aset/999/arsip').set('Authorization', authHeader());
    expect(res.status).toBe(404);
  });
});
