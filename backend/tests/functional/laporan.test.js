// Functional test - endpoint /api/laporan (FR-18, FR-19, NFR-14, UC-09, UC-10).
// buildLaporan() melakukan beberapa query berurutan; jumlah query berbeda tergantung apakah
// tahun ajaran yang diminta "aktif" (query rekap stok ke-4 hanya jalan kalau aktif).

jest.mock('../../src/config/db', () => ({ query: jest.fn() }));

const request = require('supertest');
const pool = require('../../src/config/db');
const app = require('../../src/app');
const { authHeader } = require('../helpers/mockPool');

const taTidakAktif = {
  tahun_ajaran_id: 2, tahun: '2024/2025', semester: 'Genap',
  tanggal_mulai: '2025-01-01', tanggal_selesai: '2025-07-31', is_active: true,
  is_tahun_ajaran_aktif: false,
};
const taAktif = { ...taTidakAktif, tahun_ajaran_id: 5, tahun: '2026/2027', semester: 'Ganjil', is_tahun_ajaran_aktif: true };

const pembelianRow = {
  pembelian_id: 1, tanggal: '2025-05-15', status: 'Lunas', vendor_nama: 'Toko Kreatif Jaya',
  aset_nama: 'Pulpen Informatika', dimensi_nama: 'Kecil', qty_in: 10, unit_price: 4500, total_harga: 45000,
};
const penggunaanRow = {
  kegiatan_id: 1, kegiatan_nama: 'Campus Expo', tanggal: '2025-03-10',
  aset_nama: 'Pulpen Informatika', dimensi_nama: 'Kecil', qty_out: 5, vendor_nama: 'Toko Kreatif Jaya',
};
const stokRow = {
  aset_id: 1, nama: 'Pulpen Informatika', harga: 4500, threshold_qty: 50,
  dimensi_nama: 'Kecil', lokasi_nama: '9110', sisa_stok: 120, ada_perubahan: true,
};

