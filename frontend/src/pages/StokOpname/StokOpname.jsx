import { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import PageHeader from '../../components/common/PageHeader';
import IconButton from '../../components/common/IconButton';
import { Th, Td } from '../../components/common/DataTable';
import { PlusIcon, StokOpnameIcon, EditIcon } from '../../components/common/icons';
import StokOpnameForm from './StokOpnameForm';

function tanggalLokal() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function tanggalUntukInput(value) {
  return String(value || '').slice(0, 10);
}

function formatTanggal(value) {
  const date = tanggalUntukInput(value);
  if (!date) return '-';
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function StokOpname() {
  const [data, setData] = useState([]);
  const [tahunAjaranList, setTahunAjaranList] = useState([]);
  const [tahunAjaranId, setTahunAjaranId] = useState('');
  const [view, setView] = useState('list');
  const [form, setForm] = useState({ tanggal: tanggalLokal(), catatan: '', daftar_aset: [] });
  const [detail, setDetail] = useState(null);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function fetchData(filter = tahunAjaranId) {
    setLoading(true);
    setError('');
    try {
      const res = await axiosClient.get('/stok-opname', { params: { tahunAjaranId: filter } });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat data stok opname.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData('');
//     axiosClient.get('/tahun-ajaran', { params: { status: 'aktif' } })
    axiosClient.get('/tahun-ajaran')
      .then((res) => setTahunAjaranList(res.data))
      .catch(() => setError('Gagal memuat tahun ajaran.'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const tahunAjaran = (editing ? [editing] : tahunAjaranList).find((ta) =>
    tanggalUntukInput(ta.tanggal_mulai) <= form.tanggal &&
    tanggalUntukInput(ta.tanggal_selesai) >= form.tanggal
  );

  async function openCreateForm() {
    setError('');
    setLoading(true);
    try {
      // Ambil stok terbaru saat form dibuka, bukan stok lama dari daftar.
//       const res = await axiosClient.get('/aset', { params: { status: 'aktif' } });
      const res = await axiosClient.get('/aset');
      const aset = res.data;
      if (!aset.length) {
        setError('Belum ada aset aktif untuk diperiksa.');
        return;
      }
      setEditing(null);
      setForm({
        tanggal: tanggalLokal(), catatan: '',
        daftar_aset: aset.map((item) => ({
          aset_id: item.aset_id, aset_nama: item.nama,
          lokasi_nama: item.lokasi_nama || '-', stok_sistem: Number(item.stok), stok_fisik: '',
        })),
      });
      setView('form');
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mengambil daftar aset.');
    } finally {
      setLoading(false);
    }
  }

  async function openDetail(id) {
    setError('');
    setLoading(true);
    try {
      const res = await axiosClient.get(`/stok-opname/${id}`);
      setDetail(res.data);
      setView('detail');
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal membuka detail stok opname.');
    } finally {
      setLoading(false);
    }
  }

  async function openEditForm(id) {
    setError('');
    setLoading(true);
    try {
      const { data: opname } = await axiosClient.get(`/stok-opname/${id}`);
      if (!opname.can_edit) {
        setError('Pencatatan hanya dapat diedit pada tahun ajaran terbaru yang sudah berjalan.');
        return;
      }
      setDetail(opname);
      setEditing(opname);
      setForm({
        tanggal: tanggalUntukInput(opname.tanggal),
        catatan: opname.catatan || '',
        daftar_aset: opname.daftar_aset.map(item => ({ ...item })),
      });
      setView('form');
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal membuka form edit stok opname.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!tahunAjaran) {
      setError(editing ? 'Tanggal tidak termasuk tahun ajaran pencatatan ini.' : 'Tanggal tidak termasuk tahun ajaran aktif.');
      return;
    }
    if (form.daftar_aset.some((item) => item.stok_fisik === '' ||
      !Number.isSafeInteger(Number(item.stok_fisik)) || Number(item.stok_fisik) < 0)) {
      setError('Isi stok fisik seluruh aset dengan bilangan bulat minimal 0.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        tahun_ajaran_id: tahunAjaran.tahun_ajaran_id,
        tanggal: form.tanggal,
        catatan: form.catatan,
        daftar_aset: form.daftar_aset.map((item) => ({
          aset_id: item.aset_id,
          stok_sistem: item.stok_sistem,
          stok_fisik: Number(item.stok_fisik),
        })),
      };
      if (editing) {
        payload.original = {
          tanggal: tanggalUntukInput(editing.tanggal),
          catatan: editing.catatan || '',
          daftar_aset: editing.daftar_aset,
        };
        const { data: updated } = await axiosClient.put(`/stok-opname/${editing.stok_opname_id}`, payload);
        setDetail(updated);
      } else {
        await axiosClient.post('/stok-opname', payload);
      }
      setView(editing ? 'detail' : 'list');
      setEditing(null);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan stok opname.');
    } finally {
      setSaving(false);
    }
  }

  if (view === 'form') {
    return <StokOpnameForm editing={!!editing} form={form} setForm={setForm} tahunAjaran={tahunAjaran} saving={saving} error={error} onCancel={() => { setError(''); setView(editing ? 'detail' : 'list'); setEditing(null); }} onSubmit={handleSubmit} />;
  }

  return (
    <div>
      <PageHeader title="Stok Opname" subtitle="Pemeriksaan dan penyesuaian stok aset promosi" />
      {error && <p style={{ padding: 12, borderRadius: 10, background: '#fee2e2', color: '#dc2626', marginBottom: 16 }}>{error}</p>}
      {view === 'detail' && detail ? (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: 20, borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: '#eff6ff', color: '#155dfc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <StokOpnameIcon size={22} />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Stok Opname · {formatTanggal(detail.tanggal)}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                  <span style={{ background: '#eff6ff', color: '#155dfc', padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{detail.semester} {detail.tahun}</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {detail.can_edit && <IconButton title="Ubah" bg="#eef2ff" color="#4338ca" disabled={loading} onClick={() => openEditForm(detail.stok_opname_id)}>
                <EditIcon />
              </IconButton>}
              <button type="button" onClick={() => { setError(''); setView('list'); }} style={{ padding: '10px 18px', background: '#e2e5ea', color: '#374151', borderRadius: 10, fontSize: 14 }}>Kembali</button>
            </div>
          </div>
          <div style={{ padding: 24 }}>
            <div style={{ background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: 14, padding: 20, marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#155dfc', letterSpacing: 0.4, marginBottom: 16 }}>INFORMASI STOK OPNAME</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Tanggal Pemeriksaan</div>
                  <div style={{ fontSize: 14 }}>{formatTanggal(detail.tanggal)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Tahun Ajaran</div>
                  <span style={{ background: '#dbeafe', color: '#155dfc', padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{detail.semester} {detail.tahun}</span>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Catatan</div>
                  <div style={{ fontSize: 14, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{detail.catatan || '-'}</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>DAFTAR ASET</div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>{detail.daftar_aset.length} jenis aset · {detail.daftar_aset.filter(item => Number(item.stok_fisik) !== Number(item.stok_sistem)).length} jenis aset berselisih</div>
            </div>
            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 12 }}>
              <table style={{ width: '100%', minWidth: 650, borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f9fafb' }}><tr>
                  {['Aset', 'Lokasi', 'Stok Sistem Saat Opname', 'Stok Fisik', 'Selisih'].map(head => <Th key={head}>{head}</Th>)}
                </tr></thead>
                <tbody>{detail.daftar_aset.map(item => {
                  const selisih = Number(item.stok_fisik) - Number(item.stok_sistem);
                  return <tr key={item.aset_id}>
                    <Td><span style={{ fontWeight: 600 }}>{item.aset_nama}</span></Td>
                    <Td>{item.lokasi_nama || '-'}</Td>
                    <Td>{item.stok_sistem}</Td>
                    <Td><span style={{ color: '#155dfc', fontWeight: 700 }}>{item.stok_fisik}</span></Td>
                    <Td><span style={{ background: selisih === 0 ? '#f3f4f6' : '#fef3c7', color: selisih === 0 ? '#6b7280' : '#d97706', padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{selisih > 0 ? `+${selisih}` : selisih}</span></Td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
            <p style={{ fontSize: 12, color: '#6b7280', marginTop: 12 }}>Selisih = stok fisik − stok sistem saat pemeriksaan. Nilai negatif menunjukkan unit hilang; nilai positif menunjukkan unit berlebih.</p>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <select aria-label="Filter tahun ajaran" value={tahunAjaranId} onChange={(e) => { setTahunAjaranId(e.target.value); fetchData(e.target.value); }} style={{ padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 10, background: '#fff', fontSize: 14, fontWeight: 500 }}>
              <option value="">Semua Tahun Ajaran</option>
              {tahunAjaranList.map((ta) => <option value={ta.tahun_ajaran_id} key={ta.tahun_ajaran_id}>{ta.semester} {ta.tahun}</option>)}
            </select>
            <button type="button" onClick={openCreateForm} disabled={loading} style={{ background: '#155dfc', color: '#fff', padding: '10px 16px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}><PlusIcon /> Tambah Catatan Stok Opname</button>
          </div>
          {loading ? <div style={{ padding: 24, background: '#fff', borderRadius: 14 }}>Memuat data...</div> : data.length === 0 ? <div style={{ padding: 24, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, textAlign: 'center', color: '#6b7280' }}>Belum ada data stok opname.</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {data.map((item) => (
                <div
                    key={item.stok_opname_id}
                    style={{
                    background: '#fff',
                    borderRadius: 14,
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    }}
                >
                    <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12,
                        padding: 20,
                    }}
                    >
                    <div
                        style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        }}
                    >
                        <div
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: 10,
                            background: '#eff6ff',
                            color: '#155dfc',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                        >
                        <StokOpnameIcon size={22} />
                        </div>

                        <div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>
                            Stok Opname · {formatTanggal(item.tanggal)}
                        </div>

                        <div
                            style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            marginTop: 4,
                            flexWrap: 'wrap',
                            }}
                        >
                            <span
                            style={{
                                background: '#eff6ff',
                                color: '#155dfc',
                                padding: '3px 10px',
                                borderRadius: 999,
                                fontSize: 12,
                                fontWeight: 600,
                            }}
                            >
                            {item.semester} {item.tahun}
                            </span>
                        </div>

                        {item.catatan && (
                            <p
                            style={{
                                fontSize: 13,
                                color: '#6b7280',
                                margin: '6px 0 0',
                                maxWidth: 480,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                            }}
                            >
                            {item.catatan}
                            </p>
                        )}
                        </div>
                    </div>

                    <div
                        style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        }}
                    >
                        <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>
                            Jenis Aset
                        </div>

                        <div
                            style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: '#155dfc',
                            }}
                        >
                            {item.jumlah_aset} jenis aset
                        </div>

                        <div
                            style={{
                            fontSize: 12,
                            color: '#6b7280',
                            marginTop: 4,
                            }}
                        >
                            {item.jumlah_selisih} jenis aset berselisih
                        </div>
                        </div>

                        <button
                        type="button"
                        onClick={() => openDetail(item.stok_opname_id)}
                        style={{
                            background: '#eef2ff',
                            color: '#4338ca',
                            borderRadius: 10,
                            padding: '10px 16px',
                            fontSize: 13,
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                        }}
                        >
                        Lihat Detail
                        </button>
                    </div>
                    </div>
                </div>
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
