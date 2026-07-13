import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// FR-01, NFR-11 - Halaman Login
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login gagal');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      minHeight: '100vh', background: '#1F4E78',
    }}
    >
      <form onSubmit={handleSubmit} style={{ background: '#fff', padding: 32, borderRadius: 12, width: 360 }}>
        <h2 style={{ marginBottom: 4 }}>SiPromo</h2>
        <p style={{ fontSize: 13, color: '#555', marginBottom: 20 }}>
          Masuk untuk mengelola aset promosi Program Studi Informatika
        </p>
        {error && <p style={{ color: '#c0392b', fontSize: 13 }}>{error}</p>}
        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: '100%', marginBottom: 12 }}
          required
        />
        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: '100%', marginBottom: 20 }}
          required
        />
        <button type="submit" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Memproses...' : 'Masuk'}
        </button>
      </form>
    </div>
  );
}
