// Functional test - NFR-11 (pembatasan percobaan login untuk mencegah brute-force).
// Sengaja dipisah ke file sendiri supaya limiter (state in-memory per proses) tidak ikut
// terpakai oleh test login lain di auth.test.js (tiap file test Jest punya module registry sendiri).

jest.mock('../../src/config/db', () => ({ query: jest.fn().mockResolvedValue({ rows: [] }) }));

const request = require('supertest');
const app = require('../../src/app');

describe('POST /api/auth/login - rate limit (NFR-11)', () => {
  test('permintaan ke-11 dalam 15 menit yang sama ditolak dengan 429', async () => {
    let lastRes;
    for (let i = 0; i < 11; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      lastRes = await request(app).post('/api/auth/login').send({ email: 'x@x.com', password: 'salah' });
    }
    expect(lastRes.status).toBe(429);
    expect(lastRes.body).toEqual({ message: 'Terlalu banyak percobaan login. Coba lagi dalam beberapa menit.' });
  }, 15000);
});
