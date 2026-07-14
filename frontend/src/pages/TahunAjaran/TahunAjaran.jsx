import PageHeader from '../../components/common/PageHeader';

// TODO (PBI-07): implementasikan CRUD tahun ajaran - FR-07, UC-04. Endpoint API: /api/tahun-ajaran.
export default function TahunAjaran() {
  return (
    <div>
      <PageHeader title="Kelola Data Tahun Ajaran" subtitle="Data tahun ajaran program studi" />
      <p style={{ color: '#666', fontSize: 14 }}>
        Halaman ini masih berupa kerangka. Implementasikan tabel & form mengikuti pola
        halaman <code>Aset</code> (lihat <code>src/pages/Aset/Aset.jsx</code>).
      </p>
      <p style={{ color: '#666', fontSize: 14 }}>TODO (PBI-07): implementasikan CRUD tahun ajaran - FR-07, UC-04. Endpoint API: /api/tahun-ajaran.</p>
    </div>
  );
}
