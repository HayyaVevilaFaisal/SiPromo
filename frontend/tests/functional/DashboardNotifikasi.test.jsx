import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi, test, expect } from 'vitest';
import Dashboard from '../../src/pages/Dashboard/Dashboard';
import axiosClient from '../../src/api/axiosClient';
vi.mock('../../src/api/axiosClient', () => ({ default: { get: vi.fn() } }));

test('tautan restock dan lonceng membuka panel notifikasi yang sama', async () => {
  axiosClient.get.mockImplementation(async url => ({ data: url === '/notifikasi' ? [
    { pesan_notifikasi_id: 1, aset_nama: 'Pulpen Informatika', stok: 5, threshold_qty: 10 },
  ] : {
    tahun_ajaran: { semester: 'Ganjil', tahun: '2026/2027' }, perlu_restock: 1,
    chart_penggunaan_bulanan: [], aset_terbanyak_digunakan: [], penggunaan_terbaru: [], pembelian_terbaru: [],
  } }));
  const user = userEvent.setup();
  render(<MemoryRouter><Dashboard /></MemoryRouter>);
  const link = await screen.findByRole('button', { name: 'Lihat selengkapnya' });
  await user.click(link);
  expect(await screen.findByText('Pulpen Informatika')).toBeInTheDocument();
  expect(screen.getAllByText('Notifikasi Restock')).toHaveLength(1);
  expect(link).toHaveAttribute('aria-expanded', 'true');
  await user.click(screen.getByRole('button', { name: 'Notifikasi' }));
  await waitFor(() => expect(screen.queryByText('Notifikasi Restock')).not.toBeInTheDocument());
  expect(link).toHaveAttribute('aria-expanded', 'false');
  link.focus();
  await user.keyboard('{Enter}');
  expect(await screen.findByText('Notifikasi Restock')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Tutup notifikasi' }));
  expect(link).toHaveAttribute('aria-expanded', 'false');
});
