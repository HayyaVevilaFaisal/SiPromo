import { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import PageHeader from '../../components/common/PageHeader';
import IconButton from '../../components/common/IconButton';
import { Th, Td } from '../../components/common/DataTable';
import {
  SearchIcon, PlusIcon, EditIcon, TrashIcon, CalendarIcon,
} from '../../components/common/icons';
import PenggunaanAsetForm from './PenggunaanAsetForm';

const emptyForm = {
  nama: '', tanggal: '', catatan: '', daftar_aset: [{ aset_id: '', qty_out: '' }],
};

function formatTanggal(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function toDateInputValue(value) {
  if (!value) return '';
  const d = new Date(value);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function toLocalDateOnly(value) {
  if (!value) return null;
  const d = new Date(value);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseDateInputValue(value) {
  if (!value) return null;
  const [yyyy, mm, dd] = value.split('-').map(Number);
  return new Date(yyyy, mm - 1, dd);
}

// Tahun ajaran tidak lagi dipilih manual di form - diturunkan dari Tanggal Kegiatan,
// mengikuti rentang tanggal_mulai..tanggal_selesai tahun ajaran yang sudah dibuat lebih dulu.
function findTahunAjaran(tanggal, tahunAjaranList) {
  const target = parseDateInputValue(tanggal);
  if (!target) return null;
  return tahunAjaranList.find((ta) => {
    const mulai = toLocalDateOnly(ta.tanggal_mulai);
    const selesai = toLocalDateOnly(ta.tanggal_selesai);
    return mulai && selesai && target >= mulai && target <= selesai;
  }) || null;
}

// FR-10, FR-11, FR-12, UC-06 - Kelola Pencatatan Penggunaan Aset
export default function PenggunaanAset() {
  const [data, setData] = useState([]);
  const [tahunAjaranList, setTahunAjaranList] = useState([]);
  const [asetList, setAsetList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('aktif');
  const [tahunAjaranId, setTahunAjaranId] = useState('');
  const [view, setView] = useState('list'); // 'list' | 'form'
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [error, setError] = useState('');

  async function fetchData(params = {}) {
    setLoading(true);
    setError('');
    try {
      const res = await axiosClient.get('/penggunaan-aset', { params: { search, status, tahunAjaranId, ...params } });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat data penggunaan aset. Pastikan server backend aktif.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    axiosClient.get('/tahun-ajaran', { params: { status: 'aktif' } }).then((res) => setTahunAjaranList(res.data)).catch(() => {});
    axiosClient.get('/aset', { params: { status: 'aktif' } }).then((res) => setAsetList(res.data)).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function openCreateForm() {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setView('form');
  }

  function openEditForm(row) {
    setEditing(row);
    setForm({
      nama: row.nama,
      tanggal: toDateInputValue(row.tanggal),
      catatan: row.catatan ?? '',
      daftar_aset: row.daftar_aset.length > 0
        ? row.daftar_aset.map((item) => ({ aset_id: item.aset_id, qty_out: item.qty_out }))
        : [{ aset_id: '', qty_out: '' }],
    });
    setError('');
    setView('form');
  }

  function closeForm() {
    setView('list');
    setEditing(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const daftar_aset = form.daftar_aset
      .filter((row) => row.aset_id && row.qty_out)
      .map((row) => ({ aset_id: Number(row.aset_id), qty_out: Number(row.qty_out) }));

    if (daftar_aset.length === 0) {
      setError('Tambahkan minimal satu aset dengan jumlah yang valid.');
      return;
    }

    const tahunAjaran = findTahunAjaran(form.tanggal, tahunAjaranList);
    if (!tahunAjaran) {
      setError('Tidak ditemukan tahun ajaran untuk tanggal kegiatan ini. Tambahkan tahun ajaran yang sesuai terlebih dahulu di menu Tahun Ajaran.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        tahun_ajaran_id: tahunAjaran.tahun_ajaran_id,
        nama: form.nama,
        tanggal: form.tanggal,
        catatan: form.catatan,
        daftar_aset,
      };
      if (editing) {
        await axiosClient.put(`/penggunaan-aset/${editing.kegiatan_id}`, payload);
      } else {
        await axiosClient.post('/penggunaan-aset', payload);
      }
      closeForm();
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan pencatatan penggunaan.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmTarget) return;
    setError('');
    try {
      await axiosClient.patch(`/penggunaan-aset/${confirmTarget.kegiatan_id}/arsip`);
      setConfirmTarget(null);
      fetchData();
    } catch (err) {
      setConfirmTarget(null);
      setError(err.response?.data?.message || 'Gagal menghapus catatan penggunaan.');
    }
  }

  function handleTahunAjaranChange(value) {
    setTahunAjaranId(value);
    fetchData({ tahunAjaranId: value });
  }

  function handleStatusChange(value) {
    setStatus(value);
    fetchData({ status: value });
  }

  if (view === 'form') {
    return (
      <PenggunaanAsetForm
        editing={editing}
        form={form}
        setForm={setForm}
        asetList={asetList}
        tahunAjaran={findTahunAjaran(form.tanggal, tahunAjaranList)}
        saving={saving}
        error={error}
        onCancel={closeForm}
        onSubmit={handleSubmit}
      />
    );
  }

  return (
    <div>
      <PageHeader title="Penggunaan Aset" subtitle="Pencatatan penggunaan aset per kegiatan" />

      {error && (
        <p style={{
          background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca',
          borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 16,
        }}
        >
          {error}
        </p>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <SearchIcon style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            placeholder="Cari catatan penggunaan..."
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

          <select
            value={tahunAjaranId}
            onChange={(e) => handleTahunAjaranChange(e.target.value)}
            style={{
              background: '#fff', color: '#374151', border: '1px solid #d1d5db',
              padding: '10px 16px', borderRadius: 10, fontSize: 14, fontWeight: 500,
            }}
          >
            <option value="">Semua Tahun Ajaran</option>
            {tahunAjaranList.map((ta) => (
              <option key={ta.tahun_ajaran_id} value={ta.tahun_ajaran_id}>{ta.semester} {ta.tahun}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={openCreateForm}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, background: '#155dfc',
              padding: '10px 18px', borderRadius: 10, fontSize: 14, fontWeight: 600,
            }}
          >
            <PlusIcon /> Tambah Catatan Penggunaan
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 24, textAlign: 'center', color: '#6b7280' }}>
          Memuat data...
        </div>
      ) : data.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 24, textAlign: 'center', color: '#6b7280' }}>
          Belum ada data.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {data.map((row) => (
            <div key={row.kegiatan_id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                padding: 20, borderBottom: '1px solid #e2e8f0',
              }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10, background: '#eff6ff', color: '#155dfc',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}
                  >
                    <CalendarIcon />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{row.nama}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <span style={{ fontSize: 13, color: '#6b7280' }}>{formatTanggal(row.tanggal)}</span>
                      {row.tahun && (
                        <span style={{ background: '#eff6ff', color: '#155dfc', padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                          {row.semester} {row.tahun}
                        </span>
                      )}
                    </div>
                    {row.catatan && (
                      <p style={{
                        fontSize: 13, color: '#6b7280', margin: '6px 0 0', maxWidth: 480,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}
                      >
                        {row.catatan}
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Total Aset</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#155dfc' }}>{row.total_qty_out} unit</div>
                  </div>
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
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <Th>#</Th>
                      <Th>Nama Aset</Th>
                      <Th>Dimensi</Th>
                      <Th>Qty Keluar</Th>
                      <Th>Vendor</Th>
                      <Th>Lokasi</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {row.daftar_aset.length === 0 ? (
                      <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>Belum ada aset dicatat.</td></tr>
                    ) : (
                      row.daftar_aset.map((item, idx) => (
                        <tr key={item.aset_id}>
                          <Td>{idx + 1}</Td>
                          <Td>{item.aset_nama}</Td>
                          <Td>
                            {item.dimensi_nama ? (
                              <span style={{ background: '#e2e5ea', color: '#374151', padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500 }}>
                                {item.dimensi_nama}
                              </span>
                            ) : '-'}
                          </Td>
                          <Td><span style={{ color: '#155dfc', fontWeight: 700 }}>{item.qty_out}</span></Td>
                          <Td>{item.vendor_nama || '-'}</Td>
                          <Td>{item.lokasi_nama || '-'}</Td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmTarget}
        icon={<TrashIcon size={22} />}
        tone="danger"
        title="Hapus catatan penggunaan ini?"
        description={`"${confirmTarget?.nama}" akan dihapus dan tidak akan muncul lagi di daftar aktif. Data tetap tersimpan di sistem demi menjaga keakuratan laporan, namun tidak dapat dipulihkan lagi melalui halaman ini.`}
        onCancel={() => setConfirmTarget(null)}
        onConfirm={handleDelete}
        confirmLabel="Ya, Hapus"
      />
    </div>
  );
}
