jest.mock('../../src/config/db', () => ({ query: jest.fn() }));
const request = require('supertest');
const jwt = require('jsonwebtoken');
const pool = require('../../src/config/db');
const { sessionOptions } = require('../../src/utils/authCookies');
const app = require('../../src/app');
const row = { pengguna_id: 1, nama_lengkap: 'Kaprodi', email: 'kaprodi@example.com', role: 'Kaprodi' };
const cookie = (claims = { id: 1, auth: 'google' }, expiresIn = '1h') => `sipromo_session=${jwt.sign(claims, process.env.JWT_SECRET, { expiresIn })}`;
beforeEach(() => pool.query.mockReset());
test('endpoint login password sudah dihapus dan sesi password lama ditolak', async () => {
  await request(app).post('/api/auth/login').expect(404);
  await request(app).get('/api/auth/me').set('Cookie', cookie({ id: 1, auth: 'password' })).expect(401);
  expect(pool.query).not.toHaveBeenCalled();
});
test('me menggunakan cookie dan mengambil role terbaru dari database', async () => {
  pool.query.mockResolvedValueOnce({ rows: [row] });
  const res = await request(app).get('/api/auth/me').set('Cookie', cookie());
  expect(res.status).toBe(200); expect(res.body.user.role).toBe('Kaprodi'); expect(res.body.token).toBeUndefined();
});
test('me menolak tanpa cookie, Bearer header, token salah, dan JWT kedaluwarsa', async () => {
  expect((await request(app).get('/api/auth/me')).status).toBe(401);
  expect((await request(app).get('/api/auth/me').set('Authorization', 'Bearer anything')).status).toBe(401);
  expect((await request(app).get('/api/auth/me').set('Cookie', 'sipromo_session=forged')).status).toBe(401);
  expect((await request(app).get('/api/auth/me').set('Cookie', cookie(undefined, -1))).status).toBe(401);
  expect(pool.query).not.toHaveBeenCalled();
});
test('PIC yang dinonaktifkan kehilangan akses pada sesi yang sudah terbit', async () => {
  pool.query.mockResolvedValueOnce({ rows: [] });
  expect((await request(app).get('/api/auth/me').set('Cookie', cookie())).status).toBe(401);
});
test('logout menghapus cookie HttpOnly melalui server', async () => {
  const res = await request(app).post('/api/auth/logout').set('Cookie', cookie()).set('Origin', process.env.FRONTEND_ORIGIN);
  expect(res.status).toBe(204);
  expect(res.headers['set-cookie'].find(value => value.startsWith('sipromo_session='))).toContain('Expires=Thu, 01 Jan 1970');
});
test.each([undefined, 'https://evil.test', 'http://other.localhost:5173'])('mutasi cookie ditolak untuk Origin %s', async origin => {
  let req = request(app).post('/api/auth/logout').set('Cookie', cookie());
  if (origin) req = req.set('Origin', origin);
  expect((await req).status).toBe(403);
});
test('cookie produksi wajib Secure', () => {
  const previous = process.env.NODE_ENV; process.env.NODE_ENV = 'production';
  try { expect(sessionOptions()).toMatchObject({ secure: true, httpOnly: true, sameSite: 'lax' }); }
  finally { process.env.NODE_ENV = previous; }
});
