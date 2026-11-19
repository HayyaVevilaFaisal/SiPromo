jest.mock('../../src/config/db', () => ({ query: jest.fn() }));

const request = require('supertest');
const { OAuth2 } = require('oauth');
const pool = require('../../src/config/db');

process.env.GOOGLE_CLIENT_ID = 'test-client';
process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
process.env.GOOGLE_CALLBACK_URL = 'http://localhost:5001/api/auth/google/callback';
const app = require('../../src/app');

const row = { pengguna_id: 2, email: 'pic@gmail.com', nama_lengkap: 'PIC', role: 'PIC Promosi' };
const callback = '/api/auth/google/callback';
const loginUrl = `${process.env.FRONTEND_ORIGIN}/login`;
const exchange = jest.spyOn(OAuth2.prototype, 'getOAuthAccessToken');
const getProfile = jest.spyOn(OAuth2.prototype, 'get');

beforeEach(() => {
  pool.query.mockReset();
  exchange.mockReset().mockImplementation((_code, _params, done) => done(null, 'access-token'));
  getProfile.mockReset().mockImplementation((_url, _token, done) => {
    done(null, JSON.stringify({ sub: 'google-user-id', email: row.email, email_verified: true }));
  });
});

async function startLogin() {
  const response = await request(app).get('/api/auth/google').expect(302);
  const url = new URL(response.headers.location);
  expect(url.hostname).toBe('accounts.google.com');
  expect(url.searchParams.get('redirect_uri')).toBe(process.env.GOOGLE_CALLBACK_URL);
  expect(url.searchParams.get('scope').split(' ')).toContain('profile');
  const state = url.searchParams.get('state');
  expect(state).toBeTruthy();
  const [cookie] = response.headers['set-cookie'];
  expect(cookie).toContain('HttpOnly');
  expect(cookie).toContain('SameSite=Lax');
  return { state, cookie: cookie.split(';')[0] };
}

test.each([
  { email: 'pic@gmail.com' },
  { email: 'pic@example.com', hd: 'example.com' },
])('callback Google untuk $email membuat sesi yang dapat digunakan di /me', async profile => {
  const userRow = { ...row, email: profile.email };
  pool.query.mockResolvedValue({ rows: [userRow] });
  getProfile.mockImplementation((_url, _token, done) => {
    done(null, JSON.stringify({ ...profile, sub: 'google-user-id', email_verified: true, name: 'Nama Google' }));
  });
  const { state, cookie } = await startLogin();

  const result = await request(app).get(callback).query({ state, code: 'test-code' })
    .set('Cookie', cookie).expect(302).expect('Location', loginUrl);
  expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('is_active = TRUE'), [userRow.email]);
  expect(pool.query).toHaveBeenCalledTimes(1);
  const session = result.headers['set-cookie'].find(value => value.startsWith('sipromo_session='));
  expect(session).toContain('HttpOnly');
  const me = await request(app).get('/api/auth/me').set('Cookie', session.split(';')[0]).expect(200);
  expect(me.body.user).toEqual({ id: 2, email: userRow.email, nama: 'PIC', role: 'PIC Promosi' });
});

test('login pertama mengisi nama sementara dari profil Google', async () => {
  const userRow = { ...row, email: 'pic@unpar.ac.id', nama_lengkap: 'pic@unpar.ac.id' };
  const namedUser = { ...userRow, nama_lengkap: 'Nama dari Google' };
  pool.query.mockResolvedValueOnce({ rows: [userRow] }).mockResolvedValueOnce({ rows: [namedUser] });
  getProfile.mockImplementation((_url, _token, done) => {
    done(null, JSON.stringify({
      sub: 'google-user-id', email: userRow.email, email_verified: true, hd: 'unpar.ac.id', name: namedUser.nama_lengkap,
    }));
  });
  const { state, cookie } = await startLogin();
  const result = await request(app).get(callback).query({ state, code: 'test-code' })
    .set('Cookie', cookie).expect(302).expect('Location', loginUrl);
  expect(pool.query).toHaveBeenNthCalledWith(2, expect.stringContaining('nama_lengkap = email'),
    [userRow.pengguna_id, namedUser.nama_lengkap]);
  expect(result.headers['set-cookie'].some(value => value.startsWith('sipromo_session='))).toBe(true);
});

test('state yang berbeda ditolak sebelum menukar code', async () => {
  const { cookie } = await startLogin();
  await request(app).get(callback).query({ state: 'mismatch', code: 'test-code' })
    .set('Cookie', cookie).expect(302).expect('Location', `${loginUrl}?google=failed`);
  expect(exchange).not.toHaveBeenCalled();
});

test('email di luar akun aktif terdaftar ditolak tanpa cookie sesi', async () => {
  pool.query.mockResolvedValue({ rows: [] });
  const { state, cookie } = await startLogin();
  const result = await request(app).get(callback).query({ state, code: 'test-code' })
    .set('Cookie', cookie).expect(302).expect('Location', `${loginUrl}?google=failed`);
  expect(result.headers['set-cookie']).toHaveLength(1);
  expect(result.headers['set-cookie'][0]).toMatch(/^sipromo_google_state=;.*Expires=Thu, 01 Jan 1970/);
});

test.each([
  { email: 'pic@gmail.com', email_verified: false },
  { email: 'pic@example.com', email_verified: true },
])('email yang tidak dapat dipastikan kepemilikannya ditolak', async profile => {
  getProfile.mockImplementation((_url, _token, done) => done(null, JSON.stringify(profile)));
  const { state, cookie } = await startLogin();
  await request(app).get(callback).query({ state, code: 'test-code' })
    .set('Cookie', cookie).expect(302).expect('Location', `${loginUrl}?google=failed`);
  expect(pool.query).not.toHaveBeenCalled();
});
