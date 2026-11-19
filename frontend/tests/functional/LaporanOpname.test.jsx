import { render, screen, within } from '@testing-library/react';
import { vi, test, expect } from 'vitest';
import Laporan from '../../src/pages/Laporan/Laporan';
import axiosClient from '../../src/api/axiosClient';
vi.mock('../../src/api/axiosClient', () => ({ default: { get: vi.fn() } }));
vi.mock('../../src/components/common/PageHeader', () => ({ default: () => null }));

test('pencatatan tanggal sama terpisah dalam satu tabel dengan subtotal dan total periode', async () => {
  const ta = { tahun_ajaran_id: 1, semester: 'Ganjil', tahun: '2026/2027', tanggal_mulai: '2026-07-01', tanggal_selesai: '2026-12-31' };
  const groups = [1, 2].map(id => ({ stok_opname_id: id, tanggal: '2026-10-01', catatan: `Gudang ${id}`, total_aset_hilang: 3, total_aset_berlebih: 2, rincian: [{ aset_id: 1, tanggal: '2026-10-01', aset_nama: 'Pulpen', stok_sistem: 10, stok_fisik: 7, selisih: -3, aset_hilang: 3, aset_berlebih: 0 }] }));
  axiosClient.get.mockImplementation(async url => ({ data: url === '/tahun-ajaran' ? [ta] : { tahun_ajaran: ta, ringkasan: { jumlah_stok_opname: 2, total_aset_hilang: 6, total_aset_berlebih: 4 }, kelompok_stok_opname: groups, rincian_stok_opname: groups.flatMap(g => g.rincian) } }));
  render(<Laporan />);
  await screen.findByText('Gudang 1', { exact: false });
  expect(screen.queryByText(/penyesuaian bersih/i)).not.toBeInTheDocument();
  const table = screen.getByRole('table');
  expect(within(table).getAllByText('Pencatatan 1 Oktober 2026')).toHaveLength(2);
  expect(within(table).getAllByText('Subtotal pencatatan')).toHaveLength(2);
  expect(screen.getByText('Unit hilang:').parentElement).toHaveTextContent('Unit hilang: 6 unit');
  expect(screen.getByText('Unit berlebih:').parentElement).toHaveTextContent('Unit berlebih: 4 unit');
});
