import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi, test, expect } from 'vitest';
import Aset from '../../src/pages/Aset/Aset';
import axiosClient from '../../src/api/axiosClient';

vi.mock('../../src/api/axiosClient', () => ({ default: { get: vi.fn(), put: vi.fn() } }));

test('daftar tanpa tambah aset dan edit mempertahankan stok serta harga tanpa bintang label', async () => {
  const aset = { aset_id: 1, nama: 'Brosur', level_aset_id: null, lokasi_penyimpanan_id: 1, harga: 15000, stok: 25, threshold_qty: 5 };
  axiosClient.get.mockImplementation(async (url) => ({ data: url === '/aset' ? [aset] : url === '/lokasi-penyimpanan' ? [{ lokasi_penyimpanan_id: 1, nama: 'Gudang' }] : [] }));
  axiosClient.put.mockResolvedValue({ data: aset });
  const user = userEvent.setup();
  render(<MemoryRouter><Aset /></MemoryRouter>);
  await screen.findByText('Brosur');
  expect(screen.queryByRole('button', { name: 'Tambah Aset' })).not.toBeInTheDocument();
  await user.click(screen.getByTitle('Ubah'));
  const stok = screen.getByRole('spinbutton', { name: 'Stok Awal' });
  const harga = screen.getByRole('spinbutton', { name: 'Harga Satuan' });
  expect(stok).toHaveAttribute('readonly');
  expect(harga).toHaveAttribute('readonly');
  await user.type(stok, '99');
  await user.type(harga, '99');
  expect(stok).toHaveValue(25);
  expect(harga).toHaveValue(15000);
  expect(screen.queryByText('*')).not.toBeInTheDocument();
  await user.clear(screen.getByRole('textbox'));
  await user.type(screen.getByRole('textbox'), 'Brosur Baru');
  await user.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));
  await waitFor(() => expect(axiosClient.put).toHaveBeenCalledWith('/aset/1', expect.objectContaining({ nama: 'Brosur Baru', stok: 25, harga: 15000 })));
});
