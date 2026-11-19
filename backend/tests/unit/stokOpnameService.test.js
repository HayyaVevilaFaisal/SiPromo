jest.mock('../../src/config/db', () => ({ connect: jest.fn(), query: jest.fn() }));
jest.mock('../../src/utils/stockNotification', () => ({ checkStockThreshold: jest.fn() }));
const pool = require('../../src/config/db');
const { checkStockThreshold } = require('../../src/utils/stockNotification');
const { updateStokOpname } = require('../../src/services/stokOpnameService');

let client;
let physical;
let stock;
const header = { stok_opname_id: 1, tahun_ajaran_id: 1, tanggal: '2026-10-05', catatan: '' };
const previous = { aset_id: 1, stok_sistem: 100, stok_fisik: 90 };
function payload(fisik = 95) {
  return { tanggal: header.tanggal, catatan: 'Koreksi',
    daftar_aset: [{ aset_id: 1, stok_fisik: fisik }],
    original: { tanggal: header.tanggal, catatan: '', daftar_aset: [{ ...previous }] } };
}
beforeEach(() => {
  jest.resetAllMocks();
  physical = 90;
  stock = 70; // 20 unit dipakai setelah opname awal.
  client = { release: jest.fn(), query: jest.fn(async (sql, params) => {
    if (sql.includes('FROM tahun_ajaran periode_berjalan')) return { rows: [{ tahun_ajaran_id: 1, tanggal_mulai: '2026-07-01', tanggal_selesai: '2026-12-31' }] };
    if (sql.includes('FROM stok_opname so')) return { rowCount: 1, rows: [header] };
    if (sql.includes('FROM detail_stok_opname')) return { rows: [{ ...previous, stok_fisik: physical }] };
    if (sql.includes('FROM tahun_ajaran')) return { rowCount: 1, rows: [{ tahun_ajaran_id: 1 }] };
    if (sql.includes('SELECT * FROM aset')) return { rowCount: 1, rows: [{ aset_id: 1, nama: 'Pin', stok: stock }] };
    if (sql.includes('UPDATE detail_stok_opname')) physical = params[0];
    if (sql.includes('UPDATE aset SET stok')) {
      stock = params[0];
      return { rows: [{ aset_id: 1, stok: stock }] };
    }
    return { rows: [] };
  }) };
  pool.connect.mockResolvedValue(client);
  pool.query.mockImplementation(async sql => ({ rows: sql.includes('FROM stok_opname so') ? [header] : [{ ...previous, stok_fisik: physical }] }));
});

test('koreksi menambah selisih tanpa menghapus penggunaan setelah opname', async () => {
  await updateStokOpname(1, payload());
  expect(stock).toBe(75);
  expect(physical).toBe(95);
  expect(checkStockThreshold).toHaveBeenCalledWith({ aset_id: 1, stok: 75 });
  expect(client.query).toHaveBeenCalledWith('COMMIT');
  expect(client.release).toHaveBeenCalled();
});

test('koreksi negatif mengurangi stok sistem', async () => {
  await updateStokOpname(1, payload(85));
  expect(stock).toBe(65);
});

test('edit catatan saja tidak menyesuaikan stok lagi', async () => {
  await updateStokOpname(1, payload(90));
  expect(stock).toBe(70);
  expect(checkStockThreshold).not.toHaveBeenCalled();
});

test('penyimpanan ulang dari form lama ditolak agar koreksi tidak dihitung dua kali', async () => {
  await updateStokOpname(1, payload());
  await expect(updateStokOpname(1, payload())).rejects.toMatchObject({ status: 409 });
  expect(stock).toBe(75);
  expect(client.query).toHaveBeenCalledWith('ROLLBACK');
});

test('stok negatif ditolak dan transaksi dibatalkan', async () => {
  stock = 2;
  await expect(updateStokOpname(1, payload(85))).rejects.toMatchObject({ status: 400 });
  expect(stock).toBe(2);
  expect(physical).toBe(90);
  expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  expect(checkStockThreshold).not.toHaveBeenCalled();
});

test('stok fisik negatif dan daftar aset berbeda ditolak', async () => {
  await expect(updateStokOpname(1, payload(-1))).rejects.toMatchObject({ status: 400 });
  const data = payload();
  data.daftar_aset[0].aset_id = 2;
  await expect(updateStokOpname(1, data)).rejects.toMatchObject({ status: 400 });
});
