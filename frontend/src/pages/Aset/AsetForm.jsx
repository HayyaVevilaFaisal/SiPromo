import PageHeader from '../../components/common/PageHeader';

// Form Tambah/Ubah Aset dipakai oleh halaman Kelola Data Aset (FR-03, FR-04, UC-01)
export default function AsetForm({ editing, form, setForm, dimensiList, lokasiList, saving, onCancel, onSubmit }) {
  const isEdit = Boolean(editing);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  return (
    <div>
      <PageHeader title="Kelola Data Aset" subtitle="Data aset promosi" />

      <form
        onSubmit={onSubmit}
        style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 20, borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#e2e5ea', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>
              {isEdit ? 'Ubah Aset' : 'Tambah Aset Baru'}
            </div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>
              {isEdit
                ? 'Perbarui informasi aset di bawah ini.'
                : 'Isi informasi aset dibawah ini untuk menambahkan aset baru'}
            </div>
          </div>
        </div>

        <div style={{ padding: 24 }}>
          <div style={{
            background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: 14, padding: 20,
          }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: '#155dfc', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 16 }}>
              Informasi Aset
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <Field label="Nama Aset" required>
                <input
                  value={form.nama}
                  onChange={(e) => set('nama', e.target.value)}
                  required
                  style={inputStyle}
                />
              </Field>
              <Field label="Dimensi">
                <select
                  value={form.dimensi_aset_id}
                  onChange={(e) => set('dimensi_aset_id', e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Tidak ditentukan</option>
                  {dimensiList.map((d) => (
                    <option key={d.dimensi_aset_id} value={d.dimensi_aset_id}>{d.nama}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <Field label="Stok Awal">
                <input
                  type="number"
                  min="0"
                  value={form.stok}
                  onChange={(e) => set('stok', e.target.value)}
                  style={inputStyle}
                />
              </Field>
              <Field label="Threshold" required>
                <input
                  type="number"
                  min="0"
                  value={form.threshold_qty}
                  onChange={(e) => set('threshold_qty', e.target.value)}
                  required
                  style={inputStyle}
                />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <Field label="Harga Satuan" required>
                <input
                  type="number"
                  min="0"
                  value={form.harga}
                  onChange={(e) => set('harga', e.target.value)}
                  required
                  style={inputStyle}
                />
              </Field>
              <Field label="Lokasi Penyimpanan" required>
                <select
                  value={form.lokasi_penyimpanan_id}
                  onChange={(e) => set('lokasi_penyimpanan_id', e.target.value)}
                  required
                  style={inputStyle}
                >
                  <option value="" disabled>Pilih lokasi</option>
                  {lokasiList
                    .filter((l) => l.is_active || String(l.lokasi_penyimpanan_id) === String(form.lokasi_penyimpanan_id))
                    .map((l) => (
                      <option key={l.lokasi_penyimpanan_id} value={l.lokasi_penyimpanan_id}>
                        {l.nama}{!l.is_active ? ' (Dihapus)' : ''}
                      </option>
                    ))}
                </select>
              </Field>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: '1px solid #e2e8f0' }}>
          <button type="button" onClick={onCancel} style={{ background: '#e2e8f0', color: '#374151', padding: '10px 20px', borderRadius: 10 }}>
            Batal
          </button>
          <button type="submit" disabled={saving} style={{ background: '#155dfc', padding: '10px 20px', borderRadius: 10, fontWeight: 600 }}>
            {saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Simpan Aset'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label style={{ display: 'block', marginBottom: 6 }}>
        {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '10px 12px', fontSize: 14, borderRadius: 10, border: '1px solid #d1d5db', background: '#fff',
};
