import { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';

// FR-02, UC-08 - Dashboard Ringkasan Aset
export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    axiosClient.get('/dashboard').then((res) => setData(res.data)).catch(() => {});
  }, []);

  if (!data) return <p>Memuat dashboard...</p>;

  return (
    <div>
      <h2>Dashboard</h2>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Card label="Total Penggunaan" value={data.total_penggunaan} />
        <Card label="Nilai Pembelian" value={`Rp${Number(data.nilai_pembelian).toLocaleString('id-ID')}`} />
        <Card label="Perlu Restock" value={data.perlu_restock} />
        <Card label="Total Stok" value={data.total_stok} />
      </div>

      <h3 style={{ marginTop: 24 }}>Suvenir Terbanyak Digunakan</h3>
      <ul>
        {data.suvenir_terbanyak_digunakan.map((s) => (
          <li key={s.nama}>{s.nama} - {s.total_qty} unit</li>
        ))}
      </ul>
      {/* TODO (PBI-18): tambahkan grafik penggunaan & tabel transaksi terbaru sesuai rancangan antarmuka */}
    </div>
  );
}

function Card({ label, value }) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, minWidth: 160, background: '#fff' }}>
      <div style={{ fontSize: 12, color: '#666' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1F4E78' }}>{value}</div>
    </div>
  );
}
