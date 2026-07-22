// Functional test - menguji endpoint /api/auth dari sisi HTTP (Supertest), merujuk FR-01 & NFR-11
// (login PIC Promosi/Kaprodi, autentikasi JWT). Database dimock di lapisan pool.query.

jest.mock('../../src/config/db', () => ({ query: jest.fn() }));

const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../../src/config/db');
const app = require('../../src/app');

const REAL_PASSWORD_HASH = bcrypt.hashSync('password123', 10);
const mockUserRow = {
  pengguna_id: 1,
  nama_lengkap: 'PIC Promosi Informatika',
  email: 'pic.promosi@if.unpar.ac.id',
  password: REAL_PASSWORD_HASH,
  status_aktif: true,
};

describe('POST /api/auth/login (FR-01)', () => {
  test('400 jika email atau password tidak dikirim', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Email dan password wajib diisi' });
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('401 jika email tidak terdaftar / tidak aktif', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post('/api/auth/login').send({ email: 'tidakada@if.unpar.ac.id', password: 'password123' });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: 'Email atau password salah' });
  });

  test('401 jika password salah (dicek dengan bcrypt.compare sungguhan terhadap hash)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [mockUserRow] });
    const res = await request(app).post('/api/auth/login').send({ email: mockUserRow.email, password: 'password-salah' });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: 'Email atau password salah' });
  });

  test('200 + token JWT valid jika email & password benar', async () => {
    pool.query.mockResolvedValueOnce({ rows: [mockUserRow] });
    const res = await request(app).post('/api/auth/login').send({ email: mockUserRow.email, password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ id: 1, nama: 'PIC Promosi Informatika', email: mockUserRow.email });
    expect(typeof res.body.token).toBe('string');

    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded).toMatchObject({ id: 1, email: mockUserRow.email, nama: 'PIC Promosi Informatika' });
  });
});

describe('GET /api/auth/me (autentikasi JWT, NFR-11)', () => {
  test('401 jika header Authorization tidak ada', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: 'Token tidak ditemukan' });
  });

  test('401 jika token tidak valid', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer token-acak-tidak-valid');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: 'Token tidak valid atau sudah kedaluwarsa' });
  });

  test('200 dan mengembalikan payload user jika token valid', async () => {
    const token = jwt.sign({ id: 1, email: mockUserRow.email, nama: 'PIC Promosi Informatika' }, process.env.JWT_SECRET);
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: 1, email: mockUserRow.email, nama: 'PIC Promosi Informatika' });
  });
});
