// Tes perilaku lama, dipertahankan sebagai referensi:
// jest.mock('../../src/config/db', () => ({ connect: jest.fn(), query: jest.fn() }));
// jest.mock('../../src/utils/stockNotification', () => ({ checkStockThreshold: jest.fn() }));
// const pool = require('../../src/config/db');
// const { createPembelian, updatePembelian } = require('../../src/services/pembelianService');
// let client;
// beforeEach(() => {
//   jest.resetAllMocks();
//   client = { release: jest.fn(), query: jest.fn(async sql => {
//     if (sql.includes('FROM tahun_ajaran periode_berjalan')) return { rows: [{ tahun_ajaran_id: 1, tanggal_mulai: '2026-07-01', tanggal_selesai: '2026-12-31' }] };
//     if (sql.includes('FROM detail_pembelian')) return { rows: [{ aset_id: 1, qty_in: 2, unit_price: '4000.00' }] };
//     if (sql.includes('FROM aset')) return { rows: [{ aset_id: 1, nama: 'Pin', harga: '5000.00', stok: 100 }] };
//     if (sql.includes('RETURNING *') && sql.includes('UPDATE aset')) return { rows: [{ aset_id: 1, stok: 102, harga: '6000.00' }] };
//     return { rows: [{ pembelian_id: 1, tahun_ajaran_id: 1 }] };
//   }) };
//   pool.connect.mockResolvedValue(client);
// });
// function insertPrice() { return client.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO detail_pembelian'))[1][3]; }
// function assetPrice() { return client.query.mock.calls.find(([sql]) => sql.includes('SET stok = stok +'))[1][2]; }
// 
// test('harga input disimpan di detail dan aset dalam satu transaksi', async () => {
//   await createPembelian(1, 1, '2026-10-05', 'Lunas', '', [{ aset_id: 1, qty_in: 2, unit_price: 6000 }]);
//   expect(insertPrice()).toBe(6000);
//   expect(assetPrice()).toBe(6000);
//   expect(client.query).toHaveBeenCalledWith('COMMIT');
// });
// test('tanpa input harga memakai harga aset terbaru', async () => {
//   await createPembelian(1, 1, '2026-10-05', 'Lunas', '', [{ aset_id: 1, qty_in: 2 }]);
//   expect(insertPrice()).toBe('5000.00');
// });
// test('edit pembelian menyesuaikan harga aset jika harga transaksi dikoreksi', async () => {
//   await updatePembelian(1, 1, 1, '2026-10-05', 'Lunas', '', [{ aset_id: 1, qty_in: 2, unit_price: 6500 }]);
//   expect(insertPrice()).toBe(6500);
//   expect(assetPrice()).toBe(6500);
// });
// test('edit catatan mempertahankan harga transaksi lama dan harga aset terbaru', async () => {
//   await updatePembelian(1, 1, 1, '2026-10-05', 'Lunas', 'Catatan', [{ aset_id: 1, qty_in: 2, unit_price: 4000 }]);
//   expect(insertPrice()).toBe(4000);
//   expect(assetPrice()).toBe('5000.00');
// });
// test.each([-1, '', null, 'abc', 0.001, 10000000000])('harga tidak valid %s ditolak sebelum membuka transaksi', async price => {
//   await expect(createPembelian(1, 1, '2026-10-05', 'Lunas', '', [{ aset_id: 1, qty_in: 2, unit_price: price }])).rejects.toMatchObject({ statusCode: 400 });
//   expect(pool.connect).not.toHaveBeenCalled();
// });
// test('harga nol valid', async () => {
//   await createPembelian(1, 1, '2026-10-05', 'Lunas', '', [{ aset_id: 1, qty_in: 2, unit_price: 0 }]);
//   expect(insertPrice()).toBe(0);
//   expect(assetPrice()).toBe(0);
// });
// 
// test('edit harga tetap berhasil saat stok tersisa lebih kecil dari pembelian awal', async () => {
//   const originalQuery = client.query.getMockImplementation();
//   client.query.mockImplementation(async (sql, params) => sql.includes('FROM aset')
//     ? { rows: [{ aset_id: 1, nama: 'Pin', harga: '5000.00', stok: 0 }] }
//     : originalQuery(sql, params));
//   await updatePembelian(1, 1, 1, '2026-10-05', 'Lunas', '', [{ aset_id: 1, qty_in: 2, unit_price: 6500 }]);
//   const stockUpdate = client.query.mock.calls.find(([sql]) => sql.includes('SET stok = stok +'));
//   expect(stockUpdate[1]).toEqual([0, 1, 6500]);
//   expect(client.query).toHaveBeenCalledWith('COMMIT');
// });
// 
// test('pengurangan jumlah memakai selisih bersih, bukan membatalkan seluruh pembelian', async () => {
//   await updatePembelian(1, 1, 1, '2026-10-05', 'Lunas', '', [{ aset_id: 1, qty_in: 1, unit_price: 4000 }]);
//   const stockUpdate = client.query.mock.calls.find(([sql]) => sql.includes('SET stok = stok +'));
//   expect(stockUpdate[1][0]).toBe(-1);
// });
// 
// test('pengurangan yang membuat stok negatif ditolak dengan pesan validasi', async () => {
//   const originalQuery = client.query.getMockImplementation();
//   client.query.mockImplementation(async (sql, params) => sql.includes('FROM aset')
//     ? { rows: [{ aset_id: 1, nama: 'Pin', harga: '5000.00', stok: 0 }] }
//     : originalQuery(sql, params));
//   await expect(updatePembelian(1, 1, 1, '2026-10-05', 'Lunas', '', [{ aset_id: 1, qty_in: 1, unit_price: 4000 }]))
//     .rejects.toMatchObject({ statusCode: 400 });
//   expect(client.query).toHaveBeenCalledWith('ROLLBACK');
// });

