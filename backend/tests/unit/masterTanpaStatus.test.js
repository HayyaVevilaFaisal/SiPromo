jest.mock('../../src/config/db', () => ({ query: jest.fn() }));
const pool = require('../../src/config/db');
const aset = require('../../src/services/asetService');
const vendor = require('../../src/services/vendorService');
const lokasi = require('../../src/services/lokasiPenyimpananService');
const tahun = require('../../src/services/tahunAjaranService');
const { currentPeriodSql } = require('../../src/utils/periodeEdit');
const activeSql = sql => sql.replace(/--[^\n]*/g, '');
beforeEach(() => { jest.clearAllMocks(); pool.query.mockResolvedValue({ rows: [] }); });

test('filter lokasi aset digabung dengan level dan harga menggunakan parameter SQL', async () => {
  await aset.getAllAset('Tas', '2', '3', '1000', '5000');
  const [sql, values] = pool.query.mock.calls[0];
  expect(activeSql(sql)).toContain('s.lokasi_penyimpanan_id = $3');
  expect(activeSql(sql)).toContain('s.level_aset_id = $2');
  expect(values).toEqual(['%Tas%', '2', '3', '1000', '5000']);
  expect(activeSql(sql)).not.toContain('is_active');
});

test.each([
  [vendor.getAllVendor], [lokasi.getAllLokasi], [tahun.getAllTahunAjaran],
])('daftar master mengabaikan parameter status lama', async getAll => {
  await getAll('', 'terhapus');
  expect(activeSql(pool.query.mock.calls[0][0])).not.toContain('is_active');
});

test('vendor baru tidak memerlukan kolom status', async () => {
  await vendor.createVendor('Vendor', 'Bandung', '', '');
  expect(activeSql(pool.query.mock.calls[0][0])).not.toContain('is_active');
});

test('kombinasi tahun dan semester yang sudah ada ditolak tanpa mengaktifkan ulang', async () => {
  pool.query.mockResolvedValueOnce({ rows: [{ tahun_ajaran_id: 1 }] });
  await expect(tahun.createTahunAjaran('2026/2027', 'SP', '2027-06-01', '2027-07-31'))
    .rejects.toMatchObject({ statusCode: 400 });
  expect(pool.query).toHaveBeenCalledTimes(1);
});

test.each(['aset', 'vendor', 'lokasiPenyimpanan', 'tahunAjaran'])('route master %s tidak menyediakan DELETE', name => {
  const router = require(`../../src/routes/${name}Routes`);
  expect(router.stack.some(layer => layer.route?.methods.delete)).toBe(false);
});

test('periode transaksi hanya mengikuti tanggal tanpa status tahun ajaran', () => {
  expect(activeSql(currentPeriodSql)).not.toContain('is_active');
  expect(activeSql(currentPeriodSql)).toContain('WHERE periode.tanggal_mulai');
});
