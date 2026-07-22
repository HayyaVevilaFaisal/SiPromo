// Functional test - endpoint /api/vendor (FR-05, UC-03).

jest.mock('../../src/config/db', () => ({ query: jest.fn() }));

const request = require('supertest');
const pool = require('../../src/config/db');
const app = require('../../src/app');
const { authHeader } = require('../helpers/mockPool');

describe('/api/vendor', () => {
  test('tanpa token -> 401', async () => {
    const res = await request(app).get('/api/vendor');
    expect(res.status).toBe(401);
  });

  test('POST / -> 400 jika nama kosong', async () => {
    const res = await request(app).post('/api/vendor').set('Authorization', authHeader()).send({ alamat: 'Jl. Contoh' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Nama dan alamat/tautan toko vendor wajib diisi' });
  });

  test('POST / -> 400 jika alamat kosong/hanya spasi', async () => {
    const res = await request(app).post('/api/vendor').set('Authorization', authHeader()).send({ nama: 'CV Contoh', alamat: '   ' });
    expect(res.status).toBe(400);
  });

  test('POST / -> 201 saat data valid', async () => {
    const row = { vendor_id: 1, nama: 'CV Souvenir Bandung', alamat: 'Jl. Cihampelas' };
    pool.query.mockResolvedValueOnce({ rows: [row] });
    const res = await request(app).post('/api/vendor').set('Authorization', authHeader()).send({ nama: row.nama, alamat: row.alamat });
    expect(res.status).toBe(201);
    expect(res.body).toEqual(row);
  });

  test('PUT /:id -> 400 jika alamat kosong (nama boleh tidak dikirim saat update)', async () => {
    const res = await request(app).put('/api/vendor/1').set('Authorization', authHeader()).send({ alamat: '' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Alamat/tautan toko vendor wajib diisi' });
  });

  test('PUT /:id -> 404 jika vendor tidak ditemukan', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).put('/api/vendor/999').set('Authorization', authHeader()).send({ alamat: 'Jl. Baru' });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'Vendor tidak ditemukan' });
  });

  test('PATCH /:id/arsip dan /:id/pulihkan -> 200', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ vendor_id: 1, is_active: false }] });
    const arsip = await request(app).patch('/api/vendor/1/arsip').set('Authorization', authHeader());
    expect(arsip.status).toBe(200);
    expect(arsip.body.message).toBe('Vendor berhasil diarsipkan');

    pool.query.mockResolvedValueOnce({ rows: [{ vendor_id: 1, is_active: true }] });
    const pulihkan = await request(app).patch('/api/vendor/1/pulihkan').set('Authorization', authHeader());
    expect(pulihkan.status).toBe(200);
    expect(pulihkan.body.message).toBe('Vendor berhasil dipulihkan');
  });
});
