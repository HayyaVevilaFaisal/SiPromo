import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, vi, test, expect } from 'vitest';
import PenggunaanAset from '../../src/pages/PenggunaanAset/PenggunaanAset';
import axiosClient from '../../src/api/axiosClient';

vi.mock('../../src/api/axiosClient', () => ({ default: { get: vi.fn(), put: vi.fn(), post: vi.fn() } }));
const message = 'Pencatatan dengan nama kegiatan, tanggal, dan daftar aset yang sama sudah pernah dibuat. Apakah Anda yakin ingin menyimpan pencatatan ini?';
const form = { nama: 'Workshop', tanggal: '2026-10-07', catatan: '', daftar_aset: [{ aset_id: '1', qty_out: '2' }, { aset_id: '2', qty_out: '3' }] };
let existing;
beforeEach(() => {
  vi.resetAllMocks();
  existing = [{ kegiatan_id: 1, nama: 'Workshop', tanggal: '2026-10-07', daftar_aset: [{ aset_id: 2, qty_out: 3 }, { aset_id: 1, qty_out: 2 }] }];
  axiosClient.get.mockImplementation(async url => ({ data: url === '/penggunaan-aset' ? existing : url === '/tahun-ajaran' ? [{ tahun_ajaran_id: 1, semester: 'Ganjil', tahun: '2026', tanggal_mulai: '2026-07-01', tanggal_selesai: '2026-12-31' }] : [{ aset_id: 1, nama: 'Pulpen', stok: 50 }, { aset_id: 2, nama: 'Tas', stok: 50 }] }));
  axiosClient.post.mockResolvedValue({ data: {} });
});
async function submit() {
  render(<MemoryRouter initialEntries={[{ pathname: '/penggunaan-aset', state: { kembaliDariAset: { form } } }]}><PenggunaanAset /></MemoryRouter>);
  await screen.findByDisplayValue('Ganjil 2026');
  fireEvent.submit(screen.getByRole('button', { name: 'Simpan Pencatatan' }).closest('form'));
}

test('urutan aset berbeda tetap duplikat; batal mempertahankan form dan konfirmasi menyimpan sekali', async () => {
  const user = userEvent.setup();
  await submit();
  await screen.findByText(message);
  expect(axiosClient.post).not.toHaveBeenCalled();
  expect(axiosClient.get).toHaveBeenCalledWith('/penggunaan-aset');
  await user.click(screen.getAllByRole('button', { name: 'Batal' }).at(-1));
  expect(screen.queryByText(message)).not.toBeInTheDocument();
  expect(screen.getByDisplayValue('Workshop')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Simpan Pencatatan' }));
  await user.click(await screen.findByRole('button', { name: 'Ya, Simpan' }));
  await waitFor(() => expect(axiosClient.post).toHaveBeenCalledTimes(1));
});

test.each(['nama', 'tanggal', 'jumlah', 'jenis', 'tambahan'])('perbedaan %s langsung disimpan', async difference => {
  if (difference === 'nama') existing[0].nama = 'Seminar';
  if (difference === 'tanggal') existing[0].tanggal = '2026-10-06';
  if (difference === 'jumlah') existing[0].daftar_aset[0].qty_out = 4;
  if (difference === 'jenis') existing[0].daftar_aset[0].aset_id = 3;
  if (difference === 'tambahan') existing[0].daftar_aset.push({ aset_id: 3, qty_out: 1 });
  await submit();
  await waitFor(() => expect(axiosClient.post).toHaveBeenCalledTimes(1));
  expect(screen.queryByText(message)).not.toBeInTheDocument();
});
