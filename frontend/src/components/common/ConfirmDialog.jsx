// Dipakai untuk konfirmasi aksi berdampak (arsip/pulihkan/hapus) di seluruh halaman kelola data
export default function ConfirmDialog({
  open, title, description, onCancel, onConfirm, confirmLabel = 'Ya', icon, tone = 'primary',
}) {
  if (!open) return null;

  const toneColor = tone === 'danger' ? '#dc2626' : '#155dfc';
  const toneBg = tone === 'danger' ? '#fee2e2' : '#eff6ff';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20,
    }}
    >
      <div style={{
        background: '#fff', borderRadius: 20, padding: '28px 32px', width: 320,
        textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
      }}
      >
        {icon && (
          <div style={{
            width: 56, height: 56, borderRadius: 16, background: toneBg, color: toneColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          }}
          >
            {icon}
          </div>
        )}
        <p style={{ fontWeight: 700, fontSize: 16, margin: '0 0 8px' }}>{title}</p>
        <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, margin: 0 }}>{description}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, background: '#fff', color: '#374151', border: '1px solid #d1d5db',
              borderRadius: 999, padding: '10px 0',
            }}
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, background: '#fff', color: toneColor, border: `1px solid ${toneColor}`,
              borderRadius: 999, padding: '10px 0', fontWeight: 600,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
