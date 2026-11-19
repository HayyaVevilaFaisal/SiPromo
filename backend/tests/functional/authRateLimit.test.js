jest.mock('../../src/config/db', () => ({ query: jest.fn().mockResolvedValue({ rows: [] }) }));

const request = require('supertest');
process.env.GOOGLE_CLIENT_ID = 'test-client';
process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
process.env.GOOGLE_CALLBACK_URL = 'http://localhost:5001/api/auth/google/callback';
const app = require('../../src/app');

describe('GET /api/auth/google - rate limit (NFR-11)', () => {
  test('permintaan ke-11 dalam 15 menit yang sama ditolak dengan 429', async () => {
    let lastRes;
    for (let i = 0; i < 11; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      lastRes = await request(app).get('/api/auth/google');
      if (i < 10) expect(lastRes.status).toBe(302);
    }
    expect(lastRes.status).toBe(429);
    expect(lastRes.body).toEqual({ message: 'Terlalu banyak percobaan login. Coba lagi dalam beberapa menit.' });
  }, 15000);
});
