import PageHeader from '../../components/common/PageHeader';

// TODO (PBI-10, PBI-11): implementasikan tabel kegiatan & form multi-aset - FR-10/FR-11/FR-12, UC-06. Endpoint API: /api/penggunaan-aset.
export default function PenggunaanAset() {
  return (
    <div>
      <PageHeader title="Pencatatan Penggunaan Aset" subtitle="Riwayat penggunaan aset untuk kegiatan promosi" />
      <p style={{ color: '#666', fontSize: 14 }}>
        Halaman ini masih berupa kerangka. Implementasikan tabel & form mengikuti pola
        halaman <code>Aset</code> (lihat <code>src/pages/Aset/Aset.jsx</code>).
      </p>
      <p style={{ color: '#666', fontSize: 14 }}>TODO (PBI-10, PBI-11): implementasikan tabel kegiatan & form multi-aset - FR-10/FR-11/FR-12, UC-06. Endpoint API: /api/penggunaan-aset.</p>
    </div>
  );
}
