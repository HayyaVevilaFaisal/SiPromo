import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
// import ConfirmDialog from '../../components/common/ConfirmDialog';
import PageHeader from '../../components/common/PageHeader';
import IconButton from '../../components/common/IconButton';
import { Th, Td } from '../../components/common/DataTable';
import {
  SearchIcon, FilterIcon, PlusIcon, EditIcon, TrashIcon, CloseIcon, ResetIcon, BellIcon,
} from '../../components/common/icons';
import AsetForm from './AsetForm';

const emptyForm = {
  nama: '', level_aset_id: '', lokasi_penyimpanan_id: '', vendor_id: '', harga: '', stok: 0, threshold_qty: 0,
};

// FR-03, FR-04, UC-01 - Kelola Data Aset (halaman referensi pola CRUD untuk halaman lain)
export default function Aset() {
  const navigate = useNavigate();
  const location = useLocation();
  const kembaliDariLokasi = location.state?.kembaliDariLokasi;
  const kembaliDariVendor = location.state?.kembaliDariVendor;
  const draft = kembaliDariVendor ?? kembaliDariLokasi;
  const dariPenggunaan = location.state?.dariPenggunaan ?? draft?.dariPenggunaan;
  const dariPembelian = location.state?.dariPembelian ?? draft?.dariPembelian;
  const [data, setData] = useState([]);
  const [levelList, setLevelList] = useState([]);
  const [lokasiList, setLokasiList] = useState([]);
  const [vendorList, setVendorList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilter, setShowFilter] = useState(false);
//   const [filters, setFilters] = useState({ level: '', status: 'aktif', hargaMin: '', hargaMax: '' });
  // const [filters, setFilters] = useState({ level: '', lokasi: '', hargaMin: '', hargaMax: '' });
  const [filters, setFilters] = useState({ level: '', lokasi: '', status: '', hargaMin: '', hargaMax: '' });
//   const [activeFilters, setActiveFilters] = useState({ level: '', status: 'aktif', hargaMin: '', hargaMax: '' });
  // const [activeFilters, setActiveFilters] = useState({ level: '', lokasi: '', hargaMin: '', hargaMax: '' });
  const [activeFilters, setActiveFilters] = useState({ level: '', lokasi: '', status: '', hargaMin: '', hargaMax: '' });
  const hasPriceFilter = activeFilters.hargaMin !== '' || activeFilters.hargaMax !== '';
//   const activeFilterCount = Number(Boolean(activeFilters.level)) + Number(activeFilters.status !== 'aktif') + Number(hasPriceFilter);
  // const activeFilterCount = Number(Boolean(activeFilters.level)) + Number(Boolean(activeFilters.lokasi)) + Number(hasPriceFilter);
  const activeFilterCount = Number(Boolean(activeFilters.level)) + Number(Boolean(activeFilters.lokasi)) + Number(Boolean(activeFilters.status)) + Number(hasPriceFilter);
  const activeLokasi = lokasiList.find((lokasi) => String(lokasi.lokasi_penyimpanan_id) === activeFilters.lokasi);
  const activeLevel = levelList.find((level) => String(level.level_aset_id) === activeFilters.level);
  const [priceCeiling, setPriceCeiling] = useState(0);
//   const [view, setView] = useState(dariPenggunaan || draft ? 'form' : 'list'); // 'list' | 'form'
  const [view, setView] = useState(dariPenggunaan || dariPembelian || draft ? 'form' : 'list'); // 'list' | 'form'
  const [editing, setEditing] = useState(null);
//   const [form, setForm] = useState(draft?.form ?? emptyForm);
//   const [form, setForm] = useState(draft?.form ?? (dariPembelian ? { ...emptyForm, vendor_id: dariPembelian.form.vendor_id } : emptyForm));
  const [form, setForm] = useState(draft?.form ?? emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // const [confirmTarget, setConfirmTarget] = useState(null);

  async function fetchData(params = {}) {
    setLoading(true);
    const res = await axiosClient.get('/aset', { params: { search, ...activeFilters, ...params } });
    setData(res.data);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
    axiosClient.get('/level-aset').then((res) => setLevelList(res.data)).catch(() => {});
    axiosClient.get('/lokasi-penyimpanan').then((res) => setLokasiList(res.data)).catch(() => {});
//     axiosClient.get('/vendor', { params: { status: 'aktif' } }).then((res) => setVendorList(res.data)).catch(() => {});
    axiosClient.get('/vendor').then((res) => setVendorList(res.data)).catch(() => {});
    // Batas atas slider harga diambil dari aset termahal yang ada, bukan angka tetap.
    axiosClient.get('/aset').then((res) => {
      const max = res.data.reduce((acc, a) => Math.max(acc, Number(a.harga)), 0);
      const ceiling = Math.ceil(max / 1000) * 1000 || 100000;
      setPriceCeiling(ceiling);
      setFilters((f) => (f.hargaMax === '' ? { ...f, hargaMin: 0, hargaMax: ceiling } : f));
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

//   function openCreateForm() {
//     setEditing(null);
//     setForm(emptyForm);
//     setView('form');
//   }

  function openEditForm(row) {
    setEditing(row);
    setForm({
      nama: row.nama,
      level_aset_id: row.level_aset_id ?? '',
      lokasi_penyimpanan_id: row.lokasi_penyimpanan_id ?? '',
      harga: row.harga,
      stok: row.stok,
      threshold_qty: row.threshold_qty,
    });
    setView('form');
  }

  function closeForm() {
    if (dariPembelian) {
      navigate('/pembelian-aset', { replace: true, state: { kembaliDariAset: dariPembelian } });
      return;
    }
    if (dariPenggunaan) {
      navigate('/penggunaan-aset', { replace: true, state: { kembaliDariAset: dariPenggunaan } });
      return;
    }
    setView('list');
    setEditing(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;
    setError('');
    setSaving(true);
    try {
      const payload = {
        nama: form.nama,
        level_aset_id: form.level_aset_id || null,
        lokasi_penyimpanan_id: form.lokasi_penyimpanan_id,
//         vendor_id: form.vendor_id || null,
        vendor_id: null,
//         harga: form.harga,
        harga: dariPembelian && !editing ? 0 : form.harga,
//         stok: form.stok,
        stok: dariPembelian && !editing ? 0 : form.stok,
        threshold_qty: form.threshold_qty,
      };
      if (editing) {
        await axiosClient.put(`/aset/${editing.aset_id}`, payload);
      } else {
        const res = await axiosClient.post('/aset', payload);
        if (dariPembelian) {
          const daftarAset = [...dariPembelian.form.daftar_aset];
          const idxKosong = daftarAset.findIndex((item) => !item.aset_id);
          // Harga dan stok dicatat melalui transaksi pembelian, bukan saat membuat master aset.
          const barisBaru = { aset_id: String(res.data.aset_id), qty_in: '', unit_price: '' };
          if (idxKosong === -1) {
            daftarAset.push(barisBaru);
          } else {
            daftarAset[idxKosong] = { ...daftarAset[idxKosong], aset_id: barisBaru.aset_id, unit_price: '' };
          }
          navigate('/pembelian-aset', {
            replace: true,
            state: { kembaliDariAset: {
              ...dariPembelian,
              form: { ...dariPembelian.form, daftar_aset: daftarAset },
            } },
          });
          return;
        }
        if (dariPenggunaan) {
          const daftarAset = [...dariPenggunaan.form.daftar_aset];
          const idxKosong = daftarAset.findIndex((item) => !item.aset_id);
          const barisBaru = { aset_id: String(res.data.aset_id), qty_out: '' };

          if (idxKosong === -1) {
            daftarAset.push(barisBaru);
          } else {
            daftarAset[idxKosong] = { ...daftarAset[idxKosong], aset_id: barisBaru.aset_id };
          }

          navigate('/penggunaan-aset', {
            replace: true,
            state: {
              kembaliDariAset: {
                ...dariPenggunaan,
                form: { ...dariPenggunaan.form, daftar_aset: daftarAset },
              },
            },
          });
          return;
        }
      }
      closeForm();
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan aset. Silakan coba kembali.');
    } finally {
      setSaving(false);
    }
  }

//   async function handleDelete() {
//     if (!confirmTarget) return;
//     await axiosClient.delete(`/aset/${confirmTarget.aset_id}`);
//     setConfirmTarget(null);
//     fetchData();
//   }

  function applyFilters() {
    const applied = {
      ...filters,
      hargaMin: Number(filters.hargaMin) > 0 ? filters.hargaMin : '',
      hargaMax: filters.hargaMax !== '' && Number(filters.hargaMax) < priceCeiling ? filters.hargaMax : '',
    };
    setActiveFilters(applied);
    fetchData(applied);
    setShowFilter(false);
  }

  function resetFilters() {
//     const cleared = { level: '', status: 'aktif', hargaMin: '', hargaMax: '' };
    // const cleared = { level: '', lokasi: '', hargaMin: '', hargaMax: '' };
    const cleared = { level: '', lokasi: '', status: '', hargaMin: '', hargaMax: '' };
    setFilters(cleared);
    setActiveFilters(cleared);
    fetchData(cleared);
    setShowFilter(false);
  }

  if (view === 'form') {
    return (
      <AsetForm
        editing={editing}
        dariPembelian={Boolean(dariPembelian)}
        error={error}
        form={form}
        setForm={setForm}
        levelList={levelList}
        lokasiList={lokasiList}
        vendorList={vendorList}
        saving={saving}
        onCancel={closeForm}
        onSubmit={handleSubmit}
        onCreateLokasi={() => navigate('/lokasi-penyimpanan', {
//           state: { dariAset: { form, dariPenggunaan } },
          state: { dariAset: { form, dariPenggunaan, dariPembelian } },
        })}
        onCreateVendor={() => navigate('/vendor', {
//           state: { dariAset: { form, dariPenggunaan } },
          state: { dariAset: { form, dariPenggunaan, dariPembelian } },
        })}
      />
    );
  }

  return (
    <div>
      <PageHeader title="Kelola Data Aset" subtitle="Data aset promosi" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, position: 'relative' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <SearchIcon style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            placeholder="Cari aset..."
            title="Cari nama, level, stok, threshold, harga, lokasi, vendor, atau status aset"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchData()}
            style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => {
                if (!showFilter) setFilters({ ...activeFilters });
                setShowFilter((v) => !v);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, background: activeFilterCount ? '#eff6ff' : '#fff', color: activeFilterCount ? '#155dfc' : '#374151',
                border: `1px solid ${activeFilterCount ? '#93c5fd' : '#d1d5db'}`, padding: '10px 16px', borderRadius: 10, fontSize: 14, fontWeight: 500,
              }}
            >
              <FilterIcon /> Filter{activeFilterCount > 0 && ` (${activeFilterCount})`}
            </button>
            {showFilter && (
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: '#fff',
                border: '1px solid #e2e8f0', borderRadius: 16, width: 300,
                boxShadow: '0 12px 30px rgba(0,0,0,0.12)', zIndex: 10, overflow: 'hidden',
              }}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '14px 20px',
                  borderBottom: '1px solid #e2e8f0', color: '#111827',
                }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BellIcon />
                    <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.3 }}>FILTER ASET</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFilter(false)}
                    title="Tutup"
                    style={{
                      width: 24, height: 24, borderRadius: 8, background: 'transparent', color: '#6b7280',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                    }}
                  >
                    <CloseIcon />
                  </button>
                </div>

                <div style={{ padding: '18px 20px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Level Aset</div>
                  <select
                    aria-label="Level Aset"
                    value={filters.level}
                    onChange={(e) => setFilters((f) => ({ ...f, level: e.target.value }))}
                    style={{
                      width: '100%', marginBottom: 20, padding: '10px 12px', borderRadius: 10,
//                       border: '1px solid #d1d5db', fontSize: 14, color: filters.level ? '#111827' : '#9ca3af',
                      border: '1px solid #d1d5db', fontSize: 14, background: '#f3f4f6', color: '#4b5563',
                    }}
                  >
                    <option value="">Semua Level Aset</option>
                    {levelList.map((d) => (
                      <option key={d.level_aset_id} value={d.level_aset_id}>{d.nama}</option>
                    ))}
                  </select>

{/* Kode lama, dipertahankan untuk penggunaan kembali:
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 10 }}>Status</div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                    {[
                      { value: 'aktif', label: 'Aktif' },
                      { value: 'terhapus', label: 'Terhapus' },
                      { value: '', label: 'Semua' },
                    ].map((opt) => (
                      <button
                        key={opt.value || 'semua'}
                        type="button"
                        onClick={() => setFilters((f) => ({ ...f, status: opt.value }))}
                        style={{
                          padding: '6px 14px', borderRadius: 999, fontSize: 13, fontWeight: 500,
                          background: filters.status === opt.value ? '#eff6ff' : '#f3f4f6',
                          color: filters.status === opt.value ? '#155dfc' : '#4b5563',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

*/}
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 10 }}>Status</div>
{/* Kode dropdown status lama, dipertahankan untuk penggunaan kembali:
                  <select
                    aria-label="Status Aset"
                    value={filters.status}
                    onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                    style={{ width: '100%', marginBottom: 20, padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14 }}
                  >
                    <option value="">Semua Status</option>
                    <option value="kritis">Kritis</option>
                    <option value="aman">Aman</option>
                  </select>
*/}
                  <div role="group" aria-label="Status Aset" style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                    {[
                      { value: 'kritis', label: 'Kritis' },
                      { value: 'aman', label: 'Aman' },
                      { value: '', label: 'Semua' },
                    ].map((opt) => (
                      <button
                        key={opt.value || 'semua'}
                        type="button"
                        aria-pressed={filters.status === opt.value}
                        onClick={() => setFilters((f) => ({ ...f, status: opt.value }))}
                        style={{
                          padding: '6px 14px', borderRadius: 999, fontSize: 13, fontWeight: 500,
                          background: filters.status === opt.value ? '#eff6ff' : '#f3f4f6',
                          color: filters.status === opt.value ? '#155dfc' : '#4b5563',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 10 }}>Lokasi Penyimpanan</div>
                  <select
                    aria-label="Lokasi Penyimpanan"
                    value={filters.lokasi}
                    onChange={(e) => setFilters((f) => ({ ...f, lokasi: e.target.value }))}
                    // style={{ width: '100%', marginBottom: 20, padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14 }}
                    style={{ width: '100%', marginBottom: 20, padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14, background: '#f3f4f6', color: '#4b5563' }}
                  >
                    <option value="">Semua Lokasi Penyimpanan</option>
                    {lokasiList.map((lokasi) => (
                      <option key={lokasi.lokasi_penyimpanan_id} value={lokasi.lokasi_penyimpanan_id}>{lokasi.nama}</option>
                    ))}
                  </select>

                  <div style={{ fontSize: 13, marginBottom: 10 }}>
                    <span style={{ fontWeight: 700, color: '#111827' }}>Harga : </span>
                    <span style={{ color: '#155dfc', fontWeight: 600 }}>
                      Rp{Number(filters.hargaMin || 0).toLocaleString('id-ID')} - Rp{Number(filters.hargaMax || priceCeiling).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <PriceRangeSlider
                    min={0}
                    max={priceCeiling}
                    valueMin={filters.hargaMin === '' ? 0 : Number(filters.hargaMin)}
                    valueMax={filters.hargaMax === '' ? priceCeiling : Number(filters.hargaMax)}
                    onChange={(hargaMin, hargaMax) => setFilters((f) => ({ ...f, hargaMin, hargaMax }))}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid #e2e8f0' }}>
                  <button
                    type="button"
                    onClick={resetFilters}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', color: '#6b7280', padding: 0 }}
                  >
                    <ResetIcon />
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={applyFilters}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, background: '#155dfc',
                      padding: '10px 18px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                    }}
                  >
                    <PlusIcon /> Terapkan
                  </button>
                </div>
              </div>
            )}
          </div>

{/* Kode tombol tambah aset lama, dipertahankan untuk penggunaan kembali:
          <button
            type="button"
            onClick={openCreateForm}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, background: '#155dfc',
              padding: '10px 18px', borderRadius: 10, fontSize: 14, fontWeight: 600,
            }}
          >
            <PlusIcon /> Tambah Aset
          </button>
*/}
        </div>
      </div>

      {activeFilterCount > 0 && (
        <div aria-label="Filter aktif" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16, fontSize: 13 }}>
          <span style={{ color: '#6b7280' }}>Filter aktif:</span>
          {[
            activeFilters.level && `Level Aset: ${activeLevel?.nama || activeFilters.level}`,
//             activeFilters.status !== 'aktif' && `Status: ${activeFilters.status === 'terhapus' ? 'Terhapus' : 'Semua'}`,
            activeFilters.status && `Status: ${activeFilters.status === 'kritis' ? 'Kritis' : 'Aman'}`,
            activeFilters.lokasi && `Lokasi Penyimpanan: ${activeLokasi?.nama || activeFilters.lokasi}`,
            hasPriceFilter && `Harga: Rp${Number(activeFilters.hargaMin || 0).toLocaleString('id-ID')} – ${activeFilters.hargaMax === '' ? 'Tanpa batas' : `Rp${Number(activeFilters.hargaMax).toLocaleString('id-ID')}`}`,
          ].filter(Boolean).map((label) => (
            <span key={label} style={{ background: '#eff6ff', color: '#155dfc', border: '1px solid #bfdbfe', borderRadius: 999, padding: '6px 12px' }}>{label}</span>
          ))}
          <button type="button" onClick={resetFilters} style={{ background: 'transparent', color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4, padding: '6px 8px' }}>
            <ResetIcon /> Hapus filter
          </button>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <Th>Nama Aset</Th>
                <Th>Level</Th>
                <Th>Stok</Th>
                <Th>Threshold</Th>
                <Th>Harga</Th>
                <Th>Lokasi</Th>
                <Th>Vendor</Th>
                <Th>Status</Th>
                <Th>Aksi</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>Memuat data...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>Belum ada data.</td></tr>
              ) : (
                data.map((row) => {
                  const kritis = row.stok < row.threshold_qty;
                  return (
                    <tr key={row.aset_id}>
                      <Td>{row.nama}</Td>
                      <Td>
                        {row.level_nama ? (
                          <span style={{ background: '#e2e5ea', color: '#374151', padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500 }}>
                            {row.level_nama}
                          </span>
                        ) : '-'}
                      </Td>
                      <Td><span style={{ color: '#155dfc', fontWeight: 700 }}>{row.stok}</span></Td>
                      <Td>{row.threshold_qty}</Td>
                      <Td>{`Rp${Number(row.harga).toLocaleString('id-ID')}`}</Td>
                      <Td>
                        {row.lokasi_nama}
                        {/* Kode lama, dipertahankan untuk penggunaan kembali:
{row.lokasi_is_active === false && (
                          <span style={{ color: '#9ca3af', fontSize: 12 }}> (Dihapus)</span>
                        )}
*/}
                      </Td>
                      <Td>{row.vendor_nama || '-'}</Td>
                      <Td>
                        <span style={{
                          background: kritis ? '#fee2e2' : '#dcfce7',
                          color: kritis ? '#dc2626' : '#16a34a',
                          padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                        }}
                        >
                          {kritis ? 'Kritis' : 'Aman'}
                        </span>
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
                  );
                })
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
        title="Hapus aset ini?"
        description={`"${confirmTarget?.nama}" akan dihapus dan tidak akan muncul lagi di daftar aktif. Data tetap tersimpan di sistem demi menjaga keakuratan laporan, namun tidak dapat dipulihkan lagi melalui halaman ini.`}
        onCancel={() => setConfirmTarget(null)}
        onConfirm={handleDelete}
        confirmLabel="Ya, Hapus"
      />
*/}
    </div>
  );
}

