// Mengambil koneksi database PostgreSQL.
const pool = require('../config/db');


// PBI-08 - Data Level Aset.
// Service menangani proses pengambilan data level aset dari database.


// Mengambil seluruh data level aset.
async function getAllLevel() {

  // Menjalankan query untuk mengambil seluruh data level aset.
  const { rows } = await pool.query(
    `
      SELECT *
      FROM level_aset
      ORDER BY level_aset_id ASC
    `
  );


  // Mengembalikan hasil kepada controller.
  return rows;
}


// Mengekspor fungsi service agar dapat digunakan controller.
module.exports = {
  getAllLevel,
};