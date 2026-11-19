function parseDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

function dateLimits(value) {
  const start = parseDate(value);
  if (!start) return {};
  const min = new Date(start);
  min.setUTCDate(min.getUTCDate() + 1);
  const max = new Date(start);
  max.setUTCDate(1);
  max.setUTCMonth(max.getUTCMonth() + 7);
  const lastDay = new Date(max);
  lastDay.setUTCMonth(lastDay.getUTCMonth() + 1);
  lastDay.setUTCDate(0);
  max.setUTCDate(Math.min(start.getUTCDate(), lastDay.getUTCDate()));
  return { min: min.toISOString().slice(0, 10), max: max.toISOString().slice(0, 10) };
}

function validateSemesterDates(start, end, tahunAwal) {
  if (!parseDate(start) || !parseDate(end)) return 'Tanggal mulai dan tanggal selesai harus berupa tanggal yang valid.';
  if (/^[1-9][0-9]{3}$/.test(String(tahunAwal)) && start < `${tahunAwal}-01-01`) {
    return `Tanggal mulai semester tidak boleh sebelum tahun awal ${tahunAwal}.`;
  }
  const limits = dateLimits(start);
  if (end < limits.min) return 'Tanggal selesai harus setelah tanggal mulai.';
  if (end > limits.max) return 'Durasi semester maksimal 7 bulan kalender.';
  return '';
}

module.exports = { dateLimits, validateSemesterDates };
