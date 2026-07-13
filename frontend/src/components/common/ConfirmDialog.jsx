// Dipakai untuk konfirmasi arsip/pulihkan data (pola pop-up pada rancangan antarmuka)
export default function ConfirmDialog({ open, title, description, onCancel, onConfirm, confirmLabel = 'Ya' }) {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20,
    }}
    >
      <div style={{ background: '#fff', borderRadius: 8, padding: 24, width: 320, textAlign: 'center' }}>
        <p style={{ fontWeight: 600 }}>{title}</p>
        <p style={{ fontSize: 13, color: '#555' }}>{description}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
          <button onClick={onCancel} style={{ background: '#e2e8f0', color: '#333' }}>Batal</button>
          <button onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
