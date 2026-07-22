// Functional test - halaman Login (FR-01). Merender komponen sungguhan di dalam AuthProvider +
// MemoryRouter; hanya axiosClient (batas jaringan) yang di-mock, supaya alur AuthContext.login()
// yang sesungguhnya tetap teruji.
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import Login from '../../src/pages/Login/Login';
import { AuthProvider } from '../../src/context/AuthContext';
import axiosClient from '../../src/api/axiosClient';

vi.mock('../../src/api/axiosClient', () => ({
  default: { post: vi.fn(), get: vi.fn() },
}));

function renderLogin() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('Login', () => {
  test('menampilkan form login', () => {
    renderLogin();
    expect(screen.getByText('Selamat Datang!')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('SiPromo Account')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /masuk/i })).toBeInTheDocument();
  });

  test('menampilkan pesan error dari server saat login gagal, tanpa menyimpan token', async () => {
    axiosClient.post.mockRejectedValueOnce({ response: { data: { message: 'Email atau password salah' } } });
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByPlaceholderText('SiPromo Account'), 'salah@if.unpar.ac.id');
    await user.type(screen.getByPlaceholderText('Password'), 'passwordsalah');
    await user.click(screen.getByRole('button', { name: /masuk/i }));

    expect(await screen.findByText('Email atau password salah')).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
  });

  test('login sukses menyimpan token & user ke localStorage', async () => {
    axiosClient.post.mockResolvedValueOnce({
      data: { token: 'jwt-dummy', user: { id: 1, nama: 'PIC Promosi', email: 'pic@if.unpar.ac.id' } },
    });
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByPlaceholderText('SiPromo Account'), 'pic@if.unpar.ac.id');
    await user.type(screen.getByPlaceholderText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: /masuk/i }));

    await waitFor(() => expect(localStorage.getItem('token')).toBe('jwt-dummy'));
    expect(JSON.parse(localStorage.getItem('user'))).toEqual({ id: 1, nama: 'PIC Promosi', email: 'pic@if.unpar.ac.id' });
  });

  test('tombol mata toggle visibilitas password', async () => {
    const user = userEvent.setup();
    renderLogin();
    const passwordInput = screen.getByPlaceholderText('Password');
    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: /tampilkan password/i }));
    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: /sembunyikan password/i }));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });
});
