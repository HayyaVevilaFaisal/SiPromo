jest.mock('../../src/config/db', () => ({ query: jest.fn() }));
const PDFDocument = require('pdfkit');
const { createLaporanPdf } = require('../../src/services/laporanService');

function fixture(count, active = true) {
  return {
    tahun_ajaran: { semester: 'Ganjil', tahun: '2026/2027', tanggal_mulai: '2026-08-01', tanggal_selesai: '2027-01-31', is_tahun_ajaran_aktif: active },
    ringkasan: { total_nilai_pembelian: count * 12500000, jumlah_transaksi_pembelian: count, total_qty_masuk: count * 100, total_qty_keluar: 0, jumlah_kegiatan: 0, jumlah_stok_opname: 0, total_aset_hilang: 0, total_aset_berlebih: 0, jumlah_detail_berselisih: 0, total_sisa_stok: 0 },
    rincian_pembelian: Array.from({ length: count }, () => ({ tanggal: '2026-10-15', vendor_nama: 'PT Cipta Kreasi Nusantara', status: 'Belum Bayar', aset_nama: 'Notebook Softcover Informatika', level_nama: 'Premium', qty_in: 100, unit_price: 125000, total_harga: 12500000 })),
    rincian_penggunaan: [], rincian_stok_opname: [], kelompok_stok_opname: [], rekap_stok: [],
  };
}
async function finish(doc) {
  const chunks = [];
  doc.on('data', chunk => chunks.push(chunk));
  const done = new Promise(resolve => doc.on('end', resolve));
  doc.end();
  await done;
  return Buffer.concat(chunks);
}
afterEach(() => jest.restoreAllMocks());

test.each([true, false])('laporan kosong tetap formal dan tanpa halaman kosong, aktif=%s', async active => {
  const text = jest.spyOn(PDFDocument.prototype, 'text');
  const doc = createLaporanPdf(fixture(0, active));
  const calls = text.mock.calls.map(call => String(call[0]));
  expect(calls).toContain('Belum ada pencatatan stok opname.');
  expect(calls.includes('Rekap Stok Aset (Saat Ini)')).toBe(active);
  expect(doc.bufferedPageRange().count).toBe(active ? 2 : 1);
  expect((await finish(doc)).subarray(0, 5).toString()).toBe('%PDF-');
});

test('tabel panjang tetap di dalam margin, header berulang dan footer setiap halaman', async () => {
  const rectangles = jest.spyOn(PDFDocument.prototype, 'rect');
  const text = jest.spyOn(PDFDocument.prototype, 'text');
  const sizes = jest.spyOn(PDFDocument.prototype, 'fontSize');
  const doc = createLaporanPdf(fixture(60));
  const count = doc.bufferedPageRange().count;
  expect(count).toBeGreaterThan(2);
  for (const [x, y, width, height] of rectangles.mock.calls.filter(([, y]) => y < 800)) {
    expect(x).toBeGreaterThanOrEqual(50);
    expect(x + width).toBeLessThanOrEqual(545.29);
    expect(y).toBeGreaterThanOrEqual(54);
    expect(y + height).toBeLessThanOrEqual(777.9);
  }
  const texts = text.mock.calls.map(call => String(call[0]));
  expect(texts.filter(value => value === 'TANGGAL').length).toBeGreaterThan(1);
  expect(texts.filter(value => /^Halaman \d+ dari/.test(value))).toHaveLength(count);
  expect(sizes.mock.calls.every(([size]) => size >= 8)).toBe(true);
  await finish(doc);
});

test('satu sel melebihi satu halaman dibagi tanpa kehilangan teks atau melewati footer', async () => {
  const data = fixture(1, false);
  const token = 'PENANDA';
  data.rincian_pembelian[0].aset_nama = Array(800).fill(token).join(' ');
  const text = jest.spyOn(PDFDocument.prototype, 'text');
  const rectangles = jest.spyOn(PDFDocument.prototype, 'rect');
  const doc = createLaporanPdf(data);
  expect(doc.bufferedPageRange().count).toBeGreaterThan(2);
  const output = text.mock.calls.map(call => String(call[0])).join(' ');
  expect(output.match(/PENANDA/g)).toHaveLength(800);
  for (const [, y, , height] of rectangles.mock.calls.filter(([, y]) => y < 800)) expect(y + height).toBeLessThanOrEqual(777.9);
  await finish(doc);
});


test('Cambria disertakan, tanggal utuh, logo utuh, dan warna tabel/footer tetap seperti awal', async () => {
  const text = jest.spyOn(PDFDocument.prototype, 'text');
  const fill = jest.spyOn(PDFDocument.prototype, 'fill');
  const images = jest.spyOn(PDFDocument.prototype, 'image');
  const doc = createLaporanPdf(fixture(2));
  const texts = text.mock.calls.map(call => String(call[0]));
  expect(texts.filter(value => value === '15/10/2026')).toHaveLength(2);
  expect(images.mock.calls[0][0]).toMatch(/unpar-logo-report.png$/);
  expect(images.mock.calls[0][3]).toMatchObject({ fit: [68, 72] });
  const fills = fill.mock.calls.map(call => call[0]);
  expect(fills).toContain('#faf1da');
  expect(fills).toContain('#1b4d3e');
  expect(fills).toContain('#c99a2e');
  const pdf = await finish(doc);
  expect(pdf.toString('latin1')).toMatch(/\/FontFile2/);
  expect(pdf.toString('latin1')).toMatch(/Cambria/);
});
