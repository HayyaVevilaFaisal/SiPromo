import { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import PageHeader from '../../components/common/PageHeader';
import { Th, Td } from '../../components/common/DataTable';
import {
  CalendarIcon, CartIcon, BoxIcon, WalletIcon, PackageIcon, DownloadIcon,
} from '../../components/common/icons';

function formatRupiah(value) {
  return `Rp${Number(value || 0).toLocaleString('id-ID')}`;
}

function formatTanggal(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatBulanTahun(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

// FR-18, FR-19, UC-09, UC-10 - Laporan & Ekspor PDF Aset Promosi
export default function Laporan() {
  const [tahunAjaranList, setTahunAjaranList] = useState([]);
  const [tahunAjaranId, setTahunAjaranId] = useState('');
  const [laporan, setLaporan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    axiosClient.get('/tahun-ajaran', { params: { status: 'aktif' } }).then((res) => {
      setTahunAjaranList(res.data);
      if (res.data.length > 0) setTahunAjaranId(String(res.data[0].tahun_ajaran_id));
      else setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!tahunAjaranId) return;
    fetchLaporan(tahunAjaranId);
  }, [tahunAjaranId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchLaporan(id) {
    setLoading(true);
    setError('');
    try {
      const res = await axiosClient.get('/laporan', { params: { tahunAjaranId: id } });
      setLaporan(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat laporan. Pastikan server backend aktif.');
    } finally {
      setLoading(false);
    }
  }

  async function handleExportPdf() {
    if (!tahunAjaranId) return;
    setExporting(true);
    setError('');
    try {
      const res = await axiosClient.get('/laporan/export-pdf', {
        params: { tahunAjaranId },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `laporan-aset-promosi-${laporan?.tahun_ajaran?.tahun ?? ''}-${laporan?.tahun_ajaran?.semester ?? ''}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Gagal mengekspor laporan ke PDF.');
    } finally {
      setExporting(false);
    }
  }

  const ta = laporan?.tahun_ajaran;
  const ringkasan = laporan?.ringkasan;
  const rincianPembelian = laporan?.rincian_pembelian ?? [];
  const rincianPenggunaan = laporan?.rincian_penggunaan ?? [];
  const rekapStok = laporan?.rekap_stok ?? [];

  return (
    <div>
      <PageHeader title="Laporan Aset Promosi" subtitle="Rekap dan ekspor laporan aset promosi" />

      {error && (
        <p style={{
          background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca',
          borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 16,
        }}
        >
          {error}
        </p>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, background: '#fff', color: '#155dfc',
          border: '1px solid #d1d5db', borderRadius: 10, padding: '10px 14px',
        }}
        >
          <span style={{ display: 'flex', color: '#9ca3af', flexShrink: 0 }}>
            <CalendarIcon size={16} />
          </span>
          <span style={{ fontSize: 14, color: '#374151', fontWeight: 500, flexShrink: 0 }}>Semester :</span>
          <select
            value={tahunAjaranId}
            onChange={(e) => setTahunAjaranId(e.target.value)}
            style={{
              background: 'transparent', color: '#155dfc', border: 'none', outline: 'none',
              fontSize: 14, fontWeight: 700, padding: 0,
            }}
          >
            {tahunAjaranList.length === 0 && <option value="">Belum ada tahun ajaran</option>}
            {tahunAjaranList.map((item) => (
              <option key={item.tahun_ajaran_id} value={item.tahun_ajaran_id}>{item.semester} {item.tahun}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleExportPdf}
          disabled={exporting || !laporan}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, background: '#155dfc',
            padding: '10px 18px', borderRadius: 10, fontSize: 14, fontWeight: 600,
          }}
        >
          <DownloadIcon /> {exporting ? 'Mengekspor...' : 'Ekspor PDF'}
        </button>
      </div>

      {loading ? (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 24, textAlign: 'center', color: '#6b7280' }}>
          Memuat data...
        </div>
      ) : !ta ? (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 24, textAlign: 'center', color: '#6b7280' }}>
          Belum ada tahun ajaran. Tambahkan tahun ajaran terlebih dahulu di menu Tahun Ajaran.
        </div>
      ) : (
        <>
          <div style={{
            textAlign: 'center', background: '#eff6ff', color: '#155dfc', fontSize: 13, fontWeight: 600,
            borderRadius: 10, padding: '10px 16px', marginBottom: 20,
          }}
          >
            {ta.semester} {ta.tahun} &nbsp;·&nbsp; {formatBulanTahun(ta.tanggal_mulai)} - {formatBulanTahun(ta.tanggal_selesai)}
          </div>

          <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
            <div style={{ flex: 1, background: '#155dfc', borderRadius: 14, padding: 20 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10, background: 'rgba(255,255,255,0.18)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
              }}
              >
                <WalletIcon />
              </div>
              <div style={{ fontSize: 13, color: '#dbeafe' }}>Total Nilai Pembelian</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '4px 0' }}>
                {formatRupiah(ringkasan.total_nilai_pembelian)}
              </div>
              <div style={{ fontSize: 12, color: '#dbeafe' }}>
                {ringkasan.jumlah_transaksi_pembelian} Transaksi &middot; {ringkasan.total_qty_masuk} unit masuk
              </div>
            </div>

            <div style={{ flex: 1, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 20 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10, background: '#eff6ff', color: '#155dfc',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
              }}
              >
                <PackageIcon />
              </div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>Total Unit Digunakan</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: '4px 0' }}>{ringkasan.total_qty_keluar}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{ringkasan.jumlah_kegiatan} Kegiatan</div>
            </div>

            <div style={{ flex: 1, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 20 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10, background: '#eff6ff', color: '#155dfc',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
              }}
              >
                <CalendarIcon />
              </div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>Kegiatan</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: '4px 0' }}>{ringkasan.jumlah_kegiatan}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Di tahun ajaran {ta.tahun}</div>
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 24 }}>
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
                  <div style={{ fontWeight: 700, fontSize: 16 }}>Rincian Pembelian Aset</div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                    {rincianPembelian.length} jenis pembelian aset pada tahun ajaran {ta.tahun}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Total Unit</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#155dfc' }}>{ringkasan.total_qty_masuk}</div>
              </div>
            </div>

            {rincianPembelian.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>Belum ada data pembelian.</div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        <Th>Vendor</Th>
                        <Th>Aset</Th>
                        <Th>Dimensi</Th>
                        <Th>Qty Masuk</Th>
                        <Th>Harga Satuan</Th>
                        <Th>Harga Total</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {rincianPembelian.map((row, idx) => (
                        <tr key={idx}>
                          <Td>
                            <div style={{ fontWeight: 600 }}>{row.vendor_nama}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                              <span style={{
                                fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                                background: row.status === 'Lunas' ? '#dcfce7' : row.status === 'DP' ? '#fef3c7' : '#fee2e2',
                                color: row.status === 'Lunas' ? '#16a34a' : row.status === 'DP' ? '#d97706' : '#dc2626',
                              }}
                              >
                                {row.status}
                              </span>
                              <span style={{ fontSize: 12, color: '#9ca3af' }}>{formatTanggal(row.tanggal)}</span>
                            </div>
                          </Td>
                          <Td>{row.aset_nama}</Td>
                          <Td>
                            {row.dimensi_nama ? (
                              <span style={{ background: '#e2e5ea', color: '#374151', padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500 }}>
                                {row.dimensi_nama}
                              </span>
                            ) : '-'}
                          </Td>
                          <Td><span style={{ color: '#155dfc', fontWeight: 700 }}>{row.qty_in}</span></Td>
                          <Td>{formatRupiah(row.unit_price)}</Td>
                          <Td>{formatRupiah(row.total_harga)}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'flex-end', background: '#eff6ff', padding: '12px 20px', fontSize: 13,
                }}
                >
                  <span style={{ color: '#374151' }}>Subtotal Pembelian :&nbsp;</span>
                  <span style={{ fontWeight: 700, color: '#155dfc' }}>{formatRupiah(ringkasan.total_nilai_pembelian)}</span>
                </div>
              </>
            )}
          </div>

          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 24 }}>
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
                  <CalendarIcon />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>Rincian Pencatatan Penggunaan Aset</div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                    {rincianPenggunaan.length} jenis penggunaan aset pada tahun ajaran {ta.tahun}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Kegiatan</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#155dfc' }}>{ringkasan.jumlah_kegiatan}</div>
              </div>
            </div>

            {rincianPenggunaan.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>Belum ada data penggunaan.</div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        <Th>Kegiatan</Th>
                        <Th>Aset</Th>
                        <Th>Dimensi Aset</Th>
                        <Th>Qty Keluar</Th>
                        <Th>Vendor</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {rincianPenggunaan.map((row, idx) => (
                        <tr key={idx}>
                          <Td>
                            <div style={{ fontWeight: 600 }}>{row.kegiatan_nama}</div>
                            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{formatTanggal(row.tanggal)}</div>
                          </Td>
                          <Td>{row.aset_nama}</Td>
                          <Td>
                            {row.dimensi_nama ? (
                              <span style={{ background: '#e2e5ea', color: '#374151', padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500 }}>
                                {row.dimensi_nama}
                              </span>
                            ) : '-'}
                          </Td>
                          <Td><span style={{ color: '#d97706', fontWeight: 700 }}>{row.qty_out}</span></Td>
                          <Td>{row.vendor_nama || '-'}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'flex-end', background: '#fef3c7', padding: '12px 20px', fontSize: 13,
                }}
                >
                  <span style={{ color: '#374151' }}>Subtotal Unit Keluar :&nbsp;</span>
                  <span style={{ fontWeight: 700, color: '#d97706' }}>{ringkasan.total_qty_keluar} unit</span>
                </div>
              </>
            )}
          </div>

          {ta.is_tahun_ajaran_aktif && (
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 20, borderBottom: '1px solid #e2e8f0' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10, background: '#eff6ff', color: '#155dfc',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
                >
                  <BoxIcon />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>Rekap Stok Aset</span>
                    <span style={{ background: '#f3f4f6', color: '#6b7280', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
                      Saat ini
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                    Kondisi stok terkini untuk aset terkait tahun ajaran ini
                  </div>
                </div>
              </div>

              {rekapStok.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>Belum ada data stok.</div>
              ) : (
                <>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                      <thead>
                        <tr style={{ background: '#f9fafb' }}>
                          <Th>Aset</Th>
                          <Th>Sisa Stok</Th>
                          <Th>Threshold</Th>
                          <Th>Lokasi Penyimpanan</Th>
                          <Th>Status</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {rekapStok.map((row) => {
                          const kritis = row.sisa_stok < row.threshold_qty;
                          return (
                            <tr key={row.aset_id}>
                              <Td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontWeight: 600 }}>{row.nama}</span>
                                  {row.ada_perubahan && (
                                    <span
                                      title="Ada transaksi pembelian/penggunaan pada tahun ajaran ini"
                                      style={{ background: '#eff6ff', color: '#155dfc', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}
                                    >
                                      Ada Transaksi
                                    </span>
                                  )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                  {row.dimensi_nama && (
                                    <span style={{ background: '#e2e5ea', color: '#374151', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 500 }}>
                                      {row.dimensi_nama}
                                    </span>
                                  )}
                                  <span style={{ fontSize: 12, color: '#9ca3af' }}>{formatRupiah(row.harga)}</span>
                                </div>
                              </Td>
                              <Td><span style={{ color: '#155dfc', fontWeight: 700 }}>{row.sisa_stok}</span></Td>
                              <Td>{row.threshold_qty}</Td>
                              <Td>{row.lokasi_nama || '-'}</Td>
                              <Td>
                                <span style={{
                                  background: kritis ? '#fee2e2' : '#dcfce7',
                                  color: kritis ? '#dc2626' : '#16a34a',
                                  padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                                }}
                                >
                                  {kritis ? 'Kritis' : 'Aman'}
                                </span>
                              </Td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div style={{
                    display: 'flex', justifyContent: 'flex-end', background: '#dcfce7', padding: '12px 20px', fontSize: 13,
                  }}
                  >
                    <span style={{ color: '#374151' }}>Subtotal Sisa Stok :&nbsp;</span>
                    <span style={{ fontWeight: 700, color: '#16a34a' }}>{ringkasan.total_sisa_stok} unit</span>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