function PriceRangeSlider({ min, max, valueMin, valueMax, onChange }) {
  const range = Math.max(max - min, 1);
  const minPercent = ((valueMin - min) / range) * 100;
  const maxPercent = ((valueMax - min) / range) * 100;

  return (
    <div className="range-slider" style={{ position: 'relative', height: 24 }}>
      <div style={{
        position: 'absolute', top: '50%', left: 0, right: 0, height: 4,
        background: '#e5e7eb', borderRadius: 2, transform: 'translateY(-50%)',
      }}
      />
      <div style={{
        position: 'absolute', top: '50%', height: 4, background: '#155dfc', borderRadius: 2,
        transform: 'translateY(-50%)', left: `${minPercent}%`, right: `${100 - maxPercent}%`,
      }}
      />
      <input
        type="range"
        className="range-thumb"
        min={min}
        max={max}
        value={valueMin}
        onChange={(e) => onChange(Math.min(Number(e.target.value), valueMax), valueMax)}
        style={{ position: 'absolute', width: '100%', top: 0, margin: 0, background: 'transparent' }}
      />
      <input
        type="range"
        className="range-thumb"
        min={min}
        max={max}
        value={valueMax}
        onChange={(e) => onChange(valueMin, Math.max(Number(e.target.value), valueMin))}
        style={{ position: 'absolute', width: '100%', top: 0, margin: 0, background: 'transparent' }}
      />
    </div>
  );
}
