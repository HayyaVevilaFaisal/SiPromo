import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi, test, expect, afterEach } from 'vitest';
import Dashboard from '../../src/pages/Dashboard/Dashboard';
import axiosClient from '../../src/api/axiosClient';
vi.mock('../../src/api/axiosClient', () => ({ default: { get: vi.fn() } }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
const current = { tahun_ajaran_id: 2, tahun: '2026/2027', semester: 'Ganjil' };
const past = { tahun_ajaran_id: 1, tahun: '2023/2024', semester: 'Genap' };
const summary = (period, total) => ({
  tahun_ajaran: period, total_penggunaan: total, jumlah_kegiatan: 1,
  nilai_pembelian: total * 1000, jumlah_transaksi: 2, total_stok: 500,
  jenis_aset: 4, perlu_restock: 2,
  chart_penggunaan_bulanan: [{ label: 'Feb', total_unit: total }],
  aset_terbanyak_digunakan: [{ nama: `Aset ${period.tahun}`, total_qty: total }],
  penggunaan_terbaru: [{ kegiatan_id: 8, kegiatan_nama: 'Open House', jenis_aset: 3, qty_out: total, aset_detail: [{ aset_id: 1, aset_nama: 'Pulpen', qty_out: total }], tanggal: '2026-01-10' }],
  pembelian_terbaru: [{ pembelian_id: 9, vendor_nama: 'Vendor ATK', qty_in: 120, aset_detail: [{ aset_id: 2, aset_nama: 'Totebag', qty_in: 120, total_harga: 250000 }], total_harga: 250000, status: 'Lunas', tanggal: '2026-01-11' }],
});

test('memilih riwayat memperbarui ringkasan dan menyembunyikan card stok/restock, lalu kembali ke semester berjalan', async () => {
  axiosClient.get.mockImplementation(async (url, config) => ({ data:
    url === '/tahun-ajaran' ? [current, past] : url === '/notifikasi' ? [] :
      config?.params?.tahunAjaranId === '1' ? summary(past, 35) : summary(current, 80),
  }));
  const user = userEvent.setup();
  render(<MemoryRouter><Dashboard /></MemoryRouter>);
  expect(await screen.findByText('Total Stok Aset')).toBeInTheDocument();
  const select = screen.getByRole('combobox', { name: 'Tahun ajaran dashboard' });
  await user.selectOptions(select, '1');
  expect(await screen.findByText('Semester Genap 2023/2024')).toBeInTheDocument();
  expect(axiosClient.get).toHaveBeenCalledWith('/dashboard', { params: { tahunAjaranId: '1' } });
  expect(screen.queryByText('Total Stok Aset')).not.toBeInTheDocument();
  expect(screen.queryByText('Perlu Restock')).not.toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Feb: 35 unit' })).toBeInTheDocument();
  expect(screen.getByText('Rp35.000')).toBeInTheDocument();
  expect(screen.getByText('Aset 2023/2024')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Kegiatan dengan Penggunaan Aset Terbanyak' })).toBeInTheDocument();
  expect(screen.getByText('Open House')).toBeInTheDocument();
  expect(screen.getByText('Vendor ATK')).toBeInTheDocument();
  expect(screen.getByText('Rp250.000')).toBeInTheDocument();
  expect(screen.getByText('Pulpen')).toBeInTheDocument();
  expect(screen.getByText('Totebag')).toBeInTheDocument();
  expect(screen.getByText('120 unit · Rp250.000')).toBeInTheDocument();
  await user.selectOptions(select, '2');
  expect(await screen.findByText('Total Stok Aset')).toBeInTheDocument();
  expect(screen.getByText('Perlu Restock')).toBeInTheDocument();
});

test('kegagalan riwayat menyembunyikan ringkasan lama dan dapat dicoba lagi', async () => {
  let fail = true;
  axiosClient.get.mockImplementation(async (url, config) => {
    if (url === '/tahun-ajaran') return { data: [current, past] };
    if (url === '/notifikasi') return { data: [] };
    if (config?.params?.tahunAjaranId === '1') {
      if (fail) throw new Error('offline');
      return { data: summary(past, 35) };
    }
    return { data: summary(current, 80) };
  });
  const user = userEvent.setup();
  render(<MemoryRouter><Dashboard /></MemoryRouter>);
  await screen.findByText('Total Stok Aset');
  await user.selectOptions(screen.getByRole('combobox'), '1');
  expect(await screen.findByRole('alert')).toHaveTextContent('Ringkasan aset gagal dimuat');
  expect(screen.queryByText('Aset 2026/2027')).not.toBeInTheDocument();
  fail = false;
  await user.click(screen.getByRole('button', { name: 'Coba lagi' }));
  await waitFor(() => expect(screen.getByText('Aset 2023/2024')).toBeInTheDocument());
});
