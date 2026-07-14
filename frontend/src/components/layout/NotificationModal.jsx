// UC-05 - Modal Notifikasi Restock
export default function NotificationModal({ data, onClose }) {
  return (
    <div style={{
      position: 'absolute', top: 54, right: 24, background: '#fff',
      border: '1px solid #e2e8f0', borderRadius: 14, padding: 16, width: 320,
      boxShadow: '0 12px 30px rgba(0,0,0,0.12)', zIndex: 10,
    }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <strong>Notifikasi Restock</strong>
        <button onClick={onClose} style={{ background: 'transparent', color: '#333' }}>x</button>
      </div>
      {data.length === 0 && <p style={{ fontSize: 13 }}>Tidak ada notifikasi baru.</p>}
      {data.map((n) => (
        <div key={n.pesan_notifikasi_id} style={{ padding: '8px 0', borderBottom: '1px solid #f1f1f1', fontSize: 13 }}>
          {n.pesan}
        </div>
      ))}
    </div>
  );
}
