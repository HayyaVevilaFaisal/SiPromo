import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, test, expect } from 'vitest';
import StokOpname from '../../src/pages/StokOpname/StokOpname';
import axiosClient from '../../src/api/axiosClient';
vi.mock('../../src/api/axiosClient', () => ({ default: { get: vi.fn(), put: vi.fn(), post: vi.fn() } }));
vi.mock('../../src/components/common/PageHeader', () => ({ default: () => null }));

test('edit memuat hasil opname lama dan menyimpan koreksi dengan snapshot awal', async () => {
  const opname = {
    stok_opname_id: 1, can_edit: true, tanggal: '2026-10-05', catatan: 'Awal', tahun_ajaran_id: 1,
    tanggal_mulai: '2026-07-01', tanggal_selesai: '2026-12-31', semester: 'Ganjil', tahun: '2026',
    daftar_aset: [{ aset_id: 1, aset_nama: 'Pin Logo', stok_sistem: 100, stok_fisik: 90 }],
  };
  axiosClient.get.mockImplementation(async url => ({ data:
    url === '/stok-opname/1' ? opname : url === '/stok-opname' ? [{ ...opname, jumlah_aset: 1, jumlah_selisih: 1 }] : []
  }));
  axiosClient.put.mockResolvedValue({ data: opname });
  const user = userEvent.setup();
  render(<StokOpname />);
  await screen.findByRole('button', { name: 'Lihat Detail' });
  expect(screen.queryByRole('button', { name: 'Ubah' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Lihat Detail' }));
  await user.click(await screen.findByRole('button', { name: 'Ubah' }));
  expect(screen.getByText('Edit Stok Opname')).toBeInTheDocument();
  const physical = screen.getByRole('spinbutton');
  expect(physical).toHaveValue(90);
  await user.clear(physical);
  await user.type(physical, '95');
  expect(screen.getByText('-5')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));
  await waitFor(() => expect(axiosClient.put).toHaveBeenCalledWith('/stok-opname/1', expect.objectContaining({
    daftar_aset: [{ aset_id: 1, stok_sistem: 100, stok_fisik: 95 }],
    original: { tanggal: '2026-10-05', catatan: 'Awal', daftar_aset: opname.daftar_aset },
  })));
  expect(axiosClient.post).not.toHaveBeenCalled();
  await screen.findByText('Stok Opname · 5 Oktober 2026');
  expect(screen.queryByText(/Catatan #/)).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Kembali' }));
  await screen.findByRole('button', { name: 'Lihat Detail' });
  expect(screen.queryByRole('button', { name: 'Ubah' })).not.toBeInTheDocument();
});
