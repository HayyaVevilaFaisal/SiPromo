import PageHeader from '../../components/common/PageHeader';

// TODO (PBI-06): implementasikan CRUD lokasi penyimpanan - FR-06, UC-02. Endpoint API: /api/lokasi-penyimpanan.
export default function LokasiPenyimpanan() {
  return (
    <div>
      <PageHeader title="Kelola Data Lokasi Penyimpanan" subtitle="Data lokasi penyimpanan aset promosi" />
      <p style={{ color: '#666', fontSize: 14 }}>
        Halaman ini masih berupa kerangka. Implementasikan tabel & form mengikuti pola
        halaman <code>Aset</code> (lihat <code>src/pages/Aset/Aset.jsx</code>).
      </p>
      <p style={{ color: '#666', fontSize: 14 }}>TODO (PBI-06): implementasikan CRUD lokasi penyimpanan - FR-06, UC-02. Endpoint API: /api/lokasi-penyimpanan.</p>
    </div>
  );
}
