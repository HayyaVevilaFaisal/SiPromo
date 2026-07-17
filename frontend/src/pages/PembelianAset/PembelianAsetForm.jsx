import { useRef } from 'react';
import PageHeader from '../../components/common/PageHeader';
import IconButton from '../../components/common/IconButton';
import { PlusIcon, TrashIcon, UploadIcon } from '../../components/common/icons';

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_SIZE = 5 * 1024 * 1024;

function formatRupiah(value) {
  return `Rp${Number(value || 0).toLocaleString('id-ID')}`;
}

// Form Catat/Ubah Pembelian Aset dipakai oleh halaman Pencatatan Pembelian Aset (FR-13..FR-17, UC-07)
export default function PembelianAsetForm({
  editing, form, setForm, vendorList, asetList, tahunAjaran, saving, error, onCancel, onSubmit,
}) {
  const isEdit = Boolean(editing);
  const fileInputRef = useRef(null);

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
    setForm((f) => ({ ...f, daftar_aset: [...f.daftar_aset, { aset_id: '', qty_in: '' }] }));
  }

  function hargaAset(asetId) {
    const aset = asetList.find((a) => String(a.aset_id) === String(asetId));
    return aset ? Number(aset.harga) : null;
  }

  function removeRow(idx) {
    setForm((f) => ({ ...f, daftar_aset: f.daftar_aset.filter((_, i) => i !== idx) }));
  }

  function pickFile(file) {
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      set('fileError', 'Tipe file tidak didukung. Gunakan PDF, JPG, atau PNG.');
      return;
    }
    if (file.size > MAX_SIZE) {
      set('fileError', 'Ukuran file maksimal 5 MB.');
      return;
    }
    setForm((f) => ({ ...f, bonFile: file, fileError: '' }));
  }

  function handleDrop(e) {
    e.preventDefault();
    pickFile(e.dataTransfer.files?.[0]);
  }

  const dipilih = form.daftar_aset.filter((row) => row.aset_id).length;
  const totalNilai = form.daftar_aset.reduce(
    (sum, row) => sum + (Number(row.qty_in) || 0) * (hargaAset(row.aset_id) || 0),
    0
  );

  return (
    <div>
      <PageHeader title="Pembelian Aset" subtitle="Pencatatan pembelian dari vendor" />

      <form
        onSubmit={onSubmit}
        style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 20, borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#e2e5ea', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>
              {isEdit ? 'Ubah Pembelian Aset' : 'Catat Pembelian Aset'}
            </div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>
              {isEdit
                ? 'Perbarui informasi pembelian & daftar aset di bawah ini.'
                : 'Isi informasi pembelian, lalu tambahkan baris aset'}
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
              Informasi Pembelian
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <Field label="Vendor" required>
                <select
                  value={form.vendor_id}
                  onChange={(e) => set('vendor_id', e.target.value)}
                  required
                  style={inputStyle}
                >
                  <option value="" disabled>Pilih vendor</option>
                  {vendorList.map((v) => (
                    <option key={v.vendor_id} value={v.vendor_id}>{v.nama}</option>
                  ))}
                </select>
              </Field>
              <Field label="Tanggal Pembelian" required>
                <input
                  type="date"
                  value={form.tanggal}
                  onChange={(e) => set('tanggal', e.target.value)}
                  required
                  style={inputStyle}
                />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <Field label="Status Pembelian" required>
                <select
                  value={form.status}
                  onChange={(e) => set('status', e.target.value)}
                  required
                  style={inputStyle}
                >
                  <option value="Belum Bayar">Belum Bayar</option>
                  <option value="DP">DP</option>
                  <option value="Lunas">Lunas</option>
                </select>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <Field label="Tahun Ajaran">
                <input
                  value={tahunAjaran ? `${tahunAjaran.semester} ${tahunAjaran.tahun}` : (form.tanggal ? 'Tidak ditemukan' : '-')}
                  disabled
                  title="Otomatis mengikuti Tanggal Pembelian"
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
              <div />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 12 }}>
              Upload Bon/Bukti Pembelian
            </div>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              style={{
                border: '2px dashed #d1d5db', borderRadius: 12, padding: '32px 20px', textAlign: 'center',
                cursor: 'pointer', background: '#fafafa',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                style={{ display: 'none' }}
                onChange={(e) => pickFile(e.target.files?.[0])}
              />
              <div style={{
                width: 44, height: 44, borderRadius: 10, background: '#eef2ff', color: '#4338ca',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
              }}
              >
                <UploadIcon />
              </div>
              {form.bonFile ? (
                <p style={{ fontSize: 14, color: '#111827', fontWeight: 500 }}>{form.bonFile.name}</p>
              ) : form.nama_file ? (
                <p style={{ fontSize: 14, color: '#111827' }}>
                  File saat ini: <span style={{ fontWeight: 500 }}>{form.nama_file}</span> — klik untuk mengganti
                </p>
              ) : (
                <>
                  <p style={{ fontSize: 14, color: '#374151' }}>Klik atau drag &amp; drop file bon pembelian</p>
                  <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>PDF, JPG, PNG - maks. 5 MB</p>
                </>
              )}
            </div>
            {form.fileError && (
              <p style={{ fontSize: 12, color: '#dc2626', margin: '6px 0 0' }}>{form.fileError}</p>
            )}
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 140px 40px', gap: 12, marginBottom: 8, padding: '0 2px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.3 }}>Aset</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.3 }}>Qty Masuk</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.3 }}>Harga Satuan</div>
              <div />
            </div>

            {form.daftar_aset.length === 0 ? (
              <p style={{ fontSize: 13, color: '#6b7280', padding: '16px 0' }}>Belum ada aset ditambahkan.</p>
            ) : (
              form.daftar_aset.map((row, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 140px 40px', gap: 12, marginBottom: 10, alignItems: 'center' }}>
                  <select
                    value={row.aset_id}
                    onChange={(e) => setRow(idx, 'aset_id', e.target.value)}
                    required
                    style={inputStyle}
                  >
                    <option value="" disabled>Pilih aset</option>
                    {asetList.map((a) => (
                      <option key={a.aset_id} value={a.aset_id}>{a.nama}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={row.qty_in}
                    onChange={(e) => setRow(idx, 'qty_in', e.target.value)}
                    required
                    style={inputStyle}
                  />
                  <input
                    value={row.aset_id ? formatRupiah(hargaAset(row.aset_id)) : '-'}
                    disabled
                    title="Otomatis mengikuti harga aset"
                    style={{ ...inputStyle, background: '#f3f4f6', color: '#6b7280' }}
                  />
                  <IconButton title="Hapus baris" bg="#fee2e2" color="#dc2626" onClick={() => removeRow(idx)}>
                    <TrashIcon />
                  </IconButton>
                </div>
              ))
            )}

            <div style={{
              background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: 10, padding: '14px 18px',
              marginTop: 16, display: 'flex', justifyContent: 'flex-end',
            }}
            >
              <span style={{ fontSize: 14, fontWeight: 700, color: '#155dfc' }}>
                TOTAL NILAI : {formatRupiah(totalNilai)}
              </span>
            </div>
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
