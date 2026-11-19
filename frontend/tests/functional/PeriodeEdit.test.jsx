import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, vi, test, expect } from 'vitest';
import PembelianAset from '../../src/pages/PembelianAset/PembelianAset';
import PenggunaanAset from '../../src/pages/PenggunaanAset/PenggunaanAset';
import StokOpname from '../../src/pages/StokOpname/StokOpname';
import axiosClient from '../../src/api/axiosClient';
vi.mock('../../src/api/axiosClient', () => ({ default: { get: vi.fn(), put: vi.fn(), post: vi.fn() } }));
vi.mock('../../src/components/common/PageHeader', () => ({ default: () => null }));
beforeEach(() => vi.resetAllMocks());

for (const [name, Component, endpoint, row] of [
  ['pembelian', PembelianAset, '/pembelian-aset', { pembelian_id: 1, vendor_nama: 'Vendor', daftar_aset: [], tanggal: '2026-10-05', status: 'Lunas' }],
  ['penggunaan', PenggunaanAset, '/penggunaan-aset', { kegiatan_id: 1, nama: 'Kegiatan', daftar_aset: [], tanggal: '2026-10-05' }],
]) {
  test.each([false, true])(`${name}: hak edit dari backend = %s`, async canEdit => {
    axiosClient.get.mockImplementation(async url => ({ data: url === endpoint ? [{ ...row, can_edit: canEdit }] : [] }));
    render(<MemoryRouter><Component /></MemoryRouter>);
    await screen.findByText(name === 'pembelian' ? 'Vendor' : 'Kegiatan');
    if (canEdit) expect(screen.getByRole('button', { name: 'Ubah' })).toBeEnabled();
    else expect(screen.queryByRole('button', { name: 'Ubah' })).not.toBeInTheDocument();
    expect(screen.queryByText('Hanya lihat')).not.toBeInTheDocument();
  });
}

test('stok opname periode lama tetap dapat dibuka tetapi tombol edit disembunyikan', async () => {
  const row = { stok_opname_id: 1, tanggal: '2026-01-01', catatan: '', tahun_ajaran_id: 1, semester: 'Genap', tahun: '2026', can_edit: false, daftar_aset: [] };
  axiosClient.get.mockImplementation(async url => ({ data: url === '/stok-opname' ? [row] : url === '/stok-opname/1' ? row : [] }));
  const user = userEvent.setup();
  render(<StokOpname />);
  await user.click(await screen.findByRole('button', { name: 'Lihat Detail' }));
  expect(await screen.findByText('Detail Stok Opname #1')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Ubah' })).not.toBeInTheDocument();
  expect(screen.queryByText('Hanya lihat')).not.toBeInTheDocument();
});
