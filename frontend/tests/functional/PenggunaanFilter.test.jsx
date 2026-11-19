import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi, test, expect } from 'vitest';
import PenggunaanAset from '../../src/pages/PenggunaanAset/PenggunaanAset';
import axiosClient from '../../src/api/axiosClient';

vi.mock('../../src/api/axiosClient', () => ({ default: { get: vi.fn() } }));

test('dropdown tahun ajaran langsung memperbarui hasil bersama pencarian', async () => {
  axiosClient.get.mockImplementation(async url => ({ data: url === '/tahun-ajaran'
    ? [{ tahun_ajaran_id: 7, semester: 'Ganjil', tahun: '2026' }] : [] }));
  const user = userEvent.setup();
  render(<MemoryRouter><PenggunaanAset /></MemoryRouter>);
  await screen.findByText('Belum ada data.');
  expect(screen.queryByRole('button', { name: 'Filter' })).not.toBeInTheDocument();
  expect(screen.queryByRole('combobox', { name: 'Level Aset' })).not.toBeInTheDocument();
  await user.type(screen.getByPlaceholderText('Cari kegiatan atau aset'), 'Pulpen');
  await user.selectOptions(screen.getByRole('combobox', { name: 'Tahun Ajaran' }), '7');
  await waitFor(() => expect(axiosClient.get).toHaveBeenLastCalledWith('/penggunaan-aset', {
    params: { search: 'Pulpen', tahunAjaranId: '7' },
  }));
  await user.selectOptions(screen.getByRole('combobox', { name: 'Tahun Ajaran' }), '');
  await waitFor(() => expect(axiosClient.get).toHaveBeenLastCalledWith('/penggunaan-aset', {
    params: { search: 'Pulpen', tahunAjaranId: '' },
  }));
});
