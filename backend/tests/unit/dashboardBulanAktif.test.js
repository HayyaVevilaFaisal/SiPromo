jest.mock('../../src/config/db', () => ({ query: jest.fn() }));
const pool = require('../../src/config/db');
const { getRingkasan } = require('../../src/services/dashboardService');
afterEach(() => jest.useRealTimers());

test('sorotan mengikuti bulan dan tahun Asia/Jakarta, termasuk pergantian bulan UTC', async () => {
  jest.useFakeTimers().setSystemTime(new Date('2026-10-31T17:30:00Z'));
  pool.query.mockResolvedValueOnce({ rows: [{ tahun_ajaran_id: 1, tanggal_mulai: '2026-08-01', tanggal_selesai: '2026-12-31' }] })
    .mockResolvedValueOnce({ rows: [{ total_unit: 0, jenis: 0 }] })
    .mockResolvedValueOnce({ rows: [{ total: 0 }] })
    .mockResolvedValueOnce({ rows: [{ total_unit: 100, jumlah_kegiatan: 1 }] })
    .mockResolvedValueOnce({ rows: [{ total_nilai: 0, jumlah_transaksi: 0 }] })
    .mockResolvedValueOnce({ rows: [{ bulan: new Date('2026-08-01'), total_unit: 100 }] })
    .mockResolvedValue({ rows: [] });
  const data = await getRingkasan(1);
  expect(data.chart_penggunaan_bulanan.filter(b => b.is_bulan_aktif)).toEqual([
    { label: 'Nov', total_unit: 0, is_bulan_aktif: true },
  ]);
});
