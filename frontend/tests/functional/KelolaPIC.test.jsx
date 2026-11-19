import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, test, expect, beforeEach } from 'vitest';
import KelolaPIC from '../../src/pages/KelolaPIC/KelolaPIC';
import axiosClient from '../../src/api/axiosClient';
vi.mock('../../src/api/axiosClient', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
vi.mock('../../src/components/common/PageHeader', () => ({ default: () => <h1>Kelola PIC Promosi</h1> }));
const pic = { pengguna_id: 2, nama_lengkap: 'PIC Lama', email: 'pic@gmail.com', is_active: true };
beforeEach(() => { vi.resetAllMocks(); axiosClient.get.mockResolvedValue({ data: [pic] }); });
test('mendaftarkan akun PIC untuk login Google', async () => {
  axiosClient.post.mockResolvedValue({ data: { ...pic, pengguna_id: 3, nama_lengkap: 'PIC Baru' } });
  render(<KelolaPIC />); const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: /Daftarkan PIC/ }));
  await user.type(screen.getByLabelText(/Nama/), 'PIC Baru');
  await user.type(screen.getByLabelText(/Email/), 'baru@gmail.com');
  await user.click(screen.getByRole('button', { name: 'Simpan' }));
  await waitFor(() => expect(axiosClient.post).toHaveBeenCalledWith('/pic', { nama_lengkap: 'PIC Baru', email: 'baru@gmail.com', is_active: true }));
  expect(await screen.findByText(/Data PIC berhasil disimpan/)).toBeInTheDocument();
});
test('edit nama, email, status PIC dan kembali ke daftar', async () => {
  axiosClient.patch.mockResolvedValue({ data: { ...pic, nama_lengkap: 'PIC Baru', is_active: false } });
  render(<KelolaPIC />); const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Edit PIC Lama' }));
  await user.clear(screen.getByLabelText(/Nama/));
  await user.type(screen.getByLabelText(/Nama/), 'PIC Baru');
  await user.selectOptions(screen.getByLabelText(/Status Aktif/), 'false');
  await user.click(screen.getByRole('button', { name: 'Simpan' }));
  expect(await screen.findByText('Nonaktif')).toBeInTheDocument();
  expect(axiosClient.patch).toHaveBeenCalledWith('/pic/2', { nama_lengkap: 'PIC Baru', email: 'pic@gmail.com', is_active: false });
});
test('pencarian menampilkan hasil kosong dan batal tidak menyimpan', async () => {
  render(<KelolaPIC />); const user = userEvent.setup();
  await screen.findByText('PIC Lama');
  await user.type(screen.getByRole('searchbox'), 'tidak-ada');
  expect(screen.getByText('PIC tidak ditemukan.')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /Daftarkan PIC/ }));
  await user.click(screen.getByRole('button', { name: 'Batal' }));
  expect(axiosClient.post).not.toHaveBeenCalled();
});
