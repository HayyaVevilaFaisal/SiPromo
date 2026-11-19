import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi, test, expect } from 'vitest';
import Aset from '../../src/pages/Aset/Aset';
import axiosClient from '../../src/api/axiosClient';

vi.mock('../../src/api/axiosClient', () => ({ default: { get: vi.fn() } }));

// Test lama untuk filter status:
// test('filter level, status, harga terlihat setelah diterapkan dan tetap digunakan saat mencari', async () => {
//   axiosClient.get.mockImplementation(async (url, options) => ({ data: url === '/level-aset'
//     ? [{ level_aset_id: 2, nama: 'Premium' }]
//     : url === '/aset' && !options ? [{ harga: 10000 }] : [] }));
//   const user = userEvent.setup();
//   render(<MemoryRouter><Aset /></MemoryRouter>);
//   await screen.findByText('Belum ada data.');
//   await user.click(screen.getByRole('button', { name: 'Filter' }));
//   await user.selectOptions(screen.getByRole('combobox', { name: 'Level Aset' }), '2');
//   await user.click(screen.getByRole('button', { name: 'Terhapus' }));
//   fireEvent.change(screen.getAllByRole('slider')[1], { target: { value: '5000' } });
//   expect(screen.queryByText('Filter aktif:')).not.toBeInTheDocument();
//   await user.click(screen.getByRole('button', { name: 'Terapkan' }));
//   expect(screen.getByText('Level Aset: Premium')).toBeInTheDocument();
//   expect(screen.getByText('Status: Terhapus')).toBeInTheDocument();
//   expect(screen.getByText('Harga: Rp0 – Rp5.000')).toBeInTheDocument();
//   await user.click(screen.getByRole('button', { name: 'Filter (3)' }));
//   await user.click(screen.getByRole('button', { name: 'Semua' }));
//   await user.click(screen.getByRole('button', { name: 'Tutup' }));
//   await user.type(screen.getByPlaceholderText('Cari aset...'), 'Tas{Enter}');
//   await waitFor(() => expect(axiosClient.get).toHaveBeenLastCalledWith('/aset', {
//     params: { search: 'Tas', level: '2', status: 'terhapus', hargaMin: '', hargaMax: 5000 },
//   }));
//   await user.click(screen.getByRole('button', { name: 'Hapus filter' }));
//   expect(screen.queryByText('Filter aktif:')).not.toBeInTheDocument();
//   await waitFor(() => expect(axiosClient.get).toHaveBeenLastCalledWith('/aset', {
//     params: { search: 'Tas', level: '', status: 'aktif', hargaMin: '', hargaMax: '' },
//   }));
// });

test('filter level, lokasi, harga terlihat setelah diterapkan dan tetap digunakan saat mencari', async () => {
  axiosClient.get.mockImplementation(async (url, options) => ({ data: url === '/level-aset'
    ? [{ level_aset_id: 2, nama: 'Premium' }]
    : url === '/lokasi-penyimpanan' ? [{ lokasi_penyimpanan_id: 3, nama: 'Gudang' }]
    : url === '/aset' && !options ? [{ harga: 10000 }] : [] }));
  const user = userEvent.setup();
  render(<MemoryRouter><Aset /></MemoryRouter>);
  await screen.findByText('Belum ada data.');
  await user.click(screen.getByRole('button', { name: 'Filter' }));
  await user.selectOptions(screen.getByRole('combobox', { name: 'Level Aset' }), '2');
  await user.selectOptions(screen.getByRole('combobox', { name: 'Lokasi Penyimpanan' }), '3');
  fireEvent.change(screen.getAllByRole('slider')[1], { target: { value: '5000' } });
  expect(screen.queryByText('Filter aktif:')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Terapkan' }));
  expect(screen.getByText('Level Aset: Premium')).toBeInTheDocument();
  expect(screen.getByText('Lokasi Penyimpanan: Gudang')).toBeInTheDocument();
  expect(screen.getByText('Harga: Rp0 – Rp5.000')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Filter (3)' }));
  await user.selectOptions(screen.getByRole('combobox', { name: 'Lokasi Penyimpanan' }), '');
  await user.click(screen.getByRole('button', { name: 'Tutup' }));
  await user.type(screen.getByPlaceholderText('Cari aset...'), 'Tas{Enter}');
  await waitFor(() => expect(axiosClient.get).toHaveBeenLastCalledWith('/aset', {
//     params: { search: 'Tas', level: '2', lokasi: '3', hargaMin: '', hargaMax: 5000 },
    params: { search: 'Tas', level: '2', status: '', lokasi: '3', hargaMin: '', hargaMax: 5000 },
  }));
  await user.click(screen.getByRole('button', { name: 'Hapus filter' }));
  expect(screen.queryByText('Filter aktif:')).not.toBeInTheDocument();
  await waitFor(() => expect(axiosClient.get).toHaveBeenLastCalledWith('/aset', {
//     params: { search: 'Tas', level: '', lokasi: '', hargaMin: '', hargaMax: '' },
    params: { search: 'Tas', level: '', status: '', lokasi: '', hargaMin: '', hargaMax: '' },
  }));
});

 test.each(['kritis', 'aman'])('filter status %s diterapkan, tersimpan saat mencari, dan dapat direset', async (status) => {
  axiosClient.get.mockImplementation(async () => ({ data: [] }));
  const user = userEvent.setup();
  render(<MemoryRouter><Aset /></MemoryRouter>);
  await screen.findByText('Belum ada data.');
  await user.click(screen.getByRole('button', { name: 'Filter' }));
//   await user.selectOptions(screen.getByRole('combobox', { name: 'Status Aset' }), status);
  await user.click(screen.getByRole('button', { name: status === 'kritis' ? 'Kritis' : 'Aman' }));
  expect(screen.queryByText('Filter aktif:')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Terapkan' }));
  expect(screen.getByText(`Status: ${status === 'kritis' ? 'Kritis' : 'Aman'}`)).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Filter (1)' }));
//   expect(screen.getByRole('combobox', { name: 'Status Aset' })).toHaveValue(status);
  expect(screen.getByRole('button', { name: status === 'kritis' ? 'Kritis' : 'Aman' })).toHaveAttribute('aria-pressed', 'true');
//   await user.selectOptions(screen.getByRole('combobox', { name: 'Status Aset' }), '');
  await user.click(screen.getByRole('button', { name: 'Semua' }));
  await user.click(screen.getByRole('button', { name: 'Tutup' }));
  await user.type(screen.getByPlaceholderText('Cari aset...'), 'Tas{Enter}');
  await waitFor(() => expect(axiosClient.get).toHaveBeenLastCalledWith('/aset', {
    params: { search: 'Tas', level: '', lokasi: '', status, hargaMin: '', hargaMax: '' },
  }));
  await user.click(screen.getByRole('button', { name: 'Hapus filter' }));
  expect(screen.queryByText('Filter aktif:')).not.toBeInTheDocument();
  await waitFor(() => expect(axiosClient.get).toHaveBeenLastCalledWith('/aset', {
    params: { search: 'Tas', level: '', lokasi: '', status: '', hargaMin: '', hargaMax: '' },
  }));
});
