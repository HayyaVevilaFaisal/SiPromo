import FormIcon from '../../components/common/FormIcon';
import { BoxIcon } from '../../components/common/icons';
import PageHeader from '../../components/common/PageHeader';
import { PlusIcon } from '../../components/common/icons';

// Form Tambah/Ubah Aset dipakai oleh halaman Kelola Data Aset (FR-03, FR-04, UC-01)
// export default function AsetForm({ editing, form, setForm, levelList, lokasiList, vendorList = [], saving, onCancel, onSubmit, onCreateLokasi, onCreateVendor }) {
export default function AsetForm({ editing, form, setForm, levelList, lokasiList, vendorList = [], saving, onCancel, onSubmit, onCreateLokasi, onCreateVendor, dariPembelian = false, error }) {
  const isEdit = Boolean(editing);
  const hidePurchaseFields = dariPembelian && !isEdit;

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
          <FormIcon icon={BoxIcon} />
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
          {error && <p role="alert" style={{ color: '#dc2626', marginBottom: 16 }}>{error}</p>}
          <div style={{
            background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: 14, padding: 20,
          }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: '#155dfc', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 16 }}>
              Informasi Aset
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <Field label="Nama Aset" required showRequired>
                <input
                  value={form.nama}
                  onChange={(e) => set('nama', e.target.value)}
                  required
                  style={inputStyle}
                />
              </Field>
              <Field label="Level Aset" required showRequired>
                <select
                  value={form.level_aset_id}
                  onChange={(e) => set('level_aset_id', e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Tidak ditentukan</option>
                  {levelList.map((d) => (
                    <option key={d.level_aset_id} value={d.level_aset_id}>{d.nama}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              {!hidePurchaseFields && (
              <Field label={isEdit ? 'Stok' : 'Stok Awal'}>
                <input
                  type="number"
                  min="0"
                  value={form.stok}
                  // onChange={(e) => set('stok', e.target.value)}
                  onChange={(e) => !isEdit && set('stok', e.target.value)}
                  readOnly={isEdit}
                  aria-label={isEdit ? 'Stok' : 'Stok Awal'}
                  // style={inputStyle}
                  style={isEdit ? { ...inputStyle, background: '#f3f4f6', color: '#6b7280' } : inputStyle}
                />
              </Field>
              )}
              <Field label="Threshold" required showRequired>
                <input
                  type="number"
                  min="0"
                  value={form.threshold_qty}
                  onChange={(e) => set('threshold_qty', e.target.value)}
                  required
                  style={inputStyle}
                />
              </Field>
            {/* Pemisah baris lama, dipertahankan untuk penggunaan kembali:
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            */}
              {!hidePurchaseFields && (
              <Field label="Harga Satuan" required>
                <input
                  type="number"
                  min="0"
                  value={form.harga}
                  // onChange={(e) => set('harga', e.target.value)}
                  onChange={(e) => !isEdit && set('harga', e.target.value)}
                  readOnly={isEdit}
                  aria-label="Harga Satuan"
                  required
                  // style={inputStyle}
                  style={isEdit ? { ...inputStyle, background: '#f3f4f6', color: '#6b7280' } : inputStyle}
                />
              </Field>
              )}
              <Field label="Lokasi Penyimpanan" required showRequired>
                <select
                  aria-label="Lokasi Penyimpanan"
                  value={form.lokasi_penyimpanan_id}
                  onChange={(e) => set('lokasi_penyimpanan_id', e.target.value)}
                  required
                  style={inputStyle}
                >
                  <option value="" disabled>Pilih lokasi</option>
{/* Kode lama, dipertahankan untuk penggunaan kembali:
                  {lokasiList
                    .filter((l) => l.is_active || String(l.lokasi_penyimpanan_id) === String(form.lokasi_penyimpanan_id))
                    .map((l) => (
                      <option key={l.lokasi_penyimpanan_id} value={l.lokasi_penyimpanan_id}>
                        {l.nama}{!l.is_active ? ' (Dihapus)' : ''}
                      </option>
                    ))}
*/}
                  {lokasiList.map((l) => (
                    <option key={l.lokasi_penyimpanan_id} value={l.lokasi_penyimpanan_id}>{l.nama}</option>
                  ))}
                </select>
                {!isEdit && onCreateLokasi && (
                  <button type="button" onClick={onCreateLokasi} disabled={saving} style={{
                    display: 'flex', alignItems: 'center', gap: 6, marginTop: 8,
                    background: '#eff6ff', color: '#155dfc', border: '1px solid #bfdbfe',
                    padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 500,
                  }}>
                    <PlusIcon /> Tambah Lokasi Penyimpanan
                  </button>
                )}
              </Field>
            </div>
            {/* Field vendor lama, dipertahankan untuk penggunaan kembali:
            {!isEdit && (
              <div style={{ marginTop: 20 }}>
                <Field label="Vendor">
                  <select aria-label="Vendor" value={form.vendor_id || ''} onChange={(e) => set('vendor_id', e.target.value)} style={inputStyle}>
                    <option value="">Tidak ditentukan</option>
                    {vendorList.map((vendor) => <option key={vendor.vendor_id} value={vendor.vendor_id}>{vendor.nama}</option>)}
                  </select>
                  <button type="button" onClick={onCreateVendor} disabled={saving} style={{
                    display: 'flex', alignItems: 'center', gap: 6, marginTop: 8,
                    background: '#eff6ff', color: '#155dfc', border: '1px solid #bfdbfe',
                    padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 500,
                  }}><PlusIcon /> Tambah Vendor</button>
                </Field>
              </div>
            )}
            */}
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

function Field({ label, required, showRequired = false, children }) {
  return (
    <div>
      <label style={{ display: 'block', marginBottom: 6 }}>
        {label} {showRequired && required && <span style={{ color: '#dc2626' }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '10px 12px', fontSize: 14, borderRadius: 10, border: '1px solid #d1d5db', background: '#fff',
};
