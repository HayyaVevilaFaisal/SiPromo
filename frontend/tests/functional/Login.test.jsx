import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, test, expect, beforeEach } from 'vitest';
import Login from '../../src/pages/Login/Login';
import { AuthProvider } from '../../src/context/AuthContext';
import axiosClient from '../../src/api/axiosClient';
vi.mock('../../src/api/axiosClient', () => ({ default: { post: vi.fn(), get: vi.fn() } }));
function mount(url = '/login') {
  return render(<MemoryRouter initialEntries={[url]}><AuthProvider><Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/kelola-pic" element={<p>Kelola PIC Kaprodi</p>} />
    <Route path="/" element={<p>Dashboard</p>} />
  </Routes></AuthProvider></MemoryRouter>);
}
beforeEach(() => {
  localStorage.clear(); vi.resetAllMocks();
  axiosClient.get.mockRejectedValue({ response: { status: 401 } });
});
test('Kaprodi dengan sesi cookie diarahkan ke dashboard', async () => {
  axiosClient.get.mockResolvedValueOnce({ data: { user: { id: 1, role: 'Kaprodi' } } });
  mount();
  expect(await screen.findByText('Dashboard')).toBeInTheDocument();
  expect(axiosClient.get).toHaveBeenCalledWith('/auth/me');
  expect(localStorage.getItem('token')).toBeNull(); expect(localStorage.getItem('user')).toBeNull();
});
test('PIC dengan sesi cookie diarahkan ke dashboard', async () => {
  axiosClient.get.mockResolvedValueOnce({ data: { user: { id: 2, role: 'PIC Promosi' } } });
  mount(); expect(await screen.findByText('Dashboard')).toBeInTheDocument();
});
test('halaman login menampilkan tautan Google dan pesan jika callback gagal', async () => {
  mount('/login?google=failed');
  expect(await screen.findByRole('link', { name: 'Masuk dengan Google' })).toHaveAttribute('href', '/api/auth/google');
  expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('Login dengan Google gagal');
});
