import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, test, expect, afterEach } from 'vitest';
import Dashboard from '../../src/pages/Dashboard/Dashboard';
import axiosClient from '../../src/api/axiosClient';
vi.mock('../../src/api/axiosClient', () => ({ default: { get: vi.fn() } }));
afterEach(cleanup);

test.each([5, 0])('bulan aktif biru meski penggunaan %s lebih rendah dari bulan puncak', async total => {
  axiosClient.get.mockResolvedValue({ data: {
    tahun_ajaran: { semester: 'Ganjil', tahun: '2026/2027' },
    chart_penggunaan_bulanan: [
      { label: 'Agu', total_unit: 100, is_bulan_aktif: false },
      { label: 'Okt', total_unit: total, is_bulan_aktif: true },
    ],
    aset_terbanyak_digunakan: [], penggunaan_terbaru: [], pembelian_terbaru: [],
  } });
  render(<MemoryRouter><Dashboard /></MemoryRouter>);
  expect(await screen.findByRole('img', { name: `Okt: ${total} unit, bulan aktif` })).toHaveStyle({ background: '#155dfc' });
  expect(screen.getByRole('img', { name: 'Agu: 100 unit' })).toHaveStyle({ background: '#e5e7eb', height: '100%', position: 'absolute' });
  expect(screen.getByRole('img', { name: `Okt: ${total} unit, bulan aktif` })).toHaveStyle({ height: `${total}%`, position: 'absolute' });
});


test.each(['Agu', 'Okt'])('tinggi sebanding dengan nilai dan tetap sama ketika bulan aktif %s', async active => {
  axiosClient.get.mockResolvedValue({ data: {
    tahun_ajaran: { semester: 'Ganjil', tahun: '2026/2027' },
    chart_penggunaan_bulanan: [
      { label: 'Agu', total_unit: 35, is_bulan_aktif: active === 'Agu' },
      { label: 'Okt', total_unit: 70, is_bulan_aktif: active === 'Okt' },
      { label: 'Nov', total_unit: 0, is_bulan_aktif: false },
    ],
    aset_terbanyak_digunakan: [], penggunaan_terbaru: [], pembelian_terbaru: [],
  } });
  render(<MemoryRouter><Dashboard /></MemoryRouter>);
  const august = await screen.findByRole('img', { name: /^Agu:/ });
  const october = screen.getByRole('img', { name: /^Okt:/ });
  expect(august).toHaveStyle({ height: '50%', position: 'absolute', bottom: 0 });
  expect(october).toHaveStyle({ height: '100%', position: 'absolute', bottom: 0 });
  expect(screen.getByRole('img', { name: 'Nov: 0 unit' })).toHaveStyle({ height: '0%' });
  expect(screen.getByText('35')).toHaveStyle({ position: 'absolute' });
  expect(screen.getByText('70')).toHaveStyle({ position: 'absolute' });
});
