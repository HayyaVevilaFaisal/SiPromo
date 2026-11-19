import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, test, expect, vi } from 'vitest';
import Aset from '../../src/pages/Aset/Aset';
import Vendor from '../../src/pages/Vendor/Vendor';
import LokasiPenyimpanan from '../../src/pages/LokasiPenyimpanan/LokasiPenyimpanan';
import TahunAjaran from '../../src/pages/TahunAjaran/TahunAjaran';
import axiosClient from '../../src/api/axiosClient';

vi.mock('../../src/api/axiosClient', () => ({ default: { get: vi.fn() } }));
vi.mock('../../src/components/common/PageHeader', () => ({ default: () => null }));
beforeEach(() => vi.resetAllMocks());

test.each([
  ['/aset', Aset, { aset_id: 1, nama: 'Aset Lama', harga: 1000, stok: 1, threshold_qty: 0 }],
  ['/vendor', Vendor, { vendor_id: 1, nama: 'Vendor Lama', alamat: 'Bandung' }],
  ['/lokasi-penyimpanan', LokasiPenyimpanan, { lokasi_penyimpanan_id: 1, nama: 'Lokasi Lama', jumlah_aset: 1 }],
  ['/tahun-ajaran', TahunAjaran, { tahun_ajaran_id: 1, tahun: '2026/2027', semester: 'SP' }],
])('master %s menampilkan data tanpa status dan hanya menyediakan aksi ubah', async (url, Page, row) => {
  axiosClient.get.mockImplementation(async path => ({ data: path === url ? [row] : [] }));
  render(<MemoryRouter><Page /></MemoryRouter>);
  expect(await screen.findByRole('button', { name: 'Ubah' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Hapus' })).not.toBeInTheDocument();
  expect(screen.queryByText('Semua Status')).not.toBeInTheDocument();
  expect(screen.queryByText('Terhapus')).not.toBeInTheDocument();
  for (const [path, options] of axiosClient.get.mock.calls) {
    if (path === url) expect(options?.params ?? {}).not.toHaveProperty('status');
  }
});
