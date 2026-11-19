jest.mock('../../src/services/tahunAjaranService', () => ({ createTahunAjaran: jest.fn(), updateTahunAjaran: jest.fn() }));
const service = require('../../src/services/tahunAjaranService');
const controller = require('../../src/controllers/tahunAjaranController');

test.each(['createTahunAjaran', 'updateTahunAjaran'])('%s menolak semester beberapa tahun sebelum mengakses database', async action => {
  const req = { params: { id: '1' }, body: { tahun: '2023/2024', semester: 'Ganjil', tanggal_mulai: '2023-12-31', tanggal_selesai: '2027-02-04' } };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  await controller[action](req, res, jest.fn());
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith({ message: 'Durasi semester maksimal 7 bulan kalender.' });
  expect(service[action]).not.toHaveBeenCalled();
});

// Tahun pilihan pengguna tidak lagi diturunkan dari tanggal atau semester.
describe.each(['createTahunAjaran', 'updateTahunAjaran'])('%s dengan tahun pilihan pengguna', action => {
  beforeEach(() => jest.clearAllMocks());

  test('menyimpan 2026/2027 meskipun tanggal semester berada pada tahun lain', async () => {
    const req = { params: { id: '1' }, body: { tahun: '2026/2027', semester: 'Genap', tanggal_mulai: '2028-01-01', tanggal_selesai: '2028-06-01' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    service[action].mockResolvedValue({ tahun: '2026/2027' });
    await controller[action](req, res, next);
    const args = ['2026/2027', 'Genap', '2028-01-01', '2028-06-01'];
    expect(service[action]).toHaveBeenCalledWith(...(action === 'updateTahunAjaran' ? ['1', ...args] : args));
    expect(next).not.toHaveBeenCalled();
  });

  test.each(['2026/2028', '2026', 'abcd/efgh'])('menolak format tahun %s', async tahun => {
    const req = { params: { id: '1' }, body: { tahun, semester: 'Ganjil', tanggal_mulai: '2026-07-01', tanggal_selesai: '2026-12-01' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await controller[action](req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(service[action]).not.toHaveBeenCalled();
  });
});

test.each(['createTahunAjaran', 'updateTahunAjaran'])('%s menerima semester SP', async action => {
  jest.clearAllMocks();
  const req = { params: { id: '1' }, body: { tahun: '2026/2027', semester: 'SP', tanggal_mulai: '2027-06-01', tanggal_selesai: '2027-07-31' } };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();
  service[action].mockResolvedValue({ ...req.body });
  await controller[action](req, res, next);
  const args = ['2026/2027', 'SP', '2027-06-01', '2027-07-31'];
  expect(service[action]).toHaveBeenCalledWith(...(action === 'updateTahunAjaran' ? ['1', ...args] : args));
  expect(res.json).toHaveBeenCalledWith(req.body);
  expect(next).not.toHaveBeenCalled();
});


test.each(['createTahunAjaran', 'updateTahunAjaran'])('%s menolak tanggal mulai sebelum tahun awal tanpa menyimpan data', async action => {
  jest.clearAllMocks();
  const req = { params: { id: '1' }, body: { tahun: '2026/2027', semester: 'Ganjil', tanggal_mulai: '2025-12-31', tanggal_selesai: '2026-06-01' } };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();
  await controller[action](req, res, next);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith({ message: 'Tanggal mulai semester tidak boleh sebelum tahun awal 2026.' });
  expect(service[action]).not.toHaveBeenCalled();
  expect(next).not.toHaveBeenCalled();
});
