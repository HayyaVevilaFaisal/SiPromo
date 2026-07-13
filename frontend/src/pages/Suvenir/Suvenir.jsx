import { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import Table from '../../components/common/Table';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const columns = [
  { key: 'nama', label: 'Nama Suvenir' },
  { key: 'dimensi_nama', label: 'Dimensi' },
  { key: 'stok', label: 'Stok' },
  { key: 'threshold_qty', label: 'Threshold' },
  { key: 'harga', label: 'Harga', render: (row) => `Rp${Number(row.harga).toLocaleString('id-ID')}` },
  { key: 'lokasi_nama', label: 'Lokasi' },
  { key: 'vendor_nama', label: 'Vendor' },
  {
    key: 'is_active',
    label: 'Status',
    render: (row) => (row.is_active ? 'Aktif' : 'Diarsipkan'),
  },
];

// FR-03, FR-04, UC-01 - Kelola Data Suvenir (halaman referensi pola CRUD untuk halaman lain)
export default function Suvenir() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [confirmTarget, setConfirmTarget] = useState(null);

  async function fetchData() {
    setLoading(true);
    const res = await axiosClient.get('/suvenir', { params: { search } });
    setData(res.data);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleArchive() {
    if (!confirmTarget) return;
    await axiosClient.patch(`/suvenir/${confirmTarget.suvenir_id}/arsip`);
    setConfirmTarget(null);
    fetchData();
  }

  return (
    <div>
      <h2>Kelola Data Suvenir</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          placeholder="Cari suvenir..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchData()}
        />
        <button onClick={fetchData}>Cari</button>
        {/* TODO (PBI-04): tombol "Tambah Suvenir" -> buka form tambah/ubah & modal filter dimensi/status/harga */}
      </div>

      {loading ? (
        <p>Memuat data...</p>
      ) : (
        <Table
          columns={columns}
          data={data}
          renderActions={(row) => (
            <button onClick={() => setConfirmTarget(row)} style={{ background: '#c0392b' }}>
              Arsipkan
            </button>
          )}
        />
      )}

      <ConfirmDialog
        open={!!confirmTarget}
        title="Arsipkan suvenir ini?"
        description={`"${confirmTarget?.nama}" akan dipindahkan ke arsip dan tidak muncul di daftar aktif.`}
        onCancel={() => setConfirmTarget(null)}
        onConfirm={handleArchive}
        confirmLabel="Ya, Arsipkan"
      />
    </div>
  );
}
