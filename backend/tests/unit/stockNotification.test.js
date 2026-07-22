// White box test - menguji seluruh cabang logika checkStockThreshold() secara langsung
// (tanpa lapisan HTTP), merujuk pada struktur kontrol di backend/src/utils/stockNotification.js:
//
//   if (!aset) return;                                          [cabang 1]
//   if (aset.stok < aset.threshold_qty) {
//     if (existing.length === 0) { ...INSERT... }                [cabang 2]
//     else { /* tidak insert, sudah ada notifikasi aktif */ }    [cabang 3]
//   } else { ...UPDATE resolve... }                              [cabang 4]

jest.mock('../../src/config/db', () => ({ query: jest.fn() }));

const pool = require('../../src/config/db');
const { checkStockThreshold } = require('../../src/utils/stockNotification');

describe('checkStockThreshold (white box - branch coverage)', () => {
  test('cabang 1: aset null/undefined -> tidak melakukan query apa pun', async () => {
    await checkStockThreshold(null);
    await checkStockThreshold(undefined);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('cabang 2: stok < threshold DAN belum ada notifikasi aktif -> INSERT notifikasi baru', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] }) // SELECT existing -> kosong
      .mockResolvedValueOnce({ rows: [] }); // INSERT

    await checkStockThreshold({ aset_id: 3, nama: 'Tumbler Informatika', stok: 8, threshold_qty: 10 });

    expect(pool.query).toHaveBeenCalledTimes(2);
    expect(pool.query.mock.calls[0][0]).toMatch(/SELECT 1 FROM pesan_notifikasi/);
    expect(pool.query.mock.calls[0][1]).toEqual([3]);
    expect(pool.query.mock.calls[1][0]).toMatch(/INSERT INTO pesan_notifikasi/);
    expect(pool.query.mock.calls[1][1][0]).toBe(3);
    expect(pool.query.mock.calls[1][1][1]).toMatch(/Tumbler Informatika/);
  });

  test('cabang 3: stok < threshold TAPI sudah ada notifikasi aktif -> tidak INSERT lagi (anti-duplikat)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] }); // SELECT existing -> sudah ada

    await checkStockThreshold({ aset_id: 3, nama: 'Tumbler Informatika', stok: 8, threshold_qty: 10 });

    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(pool.query.mock.calls[0][0]).toMatch(/SELECT 1 FROM pesan_notifikasi/);
  });

  test('cabang 4: stok >= threshold -> notifikasi lama otomatis di-resolve, tidak ada SELECT/INSERT', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 1 });

    await checkStockThreshold({ aset_id: 3, nama: 'Tumbler Informatika', stok: 15, threshold_qty: 10 });

    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(pool.query.mock.calls[0][0]).toMatch(/UPDATE pesan_notifikasi SET is_resolved = true/);
    expect(pool.query.mock.calls[0][1]).toEqual([3]);
  });

  test('kasus batas: stok sama persis dengan threshold -> dianggap AMAN (bukan kritis), notifikasi di-resolve', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0 });

    await checkStockThreshold({ aset_id: 9, nama: 'Pin Logo', stok: 10, threshold_qty: 10 });

    expect(pool.query.mock.calls[0][0]).toMatch(/UPDATE pesan_notifikasi SET is_resolved = true/);
  });
});
