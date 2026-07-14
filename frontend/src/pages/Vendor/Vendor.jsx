import { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import PageHeader from '../../components/common/PageHeader';
import IconButton from '../../components/common/IconButton';
import { Th, Td } from '../../components/common/DataTable';
import { SearchIcon, PlusIcon, EditIcon, TrashIcon } from '../../components/common/icons';
import VendorForm from './VendorForm';

const emptyForm = { nama: '', alamat: '', nomor_handphone: '', email: '' };

function isUrl(value) {
  return /^https?:\/\//i.test(value || '');
}

// FR-05, UC-03 - Kelola Data Vendor
export default function Vendor() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('aktif');
  const [view, setView] = useState('list'); // 'list' | 'form'
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);

  async function fetchData(params = {}) {
    setLoading(true);
    const res = await axiosClient.get('/vendor', { params: { search, status, ...params } });
    setData(res.data);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function openCreateForm() {
    setEditing(null);
    setForm(emptyForm);
    setView('form');
  }

  function openEditForm(row) {
    setEditing(row);
    setForm({
      nama: row.nama,
      alamat: row.alamat,
      nomor_handphone: row.nomor_handphone ?? '',
      email: row.email ?? '',
    });
    setView('form');
  }

  function closeForm() {
    setView('list');
    setEditing(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await axiosClient.put(`/vendor/${editing.vendor_id}`, form);
      } else {
        await axiosClient.post('/vendor', form);
      }
      closeForm();
      fetchData();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmTarget) return;
    await axiosClient.patch(`/vendor/${confirmTarget.vendor_id}/arsip`);
    setConfirmTarget(null);
    fetchData();
  }

  function handleStatusChange(value) {
    setStatus(value);
    fetchData({ status: value });
  }

  if (view === 'form') {
    return (
      <VendorForm
        editing={editing}
        form={form}
        setForm={setForm}
        saving={saving}
        onCancel={closeForm}
        onSubmit={handleSubmit}
      />
    );
  }

  return (
    <div>
      <PageHeader title="Kelola Data Vendor" subtitle="Data vendor aset promosi" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <SearchIcon style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            placeholder="Cari vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchData()}
            style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            style={{
              background: '#fff', color: '#374151', border: '1px solid #d1d5db',
              padding: '10px 16px', borderRadius: 10, fontSize: 14, fontWeight: 500,
            }}
          >
            <option value="">Semua Status</option>
            <option value="aktif">Aktif</option>
            <option value="arsip">Terhapus</option>
          </select>

          <button
            type="button"
            onClick={openCreateForm}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, background: '#155dfc',
              padding: '10px 18px', borderRadius: 10, fontSize: 14, fontWeight: 600,
            }}
          >
            <PlusIcon /> Tambah Vendor
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <Th>Nama Vendor</Th>
                <Th>Alamat</Th>
                <Th>No.HP</Th>
                <Th>Email</Th>
                <Th>Aksi</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>Memuat data...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>Belum ada data.</td></tr>
              ) : (
                data.map((row) => (
                  <tr key={row.vendor_id}>
                    <Td>{row.nama}</Td>
                    <Td>
                      {isUrl(row.alamat) ? (
                        <a href={row.alamat} target="_blank" rel="noreferrer" style={{ color: '#155dfc' }}>
                          {row.alamat}
                        </a>
                      ) : row.alamat}
                    </Td>
                    <Td>{row.nomor_handphone || '-'}</Td>
                    <Td>{row.email || '-'}</Td>
                    <Td>
                      {row.is_active ? (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <IconButton title="Ubah" bg="#eef2ff" color="#4338ca" onClick={() => openEditForm(row)}>
                            <EditIcon />
                          </IconButton>
                          <IconButton title="Hapus" bg="#fee2e2" color="#dc2626" onClick={() => setConfirmTarget(row)}>
                            <TrashIcon />
                          </IconButton>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: '#9ca3af' }}>Terhapus</span>
                      )}
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmTarget}
        icon={<TrashIcon size={22} />}
        tone="danger"
        title="Hapus vendor ini?"
        description={`"${confirmTarget?.nama}" akan dihapus dan tidak akan muncul lagi di daftar aktif. Data tetap tersimpan di sistem demi menjaga keakuratan laporan, namun tidak dapat dipulihkan lagi melalui halaman ini.`}
        onCancel={() => setConfirmTarget(null)}
        onConfirm={handleDelete}
        confirmLabel="Ya, Hapus"
      />
    </div>
  );
}
