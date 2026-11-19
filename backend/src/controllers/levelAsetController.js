// Mengambil service Level Aset.
const levelAsetService = require('../services/levelAsetService');


// PBI-08 - Data Level Aset.
// Controller menangani request dan response HTTP.


// Mengambil seluruh data level aset.
async function getAllLevel(req, res, next) {

  try {

    // Meminta service mengambil seluruh data level aset.
    const level =
      await levelAsetService.getAllLevel();


    // Mengirim data level aset kepada frontend.
    res.json(level);

  } catch (err) {

    // Meneruskan error ke middleware error handler.
    next(err);
  }
}


// Mengekspor controller agar dapat digunakan route.
module.exports = {
  getAllLevel,
};