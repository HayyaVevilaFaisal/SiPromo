// Functional test - endpoint /api/dashboard (FR-02, UC-08).
// resolveTahunAjaran() punya 3 jalur: (1) tahunAjaranId eksplisit di query string,
// (2) tanpa id -> pakai tahun ajaran yang ditandai "sedang berjalan" (is_active=true),
// (3) tanpa id & tidak ada yang aktif -> fallback ke tahun ajaran tanggal_mulai paling baru,
// (4) sama sekali tidak ada tahun ajaran -> ta null, seluruh bagian yang bergantung tahun ajaran nol/kosong.

jest.mock('../../src/config/db', () => ({ query: jest.fn() }));

const request = require('supertest');
const pool = require('../../src/config/db');
const app = require('../../src/app');
const { authHeader } = require('../helpers/mockPool');

const taRow = { tahun_ajaran_id: 5, tahun: '2026/2027', semester: 'Ganjil', tanggal_mulai: '2026-09-01', tanggal_selesai: '2027-01-07', is_active: true };

function mockIsiTahunAjaran() {
  pool.query
    .mockResolvedValueOnce({ rows: [{ total_unit: 40, jumlah_kegiatan: 1 }] }) // penggunaanRes
    .mockResolvedValueOnce({ rows: [{ total_nilai: 700000, jumlah_transaksi: 1 }] }) // pembelianRes
    .mockResolvedValueOnce({ rows: [] }) // chartRes
    .mockResolvedValueOnce({ rows: [{ nama: 'Pin Logo', total_qty: 40 }] }) // terbanyakRes
    .mockResolvedValueOnce({ rows: [{ aset_nama: 'Pin Logo', kegiatan_nama: 'CHIPS', qty_out: 40, tanggal: '2026-09-18' }] }) // penggunaanTerbaruRes
    .mockResolvedValueOnce({ rows: [{ aset_nama: 'Pin Logo', qty_in: 40, total_harga: 80000, status: 'Lunas', tanggal: '2026-09-18' }] }); // pembelianTerbaruRes
}

describe('/api/dashboard', () => {
  test('tanpa token -> 401', async () => {
    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(401);
  });

  test('?tahunAjaranId= eksplisit -> pakai tahun ajaran itu langsung (1 query resolve)', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [taRow] }) // resolve by id
      .mockResolvedValueOnce({ rows: [{ total_unit: 731, jenis: 6 }] }) // totalStokRes
      .mockResolvedValueOnce({ rows: [{ total: 2 }] }); // perluRestockRes
    mockIsiTahunAjaran();

    const res = await request(app).get('/api/dashboard?tahunAjaranId=5').set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(pool.query.mock.calls[0][0]).toMatch(/WHERE tahun_ajaran_id = \$1/);
    expect(res.body.tahun_ajaran).toEqual({ tahun_ajaran_id: 5, semester: 'Ganjil', tahun: '2026/2027' });
    expect(res.body.total_penggunaan).toBe(40);
    expect(res.body.jumlah_kegiatan).toBe(1);
    expect(res.body.nilai_pembelian).toBe(700000);
    expect(res.body.total_stok).toBe(731);
    expect(res.body.jenis_aset).toBe(6);
    expect(res.body.perlu_restock).toBe(2);
    expect(res.body.aset_terbanyak_digunakan).toEqual([{ nama: 'Pin Logo', total_qty: 40 }]);
  });

  test('tanpa tahunAjaranId, ada tahun ajaran "sedang berjalan" (is_active=true) -> dipakai langsung', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [taRow] }) // query is_active=true -> ketemu, tidak perlu fallback
      .mockResolvedValueOnce({ rows: [{ total_unit: 0, jenis: 0 }] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] });
    mockIsiTahunAjaran();

    const res = await request(app).get('/api/dashboard').set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(pool.query.mock.calls[0][0]).toMatch(/WHERE is_active = true/);
    expect(res.body.tahun_ajaran.tahun_ajaran_id).toBe(5);
  });

  test('tanpa tahunAjaranId, tidak ada yang aktif -> fallback ke tanggal_mulai paling baru (2 query resolve)', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] }) // query is_active=true -> kosong
      .mockResolvedValueOnce({ rows: [taRow] }) // fallback ORDER BY tanggal_mulai DESC
      .mockResolvedValueOnce({ rows: [{ total_unit: 0, jenis: 0 }] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] });
    mockIsiTahunAjaran();

    const res = await request(app).get('/api/dashboard').set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledTimes(10); // 2 resolve + 2 (stok/restock) + 6 (bagian yang butuh ta)
    expect(res.body.tahun_ajaran.tahun_ajaran_id).toBe(5);
  });

  test('sama sekali belum ada tahun ajaran -> semua bagian terkait ta bernilai nol/kosong, tanpa error', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] }) // is_active=true -> kosong
      .mockResolvedValueOnce({ rows: [] }) // fallback -> kosong juga
      .mockResolvedValueOnce({ rows: [{ total_unit: 0, jenis: 0 }] }) // totalStokRes tetap jalan (tidak bergantung ta)
      .mockResolvedValueOnce({ rows: [{ total: 0 }] }); // perluRestockRes tetap jalan

    const res = await request(app).get('/api/dashboard').set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledTimes(4); // TIDAK ada 6 query tambahan karena ta null
    expect(res.body).toEqual({
      tahun_ajaran: null,
      total_stok: 0,
      jenis_aset: 0,
      perlu_restock: 0,
      total_penggunaan: 0,
      jumlah_kegiatan: 0,
      nilai_pembelian: 0,
      jumlah_transaksi: 0,
      chart_penggunaan_bulanan: [],
      aset_terbanyak_digunakan: [],
      penggunaan_terbaru: [],
      pembelian_terbaru: [],
    });
  });

  test('grafik bulanan mencakup seluruh rentang tanggal_mulai s.d. tanggal_selesai tahun ajaran', async () => {
    const taTujuhBulan = { ...taRow, tanggal_mulai: '2025-01-01', tanggal_selesai: '2025-07-31' };
    pool.query
      .mockResolvedValueOnce({ rows: [taTujuhBulan] })
      .mockResolvedValueOnce({ rows: [{ total_unit: 0, jenis: 0 }] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [{ total_unit: 0, jumlah_kegiatan: 0 }] })
      .mockResolvedValueOnce({ rows: [{ total_nilai: 0, jumlah_transaksi: 0 }] })
      .mockResolvedValueOnce({ rows: [{ bulan: new Date('2025-02-01'), total_unit: 300 }] }) // chartRes: hanya Februari yang ada data
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/dashboard?tahunAjaranId=5').set('Authorization', authHeader());

    expect(res.body.chart_penggunaan_bulanan).toEqual([
      { label: 'Jan', total_unit: 0 },
      { label: 'Feb', total_unit: 300 },
      { label: 'Mar', total_unit: 0 },
      { label: 'Apr', total_unit: 0 },
      { label: 'Mei', total_unit: 0 },
      { label: 'Jun', total_unit: 0 },
      { label: 'Jul', total_unit: 0 },
    ]);
  });
});