jest.mock('../../src/config/db', () => ({ connect: jest.fn(), query: jest.fn() }));
jest.mock('../../src/utils/stockNotification', () => ({ checkStockThreshold: jest.fn() }));
const pool = require('../../src/config/db');
const { checkStockThreshold } = require('../../src/utils/stockNotification');
const { createPembelian, updatePembelian, updateStatusPembelian } = require('../../src/services/pembelianService');
let client, oldStatus, oldDetails, stock, missing;
const input = [{ aset_id: 1, qty_in: 3, unit_price: 6500 }];
beforeEach(() => {
  jest.resetAllMocks();
  oldStatus = 'Lunas'; stock = 100; missing = false;
  oldDetails = [{ aset_id: 1, qty_in: 2, unit_price: '4000.00' }];
  client = { release: jest.fn(), query: jest.fn(async (sql, params) => {
    if (sql.includes('FROM tahun_ajaran periode_berjalan')) return { rows: [{ tahun_ajaran_id: 1, tanggal_mulai: '2026-07-01', tanggal_selesai: '2026-12-31' }] };
    if (sql.includes('FOR UPDATE OF p, hp')) return { rows: missing ? [] : [{ pembelian_id: 1, tahun_ajaran_id: 1, vendor_id: 1, tanggal: '2026-10-05', catatan: '', status: oldStatus }] };
    if (sql.includes('SELECT * FROM detail_pembelian')) return { rows: oldDetails };
    if (sql.includes('SELECT * FROM aset')) return { rows: [{ aset_id: params[0], nama: 'Pin', harga: '5000.00', stok: stock }] };
    if (sql.includes('UPDATE aset')) return { rows: [{ aset_id: params[1], stok: stock + params[0], harga: 6500 }] };
    return { rows: [{ pembelian_id: 1, tahun_ajaran_id: 1, status: params?.[1] }] };
  }) };
  pool.connect.mockResolvedValue(client);
});
const stockCalls = () => client.query.mock.calls.filter(([sql]) => sql.includes('UPDATE aset'));
const detailCalls = () => client.query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO detail_pembelian'));
function expectPaidPriceSource() {
  for (const [sql] of stockCalls()) {
    expect(sql).toContain("p.status = 'Lunas'");
    expect(sql).toContain('ORDER BY p.tanggal DESC, p.pembelian_id DESC LIMIT 1');
    expect(sql).toContain('COALESCE');
  }
}

test.each(['Belum Bayar', 'DP', 'Lunas'])('buat pembelian %s hanya mengubah aset jika Lunas', async status => {
  const result = await createPembelian(1, 1, '2026-10-05', status, '', input);
  expect(detailCalls()[0][1]).toEqual([1, 1, 3, 6500]);
  expect(stockCalls().length).toBe(status === 'Lunas' ? 1 : 0);
  if (status === 'Lunas') expect(stockCalls()[0][1]).toEqual([3, 1]);
  expect(result.aset).toHaveLength(status === 'Lunas' ? 1 : 0);
  expect(checkStockThreshold).toHaveBeenCalledTimes(status === 'Lunas' ? 1 : 0);
  expectPaidPriceSource();
  expect(client.query).toHaveBeenCalledWith('COMMIT');
  expect(client.release).toHaveBeenCalled();
});

