import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, test, expect, vi } from 'vitest';
import Vendor from '../../src/pages/Vendor/Vendor';
import axiosClient from '../../src/api/axiosClient';
vi.mock('../../src/api/axiosClient', () => ({ default: { get: vi.fn(), put: vi.fn() } }));
const vendors = [
  { vendor_id: 1, nama: 'Toko Suvenir Nusantara', alamat: 'Bandung', aset_dibeli: [
    { aset_id: 1, nama: 'Tote Bag Informatika' }, { aset_id: 2, nama: 'Pin Logo' },
  ] },
  { vendor_id: 2, nama: 'Vendor Tanpa Pembelian', alamat: 'Bandung', aset_dibeli: [] },
];
function mount() { render(<MemoryRouter><Vendor /></MemoryRouter>); }
beforeEach(() => { vi.resetAllMocks(); axiosClient.get.mockResolvedValue({ data: vendors }); });
test('kolom Aset Dibeli menampilkan aset pada baris vendor dan tanda kosong', async () => {
  mount();
  expect(screen.getByRole('columnheader', { name: 'Aset Dibeli' })).toBeInTheDocument();
  const row = (await screen.findByText('Toko Suvenir Nusantara')).closest('tr');
  expect(within(row).getByText('Tote Bag Informatika')).toBeInTheDocument();
  expect(within(row).getByText('Pin Logo')).toBeInTheDocument();
  const empty = screen.getByText('Vendor Tanpa Pembelian').closest('tr');
  expect(within(empty).getAllByRole('cell')[4]).toHaveTextContent('-');
  expect(within(empty).queryByText('Pin Logo')).not.toBeInTheDocument();
});
test('pencarian vendor dapat dikirim berdasarkan nama aset tanpa menghilangkan kolom', async () => {
  mount(); await screen.findByText('Pin Logo');
  const user = userEvent.setup();
  await user.type(screen.getByPlaceholderText('Cari vendor...'), 'Pin Logo{Enter}');
  await waitFor(() => expect(axiosClient.get).toHaveBeenLastCalledWith('/vendor', { params: { search: 'Pin Logo' } }));
});
test('aksi ubah tetap mengisi form vendor tanpa memasukkan riwayat aset', async () => {
  mount();
  const row = (await screen.findByText('Toko Suvenir Nusantara')).closest('tr');
  await userEvent.click(within(row).getByRole('button', { name: 'Ubah' }));
  expect(screen.getByDisplayValue('Toko Suvenir Nusantara')).toBeInTheDocument();
  expect(screen.queryByText('Pin Logo')).not.toBeInTheDocument();
});

test('maksimal tiga label, +N lainnya mengembangkan hanya vendor yang dipilih dan dapat diringkas', async () => {
  const items = Array.from({ length: 15 }, (_, i) => ({ aset_id: i + 1, nama: `Aset ${i + 1}` }));
  axiosClient.get.mockResolvedValue({ data: [
    { vendor_id: 10, nama: 'Vendor Banyak Aset', alamat: 'Bandung', aset_dibeli: items },
    { vendor_id: 11, nama: 'Vendor Lain', alamat: 'Jakarta', aset_dibeli: items.slice(0, 4) },
  ] });
  mount(); const user = userEvent.setup();
  const row = (await screen.findByText('Vendor Banyak Aset')).closest('tr');
  const other = screen.getByText('Vendor Lain').closest('tr');
  const toggle = within(row).getByRole('button', { name: '+12 lainnya untuk Vendor Banyak Aset' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(within(row).getByText('Aset 3')).toBeInTheDocument();
  expect(within(row).queryByText('Aset 4')).not.toBeInTheDocument();
  await user.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(within(row).getByText('Aset 15')).toBeInTheDocument();
  expect(within(other).queryByText('Aset 4')).not.toBeInTheDocument();
  expect(within(other).getByRole('button', { name: '+1 lainnya untuk Vendor Lain' })).toHaveAttribute('aria-expanded', 'false');
  await user.click(within(row).getByRole('button', { name: 'Tampilkan lebih sedikit aset Vendor Banyak Aset' }));
  expect(within(row).queryByText('Aset 4')).not.toBeInTheDocument();
  expect(within(row).getByRole('button', { name: '+12 lainnya untuk Vendor Banyak Aset' })).toHaveAttribute('aria-expanded', 'false');
});
test('tepat tiga aset tidak menampilkan tombol lainnya', async () => {
  axiosClient.get.mockResolvedValue({ data: [{ vendor_id: 1, nama: 'Vendor Tiga', alamat: 'Bandung',
    aset_dibeli: [1, 2, 3].map(id => ({ aset_id: id, nama: `Aset ${id}` })),
  }] });
  mount(); await screen.findByText('Aset 3');
  expect(screen.queryByRole('button', { name: /lainnya/ })).not.toBeInTheDocument();
});
