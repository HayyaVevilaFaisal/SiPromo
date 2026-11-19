import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi, test, expect } from 'vitest';
import PembelianAset from '../../src/pages/PembelianAset/PembelianAset';
import axiosClient from '../../src/api/axiosClient';

vi.mock('../../src/api/axiosClient', () => ({ default: { get: vi.fn() } }));

test('penanda hanya menampilkan filter diterapkan, pencarian mempertahankannya, hapus filter membersihkan penanda', async () => {
  axiosClient.get.mockImplementation(async url => ({ data: url === '/tahun-ajaran'
    ? [{ tahun_ajaran_id: 7, semester: 'Ganjil', tahun: '2026' }] : [] }));
  const user = userEvent.setup();
  render(<MemoryRouter><PembelianAset /></MemoryRouter>);
  await screen.findByText('Belum ada data.');
  await user.click(screen.getByRole('button', { name: 'Filter' }));
  await user.selectOptions(screen.getByRole('combobox'), '7');
  await user.click(screen.getByRole('button', { name: 'Lunas' }));
  expect(screen.queryByText('Filter aktif:')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Terapkan' }));
  expect(screen.getByText('Tahun Ajaran: Ganjil 2026')).toBeInTheDocument();
  expect(screen.getByText('Status Pembelian: Lunas')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Filter (2)' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Filter (2)' }));
  await user.click(screen.getByRole('button', { name: 'DP' }));
  await user.click(screen.getByRole('button', { name: 'Tutup' }));
  await user.type(screen.getByPlaceholderText('Cari vendor atau aset'), 'Tas{Enter}');
  await waitFor(() => expect(axiosClient.get).toHaveBeenLastCalledWith('/pembelian-aset', {
    params: { search: 'Tas', tahunAjaranId: '7', statusPembelian: 'Lunas' },
  }));
  await user.click(screen.getByRole('button', { name: 'Hapus filter' }));
  expect(screen.queryByText('Filter aktif:')).not.toBeInTheDocument();
  await waitFor(() => expect(axiosClient.get).toHaveBeenLastCalledWith('/pembelian-aset', {
    params: { search: 'Tas', tahunAjaranId: '', statusPembelian: '' },
  }));
});
