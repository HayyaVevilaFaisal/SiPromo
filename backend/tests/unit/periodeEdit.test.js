jest.mock('../../src/config/db', () => ({ connect: jest.fn(), query: jest.fn() }));
jest.mock('../../src/utils/stockNotification', () => ({ checkStockThreshold: jest.fn() }));
const pool = require('../../src/config/db');
const { assertPeriodeEdit, canEditSql, currentPeriodSql } = require('../../src/utils/periodeEdit');
const { updatePembelian, updateStatusPembelian, uploadBonPembelian } = require('../../src/services/pembelianService');
const { updatePenggunaan } = require('../../src/services/penggunaanService');
const { updateStokOpname } = require('../../src/services/stokOpnameService');
const uploadGuard = require('../../src/middlewares/pembelianEditGuard');
const periode = { tahun_ajaran_id: 2, tanggal_mulai: '2026-07-01', tanggal_selesai: '2026-12-31' };
beforeEach(() => jest.resetAllMocks());

test('periode ditentukan dari tanggal mulai Jakarta, mengabaikan periode masa depan dan urutan ID', () => {
  expect(currentPeriodSql).toContain("tanggal_mulai <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date");
  expect(currentPeriodSql).toContain('ORDER BY periode.tanggal_mulai DESC, periode.tahun_ajaran_id DESC');
  expect(currentPeriodSql).toContain('LIMIT 1');
  expect(canEditSql('k.tahun_ajaran_id')).toContain('COALESCE(k.tahun_ajaran_id =');
});

test('periode berjalan tetap boleh diedit jika query mengembalikan periode lama sementara periode baru belum mulai', async () => {
  const client = { query: jest.fn().mockResolvedValue({ rows: [periode] }) };
  await expect(assertPeriodeEdit(client, 2, 2, '2026-10-05')).resolves.toBeUndefined();
});

test.each([1, 3])('periode lama atau masa depan (%s) ditolak', async yearId => {
  const client = { query: jest.fn().mockResolvedValue({ rows: [periode] }) };
  await expect(assertPeriodeEdit(client, yearId, 2, '2026-10-05')).rejects.toMatchObject({ statusCode: 403 });
});

test('ketika periode baru mulai, periode sebelumnya langsung terkunci', async () => {
  const client = { query: jest.fn().mockResolvedValue({ rows: [{ ...periode, tahun_ajaran_id: 3, tanggal_mulai: '2027-01-01', tanggal_selesai: '2027-06-30' }] }) };
  await expect(assertPeriodeEdit(client, 2, 2, '2026-10-05')).rejects.toMatchObject({ statusCode: 403 });
  await expect(assertPeriodeEdit(client, 3, 3, '2027-01-01')).resolves.toBeUndefined();
});

test('tidak ada periode yang sudah mulai berarti tidak ada hak edit', async () => {
  await expect(assertPeriodeEdit({ query: async () => ({ rows: [] }) }, 1)).rejects.toMatchObject({ statusCode: 403 });
});

test('mengganti tahun ajaran tujuan tidak dapat melewati aturan', async () => {
  const client = { query: async () => ({ rows: [periode] }) };
  await expect(assertPeriodeEdit(client, 2, 1, '2026-10-05')).rejects.toMatchObject({ statusCode: 403 });
});

test.each(['2026-07-01', '2026-12-31'])('tanggal batas periode %s diterima', async tanggal => {
  await expect(assertPeriodeEdit({ query: async () => ({ rows: [periode] }) }, 2, 2, tanggal)).resolves.toBeUndefined();
});

test('tanggal edit tidak boleh dipindahkan keluar tahun ajaran berjalan', async () => {
  await expect(assertPeriodeEdit({ query: async () => ({ rows: [periode] }) }, 2, 2, '2027-01-01')).rejects.toMatchObject({ statusCode: 400 });
});

const operations = [
  ['pembelian', () => updatePembelian(1, 1, 2, '2026-10-05', 'Lunas', '', [{ aset_id: 1, qty_in: 2, unit_price: 100 }])],
  ['penggunaan', () => updatePenggunaan(1, 2, 'Kegiatan', '2026-10-05', '', [{ aset_id: 1, qty_out: 2 }])],
  ['stok opname', () => updateStokOpname(1, { tanggal: '2026-10-05', daftar_aset: [{ aset_id: 1, stok_fisik: 5 }], original: { daftar_aset: [] } })],
];
test.each(operations)('edit %s pada periode lama ditolak sebelum stok/data diubah', async (_name, update) => {
  const client = { release: jest.fn(), query: jest.fn(async sql => {
    if (sql.includes('FROM tahun_ajaran periode_berjalan')) return { rows: [periode] };
    return { rowCount: 1, rows: [{ pembelian_id: 1, kegiatan_id: 1, stok_opname_id: 1, tahun_ajaran_id: 1 }] };
  }) };
  pool.connect.mockResolvedValue(client);
  await expect(update()).rejects.toMatchObject({ statusCode: 403 });
  expect(client.query.mock.calls.some(([sql]) => /^(\s*)(UPDATE|INSERT|DELETE)\b/.test(sql))).toBe(false);
  expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  expect(client.release).toHaveBeenCalled();
});

test.each([
//   ['status', () => updateStatusPembelian(1, 'Lunas')],
  ['bon', () => uploadBonPembelian(1, 'bon.pdf', 'file.pdf')],
])('perubahan %s juga menolak pembelian periode terkunci', async (_name, update) => {
  pool.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{}] });
  await expect(update()).rejects.toMatchObject({ statusCode: 403 });
  expect(pool.query.mock.calls[0][0]).toContain("AT TIME ZONE 'Asia/Jakarta'");
});

test('bon periode lama ditolak sebelum middleware upload dijalankan', async () => {
  pool.query.mockResolvedValue({ rows: [{ can_edit: false }] });
  const next = jest.fn();
  await uploadGuard({ params: { id: 1 } }, {}, next);
  expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
});


test('PATCH status menolak periode terkunci sebelum mengubah aset', async () => {
  const client = { release: jest.fn(), query: jest.fn(async sql => ({ rows: sql.includes('FROM tahun_ajaran periode_berjalan') ? [periode] : [{ pembelian_id: 1, tahun_ajaran_id: 1, status: 'DP' }] })) };
  pool.connect.mockResolvedValue(client);
  await expect(updateStatusPembelian(1, 'Lunas')).rejects.toMatchObject({ statusCode: 403 });
  expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  expect(client.query.mock.calls.some(([sql]) => /^(\s*)(UPDATE|INSERT|DELETE)\b/.test(sql))).toBe(false);
});
