// Functional test - endpoint /api/aset (FR-03, FR-04, UC-01).

jest.mock('../../src/config/db', () => ({ query: jest.fn() }));
jest.mock('../../src/utils/stockNotification', () => ({ checkStockThreshold: jest.fn() }));

const request = require('supertest');
const pool = require('../../src/config/db');
const app = require('../../src/app');
const { authHeader } = require('../helpers/mockPool');

describe('/api/aset', () => {
  test('semua route menolak permintaan tanpa token (401)', async () => {
    const res = await request(app).get('/api/aset');
    expect(res.status).toBe(401);
  });

  test('GET / mengembalikan daftar aset (200)', async () => {
    const rows = [{ aset_id: 1, nama: 'Pin Logo', stok: 45, threshold_qty: 10 }];
    pool.query.mockResolvedValueOnce({ rows });
    const res = await request(app).get('/api/aset').set('Authorization', authHeader());
    expect(res.status).toBe(200);
    expect(res.body).toEqual(rows);
  });

  test('GET /:id -> 404 jika tidak ditemukan', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/aset/999').set('Authorization', authHeader());
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'Aset tidak ditemukan' });
  });

  test('POST / -> 400 jika data belum lengkap', async () => {
    const res = await request(app).post('/api/aset').set('Authorization', authHeader()).send({ nama: 'Tanpa lokasi' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Data aset belum lengkap' });
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('POST / -> 201 saat data valid, dan checkStockThreshold dipanggil dengan baris baru', async () => {
    const { checkStockThreshold } = require('../../src/utils/stockNotification');
    const inserted = { aset_id: 10, nama: 'Stiker Prodi', lokasi_penyimpanan_id: 1, harga: 2000, stok: 100, threshold_qty: 20 };
    pool.query.mockResolvedValueOnce({ rows: [inserted] });

    const res = await request(app).post('/api/aset').set('Authorization', authHeader()).send({
      nama: 'Stiker Prodi', lokasi_penyimpanan_id: 1, harga: 2000, stok: 100, threshold_qty: 20,
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(inserted);
    expect(checkStockThreshold).toHaveBeenCalledWith(inserted);
  });

  test('PUT /:id -> 404 jika aset tidak ditemukan', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).put('/api/aset/999').set('Authorization', authHeader()).send({ nama: 'X', lokasi_penyimpanan_id: 1, harga: 1000, stok: 1, threshold_qty: 1 });
    expect(res.status).toBe(404);
  });

  test('PATCH /:id/arsip -> 200 dan is_active menjadi false', async () => {
    const archived = { aset_id: 1, nama: 'Pin Logo', is_active: false };
    pool.query.mockResolvedValueOnce({ rows: [archived] });
    const res = await request(app).patch('/api/aset/1/arsip').set('Authorization', authHeader());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Aset berhasil diarsipkan', data: archived });
  });

  test('PATCH /:id/pulihkan -> 200 dan is_active menjadi true', async () => {
    const restored = { aset_id: 1, nama: 'Pin Logo', is_active: true };
    pool.query.mockResolvedValueOnce({ rows: [restored] });
    const res = await request(app).patch('/api/aset/1/pulihkan').set('Authorization', authHeader());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Aset berhasil dipulihkan', data: restored });
  });
});
