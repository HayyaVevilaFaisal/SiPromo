import PageHeader from '../../components/common/PageHeader';
import IconButton from '../../components/common/IconButton';
import { PlusIcon, TrashIcon } from '../../components/common/icons';

// Form Catat/Ubah Penggunaan Aset dipakai oleh halaman Pencatatan Penggunaan Aset (FR-10, FR-11, FR-12, UC-06)
export default function PenggunaanAsetForm({
  editing, form, setForm, asetList, tahunAjaran, saving, error, onCancel, onSubmit,
}) {
  const isEdit = Boolean(editing);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function setRow(idx, field, value) {
    setForm((f) => ({
      ...f,
      daftar_aset: f.daftar_aset.map((row, i) => (i === idx ? { ...row, [field]: value } : row)),
    }));
  }

  function addRow() {
    setForm((f) => ({ ...f, daftar_aset: [...f.daftar_aset, { aset_id: '', qty_out: '' }] }));
  }

  function removeRow(idx) {
    setForm((f) => ({ ...f, daftar_aset: f.daftar_aset.filter((_, i) => i !== idx) }));
  }

  const dipilih = form.daftar_aset.filter((row) => row.aset_id).length;

  return (
    <div>
      <PageHeader title="Penggunaan Aset" subtitle="Pencatatan penggunaan aset per kegiatan" />

      <form
        onSubmit={onSubmit}
        style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 20, borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#e2e5ea', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>
              {isEdit ? 'Ubah Penggunaan Aset' : 'Catat Penggunaan Aset'}
            </div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>
              {isEdit
                ? 'Perbarui informasi kegiatan & daftar aset di bawah ini.'
                : 'Isi informasi kegiatan, lalu tambahkan baris aset'}
            </div>
          </div>
        </div>

        <div style={{ padding: 24 }}>
          {error && (
            <p style={{
              background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca',
              borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 16,
            }}
            >
              {error}
            </p>
          )}

          <div style={{
            background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: 14, padding: 20, marginBottom: 20,
          }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: '#155dfc', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 16 }}>
              Informasi Kegiatan
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <Field label="Kegiatan" required>
                <input
                  value={form.nama}
                  onChange={(e) => set('nama', e.target.value)}
                  placeholder="Nama kegiatan, mis. Workshop Web Dev"
                  required
                  style={inputStyle}
                />
              </Field>
              <Field label="Tanggal Kegiatan" required>
                <input
                  type="date"
                  value={form.tanggal}
                  onChange={(e) => set('tanggal', e.target.value)}
                  required
                  style={inputStyle}
                />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <Field label="Tahun Ajaran">
                <input
                  value={tahunAjaran ? `${tahunAjaran.semester} ${tahunAjaran.tahun}` : (form.tanggal ? 'Tidak ditemukan' : '-')}
                  disabled
                  title="Otomatis mengikuti Tanggal Kegiatan"
                  style={{
                    ...inputStyle,
                    background: '#f3f4f6',
                    color: tahunAjaran ? '#6b7280' : (form.tanggal ? '#dc2626' : '#6b7280'),
                  }}
                />
                {form.tanggal && !tahunAjaran && (
                  <p style={{ fontSize: 12, color: '#dc2626', margin: '6px 0 0' }}>
                    Belum ada tahun ajaran untuk tanggal ini. Tambahkan dulu di menu Tahun Ajaran.
                  </p>
                )}
              </Field>
              <Field label="Catatan">
                <input
                  value={form.catatan}
                  onChange={(e) => set('catatan', e.target.value)}
                  placeholder="Tidak ada"
                  style={inputStyle}
                />
              </Field>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                Daftar Aset
              </div>
              <button
                type="button"
                onClick={addRow}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, background: '#fff', color: '#374151',
                  border: '1px solid #d1d5db', padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 500,
                }}
              >
                <PlusIcon /> Tambah Daftar Aset
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 40px', gap: 12, marginBottom: 8, padding: '0 2px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.3 }}>Aset</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.3 }}>Qty</div>
              <div />
            </div>

            {form.daftar_aset.length === 0 ? (
              <p style={{ fontSize: 13, color: '#6b7280', padding: '16px 0' }}>Belum ada aset ditambahkan.</p>
            ) : (
              form.daftar_aset.map((row, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 40px', gap: 12, marginBottom: 10, alignItems: 'center' }}>
                  <select
                    value={row.aset_id}
                    onChange={(e) => setRow(idx, 'aset_id', e.target.value)}
                    required
                    style={inputStyle}
                  >
                    <option value="" disabled>Pilih aset</option>
                    {asetList.map((a) => (
                      <option key={a.aset_id} value={a.aset_id}>
                        {a.nama} (stok {a.stok})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={row.qty_out}
                    onChange={(e) => setRow(idx, 'qty_out', e.target.value)}
                    required
                    style={inputStyle}
                  />
                  <IconButton title="Hapus baris" bg="#fee2e2" color="#dc2626" onClick={() => removeRow(idx)}>
                    <TrashIcon />
                  </IconButton>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: 13, color: '#6b7280' }}>{dipilih} Aset dipilih</span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onCancel} style={{ background: '#e2e8f0', color: '#374151', padding: '10px 20px', borderRadius: 10 }}>
              Batal
            </button>
            <button type="submit" disabled={saving} style={{ background: '#155dfc', padding: '10px 20px', borderRadius: 10, fontWeight: 600 }}>
              {saving ? 'Menyimpan...' : 'Simpan Pencatatan'}
            </button>
          </div>
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
