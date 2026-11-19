import { Navigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import { GiftIcon } from '../../components/common/icons';

export default function Login() {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const googleStatus = searchParams.get('google');
  const googleError = googleStatus === 'unavailable'
    ? 'Login dengan Google belum tersedia.'
    : googleStatus === 'failed'
      ? 'Login dengan Google gagal. Gunakan akun Gmail atau Google Workspace yang terdaftar dan aktif di SiPromo.'
      : '';
  if (user) return <Navigate to="/" replace />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 20, minHeight: '100vh', background: 'linear-gradient(135deg, #1447e6, #3b82f6, #2563eb)', padding: 16 }}>
      <main style={{ background: '#fff', padding: 32, borderRadius: 20, width: 400, maxWidth: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.25)', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, textAlign: 'left' }}>
          <div style={{ padding: 12, borderRadius: 12, background: '#155dfc', color: '#fff' }}><GiftIcon size={24} /></div>
          <div><strong>SiPromo</strong><div style={{ fontSize: 12, color: '#6b7280' }}>Informatika UNPAR</div></div>
        </div>
        <h1 style={{ fontSize: 22 }}>Selamat Datang!</h1>
        <p>Portal Pengelolaan Aset Promosi Informatika UNPAR</p>
        <p style={{ fontSize: 13, color: '#6b7280' }}>Masuk dengan akun Email UNPAR Anda</p>
        {googleError && <p role="alert" style={{ color: '#b91c1c' }}>{googleError}</p>}

        {loading ? <p role="status">Memeriksa sesi...</p> : (
          <a href="/api/auth/google" style={{ display: 'block', textAlign: 'center', marginTop: 12, padding: 12, border: '1px solid #cbd5e1', borderRadius: 10, color: '#1e293b', textDecoration: 'none' }}>
            Masuk dengan Google
          </a>
        )}
      </main>
      <footer style={{ fontSize: 13, color: '#fff', textAlign: 'center' }}>
        © 2026 Informatika Universitas Katolik Parahyangan
      </footer>
    </div>
  );
}
