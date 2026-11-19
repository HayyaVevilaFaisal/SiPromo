// Mengambil service Notifikasi.
const notifikasiService =
  require('../services/notifikasiService');


// Controller menangani request dan response HTTP
// untuk fitur notifikasi stok.


// Mengambil seluruh notifikasi yang belum selesai.
async function getNotifikasi(
  req,
  res,
  next
) {

  try {

    // Meminta service mengambil notifikasi
    // yang masih memiliki is_resolved = false.
    const notifikasi =
      await notifikasiService.getNotifikasi();


    // Mengirim data notifikasi kepada frontend.
    res.json(notifikasi);

  } catch (err) {

    // Meneruskan error ke middleware error handler.
    next(err);
  }
}


// Menandai notifikasi sebagai selesai.
async function resolveNotifikasi(
  req,
  res,
  next
) {

  try {

    // Mengambil ID notifikasi dari parameter URL.
    const { id } = req.params;


    // Meminta service mengubah
    // is_resolved menjadi true.
    const notifikasi =
      await notifikasiService.resolveNotifikasi(id);


    // Jika notifikasi tidak ditemukan.
    if (!notifikasi) {

      return res.status(404).json({
        message:
          'Notifikasi tidak ditemukan',
      });
    }


    // Mengirim informasi bahwa
    // notifikasi telah diselesaikan.
    res.json({
      message:
        'Notifikasi berhasil diselesaikan',
      data: notifikasi,
    });

  } catch (err) {

    // Meneruskan error ke middleware error handler.
    next(err);
  }
}


// Mengekspor seluruh controller.
module.exports = {
  getNotifikasi,
  resolveNotifikasi,
};