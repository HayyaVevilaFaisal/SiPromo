jest.mock('../../src/config/db', () => ({ query: jest.fn() }));
const pool = require('../../src/config/db');
const PDFDocument = require('pdfkit');
const { buildLaporan, createLaporanPdf } = require('../../src/services/laporanService');

async function laporan(rows) {
  pool.query.mockResolvedValueOnce({ rows: [{ tahun_ajaran_id: 1, semester: 'Ganjil', tahun: '2026/2027', tanggal_mulai: '2026-07-01', tanggal_selesai: '2026-12-31', is_tahun_ajaran_aktif: false }] })
    .mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows });
  return buildLaporan(1);
}
const row = { stok_opname_id: 9, tanggal: '2026-10-01', catatan: 'Pemeriksaan gudang', aset_id: 1, aset_nama: 'Pulpen', stok_sistem: 10, stok_fisik: 7, selisih: -3 };

test('hilang dan berlebih dihitung terpisah per pencatatan, termasuk tanggal sama dan nol', async () => {
  const result = await laporan([row, { ...row, aset_id: 2, stok_fisik: 13, selisih: 3 }, { ...row, stok_opname_id: 8, selisih: 0, stok_fisik: 10 }]);
  expect(result.ringkasan).toMatchObject({ total_aset_hilang: 3, total_aset_berlebih: 3, total_penyesuaian_stok: 0 });
  expect(result.kelompok_stok_opname).toHaveLength(2);
  expect(result.kelompok_stok_opname[0]).toMatchObject({ total_aset_hilang: 3, total_aset_berlebih: 3 });
  expect(result.kelompok_stok_opname[1]).toMatchObject({ total_aset_hilang: 0, total_aset_berlebih: 0 });
  expect(result.rincian_stok_opname[0]).toMatchObject({ aset_hilang: 3, aset_berlebih: 0 });
});

test('PDF menampilkan kelompok, subtotal, total periode, tanpa kolom penomoran opname, melewati beberapa halaman', async () => {
  const result = await laporan(Array.from({ length: 80 }, (_, i) => ({ ...row, aset_id: i + 1, stok_opname_id: i < 40 ? 9 : 8 })));
  const spy = jest.spyOn(PDFDocument.prototype, 'text');
  const doc = createLaporanPdf(result);
  const texts = spy.mock.calls.map(call => String(call[0]));
  expect(texts.join(' ')).toContain('UNIT HILANG');
  expect(texts.join(' ')).toContain('UNIT BERLEBIH');
  expect(texts).not.toContain('OPNAME');
  expect(texts.some(text => /penyesuaian bersih/i.test(text))).toBe(false);
  expect(texts.filter(text => text.startsWith('Pencatatan '))).toHaveLength(2);
  expect(texts.filter(text => text.startsWith('Subtotal pencatatan:'))).toHaveLength(2);
  expect(texts).toContain('Total Ganjil 2026/2027: Unit hilang 240 unit | Unit berlebih 0 unit');
  expect(doc.bufferedPageRange().count).toBeGreaterThan(1);
  spy.mockRestore();
  doc.resume();
  await new Promise(resolve => { doc.on('end', resolve); doc.end(); });
});

test('laporan kosong memiliki total nol', async () => {
  const result = await laporan([]);
  expect(result.kelompok_stok_opname).toEqual([]);
  expect(result.ringkasan).toMatchObject({ total_aset_hilang: 0, total_aset_berlebih: 0 });
});
