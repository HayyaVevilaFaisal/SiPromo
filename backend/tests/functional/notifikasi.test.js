// Functional test - endpoint /api/notifikasi (FR-09, UC-05).

jest.mock('../../src/config/db', () => ({ query: jest.fn() }));

const request = require('supertest');
const pool = require('../../src/config/db');
const app = require('../../src/app');
const { authHeader } = require('../helpers/mockPool');

describe('/api/notifikasi', () => {
  test('tanpa token -> 401', async () => {
    const res = await request(app).get('/api/notifikasi');
    expect(res.status).toBe(401);
  });

  test('GET / -> 200, hanya notifikasi aset aktif & belum selesai (query WHERE is_resolved=false AND aset.is_active=true)', async () => {
    const rows = [{ pesan_notifikasi_id: 1, aset_nama: 'Tumbler Informatika', stok: 8, threshold_qty: 10 }];
    pool.query.mockResolvedValueOnce({ rows });
    const res = await request(app).get('/api/notifikasi').set('Authorization', authHeader());
    expect(res.status).toBe(200);
    expect(res.body).toEqual(rows);
    expect(pool.query.mock.calls[0][0]).toMatch(/is_resolved = false/);
    expect(pool.query.mock.calls[0][0]).toMatch(/a\.is_active = true/);
  });

  test('PATCH /:id/selesai -> 404 jika notifikasi tidak ditemukan', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).patch('/api/notifikasi/999/selesai').set('Authorization', authHeader());
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'Notifikasi tidak ditemukan' });
  });

  test('PATCH /:id/selesai -> 200, is_resolved menjadi true', async () => {
    const row = { pesan_notifikasi_id: 1, is_resolved: true };
    pool.query.mockResolvedValueOnce({ rows: [row] });
    const res = await request(app).patch('/api/notifikasi/1/selesai').set('Authorization', authHeader());
    expect(res.status).toBe(200);
    expect(res.body).toEqual(row);
  });
});
