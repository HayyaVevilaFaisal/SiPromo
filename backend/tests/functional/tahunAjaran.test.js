// Functional test - endpoint /api/tahun-ajaran (FR-07, UC-04).
// Turut menelusuri cabang-cabang deriveTahun() secara tidak langsung lewat HTTP (fungsi itu
// sendiri tidak diekspor dari controller, jadi diuji lewat efeknya pada response createTahunAjaran).

jest.mock('../../src/config/db', () => ({ query: jest.fn() }));

const request = require('supertest');
const pool = require('../../src/config/db');
const app = require('../../src/app');
const { authHeader } = require('../helpers/mockPool');

const base = { tahun_ajaran_id: 1, tanggal_mulai: '2025-08-01', tanggal_selesai: '2025-12-31' };

describe('/api/tahun-ajaran', () => {
  test('tanpa token -> 401', async () => {
    const res = await request(app).get('/api/tahun-ajaran');
    expect(res.status).toBe(401);
  });

  test('POST / -> 400 jika data belum lengkap', async () => {
    const res = await request(app).post('/api/tahun-ajaran').set('Authorization', authHeader()).send({ tahun: '2025/2026' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Data tahun ajaran belum lengkap' });
  });

  test('POST / -> 400 jika tanggal selesai sebelum tanggal mulai', async () => {
    const res = await request(app).post('/api/tahun-ajaran').set('Authorization', authHeader()).send({
      tahun: '2025/2026', semester: 'Ganjil', tanggal_mulai: '2025-12-31', tanggal_selesai: '2025-08-01',
    });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Tanggal selesai harus setelah tanggal mulai' });
  });

  test('POST / -> 400 jika "tahun" tidak konsisten dengan semester Ganjil (seharusnya tahun/tahun+1)', async () => {
    const res = await request(app).post('/api/tahun-ajaran').set('Authorization', authHeader()).send({
      tahun: '2024/2025', semester: 'Ganjil', tanggal_mulai: '2025-08-01', tanggal_selesai: '2025-12-31',
    });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Tahun ajaran tidak konsisten dengan tanggal mulai & semester (seharusnya "2025/2026")' });
  });

  test('POST / -> 201 jika semester Genap dengan "tahun" tahun-1/tahun sesuai', async () => {
    const row = { ...base, tahun: '2024/2025', semester: 'Genap', tanggal_mulai: '2025-01-01', tanggal_selesai: '2025-07-31' };
    pool.query.mockResolvedValueOnce({ rows: [row] });
    const res = await request(app).post('/api/tahun-ajaran').set('Authorization', authHeader()).send({
      tahun: '2024/2025', semester: 'Genap', tanggal_mulai: '2025-01-01', tanggal_selesai: '2025-07-31',
    });
    expect(res.status).toBe(201);
    expect(res.body).toEqual(row);
  });

  test('POST / -> 201 kasus khusus tanggal_mulai === tanggal_selesai (format tahun/tahun)', async () => {
    const row = { tahun: '2025/2025', semester: 'Ganjil', tanggal_mulai: '2025-06-01', tanggal_selesai: '2025-06-01' };
    pool.query.mockResolvedValueOnce({ rows: [row] });
    const res = await request(app).post('/api/tahun-ajaran').set('Authorization', authHeader()).send({
      tahun: '2025/2025', semester: 'Ganjil', tanggal_mulai: '2025-06-01', tanggal_selesai: '2025-06-01',
    });
    expect(res.status).toBe(201);
  });

  test('POST / -> 400 jika kombinasi tahun & semester sudah ada (unique violation kode 23505)', async () => {
    const dupError = new Error('duplicate key value violates unique constraint');
    dupError.code = '23505';
    pool.query.mockRejectedValueOnce(dupError);
    const res = await request(app).post('/api/tahun-ajaran').set('Authorization', authHeader()).send({
      tahun: '2025/2026', semester: 'Ganjil', tanggal_mulai: '2025-08-01', tanggal_selesai: '2025-12-31',
    });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Tahun ajaran dengan tahun & semester ini sudah ada' });
  });

  test('PUT /:id -> 404 jika tidak ditemukan', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).put('/api/tahun-ajaran/999').set('Authorization', authHeader()).send({
      tahun: '2025/2026', semester: 'Ganjil', tanggal_mulai: '2025-08-01', tanggal_selesai: '2025-12-31',
    });
    expect(res.status).toBe(404);
  });

  test('PATCH /:id/arsip dan /:id/pulihkan -> 200', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ tahun_ajaran_id: 1, is_active: false }] });
    const arsip = await request(app).patch('/api/tahun-ajaran/1/arsip').set('Authorization', authHeader());
    expect(arsip.status).toBe(200);

    pool.query.mockResolvedValueOnce({ rows: [{ tahun_ajaran_id: 1, is_active: true }] });
    const pulihkan = await request(app).patch('/api/tahun-ajaran/1/pulihkan').set('Authorization', authHeader());
    expect(pulihkan.status).toBe(200);
  });
});
