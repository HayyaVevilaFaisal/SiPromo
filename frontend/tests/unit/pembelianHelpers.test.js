// White box test - menguji langsung fungsi murni statusBadgeStyle() & findTahunAjaran()
// dari frontend/src/pages/PembelianAset/PembelianAset.jsx (diekspor khusus untuk keperluan test ini).
import { describe, test, expect } from 'vitest';
import { statusBadgeStyle, findTahunAjaran } from '../../src/pages/PembelianAset/PembelianAset';

describe('statusBadgeStyle (white box - branch coverage)', () => {
  test('"Lunas" -> hijau', () => {
    expect(statusBadgeStyle('Lunas')).toEqual({ background: '#dcfce7', color: '#16a34a' });
  });

  test('"DP" -> kuning', () => {
    expect(statusBadgeStyle('DP')).toEqual({ background: '#fef3c7', color: '#d97706' });
  });

  test('"Belum Bayar" -> merah', () => {
    expect(statusBadgeStyle('Belum Bayar')).toEqual({ background: '#fee2e2', color: '#dc2626' });
  });

  test('nilai tidak dikenal -> abu-abu (fallback)', () => {
    expect(statusBadgeStyle('Draft')).toEqual({ background: '#e2e5ea', color: '#374151' });
    expect(statusBadgeStyle(undefined)).toEqual({ background: '#e2e5ea', color: '#374151' });
  });
});

const tahunAjaranList = [
  { tahun_ajaran_id: 1, tanggal_mulai: '2024-08-01', tanggal_selesai: '2024-12-31' },
  { tahun_ajaran_id: 2, tanggal_mulai: '2025-01-01', tanggal_selesai: '2025-07-31' },
];

describe('findTahunAjaran (white box - branch coverage)', () => {
  test('tanggal kosong -> null', () => {
    expect(findTahunAjaran('', tahunAjaranList)).toBeNull();
    expect(findTahunAjaran(null, tahunAjaranList)).toBeNull();
  });

  test('tanggal di dalam rentang tahun ajaran pertama -> mengembalikan tahun ajaran itu', () => {
    expect(findTahunAjaran('2024-10-15', tahunAjaranList)).toEqual(tahunAjaranList[0]);
  });

  test('tanggal di dalam rentang tahun ajaran kedua -> mengembalikan tahun ajaran itu', () => {
    expect(findTahunAjaran('2025-05-01', tahunAjaranList)).toEqual(tahunAjaranList[1]);
  });

  test('tanggal tepat di batas awal/akhir rentang -> tetap cocok (inklusif)', () => {
    expect(findTahunAjaran('2024-08-01', tahunAjaranList)).toEqual(tahunAjaranList[0]);
    expect(findTahunAjaran('2024-12-31', tahunAjaranList)).toEqual(tahunAjaranList[0]);
  });

  test('tanggal di luar semua rentang tahun ajaran -> null', () => {
    expect(findTahunAjaran('2026-01-01', tahunAjaranList)).toBeNull();
  });

  test('daftar tahun ajaran kosong -> null', () => {
    expect(findTahunAjaran('2025-05-01', [])).toBeNull();
  });
});
