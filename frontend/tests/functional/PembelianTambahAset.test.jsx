import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { beforeEach, vi, test, expect } from 'vitest';
import PembelianAset from '../../src/pages/PembelianAset/PembelianAset';
import Aset from '../../src/pages/Aset/Aset';
import LokasiPenyimpanan from '../../src/pages/LokasiPenyimpanan/LokasiPenyimpanan';
import axiosClient from '../../src/api/axiosClient';

vi.mock('../../src/api/axiosClient', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() } }));
let assets;
let locations;
beforeEach(() => {
  vi.resetAllMocks();
  assets = [{ aset_id: 1, nama: 'Pulpen', harga: 1000, stok: 10 }];
  locations = [{ lokasi_penyimpanan_id: 1, nama: 'Gudang' }];
  axiosClient.get.mockImplementation(async url => ({ data:
    url === '/aset' ? [...assets] : url === '/lokasi-penyimpanan' ? [...locations] :
    url === '/vendor' ? [{ vendor_id: 5, nama: 'Vendor A' }] :
    url === '/tahun-ajaran' ? [{ tahun_ajaran_id: 1, semester: 'Ganjil', tahun: '2026', tanggal_mulai: '2026-07-01', tanggal_selesai: '2026-12-31' }] : [] }));
  axiosClient.post.mockImplementation(async (url, payload) => {
    if (url === '/aset') {
      const asset = { ...payload, aset_id: 9 };
      assets.push(asset);
      return { data: asset };
    }
    if (url === '/lokasi-penyimpanan') {
      const row = { ...payload, lokasi_penyimpanan_id: 2 };
      locations.push(row);
      return { data: row };
    }
    return { data: { pembelian: { pembelian_id: 11 } } };
  });
  axiosClient.patch.mockResolvedValue({ data: {} });
});
const bon = new File(['bon'], 'bon.pdf', { type: 'application/pdf' });
function setup(full = false) {
  const form = { vendor_id: '5', tanggal: '2026-10-07', status: 'DP', catatan: 'Draft pembelian',
    daftar_aset: [{ aset_id: '1', qty_in: '2', unit_price: '1000' }, ...(full ? [] : [{ aset_id: '', qty_in: '3', unit_price: '' }])],
    bonFile: bon, fileError: '' };
  render(<MemoryRouter initialEntries={[{ pathname: '/pembelian-aset', state: { kembaliDariVendor: { form, editing: null } } }]}>
    <Routes>
      <Route path="/pembelian-aset" element={<PembelianAset />} />
      <Route path="/aset" element={<Aset />} />
      <Route path="/lokasi-penyimpanan" element={<LokasiPenyimpanan />} />
    </Routes>
  </MemoryRouter>);
  return userEvent.setup();
}
async function openAsset(user) {
  await user.click(await screen.findByRole('button', { name: 'Tambah Aset', exact: true }));
  expect(await screen.findByText('Tambah Aset Baru')).toBeInTheDocument();
  expect(screen.queryByText('Stok Awal')).not.toBeInTheDocument();
  expect(screen.queryByText('Harga Satuan')).not.toBeInTheDocument();
  expect(screen.queryByRole('combobox', { name: 'Vendor' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Tambah Vendor' })).not.toBeInTheDocument();
  await user.type(screen.getByRole('textbox'), 'Brosur Baru');
  await user.selectOptions(screen.getByRole('combobox', { name: 'Lokasi Penyimpanan' }), '1');
}
test.each([false, true])('aset baru otomatis dipilih dan draft serta bon bertahan (semua baris terisi: %s)', async full => {
  const user = setup(full);
  await openAsset(user);
  await user.click(screen.getByRole('button', { name: 'Simpan Aset' }));
  await screen.findAllByRole('option', { name: 'Brosur Baru' });
  expect(screen.getByDisplayValue('Brosur Baru')).toHaveValue('9');
  expect(screen.getByDisplayValue('Pulpen')).toHaveValue('1');
  expect(screen.getByDisplayValue('Draft pembelian')).toBeInTheDocument();
  expect(screen.getByDisplayValue('2026-10-07')).toBeInTheDocument();
  expect(screen.getByDisplayValue('DP')).toBeInTheDocument();
  expect(screen.getByDisplayValue('Vendor A')).toBeInTheDocument();
  expect(screen.getByText('bon.pdf')).toBeInTheDocument();
  expect(screen.getByRole('spinbutton', { name: 'Harga satuan aset 1' })).toHaveValue(1000);
  expect(screen.getByRole('spinbutton', { name: 'Harga satuan aset 2' })).toHaveValue(null);
  expect(axiosClient.post).toHaveBeenCalledWith('/aset', expect.objectContaining({ nama: 'Brosur Baru', harga: 0, stok: 0, vendor_id: null }));
  const numbers = screen.getAllByRole('spinbutton');
  expect(numbers[0]).toHaveValue(2);
  if (full) await user.type(numbers[2], '3');
  else expect(numbers[2]).toHaveValue(3);
  await user.type(screen.getByRole('spinbutton', { name: 'Harga satuan aset 2' }), '2000');
  await user.click(screen.getByRole('button', { name: 'Simpan Pencatatan' }));
  await waitFor(() => expect(axiosClient.post).toHaveBeenCalledWith('/pembelian-aset', expect.objectContaining({
    daftar_aset: [{ aset_id: 1, qty_in: 2, unit_price: 1000 }, { aset_id: 9, qty_in: 3, unit_price: 2000 }],
  })));
  await waitFor(() => expect(axiosClient.patch).toHaveBeenCalled());
  expect(axiosClient.patch.mock.calls[0][1].get('bon')).toBe(bon);
});
test('batal tambah aset kembali tanpa mengubah daftar pembelian', async () => {
  const user = setup();
  await openAsset(user);
  await user.click(screen.getByRole('button', { name: 'Batal' }));
  await screen.findByText('Catat Pembelian Aset');
  expect(screen.getByDisplayValue('Draft pembelian')).toBeInTheDocument();
  expect(screen.queryByRole('option', { name: 'Brosur Baru' })).not.toBeInTheDocument();
  expect(screen.getByDisplayValue('Pulpen')).toBeInTheDocument();
  expect(screen.getByText('bon.pdf')).toBeInTheDocument();
  expect(axiosClient.post).not.toHaveBeenCalled();
});
test('tambah lokasi dari form aset mempertahankan konteks pembelian', async () => {
  const user = setup();
  await openAsset(user);
  await user.click(screen.getByRole('button', { name: 'Tambah Lokasi Penyimpanan' }));
  await screen.findByText('Tambah Lokasi Penyimpanan Baru');
  await user.type(screen.getAllByRole('textbox')[0], 'Gudang Baru');
  await user.click(screen.getByRole('button', { name: 'Simpan Lokasi Penyimpanan' }));
  await screen.findByDisplayValue('Brosur Baru');
  expect(screen.queryByText('Stok Awal')).not.toBeInTheDocument();
  await screen.findByRole('option', { name: 'Gudang Baru' });
  expect(screen.getByRole('combobox', { name: 'Lokasi Penyimpanan' })).toHaveValue('2');
  await user.click(screen.getByRole('button', { name: 'Simpan Aset' }));
  await screen.findByDisplayValue('Brosur Baru');
  expect(screen.getByDisplayValue('Draft pembelian')).toBeInTheDocument();
});
test('gagal simpan aset menampilkan pesan dan mempertahankan form', async () => {
  const user = setup();
  await openAsset(user);
  axiosClient.post.mockRejectedValueOnce({ response: { data: { message: 'Gagal membuat aset' } } });
  await user.click(screen.getByRole('button', { name: 'Simpan Aset' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Gagal membuat aset');
  expect(screen.getByDisplayValue('Brosur Baru')).toBeInTheDocument();
});
