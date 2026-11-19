import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import Aset from '../../src/pages/Aset/Aset';
import LokasiPenyimpanan from '../../src/pages/LokasiPenyimpanan/LokasiPenyimpanan';
import Vendor from '../../src/pages/Vendor/Vendor';
import axiosClient from '../../src/api/axiosClient';

vi.mock('../../src/api/axiosClient', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../../src/components/common/PageHeader', () => ({ default: () => null }));
let locations;
let vendors;
beforeEach(() => {
  vi.resetAllMocks();
  locations = [{ lokasi_penyimpanan_id: 1, nama: '9113', is_active: true }];
  vendors = [];
  axiosClient.get.mockImplementation(async url => ({ data: url === '/lokasi-penyimpanan' ? [...locations] : url === '/vendor' ? [...vendors] : [] }));
});

function setup() {
  render(<MemoryRouter initialEntries={['/aset']}><Routes>
    <Route path="/aset" element={<Aset />} />
    <Route path="/lokasi-penyimpanan" element={<LokasiPenyimpanan />} />
    <Route path="/vendor" element={<Vendor />} />
  </Routes></MemoryRouter>);
  return userEvent.setup();
}

async function openLocation(user) {
  await user.click(await screen.findByRole('button', { name: 'Tambah Aset' }));
  await user.type(screen.getByRole('textbox'), 'Brosur');
  await user.type(screen.getAllByRole('spinbutton')[2], '15000');
  await user.selectOptions(screen.getByRole('combobox', { name: 'Lokasi Penyimpanan' }), '1');
  await user.click(screen.getByRole('button', { name: 'Tambah Lokasi Penyimpanan' }));
  expect(await screen.findByText('Tambah Lokasi Penyimpanan Baru')).toBeInTheDocument();
}

test('menambahkan lokasi lalu kembali ke aset dengan lokasi baru dan draft tetap terisi', async () => {
  axiosClient.post.mockImplementation(async (url, form) => {
    const row = { ...form, lokasi_penyimpanan_id: 2, is_active: true };
    locations.push(row);
    return { data: row };
  });
  const user = setup();
  await openLocation(user);
  await user.type(screen.getAllByRole('textbox')[0], 'Gudang Baru');
  await user.click(screen.getByRole('button', { name: 'Simpan Lokasi Penyimpanan' }));
  expect(await screen.findByDisplayValue('Brosur')).toBeInTheDocument();
  expect(screen.getByDisplayValue('15000')).toBeInTheDocument();
  await screen.findByRole('option', { name: 'Gudang Baru' });
  expect(screen.getByRole('combobox', { name: 'Lokasi Penyimpanan' })).toHaveValue('2');
  expect(axiosClient.post).toHaveBeenCalledWith('/lokasi-penyimpanan', { nama: 'Gudang Baru', deskripsi: '' });
});

test('batal menambahkan lokasi kembali ke aset dengan lokasi sebelumnya', async () => {
  const user = setup();
  await openLocation(user);
  await user.click(screen.getByRole('button', { name: 'Batal' }));
  expect(await screen.findByDisplayValue('Brosur')).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: 'Lokasi Penyimpanan' })).toHaveValue('1');
  expect(axiosClient.post).not.toHaveBeenCalled();
});

test('vendor opsional, vendor baru dipilih otomatis dan draft bertahan saat menambah lokasi', async () => {
  axiosClient.post.mockImplementation(async (url, form) => {
    if (url === '/vendor') {
      const row = { ...form, vendor_id: 8, is_active: true };
      vendors.push(row);
      return { data: row };
    }
    return { data: { aset_id: 9 } };
  });
  const user = setup();
  await user.click(await screen.findByRole('button', { name: 'Tambah Aset' }));
  expect(screen.getByRole('combobox', { name: 'Vendor' })).not.toBeRequired();
  expect(screen.getByText('Vendor').parentElement).not.toHaveTextContent('*');
  await user.type(screen.getByRole('textbox'), 'Brosur');
  await user.type(screen.getAllByRole('spinbutton')[2], '15000');
  await user.selectOptions(screen.getByRole('combobox', { name: 'Lokasi Penyimpanan' }), '1');
  await user.click(screen.getByRole('button', { name: 'Tambah Vendor' }));
  expect(await screen.findByText('Tambah Vendor Baru')).toBeInTheDocument();
  const inputs = screen.getAllByRole('textbox');
  await user.type(inputs[0], 'Vendor Baru');
  await user.type(inputs[1], 'Bandung');
  await user.click(screen.getByRole('button', { name: 'Simpan Vendor' }));
  expect(await screen.findByDisplayValue('Brosur')).toBeInTheDocument();
  await screen.findByRole('option', { name: 'Vendor Baru' });
  expect(screen.getByRole('combobox', { name: 'Vendor' })).toHaveValue('8');
  await user.click(screen.getByRole('button', { name: 'Tambah Lokasi Penyimpanan' }));
  await user.click(await screen.findByRole('button', { name: 'Batal' }));
  await screen.findByRole('option', { name: 'Vendor Baru' });
  expect(screen.getByRole('combobox', { name: 'Vendor' })).toHaveValue('8');
  await user.click(screen.getByRole('button', { name: 'Simpan Aset' }));
  expect(axiosClient.post).toHaveBeenCalledWith('/aset', expect.objectContaining({ nama: 'Brosur', vendor_id: '8', lokasi_penyimpanan_id: '1' }));
});

test('batal tambah vendor mempertahankan pilihan vendor sebelumnya', async () => {
  vendors.push({ vendor_id: 3, nama: 'Vendor Lama', is_active: true });
  const user = setup();
  await user.click(await screen.findByRole('button', { name: 'Tambah Aset' }));
  await screen.findByRole('option', { name: 'Vendor Lama' });
  await user.selectOptions(screen.getByRole('combobox', { name: 'Vendor' }), '3');
  await user.click(screen.getByRole('button', { name: 'Tambah Vendor' }));
  await user.click(await screen.findByRole('button', { name: 'Batal' }));
  await screen.findByRole('option', { name: 'Vendor Lama' });
  expect(screen.getByRole('combobox', { name: 'Vendor' })).toHaveValue('3');
  expect(axiosClient.post).not.toHaveBeenCalled();
});
