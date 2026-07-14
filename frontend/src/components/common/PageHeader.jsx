import { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import NotificationModal from '../layout/NotificationModal';

// Header judul + subjudul + ikon notifikasi, dipakai seragam di setiap halaman kelola data (FR-09, UC-05)
export default function PageHeader({ title, subtitle }) {
  const [notifikasi, setNotifikasi] = useState([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    axiosClient.get('/notifikasi').then((res) => setNotifikasi(res.data)).catch(() => {});
  }, []);

  return (
    <div style={{
      background: '#fff', borderBottom: '1px solid #e2e8f0', margin: '-24px -24px 20px -24px',
    }}
    >
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative',
        padding: '20px 24px',
      }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{title}</h1>
          {subtitle && <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>{subtitle}</p>}
        </div>

        <button
          type="button"
          onClick={() => setShowModal((v) => !v)}
          title="Notifikasi"
          style={{
            position: 'relative', width: 38, height: 38, borderRadius: 12, background: '#f9fafb',
            border: '1px solid #e2e8f0', color: '#374151', display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: 0, flexShrink: 0,
          }}
        >
          <BellIcon />
          {notifikasi.length > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 999,
              background: '#dc2626', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex',
              alignItems: 'center', justifyContent: 'center', padding: '0 3px', lineHeight: 1,
            }}
            >
              {notifikasi.length}
            </span>
          )}
        </button>

        {showModal && <NotificationModal data={notifikasi} onClose={() => setShowModal(false)} />}
      </div>
    </div>
  );
}

function BellIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
