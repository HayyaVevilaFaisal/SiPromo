import { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';
import NotificationModal from './NotificationModal';

// FR-09, UC-05 - Ikon & modal notifikasi restock
export default function Navbar() {
  const { user, logout } = useAuth();
  const [notifikasi, setNotifikasi] = useState([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    axiosClient.get('/notifikasi').then((res) => setNotifikasi(res.data)).catch(() => {});
  }, []);

  return (
    <header style={{
      display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
      gap: 16, padding: 16, borderBottom: '1px solid #e2e8f0', background: '#fff', position: 'relative',
    }}
    >
      <button onClick={() => setShowModal((v) => !v)}>Notifikasi ({notifikasi.length})</button>
      <span style={{ fontSize: 14 }}>{user?.nama}</span>
      <button onClick={logout}>Keluar</button>
      {showModal && <NotificationModal data={notifikasi} onClose={() => setShowModal(false)} />}
    </header>
  );
}
