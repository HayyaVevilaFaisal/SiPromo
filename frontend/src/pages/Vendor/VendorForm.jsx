import PageHeader from '../../components/common/PageHeader';

// Form Tambah/Ubah Vendor dipakai oleh halaman Kelola Data Vendor (FR-05, UC-03)
export default function VendorForm({ editing, form, setForm, saving, onCancel, onSubmit }) {
  const isEdit = Boolean(editing);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  return (
    <div>
      <PageHeader title="Kelola Data Vendor" subtitle="Data vendor aset promosi" />

      <form
        onSubmit={onSubmit}
        style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 20, borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#e2e5ea', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>
              {isEdit ? 'Ubah Vendor' : 'Tambah Vendor Baru'}
            </div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>
              {isEdit
                ? 'Perbarui informasi vendor di bawah ini.'
                : 'Isi informasi vendor dibawah ini untuk menambahkan vendor baru'}
            </div>
          </div>
        </div>

        <div style={{ padding: 24 }}>
          <div style={{
            background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: 14, padding: 20,
          }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: '#155dfc', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 16 }}>
              Informasi Vendor
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <Field label="Nama Vendor" required>
                <input
                  value={form.nama}
                  onChange={(e) => set('nama', e.target.value)}
                  required
                  style={inputStyle}
                />
              </Field>
              <Field label="Alamat" required>
                <input
                  value={form.alamat}
                  onChange={(e) => set('alamat', e.target.value)}
                  placeholder="Alamat fisik atau tautan toko daring"
                  required
                  style={inputStyle}
                />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <Field label="No.HP">
                <input
                  value={form.nomor_handphone}
                  onChange={(e) => set('nomor_handphone', e.target.value)}
                  style={inputStyle}
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  style={inputStyle}
                />
              </Field>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: '1px solid #e2e8f0' }}>
          <button type="button" onClick={onCancel} style={{ background: '#e2e8f0', color: '#374151', padding: '10px 20px', borderRadius: 10 }}>
            Batal
          </button>
          <button type="submit" disabled={saving} style={{ background: '#155dfc', padding: '10px 20px', borderRadius: 10, fontWeight: 600 }}>
            {saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Simpan Vendor'}
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
