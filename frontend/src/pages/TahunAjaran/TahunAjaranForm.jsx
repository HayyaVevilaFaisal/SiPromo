import FormIcon from '../../components/common/FormIcon';
import { CalendarIcon } from '../../components/common/icons';
import PageHeader from '../../components/common/PageHeader';
// import { deriveTahun } from './deriveTahun';
import { dateLimits } from './semesterDates';

// Form Tambah/Ubah Tahun Ajaran dipakai oleh halaman Kelola Tahun Ajaran (FR-07, UC-04)
export default function TahunAjaranForm({ editing, form, setForm, saving, error, onCancel, onSubmit }) {
  const isEdit = Boolean(editing);
  // const tahun = deriveTahun(form.tanggal_mulai, form.tanggal_selesai, form.semester);
  const limits = dateLimits(form.tanggal_mulai);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  return (
    <div>
      <PageHeader title="Kelola Tahun Ajaran" subtitle="Data tahun ajaran aset promosi" />

      <form
        onSubmit={onSubmit}
        style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 20, borderBottom: '1px solid #e2e8f0' }}>
          <FormIcon icon={CalendarIcon} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>
              {isEdit ? 'Ubah Tahun Ajaran' : 'Tambah Tahun Ajaran Baru'}
            </div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>
              {isEdit
                ? 'Perbarui informasi tahun ajaran di bawah ini.'
                : 'Isi informasi tahun ajaran dibawah ini untuk menambahkan tahun ajaran baru'}
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
            background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: 14, padding: 20,
          }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: '#155dfc', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 16 }}>
              Informasi Tahun Ajaran
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              {/* Kode lama: tahun mengikuti tanggal dan semester.
              <Field label="Tahun">
                <input
                  value={tahun || '-'}
                  disabled
                  title="Otomatis mengikuti Tanggal Mulai & Semester"
                  style={{ ...inputStyle, background: '#f3f4f6', color: '#6b7280' }}
                />
              </Field>
              */}
              <Field label="Tahun Awal" required>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  value={form.tahun_awal || ''}
                  onChange={(e) => set('tahun_awal', e.target.value)}
                  placeholder="Contoh: 2026"
                  aria-label="Tahun Awal"
                  aria-describedby="tahun-awal-info"
                  required
                  style={inputStyle}
                />
                <p id="tahun-awal-info" style={{ fontSize: 13, color: '#6b7280', margin: '8px 0 0' }}>
                  Masukkan satu tahun awal, contoh: 2026. Tahun ajaran akan disimpan sebagai 2026/2027; tahun akhir adalah tahun awal + 1.
                </p>
              </Field>
              {/* <Field label="Semester (Ganjil/Genap)" required> */}
              <Field label="Semester (SP/Ganjil/Genap)" required>
                <select
                  value={form.semester}
                  onChange={(e) => set('semester', e.target.value)}
                  required
                  style={inputStyle}
                >
                  <option value="SP">SP</option>
                  <option value="Ganjil">Ganjil</option>
                  <option value="Genap">Genap</option>
                </select>
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <Field label="Tanggal Mulai Semester" required>
                <input
                  type="date"
                  min={/^[1-9][0-9]{3}$/.test(form.tahun_awal || '') ? `${form.tahun_awal}-01-01` : undefined}
                  value={form.tanggal_mulai || ''}
                  onChange={(e) => set('tanggal_mulai', e.target.value)}
                  required
                  style={inputStyle}
                />
              </Field>
              <Field label="Tanggal Selesai Semester" required>
                <input
                  type="date"
                  value={form.tanggal_selesai || ''}
                  min={limits.min}
                  max={limits.max}
                  onChange={(e) => set('tanggal_selesai', e.target.value)}
                  required
                  style={inputStyle}
                />
              </Field>
            </div>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 0 }}>Tanggal mulai tidak boleh sebelum tahun awal. Tanggal selesai harus setelah tanggal mulai. Durasi semester maksimal 7 bulan kalender.</p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: '1px solid #e2e8f0' }}>
          <button type="button" onClick={onCancel} style={{ background: '#e2e8f0', color: '#374151', padding: '10px 20px', borderRadius: 10 }}>
            Batal
          </button>
          <button type="submit" disabled={saving} style={{ background: '#155dfc', padding: '10px 20px', borderRadius: 10, fontWeight: 600 }}>
            {saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Simpan Tahun Ajaran'}
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
