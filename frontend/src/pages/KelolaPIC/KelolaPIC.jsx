import { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import PageHeader from '../../components/common/PageHeader';
import { EditIcon, UsersIcon } from '../../components/common/icons';
import './KelolaPIC.css';

const empty = { nama_lengkap: '', email: '', is_active: true };
export default function KelolaPIC() {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    axiosClient.get('/pic').then(({ data }) => { if (active) setItems(data); })
      .catch(err => { if (active) setError(err.response?.data?.message || 'Daftar PIC gagal dimuat.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);
  function open(item) {
    setEditing(item?.pengguna_id ?? null);
    setForm(item ? { nama_lengkap: item.nama_lengkap, email: item.email, is_active: item.is_active } : { ...empty });
    setError(''); setSuccess('');
  }
  async function save(event) {
    event.preventDefault(); setSaving(true); setError('');
    const payload = { ...form, nama_lengkap: form.nama_lengkap.trim(), email: form.email.trim().toLowerCase() };
    try {
      const { data } = editing ? await axiosClient.patch(`/pic/${editing}`, payload) : await axiosClient.post('/pic', payload);
      setItems(current => editing ? current.map(row => row.pengguna_id === editing ? data : row) : [...current, data]);
      setForm(null); setEditing(null); setSuccess('Data PIC berhasil disimpan. PIC aktif dapat masuk menggunakan Google.');
    } catch (err) { setError(err.response?.data?.message || 'Data PIC gagal disimpan. Silakan coba kembali.'); }
    finally { setSaving(false); }
  }
  const filtered = items.filter(item => `${item.nama_lengkap} ${item.email}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <div>
    <PageHeader title="Kelola PIC Promosi" subtitle="Pengelolaan akses PIC Promosi" />
    <div className="pic-page">
    {success && <p role="status" className="pic-success">{success}</p>}
    {error && <div role="alert" className="pic-error">{error} {!form && <button onClick={() => setReload(value => value + 1)}>Coba lagi</button>}</div>}
    {form ? <form onSubmit={save} className="pic-card">
      <div className="pic-form-heading"><span className="pic-avatar" aria-hidden="true"><UsersIcon size={24} /></span><div><h2>{editing ? 'Edit PIC Promosi' : 'Tambah PIC Baru'}</h2><p>{editing ? 'Perbarui informasi dan akses PIC promosi.' : 'Isi informasi di bawah ini untuk menambahkan PIC baru'}</p></div></div>
      <div className="pic-form-body"><h3>INFORMASI PIC PROMOSI</h3><div className="pic-fields">
        <label htmlFor="pic-nama">Nama <span>*</span><input id="pic-nama" autoFocus required maxLength={150} value={form.nama_lengkap} onChange={e => setForm({ ...form, nama_lengkap: e.target.value })} /></label>
        <label htmlFor="pic-email">Email <span>*</span><input id="pic-email" type="email" required maxLength={255} placeholder="nama@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /><small>Gunakan alamat email PIC.</small></label>
        <label htmlFor="pic-status" className="pic-status-field">Status Aktif <span>*</span><select id="pic-status" value={String(form.is_active)} onChange={e => setForm({ ...form, is_active: e.target.value === 'true' })}><option value="true">Aktif</option><option value="false">Nonaktif</option></select></label>
      </div></div>
      <div className="pic-actions"><button type="button" className="pic-secondary" disabled={saving} onClick={() => { setForm(null); setError(''); }}>Batal</button><button disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button></div>
    </form> : <section className="pic-card" aria-label="Daftar PIC Promosi">
      <div className="pic-toolbar"><input type="search" aria-label="Cari PIC" placeholder="Cari nama atau email PIC..." value={query} onChange={e => setQuery(e.target.value)} /><button onClick={() => open(null)}>＋ Daftarkan PIC</button></div>
      <div className="pic-table-wrap"><table><thead><tr><th>NAMA</th><th>EMAIL</th><th>STATUS</th><th>AKSI</th></tr></thead><tbody>
        {loading ? <tr><td colSpan={4} role="status">Memuat PIC...</td></tr> : filtered.map(item => <tr key={item.pengguna_id}><td>{item.nama_lengkap}</td><td>{item.email}</td><td><span className={`pic-badge ${item.is_active ? '' : 'inactive'}`}>{item.is_active ? 'Aktif' : 'Nonaktif'}</span></td><td><button className="pic-edit" aria-label={`Edit ${item.nama_lengkap}`} onClick={() => open(item)}><EditIcon /></button></td></tr>)}
        {!loading && filtered.length === 0 && <tr><td colSpan={4}>{query ? 'PIC tidak ditemukan.' : 'Belum ada PIC terdaftar.'}</td></tr>}
      </tbody></table></div>
    </section>}
    </div>
  </div>;
}
