import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import LokasiPenyimpanan from '../../src/pages/LokasiPenyimpanan/LokasiPenyimpanan';
import axiosClient from '../../src/api/axiosClient';

vi.mock('../../src/api/axiosClient', () => ({ default: { get: vi.fn(), put: vi.fn() } }));
vi.mock('../../src/components/common/PageHeader', () => ({ default: () => null }));

beforeEach(() => {
  vi.resetAllMocks();
  axiosClient.get.mockResolvedValue({ data: [{ lokasi_penyimpanan_id: 1, nama: '9113', deskripsi: '', is_active: true, jumlah_aset: 0 }] });
});

test('mengedit nama lokasi dan kembali ke daftar setelah berhasil', async () => {
  axiosClient.put.mockResolvedValue({ data: {} });
  const user = userEvent.setup();
  render(<MemoryRouter><LokasiPenyimpanan /></MemoryRouter>);
  await user.click(await screen.findByRole('button', { name: 'Ubah' }));
  const input = screen.getByDisplayValue('9113');
  await user.clear(input);
  await user.type(input, 'Gudang Promosi');
  await user.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));
  await waitFor(() => expect(axiosClient.put).toHaveBeenCalledWith('/lokasi-penyimpanan/1', { nama: 'Gudang Promosi', deskripsi: '' }));
  expect(await screen.findByRole('button', { name: 'Tambah Lokasi Penyimpanan' })).toBeInTheDocument();
});

test('kegagalan simpan menampilkan pesan dan mempertahankan isi form', async () => {
  axiosClient.put.mockRejectedValue({ response: { data: { message: 'Nama lokasi sudah digunakan' } } });
  const user = userEvent.setup();
  render(<MemoryRouter><LokasiPenyimpanan /></MemoryRouter>);
  await user.click(await screen.findByRole('button', { name: 'Ubah' }));
  await user.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Nama lokasi sudah digunakan');
  expect(screen.getByDisplayValue('9113')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Simpan Perubahan' })).toBeEnabled();
});
