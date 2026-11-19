jest.mock('../../src/config/db', () => ({ query: jest.fn() }));
const pool = require('../../src/config/db');
const { getRingkasan } = require('../../src/services/dashboardService');
const current = { tahun_ajaran_id: 2, tanggal_mulai: '2026-08-01', tanggal_selesai: '2027-01-31' };
const past = { ...current, tahun_ajaran_id: 1 };
beforeEach(() => {
  pool.query.mockReset().mockImplementation(async (sql, params) => {
    if (sql.includes('SELECT *') && sql.includes('FROM tahun_ajaran')) {
      return { rows: [params ? (String(params[0]) === '1' ? past : current) : current] };
    }
    // Nilai nol untuk ringkasan; kartu tidak memiliki baris.
    if (sql.includes('AS jumlah_kegiatan')) return { rows: [{ total_unit: 0, jumlah_kegiatan: 0 }] };
    if (sql.includes('AS jumlah_transaksi')) return { rows: [{ total_nilai: 0, jumlah_transaksi: 0 }] };
    if (sql.includes('COUNT(*) AS jenis')) return { rows: [{ total_unit: 0, jenis: 0 }] };
    if (sql.includes('COUNT(*) AS total')) return { rows: [{ total: 0 }] };
    return { rows: [] };
  });
});
test.each([
  ['1', true],
  ['2', false],
  [undefined, false],
])('periode %s menggunakan peringkat hanya untuk riwayat', async (id, history) => {
  await getRingkasan(id);
  const usage = pool.query.mock.calls.find(([sql]) => sql.includes('k.nama AS kegiatan_nama'));
  const purchase = pool.query.mock.calls.find(([sql]) => sql.includes('AS total_harga'));
  expect(usage[1]).toEqual([id === '1' ? 1 : 2]);
  expect(purchase[1]).toEqual(usage[1]);
  expect(usage[0]).toMatch(/WHERE k.tahun_ajaran_id = \$1/);
  expect(purchase[0]).toMatch(/WHERE hp.tahun_ajaran_id = \$1/);
  expect(usage[0]).toContain(history ? 'LIMIT 1' : 'LIMIT 4');
  expect(purchase[0]).toContain(history ? 'LIMIT 1' : 'LIMIT 4');
  if (history) {
    expect(usage[0]).toContain('SUM(ak.qty_out) AS qty_out');
    expect(usage[0]).toContain('GROUP BY k.kegiatan_id');
    expect(purchase[0]).toContain('SUM(dp.qty_in * dp.unit_price) AS total_harga');
    expect(purchase[0]).toContain('GROUP BY p.pembelian_id');
    expect(purchase[0]).toContain('JOIN vendor v');
    expect(usage[0]).toContain('WHERE item.kegiatan_id = k.kegiatan_id');
    expect(usage[0]).toContain('SUM(item.qty_out) AS qty_out');
    expect(usage[0]).toContain('detail.qty_out DESC');
    expect(purchase[0]).toContain('WHERE item.pembelian_id = p.pembelian_id');
    expect(purchase[0]).toContain('SUM(item.qty_in * item.unit_price) AS total_harga');
    expect(purchase[0]).toContain('detail.total_harga DESC');
    expect(usage[0]).toMatch(/ORDER BY\s+qty_out DESC,\s+k.tanggal DESC/);
    expect(purchase[0]).toMatch(/ORDER BY\s+total_harga DESC,\s+p.tanggal DESC/);
  } else {
    expect(usage[0]).toMatch(/ORDER BY\s+k.tanggal DESC/);
    expect(purchase[0]).toMatch(/ORDER BY\s+p.tanggal DESC/);
  }
});
