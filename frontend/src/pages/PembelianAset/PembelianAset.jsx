import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import PageHeader from '../../components/common/PageHeader';
import IconButton from '../../components/common/IconButton';
import { Th, Td } from '../../components/common/DataTable';
import {
  SearchIcon, FilterIcon, PlusIcon, EditIcon, TrashIcon, CloseIcon, ResetIcon, CartIcon, PaperclipIcon,
} from '../../components/common/icons';
import PembelianAsetForm from './PembelianAsetForm';

const emptyForm = {
  vendor_id: '', tanggal: '', status: 'Belum Bayar', catatan: '',
  daftar_aset: [{ aset_id: '', qty_in: '', unit_price: '' }],
  bonFile: null, nama_file: null, url_file: null, fileError: '',
};

function assetSignature(items) {
  const totals = new Map();
  for (const item of items) {
    const id = Number(item.aset_id);
    totals.set(id, (totals.get(id) || 0) + Number(item.qty_in));
  }
  return JSON.stringify([...totals].sort(([a], [b]) => a - b));
}

const STATUS_PEMBELIAN_OPTIONS = ['Belum Bayar', 'DP', 'Lunas'];

function formatTanggal(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatRupiah(value) {
  return `Rp${Number(value || 0).toLocaleString('id-ID')}`;
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

export function findTahunAjaran(tanggal, tahunAjaranList) {
  const target = parseDateInputValue(tanggal);
  if (!target) return null;
  return tahunAjaranList.find((ta) => {
    const mulai = toLocalDateOnly(ta.tanggal_mulai);
    const selesai = toLocalDateOnly(ta.tanggal_selesai);
    return mulai && selesai && target >= mulai && target <= selesai;
  }) || null;
}

export function statusBadgeStyle(status) {
  if (status === 'Lunas') return { background: '#dcfce7', color: '#16a34a' };
  if (status === 'DP') return { background: '#fef3c7', color: '#d97706' };
  if (status === 'Belum Bayar') return { background: '#fee2e2', color: '#dc2626' };
  return { background: '#e2e5ea', color: '#374151' };
}

// FR-13, FR-14, FR-15, FR-16, FR-17, UC-07 - Kelola Pencatatan Pembelian Aset
export default function PembelianAset() {
  const navigate = useNavigate();
  const location = useLocation();
  const kembaliDariVendor = location.state?.kembaliDariVendor;
  const kembaliDariAset = location.state?.kembaliDariAset;
  const draft = kembaliDariAset ?? kembaliDariVendor;
  const [data, setData] = useState([]);
  const [vendorList, setVendorList] = useState([]);
  const [tahunAjaranList, setTahunAjaranList] = useState([]);
  const [asetList, setAsetList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState({ tahunAjaranId: '', statusPembelian: '' });
  const [activeFilters, setActiveFilters] = useState({ tahunAjaranId: '', statusPembelian: '' });
  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length;
  const activeTahunAjaran = tahunAjaranList.find((ta) => String(ta.tahun_ajaran_id) === activeFilters.tahunAjaranId);
//   const [view, setView] = useState(kembaliDariVendor ? 'form' : 'list'); // 'list' | 'form'
  const [view, setView] = useState(draft ? 'form' : 'list'); // 'list' | 'form'
//   const [editing, setEditing] = useState(kembaliDariVendor?.editing ?? null);
  const [editing, setEditing] = useState(draft?.editing ?? null);
//   const [form, setForm] = useState(kembaliDariVendor?.form ?? emptyForm);
  const [form, setForm] = useState(draft?.form ?? emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [pendingPurchase, setPendingPurchase] = useState(null);
  const [error, setError] = useState('');

  async function fetchData(params = {}) {
    setLoading(true);
    setError('');
    try {
      const res = await axiosClient.get('/pembelian-aset', { params: { search, ...activeFilters, ...params } });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat data pembelian aset. Pastikan server backend aktif.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
//     axiosClient.get('/vendor', { params: { status: 'aktif' } }).then((res) => setVendorList(res.data)).catch(() => {});
    axiosClient.get('/vendor').then((res) => setVendorList(res.data)).catch(() => {});
//     axiosClient.get('/tahun-ajaran', { params: { status: 'aktif' } }).then((res) => setTahunAjaranList(res.data)).catch(() => {});
    axiosClient.get('/tahun-ajaran').then((res) => setTahunAjaranList(res.data)).catch(() => {});
//     axiosClient.get('/aset', { params: { status: 'aktif' } }).then((res) => setAsetList(res.data)).catch(() => {});
    axiosClient.get('/aset').then((res) => setAsetList(res.data)).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function openCreateForm() {
    setError('');
    try {
//       const { data: assets } = await axiosClient.get('/aset', { params: { status: 'aktif' } });
      const { data: assets } = await axiosClient.get('/aset');
      setAsetList(assets);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mengambil harga aset terbaru.');
      return;
    }
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setView('form');
  }

  function openEditForm(row) {
    if (!row.can_edit) {
      setError('Pencatatan hanya dapat diedit pada tahun ajaran terbaru yang sudah berjalan.');
      return;
    }
    setEditing(row);
    setForm({
      vendor_id: row.vendor_id ?? '',
      tanggal: toDateInputValue(row.tanggal),
      status: row.status,
      catatan: row.catatan ?? '',
      daftar_aset: row.daftar_aset.length > 0
        ? row.daftar_aset.map((item) => ({ aset_id: item.aset_id, qty_in: item.qty_in, unit_price: item.unit_price }))
        : [{ aset_id: '', qty_in: '', unit_price: '' }],
      bonFile: null,
      nama_file: row.nama_file ?? null,
      url_file: row.url_file ?? null,
      fileError: '',
    });
    setError('');
    setView('form');
  }

  function closeForm() {
    setPendingPurchase(null);
    setView('list');
    setEditing(null);
  }

  function openTambahVendor() {
    navigate('/vendor', { state: { dariPembelian: { form, editing } } });
  }

  function openTambahAset() {
    navigate('/aset', { state: { dariPembelian: { form, editing } } });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving || pendingPurchase) return;
    setError('');

    if (form.daftar_aset.some(row => row.aset_id && (row.unit_price === '' || row.unit_price == null || !Number.isFinite(Number(row.unit_price)) || Number(row.unit_price) < 0 || Number(row.unit_price) > 9999999999.99))) {
      setError('Isi harga satuan setiap aset dengan nilai minimal 0.');
      return;
    }
    const daftar_aset = form.daftar_aset
      .filter((row) => row.aset_id && row.qty_in)
      .map((row) => ({ aset_id: Number(row.aset_id), qty_in: Number(row.qty_in), unit_price: Number(row.unit_price) }));

    if (daftar_aset.length === 0) {
      setError('Tambahkan minimal satu aset dengan jumlah yang valid.');
      return;
    }

    const tahunAjaran = findTahunAjaran(form.tanggal, tahunAjaranList);
    if (!tahunAjaran) {
      setError('Tidak ditemukan tahun ajaran untuk tanggal pembelian ini. Tambahkan tahun ajaran yang sesuai terlebih dahulu di menu Tahun Ajaran.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        vendor_id: Number(form.vendor_id),
        tahun_ajaran_id: tahunAjaran.tahun_ajaran_id,
        tanggal: form.tanggal,
        status: form.status,
        catatan: form.catatan,
        daftar_aset,
      };
      if (!editing) {
        const existing = await axiosClient.get('/pembelian-aset');
        const signature = assetSignature(daftar_aset);
        const duplicate = existing.data.some((row) =>
          Number(row.vendor_id) === payload.vendor_id
          && toDateInputValue(row.tanggal) === payload.tanggal
          && assetSignature(row.daftar_aset) === signature
        );
        if (duplicate) {
          setPendingPurchase({ payload, bonFile: form.bonFile });
          return;
        }
      }
      await savePurchase(payload, form.bonFile);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan pencatatan pembelian.');
    } finally {
      setSaving(false);
    }
  }

  async function savePurchase(payload, bonFile) {
    let pembelianId = editing?.pembelian_id;
    if (editing) {
      await axiosClient.put(`/pembelian-aset/${pembelianId}`, payload);
    } else {
      const res = await axiosClient.post('/pembelian-aset', payload);
      pembelianId = res.data.pembelian.pembelian_id;
    }
    if (bonFile) {
      const fd = new FormData();
      fd.append('bon', bonFile);
      await axiosClient.patch(`/pembelian-aset/${pembelianId}/bon`, fd);
    }
    closeForm();
    fetchData();
//     axiosClient.get('/aset', { params: { status: 'aktif' } }).then(res => setAsetList(res.data)).catch(() => {});
    axiosClient.get('/aset').then(res => setAsetList(res.data)).catch(() => {});
  }

  async function confirmDuplicate() {
    if (saving || !pendingPurchase) return;
    const { payload, bonFile } = pendingPurchase;
    setPendingPurchase(null);
    setSaving(true);
    setError('');
    try {
      await savePurchase(payload, bonFile);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan pencatatan pembelian.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmTarget) return;
    setError('');
    try {
      await axiosClient.delete(`/pembelian-aset/${confirmTarget.pembelian_id}`);
      setConfirmTarget(null);
      fetchData();
    } catch (err) {
      setConfirmTarget(null);
      setError(err.response?.data?.message || 'Gagal menghapus catatan pembelian.');
    }
  }

  function applyFilters() {
    setActiveFilters({ ...filters });
    fetchData(filters);
    setShowFilter(false);
  }

  function resetFilters() {
    const cleared = { tahunAjaranId: '', statusPembelian: '' };
    setFilters(cleared);
    setActiveFilters(cleared);
    fetchData(cleared);
    setShowFilter(false);
  }

  if (view === 'form') {
    return (
      <>
      <PembelianAsetForm
        editing={editing}
        form={form}
        setForm={setForm}
        vendorList={vendorList}
        onCreateVendor={openTambahVendor}
        onCreateAset={openTambahAset}
        asetList={asetList}
        tahunAjaran={findTahunAjaran(form.tanggal, tahunAjaranList)}
        saving={saving}
        error={error}
        onCancel={closeForm}
        onSubmit={handleSubmit}
      />
      <ConfirmDialog
        open={Boolean(pendingPurchase)}
        title="Konfirmasi Pencatatan"
        description="Pencatatan dengan vendor, tanggal, dan daftar aset yang sama sudah pernah dibuat. Apakah Anda yakin ingin menyimpan pencatatan ini?"
        confirmLabel="Ya, Simpan"
        onCancel={() => setPendingPurchase(null)}
        onConfirm={confirmDuplicate}
      />
      </>
    );
  }

  return (
    <div>
      <PageHeader title="Pembelian Aset" subtitle="Pencatatan pembelian dari vendor" />

      {error && (
        <p style={{
          background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca',
          borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 16,
        }}
        >
          {error}
        </p>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, position: 'relative' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <SearchIcon style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            placeholder="Cari vendor atau aset"
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
                    <FilterIcon />
                    <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.3 }}>FILTER PEMBELIAN</span>
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
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', marginBottom: 8 }}>TAHUN AJARAN</div>
                  <select
                    aria-label="Tahun Ajaran"
                    value={filters.tahunAjaranId}
                    onChange={(e) => setFilters((f) => ({ ...f, tahunAjaranId: e.target.value }))}
                    style={{
                      width: '100%', marginBottom: 20, padding: '10px 12px', borderRadius: 10,
                      border: '1px solid #d1d5db', fontSize: 14, fontWeight: 500, background: '#f3f4f6', color: '#4b5563',
                    }}
                  >
                    <option value="">Semua Tahun Ajaran</option>
                    {tahunAjaranList.map((ta) => (
                      <option key={ta.tahun_ajaran_id} value={ta.tahun_ajaran_id}>{ta.semester} {ta.tahun}</option>
                    ))}
                  </select>

                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 10 }}>Status Pembelian</div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                    {[{ value: '', label: 'Semua' }, ...STATUS_PEMBELIAN_OPTIONS.map((s) => ({ value: s, label: s }))].map((opt) => (
                      <button
                        key={opt.value || 'semua'}
                        type="button"
                        onClick={() => setFilters((f) => ({ ...f, statusPembelian: opt.value }))}
                        style={{
                          padding: '6px 14px', borderRadius: 999, fontSize: 13, fontWeight: 500,
                          background: filters.statusPembelian === opt.value ? '#eff6ff' : '#f3f4f6',
                          color: filters.statusPembelian === opt.value ? '#155dfc' : '#4b5563',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
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
                    Terapkan
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, background: '#155dfc',
              padding: '10px 18px', borderRadius: 10, fontSize: 14, fontWeight: 600,
            }}
          >
            <PlusIcon /> Tambah Catatan Pembelian
          </button>
        </div>
      </div>

      {activeFilterCount > 0 && (
        <div aria-label="Filter aktif" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16, fontSize: 13 }}>
          <span style={{ color: '#6b7280' }}>Filter aktif:</span>
          {activeFilters.tahunAjaranId && (
            <span style={{ background: '#eff6ff', color: '#155dfc', border: '1px solid #bfdbfe', borderRadius: 999, padding: '6px 12px' }}>
              Tahun Ajaran: {activeTahunAjaran ? `${activeTahunAjaran.semester} ${activeTahunAjaran.tahun}` : activeFilters.tahunAjaranId}
            </span>
          )}
          {activeFilters.statusPembelian && (
            <span style={{ background: '#eff6ff', color: '#155dfc', border: '1px solid #bfdbfe', borderRadius: 999, padding: '6px 12px' }}>
              Status Pembelian: {activeFilters.statusPembelian}
            </span>
          )}
          <button type="button" onClick={resetFilters} style={{ background: 'transparent', color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4, padding: '6px 8px' }}>
            <ResetIcon /> Hapus filter
          </button>
        </div>
      )}

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
            <div key={row.pembelian_id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
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
                    <CartIcon />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{row.vendor_nama}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, color: '#6b7280' }}>{formatTanggal(row.tanggal)}</span>
                      <span style={{ ...statusBadgeStyle(row.status), padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                        {row.status}
                      </span>
                      {row.tahun && (
                        <span style={{ background: '#eff6ff', color: '#155dfc', padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                          {row.semester} {row.tahun}
                        </span>
                      )}
                      {row.url_file && (
                        <a
                          href={row.url_file}
                          target="_blank"
                          rel="noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#155dfc', textDecoration: 'none' }}
                        >
                          <PaperclipIcon /> Lihat Bon
                        </a>
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
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      Total Nilai
                    </div>

                    <div style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: '#155dfc'
                    }}>
                      {formatRupiah(row.total_nilai)}
                    </div>
                  </div>

                  {row.can_edit && <IconButton
                    title="Ubah"
                    bg="#eef2ff"
                    color="#4338ca"
                    onClick={() => openEditForm(row)}
                  >
                    <EditIcon />
                  </IconButton>}
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <Th>#</Th>
                      <Th>Nama Aset</Th>
                      <Th>Level</Th>
                      <Th>Qty Pembelian</Th>
                      <Th>Harga Satuan</Th>
                      <Th>Total Harga</Th>
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
                            {item.level_nama ? (
                              <span style={{ background: '#e2e5ea', color: '#374151', padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500 }}>
                                {item.level_nama}
                              </span>
                            ) : '-'}
                          </Td>
                          <Td><span style={{ color: '#155dfc', fontWeight: 700 }}>{item.qty_in}</span></Td>
                          <Td>{formatRupiah(item.unit_price)}</Td>
                          <Td>{formatRupiah(item.qty_in * item.unit_price)}</Td>
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
        title="Hapus catatan pembelian ini?"
        description={`Pembelian dari "${confirmTarget?.vendor_nama}" akan dihapus dan tidak akan muncul lagi di daftar aktif. Data tetap tersimpan di sistem demi menjaga keakuratan laporan, namun tidak dapat dipulihkan lagi melalui halaman ini.`}
        onCancel={() => setConfirmTarget(null)}
        onConfirm={handleDelete}
        confirmLabel="Ya, Hapus"
      />
    </div>
  );
}
