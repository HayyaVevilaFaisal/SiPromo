import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, vi, test, expect } from 'vitest';
import PembelianAset from '../../src/pages/PembelianAset/PembelianAset';
import axiosClient from '../../src/api/axiosClient';

vi.mock('../../src/api/axiosClient', () => ({ default: { get: vi.fn(), put: vi.fn(), post: vi.fn() } }));
const message = 'Pencatatan dengan vendor, tanggal, dan daftar aset yang sama sudah pernah dibuat. Apakah Anda yakin ingin menyimpan pencatatan ini?';
const form = { vendor_id: '5', status: 'Lunas', tanggal: '2026-10-07', catatan: '', daftar_aset: [{ aset_id: '1', qty_in: '2', unit_price: '1000' }, { aset_id: '2', qty_in: '3', unit_price: '2000' }] };
let existing;
beforeEach(() => {
  vi.resetAllMocks();
  existing = [{ pembelian_id: 1, vendor_id: 5, tanggal: '2026-10-07', daftar_aset: [{ aset_id: 2, qty_in: 3 }, { aset_id: 1, qty_in: 2 }] }];
  axiosClient.get.mockImplementation(async url => ({ data: url === '/pembelian-aset' ? existing : url === '/vendor' ? [{ vendor_id: 5, nama: 'Vendor A' }] : url === '/tahun-ajaran' ? [{ tahun_ajaran_id: 1, semester: 'Ganjil', tahun: '2026', tanggal_mulai: '2026-07-01', tanggal_selesai: '2026-12-31' }] : [{ aset_id: 1, nama: 'Pulpen', stok: 50 }, { aset_id: 2, nama: 'Tas', stok: 50 }] }));
  axiosClient.post.mockResolvedValue({ data: { pembelian: { pembelian_id: 9 } } });
});
async function submit() {
  render(<MemoryRouter initialEntries={[{ pathname: '/pembelian-aset', state: { kembaliDariVendor: { form } } }]}><PembelianAset /></MemoryRouter>);
  await screen.findByDisplayValue('Ganjil 2026');
  fireEvent.submit(screen.getByRole('button', { name: 'Simpan Pencatatan' }).closest('form'));
}

test('urutan aset berbeda tetap duplikat; batal mempertahankan form dan konfirmasi menyimpan sekali', async () => {
  const user = userEvent.setup();
  await submit();
  await screen.findByText(message);
  expect(axiosClient.post).not.toHaveBeenCalled();
  expect(axiosClient.get).toHaveBeenCalledWith('/pembelian-aset');
  await user.click(screen.getAllByRole('button', { name: 'Batal' }).at(-1));
  expect(screen.queryByText(message)).not.toBeInTheDocument();
  expect(screen.getByDisplayValue('Vendor A')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Simpan Pencatatan' }));
  await user.click(await screen.findByRole('button', { name: 'Ya, Simpan' }));
  await waitFor(() => expect(axiosClient.post).toHaveBeenCalledTimes(1));
});

test.each(['vendor', 'tanggal', 'jumlah', 'jenis', 'tambahan'])('perbedaan %s langsung disimpan', async difference => {
  if (difference === 'vendor') existing[0].vendor_id = 6;
  if (difference === 'tanggal') existing[0].tanggal = '2026-10-06';
  if (difference === 'jumlah') existing[0].daftar_aset[0].qty_in = 4;
  if (difference === 'jenis') existing[0].daftar_aset[0].aset_id = 3;
  if (difference === 'tambahan') existing[0].daftar_aset.push({ aset_id: 3, qty_in: 1 });
  await submit();
  await waitFor(() => expect(axiosClient.post).toHaveBeenCalledTimes(1));
  expect(screen.queryByText(message)).not.toBeInTheDocument();
});
