import PageHeader from '../../components/common/PageHeader';

// TODO (PBI-19, PBI-20): implementasikan rekap laporan & tombol ekspor PDF - FR-18/FR-19, UC-09/UC-10. Endpoint API: /api/laporan dan /api/laporan/export-pdf.
export default function Laporan() {
  return (
    <div>
      <PageHeader title="Laporan Aset Promosi" subtitle="Rekap dan ekspor laporan aset promosi" />
      <p style={{ color: '#666', fontSize: 14 }}>
        Halaman ini masih berupa kerangka. Implementasikan tabel & form mengikuti pola
        halaman <code>Aset</code> (lihat <code>src/pages/Aset/Aset.jsx</code>).
      </p>
      <p style={{ color: '#666', fontSize: 14 }}>TODO (PBI-19, PBI-20): implementasikan rekap laporan & tombol ekspor PDF - FR-18/FR-19, UC-09/UC-10. Endpoint API: /api/laporan dan /api/laporan/export-pdf.</p>
    </div>
  );
}
