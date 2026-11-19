import { expect, test } from 'vitest';
import { validateSemesterDates } from '../../src/pages/TahunAjaran/semesterDates';

test('tanggal mulai sebelum tahun awal ditolak, termasuk setelah tahun awal diganti', () => {
  expect(validateSemesterDates('2025-12-31', '2026-06-01', '2026')).toBe('Tanggal mulai semester tidak boleh sebelum tahun awal 2026.');
  expect(validateSemesterDates('2026-01-01', '2026-06-01', '2026')).toBe('');
  expect(validateSemesterDates('2026-01-01', '2026-06-01', '2027')).not.toBe('');
  expect(validateSemesterDates('2027-01-01', '2027-06-01', '2026')).toBe('');
});
