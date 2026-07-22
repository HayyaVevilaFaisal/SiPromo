// White box test - memanggil createPenggunaan(req, res, next) langsung (tanpa lapisan HTTP)
// untuk menelusuri tiap cabang di backend/src/controllers/penggunaanController.js:
//   1. Validasi field wajib kosong -> 400, tidak pernah BEGIN transaksi
//   2. Aset di daftar_aset tidak ditemukan -> ROLLBACK + next(err)
//   3. Stok tidak mencukupi (aset.stok < qty_out) -> ROLLBACK + next(err) [guard stok kritis]
//   4. Jalur sukses -> stok berkurang sesuai qty_out, transaksi COMMIT, response 201

jest.mock('../../src/config/db', () => ({ connect: jest.fn(), query: jest.fn() }));
jest.mock('../../src/utils/stockNotification', () => ({ checkStockThreshold: jest.fn() }));

const pool = require('../../src/config/db');
const { createMockClient } = require('../helpers/mockPool');
const { createPenggunaan } = require('../../src/controllers/penggunaanController');

function createReqRes(body) {
  const req = { body, params: {} };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();
  return { req, res, next };
}

const validBody = {
  tahun_ajaran_id: 2,
  nama: 'Campus Expo',
  tanggal: '2025-03-10',
  catatan: '',
  daftar_aset: [{ aset_id: 5, qty_out: 15 }],
};

describe('createPenggunaan (white box - branch coverage)', () => {
  test('cabang 1: field wajib kosong -> 400, tidak pernah membuka transaksi', async () => {
    const client = createMockClient([]);
    pool.connect.mockResolvedValue(client);
    const { req, res, next } = createReqRes({ ...validBody, nama: '' });

    await createPenggunaan(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Data kegiatan dan minimal satu aset wajib diisi' });
    expect(client.query).not.toHaveBeenCalled();
    expect(client.release).toHaveBeenCalled();
  });

  test('cabang 2: aset di daftar_aset tidak ditemukan -> ROLLBACK + next(err)', async () => {
    const client = createMockClient([
      {}, // BEGIN
      { rows: [{ kegiatan_id: 1, nama: 'Campus Expo' }] }, // INSERT kegiatan
      { rows: [] }, // SELECT aset FOR UPDATE -> tidak ditemukan
    ]);
    pool.connect.mockResolvedValue(client);
    const { req, res, next } = createReqRes(validBody);

    await createPenggunaan(req, res, next);

    expect(next.mock.calls[0][0].message).toBe('Aset dengan id 5 tidak ditemukan');
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.query).not.toHaveBeenCalledWith('COMMIT');
  });

  test('cabang 3: stok tidak mencukupi -> ROLLBACK + next(err) berisi sisa stok yang tersedia', async () => {
    const client = createMockClient([
      {}, // BEGIN
      { rows: [{ kegiatan_id: 1, nama: 'Campus Expo' }] }, // INSERT kegiatan
      { rows: [{ aset_id: 5, nama: 'Totebag Informatika', stok: 8, threshold_qty: 20 }] }, // SELECT aset - stok 8 < qty_out 15
    ]);
    pool.connect.mockResolvedValue(client);
    const { req, res, next } = createReqRes(validBody); // qty_out 15 > stok 8

    await createPenggunaan(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(next.mock.calls[0][0].message).toBe('Stok Totebag Informatika tidak mencukupi (tersedia 8)');
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    // Tidak boleh sempat INSERT aset_keluar / mengurangi stok setelah guard ini gagal
    expect(client.query.mock.calls.some((c) => String(c[0]).includes('INSERT INTO aset_keluar'))).toBe(false);
  });

  test('cabang 3b: qty_out tepat sama dengan stok tersedia -> LOLOS guard (bukan kurang dari)', async () => {
    const asetRow = { aset_id: 5, nama: 'Totebag Informatika', stok: 15, threshold_qty: 20 };
    const client = createMockClient([
      {}, // BEGIN
      { rows: [{ kegiatan_id: 1, nama: 'Campus Expo' }] }, // INSERT kegiatan
      { rows: [asetRow] }, // SELECT aset - stok 15 == qty_out 15
      {}, // INSERT aset_keluar
      { rows: [{ ...asetRow, stok: 0 }] }, // UPDATE aset stok
      {}, // COMMIT
    ]);
    pool.connect.mockResolvedValue(client);
    const { req, res, next } = createReqRes(validBody); // qty_out 15

    await createPenggunaan(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('cabang 4: jalur sukses -> stok berkurang sesuai qty_out, transaksi COMMIT, response 201', async () => {
    const asetRow = { aset_id: 5, nama: 'Pulpen Informatika', stok: 120, threshold_qty: 50 };
    const updatedAsetRow = { ...asetRow, stok: 105 };
    const client = createMockClient([
      {}, // BEGIN
      { rows: [{ kegiatan_id: 7, nama: 'Campus Expo' }] }, // INSERT kegiatan
      { rows: [asetRow] }, // SELECT aset FOR UPDATE
      {}, // INSERT aset_keluar
      { rows: [updatedAsetRow] }, // UPDATE aset stok
      {}, // COMMIT
    ]);
    pool.connect.mockResolvedValue(client);
    const { req, res, next } = createReqRes(validBody);

    await createPenggunaan(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      kegiatan: { kegiatan_id: 7, nama: 'Campus Expo' },
      aset: [updatedAsetRow],
    });

    const insertAsetKeluarCall = client.query.mock.calls[3];
    expect(insertAsetKeluarCall[0]).toMatch(/INSERT INTO aset_keluar/);
    expect(insertAsetKeluarCall[1]).toEqual([7, 5, 15]);

    const updateStokCall = client.query.mock.calls[4];
    expect(updateStokCall[0]).toMatch(/UPDATE aset SET stok = stok - \$1/);
    expect(updateStokCall[1]).toEqual([15, 5]);

    expect(client.query).toHaveBeenCalledWith('COMMIT');
  });
});
