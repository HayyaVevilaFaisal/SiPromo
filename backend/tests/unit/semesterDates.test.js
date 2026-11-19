const { validateSemesterDates, dateLimits } = require('../../src/utils/semesterDates');

test.each([
  ['2023-12-31', '2027-02-04'],
  ['2025-01-01', '2025-01-01'],
  ['2025-02-01', '2025-01-31'],
  ['2025-02-30', '2025-07-01'],
  ['2025-01-01', 'invalid'],
  ['2025-01-01', '2025-08-02'],
  ['2023-07-31', '2024-03-01'],
])('menolak rentang tidak valid %s sampai %s', (start, end) => {
  expect(validateSemesterDates(start, end)).not.toBe('');
});

test.each([
  ['2025-01-01', '2025-07-31'],
  ['2025-08-01', '2026-02-01'],
  ['2023-07-31', '2024-02-29'],
  ['2024-07-31', '2025-02-28'],
])('menerima rentang semester %s sampai %s', (start, end) => {
  expect(validateSemesterDates(start, end)).toBe('');
});

test('batas kalender menangani akhir bulan dan tahun kabisat', () => {
  expect(dateLimits('2023-07-31')).toEqual({ min: '2023-08-01', max: '2024-02-29' });
});
