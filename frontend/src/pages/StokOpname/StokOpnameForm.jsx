import FormIcon from '../../components/common/FormIcon';
import { StokOpnameIcon } from '../../components/common/icons';
import PageHeader from '../../components/common/PageHeader';

const boxStyle = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' };
const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 10, fontSize: 14, background: '#fff' };

export default function StokOpnameForm({ editing, form, setForm, tahunAjaran, saving, error, onCancel, onSubmit }) {
  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function setStokFisik(asetId, value) {
    setForm((prev) => ({
      ...prev,
      daftar_aset: prev.daftar_aset.map((item) =>
        item.aset_id === asetId ? { ...item, stok_fisik: value } : item
      ),
    }));
  }

  const terisi = form.daftar_aset.filter((item) => item.stok_fisik !== '').length;
  const jumlahSelisih = form.daftar_aset.filter((item) =>
    item.stok_fisik !== '' && Number(item.stok_fisik) !== Number(item.stok_sistem)
  ).length;

  return (
    <div>
      <PageHeader title="Stok Opname" subtitle="Pemeriksaan stok fisik aset promosi" />
      <form onSubmit={onSubmit} style={boxStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 20, borderBottom: '1px solid #e2e8f0' }}>
          <FormIcon icon={StokOpnameIcon} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{editing ? 'Edit Stok Opname' : 'Catat Stok Opname'}</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
              {editing ? 'Koreksi stok fisik hasil pemeriksaan. Stok sistem saat ini akan disesuaikan sebesar perubahan selisih dari catatan sebelumnya.' : 'Isi stok fisik seluruh aset. Setelah disimpan, stok sistem akan disesuaikan dengan selisih hasil pemeriksaan.'}
            </div>
          </div>
        </div>
        <div style={{ padding: 24 }}>
          {error && <p style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 10, padding: 12, marginBottom: 18 }}>{error}</p>}
          <div style={{ background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: 14, padding: 20, marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#155dfc', marginBottom: 16 }}>INFORMASI STOK OPNAME</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Tanggal Pemeriksaan *
                <input type="date" required value={form.tanggal} onChange={(e) => set('tanggal', e.target.value)} style={{ ...inputStyle, marginTop: 6 }} />
              </label>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Tahun Ajaran
                <input disabled value={tahunAjaran ? `${tahunAjaran.semester} ${tahunAjaran.tahun}` : 'Tidak ditemukan'} style={{ ...inputStyle, marginTop: 6, background: '#f3f4f6' }} />
              </label>
              <label style={{ fontSize: 13, fontWeight: 600, gridColumn: '1 / -1' }}>Catatan
                <input value={form.catatan} onChange={(e) => set('catatan', e.target.value)} placeholder="Contoh: Pemeriksaan stok akhir semester" style={{ ...inputStyle, marginTop: 6 }} />
              </label>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>DAFTAR ASET</div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>{terisi}/{form.daftar_aset.length} jenis aset diisi · {jumlahSelisih} jenis aset berselisih</div>
          </div>
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 12 }}>
            <table style={{ width: '100%', minWidth: 650, borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ background: '#f9fafb', color: '#6b7280' }}>
                <tr>
                  {['ASET', 'LOKASI', 'STOK SISTEM SAAT OPNAME', 'STOK FISIK *', 'SELISIH'].map((head) =>
                    <th key={head} style={{ textAlign: head === 'ASET' ? 'left' : 'center', padding: 12, borderBottom: '1px solid #e2e8f0' }}>{head}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {form.daftar_aset.map((item) => {
                  const selisih = item.stok_fisik === '' ? null : Number(item.stok_fisik) - Number(item.stok_sistem);
                  return (
                    <tr key={item.aset_id}>
                      <td style={{ padding: 12, borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>{item.aset_nama}</td>
                      <td style={{ padding: 12, borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>{item.lokasi_nama || '-'}</td>
                      <td style={{ padding: 12, borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>{item.stok_sistem}</td>
                      <td style={{ padding: 8, borderBottom: '1px solid #e2e8f0', width: 140 }}>
                        <input type="number" min="0" step="1" required value={item.stok_fisik} onChange={(e) => setStokFisik(item.aset_id, e.target.value)} placeholder="Isi stok" style={inputStyle} />
                      </td>
                      <td style={{ padding: 12, borderBottom: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 700, color: selisih === 0 ? '#6b7280' : '#d97706' }}>
                        {selisih === null ? '-' : selisih > 0 ? `+${selisih}` : selisih}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 12, color: '#6b7280', marginTop: 12 }}>Stok fisik adalah jumlah hasil hitung langsung dan menjadi acuan stok sistem setelah disimpan. Selisih = stok fisik − stok sistem. Nilai negatif menunjukkan unit hilang; nilai positif menunjukkan unit berlebih.</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: 20, borderTop: '1px solid #e2e8f0' }}>
          <button type="button" onClick={onCancel} disabled={saving} style={{ padding: '10px 18px', borderRadius: 10, background: '#e2e5ea', color: '#374151' }}>Batal</button>
          <button type="submit" disabled={saving || !tahunAjaran || !form.daftar_aset.length} style={{ padding: '10px 18px', borderRadius: 10, background: '#155dfc', color: '#fff', fontWeight: 600 }}>{saving ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Simpan Stok Opname'}</button>
        </div>
      </form>
    </div>
  );
}