describe('/api/laporan', () => {
  describe('GET /api/laporan (data JSON)', () => {
    test('tanpa token -> 401', async () => {
      const res = await request(app).get('/api/laporan?tahunAjaranId=2');
      expect(res.status).toBe(401);
    });

    test('400 jika tahunAjaranId tidak dikirim, tidak ada query ke database', async () => {
      const res = await request(app).get('/api/laporan').set('Authorization', authHeader());
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: 'Parameter tahunAjaranId wajib diisi' });
      expect(pool.query).not.toHaveBeenCalled();
    });

    test('404 jika tahun ajaran tidak ditemukan', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] }); // query taRes -> kosong
      const res = await request(app).get('/api/laporan?tahunAjaranId=999').set('Authorization', authHeader());
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: 'Tahun ajaran tidak ditemukan' });
      expect(pool.query).toHaveBeenCalledTimes(1); // berhenti di query pertama, tidak lanjut ke pembelian/penggunaan
    });

    test('200 untuk tahun ajaran TIDAK aktif -> rekap_stok kosong (query rekap stok dilewati)', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [taTidakAktif] }) // taRes
        .mockResolvedValueOnce({ rows: [pembelianRow] }) // pembelianRes
        .mockResolvedValueOnce({ rows: [penggunaanRow] }); // penggunaanRes
      // TIDAK ada mock ke-4 -> membuktikan query rekap stok memang tidak dipanggil untuk ta tidak aktif

      const res = await request(app).get('/api/laporan?tahunAjaranId=2').set('Authorization', authHeader());

      expect(res.status).toBe(200);
      expect(pool.query).toHaveBeenCalledTimes(3);
      expect(res.body.rekap_stok).toEqual([]);
      expect(res.body.ringkasan.total_sisa_stok).toBe(0);
      expect(res.body.ringkasan.total_nilai_pembelian).toBe(45000);
      expect(res.body.ringkasan.jumlah_transaksi_pembelian).toBe(1);
      expect(res.body.ringkasan.total_qty_keluar).toBe(5);
      expect(res.body.rincian_pembelian).toEqual([pembelianRow]);
      expect(res.body.rincian_penggunaan).toEqual([penggunaanRow]);
    });

    test('200 untuk tahun ajaran AKTIF -> rekap_stok terisi (query ke-4 dipanggil)', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [taAktif] })
        .mockResolvedValueOnce({ rows: [pembelianRow] })
        .mockResolvedValueOnce({ rows: [penggunaanRow] })
        .mockResolvedValueOnce({ rows: [stokRow] });

      const res = await request(app).get('/api/laporan?tahunAjaranId=5').set('Authorization', authHeader());

      expect(res.status).toBe(200);
      expect(pool.query).toHaveBeenCalledTimes(4);
      expect(res.body.rekap_stok).toEqual([stokRow]);
      expect(res.body.ringkasan.total_sisa_stok).toBe(120);
      expect(res.body.tahun_ajaran.is_tahun_ajaran_aktif).toBe(true);
    });
  });

  describe('GET /api/laporan/export-pdf (unduhan PDF)', () => {
    test('400 jika tahunAjaranId tidak dikirim', async () => {
      const res = await request(app).get('/api/laporan/export-pdf').set('Authorization', authHeader());
      expect(res.status).toBe(400);
    });

    test('404 jika tahun ajaran tidak ditemukan', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const res = await request(app).get('/api/laporan/export-pdf?tahunAjaranId=999').set('Authorization', authHeader());
      expect(res.status).toBe(404);
    });

    test('200 -> menghasilkan PDF sungguhan (header Content-Type & isi berupa file PDF valid) untuk ta tidak aktif', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [taTidakAktif] })
        .mockResolvedValueOnce({ rows: [pembelianRow] })
        .mockResolvedValueOnce({ rows: [penggunaanRow] });

      const res = await request(app).get('/api/laporan/export-pdf?tahunAjaranId=2').set('Authorization', authHeader()).buffer(true).parse((r, cb) => {
        const chunks = [];
        r.on('data', (c) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('laporan-aset-promosi-2024-2025-Genap.pdf');
      expect(res.body.length).toBeGreaterThan(1000);
      expect(res.body.subarray(0, 5).toString()).toBe('%PDF-'); // tanda tangan berkas PDF valid
    });

    test('200 -> tetap berhasil dengan rincian & rekap stok KOSONG (jalur empty-state renderTable)', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [taAktif] })
        .mockResolvedValueOnce({ rows: [] }) // pembelian kosong
        .mockResolvedValueOnce({ rows: [] }) // penggunaan kosong
        .mockResolvedValueOnce({ rows: [] }); // stok kosong

      const res = await request(app).get('/api/laporan/export-pdf?tahunAjaranId=5').set('Authorization', authHeader()).buffer(true).parse((r, cb) => {
        const chunks = [];
        r.on('data', (c) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });

      expect(res.status).toBe(200);
      expect(res.body.subarray(0, 5).toString()).toBe('%PDF-');
    });

    test('200 -> tetap berhasil dengan banyak baris data (memicu ganti halaman PDF)', async () => {
      const banyakPembelian = Array.from({ length: 15 }, (_, i) => ({ ...pembelianRow, pembelian_id: i + 1, aset_nama: `Aset ${i + 1}` }));
      const banyakPenggunaan = Array.from({ length: 15 }, (_, i) => ({ ...penggunaanRow, kegiatan_id: i + 1, aset_nama: `Aset ${i + 1}` }));
      const banyakStok = Array.from({ length: 15 }, (_, i) => ({ ...stokRow, aset_id: i + 1, nama: `Aset ${i + 1}` }));
      pool.query
        .mockResolvedValueOnce({ rows: [taAktif] })
        .mockResolvedValueOnce({ rows: banyakPembelian })
        .mockResolvedValueOnce({ rows: banyakPenggunaan })
        .mockResolvedValueOnce({ rows: banyakStok });

      const res = await request(app).get('/api/laporan/export-pdf?tahunAjaranId=5').set('Authorization', authHeader()).buffer(true).parse((r, cb) => {
        const chunks = [];
        r.on('data', (c) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });

      expect(res.status).toBe(200);
      expect(res.body.subarray(0, 5).toString()).toBe('%PDF-');
      expect(res.body.length).toBeGreaterThan(3000);
    }, 10000);
  });
});
