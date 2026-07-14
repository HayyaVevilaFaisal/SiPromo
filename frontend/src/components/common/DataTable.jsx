// Sel header/isi tabel bergaya seragam dipakai di halaman-halaman kelola data
export function Th({ children }) {
  return <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.3 }}>{children}</th>;
}

export function Td({ children }) {
  return <td style={{ padding: '14px 16px', fontSize: 14, borderTop: '1px solid #f1f5f9', color: '#111827' }}>{children}</td>;
}
