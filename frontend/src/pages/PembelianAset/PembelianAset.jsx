import PageHeader from '../../components/common/PageHeader';

// TODO (PBI-12 s.d. PBI-15): implementasikan tabel pembelian, form multi-aset, upload bon, & status pembayaran - FR-13/14/15/16/17, UC-07. Endpoint API: /api/pembelian-aset.
export default function PembelianAset() {
  return (
    <div>
      <PageHeader title="Pencatatan Pembelian Aset" subtitle="Riwayat pembelian aset promosi" />
      <p style={{ color: '#666', fontSize: 14 }}>
        Halaman ini masih berupa kerangka. Implementasikan tabel & form mengikuti pola
        halaman <code>Aset</code> (lihat <code>src/pages/Aset/Aset.jsx</code>).
      </p>
      <p style={{ color: '#666', fontSize: 14 }}>TODO (PBI-12 s.d. PBI-15): implementasikan tabel pembelian, form multi-aset, upload bon, & status pembayaran - FR-13/14/15/16/17, UC-07. Endpoint API: /api/pembelian-aset.</p>
    </div>
  );
}