const transitions = ['Belum Bayar', 'DP', 'Lunas'].flatMap(from => ['Belum Bayar', 'DP', 'Lunas'].map(to => [from, to]));
test.each(transitions)('edit status %s -> %s menghitung selisih stok sesuai kontribusi Lunas', async (from, to) => {
  oldStatus = from;
  await updatePembelian(1, 1, 1, '2026-10-05', to, '', input);
  const expectedDelta = (to === 'Lunas' ? 3 : 0) - (from === 'Lunas' ? 2 : 0);
  if (from !== 'Lunas' && to !== 'Lunas') expect(stockCalls()).toHaveLength(0);
  else expect(stockCalls()[0][1]).toEqual([expectedDelta, 1]);
  expectPaidPriceSource();
  expect(detailCalls()[0][1][3]).toBe(6500);
  expect(client.query).toHaveBeenCalledWith('COMMIT');
});

test.each(transitions)('PATCH status %s -> %s memakai transaksi stok yang sama', async (from, to) => {
  oldStatus = from;
  await updateStatusPembelian(1, to);
  const expectedDelta = (to === 'Lunas' ? 2 : 0) - (from === 'Lunas' ? 2 : 0);
  if (from !== 'Lunas' && to !== 'Lunas') expect(stockCalls()).toHaveLength(0);
  else expect(stockCalls()[0][1]).toEqual([expectedDelta, 1]);
  expectPaidPriceSource();
  expect(client.query).toHaveBeenCalledWith('COMMIT');
});

test('simpan Lunas berulang tanpa mengubah jumlah tidak menambah stok lagi', async () => {
  await updateStatusPembelian(1, 'Lunas');
  await updateStatusPembelian(1, 'Lunas');
  expect(stockCalls().map(call => call[1][0])).toEqual([0, 0]);
});

test('ganti jenis aset pada pembelian Lunas membatalkan aset lama dan menambah aset baru', async () => {
  await updatePembelian(1, 1, 1, '2026-10-05', 'Lunas', '', [{ aset_id: 2, qty_in: 4, unit_price: 7000 }]);
  expect(stockCalls().map(call => call[1])).toEqual([[-2, 1], [4, 2]]);
  expectPaidPriceSource();
});

test.each(['DP', 'Belum Bayar'])('pembatalan Lunas ke %s ditolak jika stok sudah dipakai', async status => {
  stock = 1;
  await expect(updateStatusPembelian(1, status)).rejects.toMatchObject({ statusCode: 400 });
  expect(stockCalls()).toHaveLength(0);
  expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  expect(checkStockThreshold).not.toHaveBeenCalled();
  expect(client.release).toHaveBeenCalled();
});

test('edit harga saja saat stok habis tetap berhasil dengan selisih nol', async () => {
  stock = 0;
  await updatePembelian(1, 1, 1, '2026-10-05', 'Lunas', '', [{ aset_id: 1, qty_in: 2, unit_price: 6500 }]);
  expect(stockCalls()[0][1]).toEqual([0, 1]);
  expectPaidPriceSource();
});

test('tanpa input harga memakai harga aset pada transaksi baru', async () => {
  await createPembelian(1, 1, '2026-10-05', 'Lunas', '', [{ aset_id: 1, qty_in: 2 }]);
  expect(detailCalls()[0][1][3]).toBe('5000.00');
});
test('edit tanpa input harga mempertahankan harga detail lama', async () => {
  await updatePembelian(1, 1, 1, '2026-10-05', 'Lunas', '', [{ aset_id: 1, qty_in: 2 }]);
  expect(detailCalls()[0][1][3]).toBe('4000.00');
});

test.each([-1, '', null, 'abc', 0.001, 10000000000])('harga tidak valid %s ditolak sebelum transaksi', async price => {
  await expect(createPembelian(1, 1, '2026-10-05', 'Lunas', '', [{ aset_id: 1, qty_in: 2, unit_price: price }])).rejects.toMatchObject({ statusCode: 400 });
  expect(pool.connect).not.toHaveBeenCalled();
});
test('harga nol tetap dapat dicatat', async () => {
  await createPembelian(1, 1, '2026-10-05', 'Lunas', '', [{ aset_id: 1, qty_in: 2, unit_price: 0 }]);
  expect(detailCalls()[0][1][3]).toBe(0);
});
test('kegagalan update aset membatalkan seluruh pencatatan', async () => {
  const query = client.query.getMockImplementation();
  client.query.mockImplementation((sql, params) => sql.includes('UPDATE aset') ? Promise.reject(new Error('Database gagal')) : query(sql, params));
  await expect(createPembelian(1, 1, '2026-10-05', 'Lunas', '', input)).rejects.toThrow('Database gagal');
  expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  expect(client.query).not.toHaveBeenCalledWith('COMMIT');
  expect(checkStockThreshold).not.toHaveBeenCalled();
});
test('PATCH pembelian tidak ditemukan tidak menulis data', async () => {
  missing = true;
  await expect(updateStatusPembelian(999, 'Lunas')).resolves.toBeUndefined();
  expect(stockCalls()).toHaveLength(0);
  expect(detailCalls()).toHaveLength(0);
});
