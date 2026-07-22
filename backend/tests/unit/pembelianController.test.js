// White box test - memanggil createPembelian(req, res, next) langsung (tanpa lapisan HTTP)
// untuk menelusuri tiap cabang di backend/src/controllers/pembelianController.js:
//   1. Validasi field wajib kosong -> 400, tidak pernah BEGIN transaksi
//   2. Status pembelian di luar STATUS_PEMBELIAN -> 400
//   3. Aset di daftar_aset tidak ditemukan di tengah transaksi -> ROLLBACK + next(err)
//   4. Jalur sukses -> unit_price SELALU diambil dari aset.harga (bukan dari body request),
//      stok bertambah, transaksi COMMIT, response 201

jest.mock('../../src/config/db', () => ({ connect: jest.fn(), query: jest.fn() }));
jest.mock('../../src/utils/stockNotification', () => ({ checkStockThreshold: jest.fn() }));

const pool = require('../../src/config/db');
const { createMockClient } = require('../helpers/mockPool');
const { createPembelian } = require('../../src/controllers/pembelianController');

function createReqRes(body) {
  const req = { body, params: {} };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();
  return { req, res, next };
}

const validBody = {
  vendor_id: 1,
  tahun_ajaran_id: 2,
  tanggal: '2025-05-15',
  status: 'Lunas',
  catatan: '',
  daftar_aset: [{ aset_id: 5, qty_in: 10, unit_price: 999999 }], // unit_price di body harus DIABAIKAN
};

describe('createPembelian (white box - branch coverage)', () => {
  test('cabang 1: field wajib kosong -> 400, tidak pernah membuka transaksi (BEGIN tidak dipanggil)', async () => {
    const client = createMockClient([]);
    pool.connect.mockResolvedValue(client);
    const { req, res, next } = createReqRes({ ...validBody, vendor_id: undefined });

    await createPembelian(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Data pembelian dan minimal satu aset wajib diisi' });
    expect(client.query).not.toHaveBeenCalled();
    expect(client.release).toHaveBeenCalled(); // finally tetap melepas koneksi
  });

  test('cabang 1b: daftar_aset kosong -> 400', async () => {
    const client = createMockClient([]);
    pool.connect.mockResolvedValue(client);
    const { req, res, next } = createReqRes({ ...validBody, daftar_aset: [] });

    await createPembelian(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('cabang 2: status di luar daftar valid -> 400 dengan pesan berisi pilihan yang valid', async () => {
    const client = createMockClient([]);
    pool.connect.mockResolvedValue(client);
    const { req, res, next } = createReqRes({ ...validBody, status: 'Draft' });

    await createPembelian(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Status pembelian tidak valid (harus salah satu dari: Belum Bayar, DP, Lunas)',
    });
  });

  test('cabang 3: aset di daftar_aset tidak ditemukan -> ROLLBACK dan next(err) dengan pesan yang sesuai', async () => {
    const client = createMockClient([
      {}, // BEGIN
      { rows: [{ pembelian_id: 1, tanggal: '2025-05-15', status: 'Lunas' }] }, // INSERT pembelian
      {}, // INSERT header_pembelian
      { rows: [] }, // SELECT aset FOR UPDATE -> tidak ditemukan
    ]);
    pool.connect.mockResolvedValue(client);
    const { req, res, next } = createReqRes(validBody);

    await createPembelian(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(next.mock.calls[0][0].message).toBe('Aset dengan id 5 tidak ditemukan');
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(res.status).not.toHaveBeenCalledWith(201);
    expect(client.release).toHaveBeenCalled();
  });

  test('cabang 4: jalur sukses -> unit_price diambil dari aset.harga (bukan dari body), stok bertambah, 201', async () => {
    const asetRow = { aset_id: 5, nama: 'Pulpen Informatika', harga: '4500.00', stok: 200, threshold_qty: 50 };
    const updatedAsetRow = { ...asetRow, stok: 210 };
    const client = createMockClient([
      {}, // BEGIN
      { rows: [{ pembelian_id: 9, tanggal: '2025-05-15', status: 'Lunas' }] }, // INSERT pembelian
      {}, // INSERT header_pembelian
      { rows: [asetRow] }, // SELECT aset FOR UPDATE
      {}, // INSERT detail_pembelian
      { rows: [updatedAsetRow] }, // UPDATE aset stok
      {}, // COMMIT
    ]);
    pool.connect.mockResolvedValue(client);
    const { req, res, next } = createReqRes(validBody);

    await createPembelian(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      pembelian: { pembelian_id: 9, tanggal: '2025-05-15', status: 'Lunas' },
      aset: [updatedAsetRow],
    });

    // Panggilan ke-5 (index 4) adalah INSERT detail_pembelian - parameter ke-4 (unit_price)
    // harus persis aset.harga (4500.00), BUKAN 999999 yang dikirim klien di body.
    const detailPembelianCall = client.query.mock.calls[4];
    expect(detailPembelianCall[0]).toMatch(/INSERT INTO detail_pembelian/);
    expect(detailPembelianCall[1]).toEqual([9, 5, 10, '4500.00']);

    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.query).not.toHaveBeenCalledWith('ROLLBACK');
  });
});
