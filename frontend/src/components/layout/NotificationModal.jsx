import { BellIcon, AlertTriangleIcon } from '../common/icons';

// UC-05 - Modal Notifikasi Restock. Notifikasi otomatis hilang dari daftar ini ketika
// stok aset sudah tidak lagi di bawah threshold (lihat backend/src/utils/stockNotification.js).
export default function NotificationModal({ data, onClose }) {
  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 9 }}
      />
      <div style={{
        position: 'absolute', top: 54, right: 24, background: '#fff',
        border: '1px solid #e5e7eb', borderRadius: 16, width: 320,
        boxShadow: '0 12px 30px rgba(0,0,0,0.12)', zIndex: 10, overflow: 'hidden',
      }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '16px 18px',
          borderBottom: '1px solid #f1f5f9', color: '#111827',
        }}
        >
          <BellIcon />
          <strong style={{ fontSize: 15, fontWeight: 700 }}>Notifikasi Restock</strong>
        </div>

        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {data.length === 0 && (
            <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '24px 18px', margin: 0 }}>
              Tidak ada notifikasi baru.
            </p>
          )}
          {data.map((n) => (
            <div
              key={n.pesan_notifikasi_id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12, background: '#fde3e3', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e11d48',
              }}
              >
                <AlertTriangleIcon size={20} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>{n.aset_nama}</p>
                <p style={{
                  fontSize: 12, color: '#9ca3af', margin: '4px 0 0',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
                >
                  <span>Stok : <span style={{ color: '#e11d48', fontWeight: 600 }}>{n.stok}</span> tersisa</span>
                  <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#d1d5db', flexShrink: 0 }} />
                  <span>Threshold : {n.threshold_qty}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
