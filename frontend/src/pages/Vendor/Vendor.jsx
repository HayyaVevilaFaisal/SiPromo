import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
// import ConfirmDialog from '../../components/common/ConfirmDialog';
import PageHeader from '../../components/common/PageHeader';
import IconButton from '../../components/common/IconButton';
import { Th, Td } from '../../components/common/DataTable';
import { SearchIcon, PlusIcon, EditIcon, TrashIcon } from '../../components/common/icons';
import VendorForm from './VendorForm';

const emptyForm = { nama: '', alamat: '', nomor_handphone: '', email: '' };
const MAX_ASET_PREVIEW = 3;

function isUrl(value) {
  return /^https?:\/\//i.test(value || '');
}

// FR-05, UC-03 - Kelola Data Vendor
export default function Vendor() {
  const navigate = useNavigate();
  const location = useLocation();
  const dariPembelian = location.state?.dariPembelian;
  const dariAset = location.state?.dariAset;
  const [data, setData] = useState([]);
  const [expandedVendors, setExpandedVendors] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  // const [status, setStatus] = useState('aktif');
  const [view, setView] = useState(dariPembelian || dariAset ? 'form' : 'list'); // 'list' | 'form'
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  // const [confirmTarget, setConfirmTarget] = useState(null);
  const [error, setError] = useState('');

  async function fetchData(params = {}) {
    setLoading(true);
//     const res = await axiosClient.get('/vendor', { params: { search, status, ...params } });
    const res = await axiosClient.get('/vendor', { params: { search, ...params } });
    setData(res.data);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function openCreateForm() {
    setError('');
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
    if (dariAset) {
      navigate('/aset', { replace: true, state: { kembaliDariVendor: dariAset } });
      return;
    }
    if (dariPembelian) {
      navigate('/pembelian-aset', {
        replace: true,
        state: { kembaliDariVendor: dariPembelian },
      });
      return;
    }
    setView('list');
    setEditing(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (editing) {
        await axiosClient.put(`/vendor/${editing.vendor_id}`, form);
      } else {
        const res = await axiosClient.post('/vendor', form);
        if (dariAset) {
          navigate('/aset', {
            replace: true,
            state: { kembaliDariVendor: {
              ...dariAset,
              form: { ...dariAset.form, vendor_id: String(res.data.vendor_id) },
            } },
          });
          return;
        }
        if (dariPembelian) {
          navigate('/pembelian-aset', {
            replace: true,
            state: {
              kembaliDariVendor: {
                ...dariPembelian,
                form: {
                  ...dariPembelian.form,
                  vendor_id: String(res.data.vendor_id),
                },
              },
            },
          });
          return;
        }
      }
      closeForm();
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan vendor. Silakan coba lagi.');
    } finally {
      setSaving(false);
    }
  }

//   async function handleDelete() {
//     if (!confirmTarget) return;
//     await axiosClient.delete(`/vendor/${confirmTarget.vendor_id}`);
//     setConfirmTarget(null);
//     fetchData();
//   }

//   function handleStatusChange(value) {
//     setStatus(value);
//     fetchData({ status: value });
//   }

  if (view === 'form') {
    return (
      <VendorForm
        editing={editing}
        form={form}
        setForm={setForm}
        saving={saving}
        error={error}
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
          {/* Kode lama: title="Cari nama, alamat/tautan toko, nomor HP, email, atau status vendor" */}
          <input
            placeholder="Cari vendor..."
            title="Cari nama vendor, alamat/tautan toko, nomor HP, email, atau aset dibeli"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchData()}
            style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
{/* Kode lama, dipertahankan untuk penggunaan kembali:
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
            <option value="terhapus">Terhapus</option>
          </select>
*/}

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
                <Th><span title="Aset dari seluruh riwayat pembelian berstatus Lunas">Aset Dibeli</span></Th>
                <Th>Aksi</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                /* Kode lama: <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>Memuat data...</td></tr> */
                <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>Memuat data...</td></tr>
              ) : data.length === 0 ? (
                /* Kode lama: <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>Belum ada data.</td></tr> */
                <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>Belum ada data.</td></tr>
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
                    {/* Kode lama: semua aset langsung ditampilkan.
                    <Td>
                      {row.aset_dibeli?.length ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minWidth: 160, maxWidth: 360 }}>
                          {row.aset_dibeli.map((aset) => (
                            <span key={aset.aset_id} style={{
                              display: 'inline-block', padding: '3px 8px', borderRadius: 8,
                              background: '#e8efff', color: '#155dfc', fontSize: 12,
                              fontWeight: 600, overflowWrap: 'anywhere', maxWidth: '100%',
                            }}>
                              {aset.nama}
                            </span>
                          ))}
                        </div>
                      ) : '-'}
                    </Td>
                    */}
                    <Td>
                      {row.aset_dibeli?.length ? (
                        <div id={`vendor-aset-${row.vendor_id}`} style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minWidth: 160, maxWidth: 360 }}>
                          {row.aset_dibeli.slice(0, expandedVendors[row.vendor_id] ? undefined : MAX_ASET_PREVIEW).map((aset) => (
                            <span key={aset.aset_id} style={{
                              display: 'inline-block', padding: '3px 8px', borderRadius: 8,
                              background: '#e8efff', color: '#155dfc', fontSize: 12,
                              fontWeight: 600, overflowWrap: 'anywhere', maxWidth: '100%',
                            }}>
                              {aset.nama}
                            </span>
                          ))}
                          {row.aset_dibeli.length > MAX_ASET_PREVIEW && (
                            <button
                              type="button"
                              aria-expanded={Boolean(expandedVendors[row.vendor_id])}
                              aria-controls={`vendor-aset-${row.vendor_id}`}
                              aria-label={expandedVendors[row.vendor_id]
                                ? `Tampilkan lebih sedikit aset ${row.nama}`
                                : `+${row.aset_dibeli.length - MAX_ASET_PREVIEW} lainnya untuk ${row.nama}`}
                              onClick={() => setExpandedVendors(current => ({
                                ...current, [row.vendor_id]: !current[row.vendor_id],
                              }))}
                              style={{
                                padding: '3px 4px', border: 0, background: 'transparent',
                                color: '#155dfc', fontSize: 12, fontWeight: 600,
                                cursor: 'pointer', textDecoration: 'underline',
                              }}
                            >
                              {expandedVendors[row.vendor_id]
                                ? 'Tampilkan lebih sedikit'
                                : `+${row.aset_dibeli.length - MAX_ASET_PREVIEW} lainnya`}
                            </button>
                          )}
                        </div>
                      ) : '-'}
                    </Td>
                    <Td>
                      {/* Kode lama, dipertahankan untuk penggunaan kembali:
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
*/}
                      <IconButton title="Ubah" bg="#eef2ff" color="#4338ca" onClick={() => openEditForm(row)}>
                        <EditIcon />
                      </IconButton>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

{/* Kode lama, dipertahankan untuk penggunaan kembali:
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
*/}
    </div>
  );
}
