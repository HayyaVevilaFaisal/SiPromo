// Tahun ajaran diturunkan otomatis dari tanggal mulai + tanggal selesai + semester, bukan
// diketik manual, supaya tidak mungkin tidak sinkron dengan tanggal yang sesungguhnya dipilih.
// Ganjil dimulai sekitar Agustus (tahunMulai/tahunMulai+1), Genap dimulai sekitar Januari
// meneruskan tahun ajaran sebelumnya (tahunMulai-1/tahunMulai). Kasus degenerate (tanggal mulai
// & selesai persis sama, walau tidak mungkin terjadi dalam praktiknya) menghasilkan tahun/tahun.
export function deriveTahun(tanggalMulai, tanggalSelesai, semester) {
  if (!tanggalMulai) return '';
  const year = new Date(tanggalMulai).getFullYear();
  if (Number.isNaN(year)) return '';
  if (tanggalSelesai && tanggalMulai === tanggalSelesai) {
    return `${year}/${year}`;
  }
  return semester === 'Ganjil' ? `${year}/${year + 1}` : `${year - 1}/${year}`;
}
