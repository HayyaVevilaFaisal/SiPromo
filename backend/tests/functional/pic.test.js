jest.mock('../../src/config/db', () => ({ query: jest.fn() }));
const request = require('supertest');
const jwt = require('jsonwebtoken');
const pool = require('../../src/config/db');
const app = require('../../src/app');
const kaprodi = { pengguna_id: 1, nama_lengkap: 'Mariskha', email: 'mariskha@unpar.ac.id', role: 'Kaprodi' };
const header = () => `sipromo_session=${jwt.sign({ id: 1, auth: 'google' }, process.env.JWT_SECRET)}`;
beforeEach(() => { pool.query.mockReset().mockResolvedValueOnce({ rows: [kaprodi] }); });
test('tanpa sesi ditolak', async () => {
  expect((await request(app).get('/api/pic')).status).toBe(401);
});
test.each(['get', 'post', 'patch'])('PIC tidak bisa mengelola PIC melalui %s', async method => {
  pool.query.mockReset().mockResolvedValueOnce({ rows: [{ ...kaprodi, role: 'PIC Promosi' }] });
  const res = await request(app)[method](method === 'patch' ? '/api/pic/2' : '/api/pic').set('Cookie', header()).set('Origin', process.env.FRONTEND_ORIGIN).send({});
  expect(res.status).toBe(403);
  expect(pool.query).toHaveBeenCalledTimes(1);
});
test('Kaprodi dapat melihat PIC', async () => {
  pool.query.mockResolvedValueOnce({ rows: [{ pengguna_id: 2 }] });
  const res = await request(app).get('/api/pic').set('Cookie', header()).set('Origin', process.env.FRONTEND_ORIGIN);
  expect(res.status).toBe(200); expect(res.body).toEqual([{ pengguna_id: 2 }]);
});
test('pendaftaran menormalisasi email dan memaksa role PIC meskipun client meminta Kaprodi', async () => {
  pool.query.mockResolvedValueOnce({ rows: [{ pengguna_id: 2 }] });
  const res = await request(app).post('/api/pic').set('Cookie', header()).set('Origin', process.env.FRONTEND_ORIGIN)
    .send({ email: ' PIC@UNPAR.AC.ID ', nama_lengkap: ' PIC Baru ', role: 'Kaprodi' });
  expect(res.status).toBe(201);
  expect(pool.query.mock.calls[1][1]).toEqual(['pic@unpar.ac.id', 'PIC Baru', true]);
  expect(pool.query.mock.calls[1][0]).toContain("'PIC Promosi'");
});
test('email tidak valid ditolak', async () => {
  expect((await request(app).post('/api/pic').set('Cookie', header()).set('Origin', process.env.FRONTEND_ORIGIN).send({ email: 'email-tidak-valid', nama_lengkap: 'PIC' })).status).toBe(400);
  expect(pool.query).toHaveBeenCalledTimes(1);
});
test('email duplikat ditolak 409', async () => {
  pool.query.mockRejectedValueOnce({ code: '23505' });
  expect((await request(app).post('/api/pic').set('Cookie', header()).set('Origin', process.env.FRONTEND_ORIGIN).send({ email: 'pic@unpar.ac.id', nama_lengkap: 'PIC' })).status).toBe(409);
});
test('Kaprodi dapat menonaktifkan PIC', async () => {
  pool.query.mockResolvedValueOnce({ rows: [{ pengguna_id: 2, is_active: false }] });
  const res = await request(app).patch('/api/pic/2').set('Cookie', header()).set('Origin', process.env.FRONTEND_ORIGIN).send({ is_active: false });
  expect(res.status).toBe(200); expect(res.body.is_active).toBe(false);
  expect(pool.query.mock.calls[1][0]).toContain("role = 'PIC Promosi'");
});
test('endpoint status tidak bisa mengubah akun Kaprodi', async () => {
  pool.query.mockResolvedValueOnce({ rows: [] });
  expect((await request(app).patch('/api/pic/1').set('Cookie', header()).set('Origin', process.env.FRONTEND_ORIGIN).send({ is_active: false })).status).toBe(404);
});
test('status harus boolean', async () => {
  expect((await request(app).patch('/api/pic/2').set('Cookie', header()).set('Origin', process.env.FRONTEND_ORIGIN).send({ is_active: 'false' })).status).toBe(400);
});
test('nama email dan status PIC dapat diperbarui bersama', async () => {
  pool.query.mockResolvedValueOnce({ rows: [{ pengguna_id: 2, nama_lengkap: 'PIC Baru', email: 'baru@gmail.com', is_active: false }] });
  const res = await request(app).patch('/api/pic/2').set('Cookie', header()).set('Origin', process.env.FRONTEND_ORIGIN)
    .send({ nama_lengkap: ' PIC Baru ', email: ' BARU@GMAIL.COM ', is_active: false, role: 'Kaprodi' });
  expect(res.status).toBe(200);
  expect(pool.query.mock.calls[1][1]).toEqual([false, '2', 'PIC Baru', 'baru@gmail.com']);
  expect(pool.query.mock.calls[1][0]).toContain("role = 'PIC Promosi'");
});
test('email duplikat saat edit ditolak', async () => {
  pool.query.mockRejectedValueOnce({ code: '23505' });
  const res = await request(app).patch('/api/pic/2').set('Cookie', header()).set('Origin', process.env.FRONTEND_ORIGIN)
    .send({ nama_lengkap: 'PIC', email: 'used@gmail.com', is_active: true });
  expect(res.status).toBe(409);
});
test('mutasi PIC dari origin asing ditolak', async () => {
  const res = await request(app).post('/api/pic').set('Cookie', header()).set('Origin', 'https://foreign.example')
    .send({ nama_lengkap: 'PIC', email: 'pic@gmail.com' });
  expect(res.status).toBe(403);
});
