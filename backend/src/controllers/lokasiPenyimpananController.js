// Mengambil service Lokasi Penyimpanan.
const lokasiPenyimpananService =
  require('../services/lokasiPenyimpananService');


// Mengambil seluruh lokasi penyimpanan.
async function getAllLokasi(req, res, next) {

  try {

    // Mengambil parameter pencarian dan status.
    const {
      search,
      // status,
    } = req.query;


    // Meminta service mengambil data lokasi.
    const lokasi =
      await lokasiPenyimpananService.getAllLokasi(
        // search,
        // status
        search
      );


    // Mengirim hasil kepada frontend.
    res.json(lokasi);

  } catch (err) {

    // Meneruskan error ke error handler.
    next(err);
  }
}


// Menambahkan lokasi penyimpanan baru.
async function createLokasi(req, res, next) {

  try {

    // Mengambil data lokasi dari request body.
    const {
      nama,
      deskripsi,
    } = req.body;


    // Memastikan nama lokasi diisi.
    if (!nama) {

      return res.status(400).json({
        message:
          'Nama lokasi wajib diisi',
      });
    }


    // Meminta service menambahkan lokasi baru.
    const lokasi =
      await lokasiPenyimpananService.createLokasi(
        nama,
        deskripsi
      );


    // Mengirim lokasi yang berhasil dibuat.
    res.status(201).json(lokasi);

  } catch (err) {

    // Meneruskan error.
    next(err);
  }
}


// Mengubah data lokasi penyimpanan.
async function updateLokasi(req, res, next) {

  try {

    // Mengambil ID lokasi dari URL.
    const { id } = req.params;


    // Mengambil data perubahan.
    const {
      nama,
      deskripsi,
    } = req.body;


    // Meminta service memperbarui lokasi.
    const lokasi =
      await lokasiPenyimpananService.updateLokasi(
        id,
        nama,
        deskripsi
      );


    // Jika lokasi tidak ditemukan
    // atau sudah dihapus.
    if (!lokasi) {

      return res.status(404).json({
        message:
          'Lokasi penyimpanan tidak ditemukan',
      });
    }


    // Mengirim lokasi yang berhasil diperbarui.
    res.json(lokasi);

  } catch (err) {

    // Meneruskan error.
    next(err);
  }
}


// Menghapus lokasi penyimpanan.
// async function deleteLokasi(req, res, next) {
//
//   try {
//
//     // Mengambil ID lokasi dari URL.
//     const { id } = req.params;
//
//
//     // Meminta service melakukan soft delete.
//     const lokasi =
//       await lokasiPenyimpananService.deleteLokasi(
//         id
//       );
//
//
//     // Jika lokasi tidak ditemukan
//     // atau sudah pernah dihapus.
//     if (!lokasi) {
//
//       return res.status(404).json({
//         message:
//           'Lokasi penyimpanan tidak ditemukan',
//       });
//     }
//
//
//     // Mengirim informasi bahwa lokasi berhasil dihapus.
//     res.json({
//       message:
//         'Lokasi penyimpanan berhasil dihapus',
//       data: lokasi,
//     });
//
//   } catch (err) {
//
//     // Meneruskan error.
//     next(err);
//   }
// }


// Mengekspor seluruh controller.
module.exports = {
  getAllLokasi,
  createLokasi,
  updateLokasi,
  // deleteLokasi,
};