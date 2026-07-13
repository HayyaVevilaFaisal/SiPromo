const pool = require('../config/db');

// FR-09 - Mekanisme trigger notifikasi restock berdasarkan threshold_qty.
// Dipanggil setiap kali stok aset berubah (penggunaan, pembelian, atau edit langsung).
// Catatan revisi final: pesan_notifikasi sekarang punya FK aset_id, jadi wajib disertakan.
async function checkStockThreshold(aset) {
  if (!aset) return;
  if (aset.stok < aset.threshold_qty) {
    const pesan = `Stok ${aset.nama} tersisa ${aset.stok}. Segera pertimbangkan penambahan stok (threshold: ${aset.threshold_qty}).`;
    await pool.query(
      'INSERT INTO pesan_notifikasi (aset_id, pesan) VALUES ($1, $2)',
      [aset.aset_id, pesan]
    );
  }
}

module.exports = { checkStockThreshold };
