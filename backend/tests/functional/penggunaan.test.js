// Functional test - endpoint /api/penggunaan-aset (FR-10 s.d. FR-12, UC-06).

jest.mock('../../src/config/db', () => ({ query: jest.fn(), connect: jest.fn() }));
jest.mock('../../src/utils/stockNotification', () => ({ checkStockThreshold: jest.fn() }));

const request = require('supertest');
const pool = require('../../src/config/db');
const app = require('../../src/app');
const { authHeader, createMockClient } = require('../helpers/mockPool');

const validBody = {
  tahun_ajaran_id: 2,
  nama: 'Campus Expo',
  tanggal: '2025-03-10',
  catatan: '',
  daftar_aset: [{ aset_id: 5, qty_out: 15 }],
};

describe('/api/penggunaan-aset', () => {
  test('tanpa token -> 401', async () => {
    const res = await request(app).get('/api/penggunaan-aset');
    expect(res.status).toBe(401);
  });

  test('GET / -> 200 daftar kegiatan', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ kegiatan_id: 1, nama: 'Campus Expo' }] });
    const res = await request(app).get('/api/penggunaan-aset').set('Authorization', authHeader());
    expect(res.status).toBe(200);
  });

  test('POST / -> 400 jika data belum lengkap', async () => {
    const client = createMockClient([]);
    pool.connect.mockResolvedValue(client);
    const res = await request(app).post('/api/penggunaan-aset').set('Authorization', authHeader()).send({ ...validBody, nama: '' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Data kegiatan dan minimal satu aset wajib diisi' });
  });

  test('POST / -> stok tidak mencukupi berujung 500 dengan pesan generik (bukan 400 dg detail stok)', async () => {
    // Sesuai errorHandler: throw new Error(...) tanpa statusCode selalu jatuh ke 500 dengan pesan
    // generik ke klien - detail "Stok X tidak mencukupi" hanya tercatat di log server (console.error),
    // TIDAK dibocorkan ke body response. Test ini mendokumentasikan perilaku tsb secara eksplisit.
    const client = createMockClient([
      {}, // BEGIN
      { rows: [{ kegiatan_id: 1, nama: 'Campus Expo' }] }, // INSERT kegiatan
      { rows: [{ aset_id: 5, nama: 'Totebag Informatika', stok: 8, threshold_qty: 20 }] }, // SELECT aset - stok < qty_out
    ]);
    pool.connect.mockResolvedValue(client);

    const res = await request(app).post('/api/penggunaan-aset').set('Authorization', authHeader()).send(validBody); // qty_out 15 > stok 8

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: 'Terjadi kesalahan pada server' });
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  test('POST / -> 201 sukses, stok berkurang sesuai qty_out', async () => {
    const asetRow = { aset_id: 5, nama: 'Pulpen Informatika', stok: 120, threshold_qty: 50 };
    const client = createMockClient([
      {}, // BEGIN
      { rows: [{ kegiatan_id: 7, nama: 'Campus Expo' }] }, // INSERT kegiatan
      { rows: [asetRow] }, // SELECT aset FOR UPDATE
      {}, // INSERT aset_keluar
      { rows: [{ ...asetRow, stok: 105 }] }, // UPDATE aset stok
      {}, // COMMIT
    ]);
    pool.connect.mockResolvedValue(client);

    const res = await request(app).post('/api/penggunaan-aset').set('Authorization', authHeader()).send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.aset[0].stok).toBe(105);
    expect(client.query).toHaveBeenCalledWith('COMMIT');
  });

  test('PUT /:id -> 404 jika kegiatan tidak ditemukan', async () => {
    const client = createMockClient([
      {}, // BEGIN
      { rows: [] }, // SELECT kegiatan FOR UPDATE -> tidak ada
    ]);
    pool.connect.mockResolvedValue(client);
    const res = await request(app).put('/api/penggunaan-aset/999').set('Authorization', authHeader()).send(validBody);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'Kegiatan tidak ditemukan' });
  });

  test('PATCH /:id/arsip -> 200', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ kegiatan_id: 1, is_active: false }] });
    const res = await request(app).patch('/api/penggunaan-aset/1/arsip').set('Authorization', authHeader());
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Pencatatan penggunaan berhasil diarsipkan');
  });
});
