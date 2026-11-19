jest.mock('../../src/middlewares/authMiddleware', () => require('../helpers/businessAuth'));
jest.mock('../../src/config/db', () => ({ query: jest.fn() }));
jest.mock('../../src/utils/stockNotification', () => ({ checkStockThreshold: jest.fn() }));

const request = require('supertest');
const pool = require('../../src/config/db');
const app = require('../../src/app');
const { authHeader } = require('../helpers/mockPool');

test('GET /api/level-aset mengambil level dari tabel baru', async () => {
  const rows = [{ level_aset_id: 1, nama: 'Kecil' }];
  pool.query.mockResolvedValueOnce({ rows });
  const res = await request(app).get('/api/level-aset').set('Authorization', authHeader());
  expect(res.status).toBe(200);
  expect(res.body).toEqual(rows);
  expect(pool.query.mock.calls[0][0]).toMatch(/FROM level_aset\s+ORDER BY level_aset_id/);
});

test('filter aset memakai level_aset_id dan mengembalikan level_nama', async () => {
  const rows = [{ aset_id: 1, level_aset_id: 2, level_nama: 'Sedang' }];
  pool.query.mockResolvedValueOnce({ rows });
  const res = await request(app).get('/api/aset?level=2').set('Authorization', authHeader());
  expect(res.status).toBe(200);
  expect(res.body).toEqual(rows);
  const [sql, params] = pool.query.mock.calls[0];
  expect(sql).toContain('LEFT JOIN level_aset');
  expect(sql).toContain('s.level_aset_id = $1');
  expect(sql).toContain('AS level_nama');
  expect(params).toContain('2');
});

test('pembuatan aset menyimpan level_aset_id dari form', async () => {
  const row = { aset_id: 3, level_aset_id: 2 };
  pool.query.mockResolvedValueOnce({ rows: [row] });
  const res = await request(app).post('/api/aset').set('Authorization', authHeader()).send({
    nama: 'Pin Logo', level_aset_id: 2, lokasi_penyimpanan_id: 1, harga: 2000,
  });
  expect(res.status).toBe(201);
  const [sql, params] = pool.query.mock.calls[0];
  expect(sql).toContain('level_aset_id');
  expect(params[1]).toBe(2);
});
