import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import PageHeader from '../../components/common/PageHeader';
import { Th, Td } from '../../components/common/DataTable';
import { CartIcon, WalletIcon, AlertTriangleIcon, PackageIcon } from '../../components/common/icons';

const ACCENT = '#155dfc';

function formatRupiah(value) {
  return `Rp${Number(value || 0).toLocaleString('id-ID')}`;
}

function formatTanggal(date) {
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function statusBadgeStyle(status) {
  if (status === 'Lunas') return { background: '#dcfce7', color: '#16a34a' };
  if (status === 'DP') return { background: '#fef3c7', color: '#d97706' };
  if (status === 'Belum Bayar') return { background: '#fee2e2', color: '#dc2626' };
  return { background: '#e2e5ea', color: '#374151' };
}

const cardWrapperStyle = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20 };
const cardTitleStyle = { fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 };
const cardSubtitleStyle = { fontSize: 12.5, color: '#9ca3af', margin: '4px 0 0' };
const pillStyle = { background: '#eff6ff', color: ACCENT, fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap' };
const pillButtonStyle = { background: '#f3f4f6', color: '#374151', fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 999, textDecoration: 'none', whiteSpace: 'nowrap' };
const emptyStateStyle = { fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '24px 8px', margin: 0 };

// FR-02, UC-08 - Dashboard Ringkasan Aset
export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    axiosClient.get('/dashboard').then((res) => setData(res.data)).catch(() => {});
  }, []);

  if (!data) return <p>Memuat dashboard...</p>;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Ringkasan penggunaan dan pembelian aset promosi Informatika UNPAR" />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', flexShrink: 0 }} />
        <span style={{ fontSize: 14, color: '#374151' }}>Data semester berjalan:</span>
        <span style={pillStyle}>
          {data.tahun_ajaran ? `Semester ${data.tahun_ajaran.semester} ${data.tahun_ajaran.tahun}` : 'Belum ada tahun ajaran aktif'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(180px, 1fr))', gap: 16, marginBottom: 16 }}>
        <StatCard
          icon={<CartIcon size={20} />}
          label="Total Penggunaan"
          value={data.total_penggunaan}
          sublabel={`${data.jumlah_kegiatan} Kegiatan`}
          variant="primary"
        />
        <StatCard
          icon={<WalletIcon size={20} />}
          label="Nilai Pembelian"
          value={formatRupiah(data.nilai_pembelian)}
          sublabel={`${data.jumlah_transaksi} Transaksi`}
        />
        <StatCard
          icon={<AlertTriangleIcon size={20} />}
          label="Perlu Restock"
          value={data.perlu_restock}
          sublabel="Item dibawah threshold"
          variant="danger"
        />
        <StatCard
          icon={<PackageIcon size={20} />}
          label="Total Stok Aset"
          value={data.total_stok}
          sublabel={`${data.jenis_aset} jenis terdaftar`}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 16, marginBottom: 16 }}>
        <ChartCard
          chartData={data.chart_penggunaan_bulanan}
          jumlahKegiatan={data.jumlah_kegiatan}
          totalUnit={data.total_penggunaan}
        />
        <TerbanyakCard data={data.aset_terbanyak_digunakan} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <PenggunaanTerbaruCard data={data.penggunaan_terbaru} />
        <PembelianTerbaruCard data={data.pembelian_terbaru} />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sublabel, variant }) {
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  return (
    <div style={{
      background: isPrimary ? ACCENT : '#fff',
      border: isPrimary ? 'none' : `1px solid ${isDanger ? '#fecaca' : '#e2e8f0'}`,
      borderRadius: 16, padding: 20,
    }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isPrimary ? 'rgba(255,255,255,0.18)' : isDanger ? '#fee2e2' : '#eff6ff',
        color: isPrimary ? '#fff' : isDanger ? '#dc2626' : ACCENT,
      }}
      >
        {icon}
      </div>
      <div style={{ marginTop: 16, fontSize: 13, fontWeight: 500, color: isPrimary ? 'rgba(255,255,255,0.85)' : '#6b7280' }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 26, fontWeight: 800, color: isPrimary ? '#fff' : isDanger ? '#dc2626' : '#111827' }}>{value}</div>
      <div style={{ marginTop: 4, fontSize: 12, color: isPrimary ? 'rgba(255,255,255,0.75)' : isDanger ? '#dc2626' : '#9ca3af' }}>{sublabel}</div>
    </div>
  );
}

