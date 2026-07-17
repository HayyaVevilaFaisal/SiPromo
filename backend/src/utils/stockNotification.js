const pool = require('../config/db');

// FR-09 - Mekanisme trigger notifikasi restock berdasarkan threshold_qty.
// Dipanggil setiap kali stok aset berubah (penggunaan, pembelian, atau edit langsung).
// Catatan revisi final: pesan_notifikasi sekarang punya FK aset_id, jadi wajib disertakan.
async function checkStockThreshold(aset) {
  if (!aset) return;
  if (aset.stok < aset.threshold_qty) {
    // Hindari notifikasi duplikat: hanya buat baru kalau belum ada notifikasi
    // restock yang masih aktif (belum resolved) untuk aset ini.
    const { rows: existing } = await pool.query(
      'SELECT 1 FROM pesan_notifikasi WHERE aset_id = $1 AND is_resolved = false LIMIT 1',
      [aset.aset_id]
    );
    if (existing.length === 0) {
      const pesan = `Stok ${aset.nama} tersisa ${aset.stok}. Segera pertimbangkan penambahan stok (threshold: ${aset.threshold_qty}).`;
      await pool.query(
        'INSERT INTO pesan_notifikasi (aset_id, pesan) VALUES ($1, $2)',
        [aset.aset_id, pesan]
      );
    }
  } else {
    // Stok sudah pulih di atas threshold (mis. setelah pencatatan pembelian) - notifikasi lama
    // untuk aset ini tidak relevan lagi, jadi otomatis ditandai selesai supaya hilang dari tampilan.
    await pool.query(
      'UPDATE pesan_notifikasi SET is_resolved = true WHERE aset_id = $1 AND is_resolved = false',
      [aset.aset_id]
    );
  }
}

module.exports = { checkStockThreshold };
