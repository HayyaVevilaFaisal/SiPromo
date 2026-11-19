import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, test, expect, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '../../src/context/AuthContext';
import axiosClient from '../../src/api/axiosClient';
vi.mock('../../src/api/axiosClient', () => ({ default: { post: vi.fn(), get: vi.fn() } }));
function Probe() {
  const { user, loading, logout } = useAuth();
  const [error, setError] = useState('');
  return <><p>{loading ? 'Memeriksa' : user ? user.email : 'Tanpa sesi'}</p>
    <button onClick={() => logout().catch(() => setError('Logout gagal'))}>Keluar</button>
    {error && <p role="alert">{error}</p>}</>;
}
beforeEach(() => {
  vi.resetAllMocks(); localStorage.clear();
  axiosClient.get.mockResolvedValue({ data: { user: { id: 1, email: 'mariskha@unpar.ac.id' } } });
});
test('logout meminta server menghapus cookie sebelum menghapus identitas UI', async () => {
  axiosClient.post.mockResolvedValue({ status: 204 });
  render(<AuthProvider><Probe /></AuthProvider>);
  await screen.findByText('mariskha@unpar.ac.id');
  await userEvent.click(screen.getByRole('button', { name: 'Keluar' }));
  expect(await screen.findByText('Tanpa sesi')).toBeInTheDocument();
  expect(axiosClient.post).toHaveBeenCalledWith('/auth/logout');
});
test('logout gagal tidak memberi kesan sesi cookie telah dihapus', async () => {
  axiosClient.post.mockRejectedValue(new Error('network failure'));
  render(<AuthProvider><Probe /></AuthProvider>);
  await screen.findByText('mariskha@unpar.ac.id');
  await userEvent.click(screen.getByRole('button', { name: 'Keluar' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Logout gagal');
  expect(screen.getByText('mariskha@unpar.ac.id')).toBeInTheDocument();
});
