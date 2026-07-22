// Functional test - endpoint /api/lokasi-penyimpanan (FR-06, UC-02).

jest.mock('../../src/config/db', () => ({ query: jest.fn() }));

const request = require('supertest');
const pool = require('../../src/config/db');
const app = require('../../src/app');
const { authHeader } = require('../helpers/mockPool');

describe('/api/lokasi-penyimpanan', () => {
  test('tanpa token -> 401', async () => {
    const res = await request(app).get('/api/lokasi-penyimpanan');
    expect(res.status).toBe(401);
  });

  test('POST / -> 400 jika nama kosong', async () => {
    const res = await request(app).post('/api/lokasi-penyimpanan').set('Authorization', authHeader()).send({ deskripsi: 'Ruang gudang' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Nama lokasi wajib diisi' });
  });

  test('POST / -> 201 saat data valid', async () => {
    const row = { lokasi_penyimpanan_id: 4, nama: 'Gudang Baru', deskripsi: null };
    pool.query.mockResolvedValueOnce({ rows: [row] });
    const res = await request(app).post('/api/lokasi-penyimpanan').set('Authorization', authHeader()).send({ nama: 'Gudang Baru' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual(row);
  });

  test('PUT /:id -> 404 jika tidak ditemukan', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).put('/api/lokasi-penyimpanan/999').set('Authorization', authHeader()).send({ nama: 'X' });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'Lokasi penyimpanan tidak ditemukan' });
  });

  test('PATCH /:id/arsip -> 200', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ lokasi_penyimpanan_id: 1, is_active: false }] });
    const res = await request(app).patch('/api/lokasi-penyimpanan/1/arsip').set('Authorization', authHeader());
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Lokasi penyimpanan berhasil diarsipkan');
  });

  test('PATCH /:id/pulihkan -> 404 jika tidak ditemukan', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).patch('/api/lokasi-penyimpanan/999/pulihkan').set('Authorization', authHeader());
    expect(res.status).toBe(404);
  });
});
