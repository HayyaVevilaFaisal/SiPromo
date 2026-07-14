// Tombol aksi ikon bulat kecil (Ubah/Hapus/Pulihkan dst) dipakai di tabel-tabel kelola data
export default function IconButton({ children, onClick, title, bg, color }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        background: bg, color, width: 32, height: 32, borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
      }}
    >
      {children}
    </button>
  );
}
