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
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [periods, setPeriods] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [currentId, setCurrentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [listError, setListError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    axiosClient.get('/tahun-ajaran').then(({ data: rows }) => {
      if (active) setPeriods(Array.isArray(rows) ? rows : []);
    }).catch(() => {
      if (active) setListError('Daftar tahun ajaran gagal dimuat. Muat ulang halaman untuk mencoba lagi.');
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const request = selectedId
      ? axiosClient.get('/dashboard', { params: { tahunAjaranId: selectedId } })
      : axiosClient.get('/dashboard');
    request.then(({ data: summary }) => {
      if (!active) return;
      setData(summary);
      if (!selectedId) setCurrentId(String(summary.tahun_ajaran?.tahun_ajaran_id ?? ''));
    }).catch(() => {
      if (active) setError('Ringkasan aset gagal dimuat. Silakan coba lagi.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [selectedId, retry]);

  const isHistory = Boolean(selectedId && selectedId !== currentId);
  const options = [...periods];
  if (data?.tahun_ajaran?.tahun_ajaran_id && !options.some(row => String(row.tahun_ajaran_id) === String(data.tahun_ajaran.tahun_ajaran_id))) options.push(data.tahun_ajaran);
  options.sort((a, b) => String(b.tanggal_mulai || b.tahun).localeCompare(String(a.tanggal_mulai || a.tahun)));

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Ringkasan penggunaan dan pembelian aset promosi Informatika UNPAR"
        notificationsOpen={notificationsOpen}
        onNotificationsOpenChange={setNotificationsOpen}
      />

      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', flexShrink: 0 }} />
        <span style={{ fontSize: 14, color: '#374151' }}>{isHistory ? 'Data semester:' : 'Data semester berjalan:'}</span>
        {!loading && !error && <span style={pillStyle}>
          {data?.tahun_ajaran ? `Semester ${data.tahun_ajaran.semester} ${data.tahun_ajaran.tahun}` : 'Belum ada tahun ajaran aktif'}
        </span>}
        <select aria-label="Tahun ajaran dashboard" disabled={loading && !data} value={selectedId || currentId}
          onChange={event => {
            setSelectedId(event.target.value === currentId ? '' : event.target.value);
            setNotificationsOpen(false);
          }}
          style={{ marginLeft: 'auto', background: '#fff', color: '#374151', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', font: 'inherit', maxWidth: '100%' }}>
          {!currentId && <option value="">Semester berjalan</option>}
          {options.map(row => <option key={row.tahun_ajaran_id} value={String(row.tahun_ajaran_id)}>
            {row.semester} {row.tahun}{String(row.tahun_ajaran_id) === currentId ? ' (Berjalan)' : ''}
          </option>)}
        </select>
      </div>
      {listError && <p role="alert">{listError}</p>}
      {loading ? <p role="status">Memuat dashboard...</p> : error ? (
        <div role="alert">{error} <button type="button" onClick={() => setRetry(value => value + 1)}>Coba lagi</button></div>
      ) : data && <>
      <div style={{ display: 'grid', gridTemplateColumns: isHistory ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(180px, 1fr))', gap: 16, marginBottom: 16 }}>
        <StatCard
          icon={<CartIcon size={20} />}
          label="Total Unit Digunakan"
          value={data.total_penggunaan}
          sublabel={`${data.jumlah_kegiatan} Kegiatan`}
          variant="primary"
        />
        <StatCard
          icon={<WalletIcon size={20} />}
          label="Total Nilai Pembelian"
          value={formatRupiah(data.nilai_pembelian)}
          sublabel={`${data.jumlah_transaksi} Transaksi`}
        />
        {!isHistory && <><StatCard
          icon={<AlertTriangleIcon size={20} />}
          label="Perlu Restock"
          value={data.perlu_restock}
          sublabel={(
            <button
              type="button"
              onClick={() => setNotificationsOpen(true)}
              aria-expanded={notificationsOpen}
              style={{ background: 'transparent', color: 'inherit', font: 'inherit', padding: 0, borderRadius: 0, textDecoration: 'underline', textUnderlineOffset: 2, textAlign: 'left' }}
            >
              {/* Teks lama: lihat selengkapnya di notifikasi */}
              Lihat selengkapnya
            </button>
          )}
          variant="danger"
        />
        <StatCard
          icon={<PackageIcon size={20} />}
          label="Total Stok Aset"
          value={data.total_stok}
          sublabel={`${data.jenis_aset} jenis terdaftar`}
        /></>}
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
        <PenggunaanTerbaruCard data={data.penggunaan_terbaru} isHistory={isHistory} />
        <PembelianTerbaruCard data={data.pembelian_terbaru} isHistory={isHistory} />
      </div>
      </>}
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
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 150, marginTop: 32, padding: '0 4px', borderBottom: '1px solid #f1f5f9' }}>
            {chartData.map((b) => {
              const heightPct = (Number(b.total_unit) / max) * 100;
              const isActive = b.is_bulan_aktif;
              return (
                <div key={b.label} style={{ flex: 1, position: 'relative', height: '100%' }}>
                  <span style={{ position: 'absolute', bottom: `calc(${heightPct}% + 6px)`, left: 0, width: '100%', textAlign: 'center', fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? ACCENT : '#6b7280' }}>{b.total_unit}</span>
                  <div role="img" aria-label={`${b.label}: ${b.total_unit} unit${isActive ? ', bulan aktif' : ''}`} style={{
                    position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
                    width: '100%', maxWidth: 34, borderRadius: '6px 6px 0 0', height: `${heightPct}%`,
                    background: isActive ? ACCENT : '#e5e7eb',
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

function RiwayatList({ data, pembelian = false }) {
  if (!data.length) return <p style={emptyStateStyle}>Belum ada data.</p>;
  return (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {data.map(row => (
        <li key={pembelian ? row.pembelian_id : row.kegiatan_id} style={{ padding: '16px 0', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 14 }}>{pembelian ? row.vendor_nama : row.kegiatan_nama}</strong>
            <strong style={{ color: ACCENT }}>{pembelian ? formatRupiah(row.total_harga) : `${row.qty_out} unit`}</strong>
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
            {formatTanggal(row.tanggal)} · {pembelian ? `${row.qty_in} unit` : `${row.jenis_aset} jenis aset`}
            {pembelian && <span style={{ ...statusBadgeStyle(row.status), padding: '3px 8px', borderRadius: 999, marginLeft: 8 }}>{row.status}</span>}
          </div>
          <ul aria-label={`Rincian aset ${pembelian ? `pembelian ${row.pembelian_id}` : row.kegiatan_nama}`} style={{ listStyle: 'none', margin: '12px 0 0', padding: 12, background: '#f9fafb', borderRadius: 8 }}>
            {(row.aset_detail || []).map(aset => (
              <li key={aset.aset_id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '5px 0', fontSize: 13 }}>
                <span>{aset.aset_nama}</span>
                <span style={{ textAlign: 'right' }}>{pembelian ? `${aset.qty_in} unit · ${formatRupiah(aset.total_harga)}` : `${aset.qty_out} unit`}</span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

function PenggunaanTerbaruCard({ data, isHistory }) {
  return (
    <div style={cardWrapperStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <h3 style={cardTitleStyle}>{isHistory ? 'Kegiatan dengan Penggunaan Aset Terbanyak' : 'Penggunaan Terbaru Semester Ini'}</h3>
          <p style={cardSubtitleStyle}>{isHistory ? 'Kegiatan dengan total unit penggunaan tertinggi pada semester ini' : `${data.length} penggunaan aset terbaru`}</p>
        </div>
        <Link to="/penggunaan-aset" style={pillButtonStyle}>Lihat Semua</Link>
      </div>
      {isHistory ? <RiwayatList data={data} /> : <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {!isHistory && <Th>Aset</Th>}
              <Th>Kegiatan</Th>
              {isHistory && <Th>Jenis Aset</Th>}
              <Th>{isHistory ? 'Total Unit' : 'Qty'}</Th>
              <Th>Tanggal</Th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr><td colSpan={4} style={emptyStateStyle}>Belum ada data.</td></tr>
            )}
            {data.map((row, i) => (
              <tr key={i}>
                {!isHistory && <Td>{row.aset_nama}</Td>}
                <Td><span style={pillStyle}>{row.kegiatan_nama}</span></Td>
                {isHistory && <Td>{row.jenis_aset}</Td>}
                <Td><strong style={{ color: ACCENT }}>{row.qty_out}</strong></Td>
                <Td>{formatTanggal(row.tanggal)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>}
    </div>
  );
}

function PembelianTerbaruCard({ data, isHistory }) {
  return (
    <div style={cardWrapperStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <h3 style={cardTitleStyle}>{isHistory ? 'Pembelian Terbesar Semester ini' : 'Pembelian Terbaru Semester Ini'}</h3>
          <p style={cardSubtitleStyle}>{isHistory ? 'Transaksi dengan total nilai pembelian tertinggi pada semester ini' : `${data.length} pembelian aset terbaru`}</p>
        </div>
        <Link to="/pembelian-aset" style={pillButtonStyle}>Lihat Semua</Link>
      </div>
      {isHistory ? <RiwayatList data={data} pembelian /> : <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <Th>{isHistory ? 'Transaksi / Vendor' : 'Aset'}</Th>
              <Th>{isHistory ? 'Total Unit' : 'Qty'}</Th>
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
                <Td>{isHistory ? <><strong>{row.vendor_nama}</strong><div style={{ fontSize: 12, color: '#6b7280' }}>{formatTanggal(row.tanggal)}</div></> : row.aset_nama}</Td>
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
      </div>}
    </div>
  );
}