function ChartCard({ chartData, jumlahKegiatan, totalUnit }) {
  const max = Math.max(1, ...chartData.map((b) => b.total_unit));
  const peakIndex = chartData.reduce((best, b, i) => (b.total_unit > (chartData[best] ? chartData[best].total_unit : -1) ? i : best), 0);

  return (
    <div style={cardWrapperStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={cardTitleStyle}>Penggunaan Aset</h3>
          <p style={cardSubtitleStyle}>Distribusi penggunaan aset setiap bulan pada semester ini</p>
        </div>
        <span style={pillStyle}>{totalUnit} Unit</span>
      </div>

      {chartData.length === 0 ? (
        <p style={emptyStateStyle}>Belum ada data penggunaan pada semester ini.</p>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 150, marginTop: 24, padding: '0 4px' }}>
            {chartData.map((b, i) => {
              const heightPct = Math.max(4, (b.total_unit / max) * 100);
              const isPeak = i === peakIndex && b.total_unit > 0;
              return (
                <div key={b.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  {isPeak && <span style={{ fontSize: 13, fontWeight: 700, color: ACCENT, marginBottom: 6 }}>{b.total_unit}</span>}
                  <div style={{
                    width: '100%', maxWidth: 34, borderRadius: 6, height: `${heightPct}%`,
                    background: isPeak ? ACCENT : '#e5e7eb',
                  }}
                  />
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {chartData.map((b) => (
              <span key={b.label} style={{ flex: 1, textAlign: 'center', fontSize: 12, color: '#9ca3af' }}>{b.label}</span>
            ))}
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <div style={{ flex: 1, background: '#f9fafb', borderRadius: 12, padding: '12px 16px' }}>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>Kegiatan</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>{jumlahKegiatan}</div>
        </div>
        <div style={{ flex: 1, background: '#f9fafb', borderRadius: 12, padding: '12px 16px' }}>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>Total Unit</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>{totalUnit}</div>
        </div>
      </div>
    </div>
  );
}

const RANK_SHADES = [ACCENT, '#4c8bfa', '#93c5fd', '#bfdbfe'];

function TerbanyakCard({ data }) {
  const max = Math.max(1, ...data.map((d) => d.total_qty));
  return (
    <div style={cardWrapperStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={cardTitleStyle}>Aset Terbanyak Digunakan</h3>
          <p style={cardSubtitleStyle}>Penggunaan aset terbanyak pada semester ini</p>
        </div>
        <Link to="/penggunaan-aset" style={pillButtonStyle}>Lihat Semua</Link>
      </div>

      {data.length === 0 ? (
        <p style={emptyStateStyle}>Belum ada data penggunaan pada semester ini.</p>
      ) : (
        <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {data.map((item, i) => (
            <div key={item.nama}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 13.5, marginBottom: 6 }}>
                <span style={{ color: '#6b7280' }}>
                  #{i + 1} <strong style={{ color: '#111827', fontWeight: 700 }}>{item.nama}</strong>
                </span>
                <span style={{ color: ACCENT, fontWeight: 700, flexShrink: 0 }}>{item.total_qty} Unit</span>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: '#f1f5f9', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${(item.total_qty / max) * 100}%`,
                  background: RANK_SHADES[i] || '#bfdbfe', borderRadius: 999,
                }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PenggunaanTerbaruCard({ data }) {
  return (
    <div style={cardWrapperStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <h3 style={cardTitleStyle}>Penggunaan Terbaru Semester Ini</h3>
          <p style={cardSubtitleStyle}>{data.length} penggunaan aset terbaru</p>
        </div>
        <Link to="/penggunaan-aset" style={pillButtonStyle}>Lihat Semua</Link>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <Th>Aset</Th>
              <Th>Kegiatan</Th>
              <Th>Qty</Th>
              <Th>Tanggal</Th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr><td colSpan={4} style={emptyStateStyle}>Belum ada data.</td></tr>
            )}
            {data.map((row, i) => (
              <tr key={i}>
                <Td>{row.aset_nama}</Td>
                <Td><span style={pillStyle}>{row.kegiatan_nama}</span></Td>
                <Td><strong style={{ color: ACCENT }}>{row.qty_out}</strong></Td>
                <Td>{formatTanggal(row.tanggal)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PembelianTerbaruCard({ data }) {
  return (
    <div style={cardWrapperStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <h3 style={cardTitleStyle}>Pembelian Terbaru Semester Ini</h3>
          <p style={cardSubtitleStyle}>{data.length} pembelian aset terbaru</p>
        </div>
        <Link to="/pembelian-aset" style={pillButtonStyle}>Lihat Semua</Link>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <Th>Aset</Th>
              <Th>Qty</Th>
              <Th>Total</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr><td colSpan={4} style={emptyStateStyle}>Belum ada data.</td></tr>
            )}
            {data.map((row, i) => (
              <tr key={i}>
                <Td>{row.aset_nama}</Td>
                <Td><strong style={{ color: ACCENT }}>{row.qty_in}</strong></Td>
                <Td>{formatRupiah(row.total_harga)}</Td>
                <Td>
                  <span style={{ ...statusBadgeStyle(row.status), padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                    {row.status}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
