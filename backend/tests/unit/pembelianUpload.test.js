// White box test - uploadBonPembelian(req, res, next) dipanggil langsung dengan req.file palsu,
// supaya tidak perlu multer sungguhan / tidak menulis apa pun ke backend/uploads/.

jest.mock('../../src/config/db', () => ({ query: jest.fn() }));

const pool = require('../../src/config/db');
const { uploadBonPembelian } = require('../../src/controllers/pembelianController');

function createReqRes({ body = {}, params = {}, file } = {}) {
  const req = { body, params, file };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();
  return { req, res, next };
}

describe('uploadBonPembelian (white box)', () => {
  test('cabang 1: req.file kosong -> 400, tidak ada query ke database', async () => {
    const { req, res, next } = createReqRes({ params: { id: '1' } });
    await uploadBonPembelian(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'File bon pembelian wajib diunggah' });
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('cabang 2: pembelian tidak ditemukan -> 404', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const { req, res, next } = createReqRes({
      params: { id: '999' },
      file: { originalname: 'bon.pdf', filename: '123-bon.pdf' },
    });
    await uploadBonPembelian(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('cabang 3: sukses -> nama_file & url_file diturunkan dari req.file', async () => {
    const updated = { pembelian_id: 1, nama_file: 'bon.pdf', url_file: '/uploads/123-bon.pdf' };
    pool.query.mockResolvedValueOnce({ rows: [updated] });
    const { req, res, next } = createReqRes({
      params: { id: '1' },
      file: { originalname: 'bon.pdf', filename: '123-bon.pdf' },
    });

    await uploadBonPembelian(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(updated);
    expect(pool.query.mock.calls[0][1]).toEqual(['bon.pdf', '/uploads/123-bon.pdf', '1']);
  });
});
