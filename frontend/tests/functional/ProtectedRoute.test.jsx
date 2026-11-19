import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, test, expect, beforeEach } from 'vitest';
import ProtectedRoute from '../../src/routes/ProtectedRoute';
import { useAuth } from '../../src/context/AuthContext';
vi.mock('../../src/context/AuthContext', () => ({ useAuth: vi.fn() }));
function mount() {
  render(<MemoryRouter initialEntries={['/kelola-pic']}><Routes>
    <Route path="/" element={<p>Dashboard PIC</p>} />
    <Route path="/login" element={<p>Masuk</p>} />
    <Route element={<ProtectedRoute role="Kaprodi" />}>
      <Route path="/kelola-pic" element={<p>Halaman Kelola PIC</p>} />
    </Route>
  </Routes></MemoryRouter>);
}
beforeEach(() => localStorage.clear());
test('PIC yang mengetik URL Kelola PIC diarahkan kembali', () => {
  useAuth.mockReturnValue({ user: { role: 'PIC Promosi' }, loading: false }); mount();
  expect(screen.getByText('Dashboard PIC')).toBeInTheDocument();
  expect(screen.queryByText('Halaman Kelola PIC')).not.toBeInTheDocument();
});
test('Kaprodi dapat membuka Kelola PIC', () => {
  useAuth.mockReturnValue({ user: { role: 'Kaprodi' }, loading: false }); mount();
  expect(screen.getByText('Halaman Kelola PIC')).toBeInTheDocument();
});
test('token cache tanpa identitas tervalidasi tidak membuka halaman', () => {
  useAuth.mockReturnValue({ user: null, loading: false }); mount();
  expect(screen.getByText('Masuk')).toBeInTheDocument();
});

