// Mengambil service Aset.
const asetService =
  require('../services/asetService');


// FR-03, FR-04, UC-01 - Kelola Data Aset.
//
// Vendor hanya berasal dari transaksi pembelian Lunas terbaru.
//
// level_aset_id bersifat opsional
// sehingga dapat bernilai NULL.


// Mengambil seluruh data aset.
async function getAllAset(
  req,
  res,
  next
) {

  try {

    // Mengambil parameter filter dari URL.
    const {
      search,
      level,
      // status,
      status,
      lokasi,
      hargaMin,
      hargaMax,
    } = req.query;


    // Meminta service mengambil data aset.
    const aset =
      await asetService.getAllAset(
        search,
        level,
        // status,
        lokasi,
        hargaMin,
        // hargaMax
        hargaMax,
        status
      );


    // Mengirim hasil kepada frontend.
    res.json(aset);

  } catch (err) {

    // Meneruskan error ke middleware error handler.
    next(err);
  }
}


// Mengambil satu aset berdasarkan ID.
async function getAsetById(
  req,
  res,
  next
) {

  try {

    // Mengambil ID aset dari URL.
    const { id } = req.params;


    // Meminta service mencari aset.
    const aset =
      await asetService.getAsetById(id);


    // Jika aset tidak ditemukan.
    if (!aset) {

      return res.status(404).json({
        message:
          'Aset tidak ditemukan',
      });
    }


    // Mengirim data aset kepada frontend.
    res.json(aset);

  } catch (err) {

    // Meneruskan error.
    next(err);
  }
}


// Menambahkan aset baru.
async function createAset(
  req,
  res,
  next
) {

  try {

    // Mengambil data aset dari request body.
    const {
      nama,
      level_aset_id,
      lokasi_penyimpanan_id,
      harga,
      stok,
      threshold_qty,
      // vendor_id, -- Relasi langsung aset-vendor dinonaktifkan
    } = req.body;


    // Memastikan data wajib telah diisi.
    //
    // Level tidak wajib karena boleh NULL.
    if (
      !nama ||
      !lokasi_penyimpanan_id ||
      harga == null
    ) {

      return res.status(400).json({
        message:
          'Data aset belum lengkap',
      });
    }


    // Meminta service membuat aset baru.
    const aset =
      await asetService.createAset(
        nama,
        level_aset_id,
        lokasi_penyimpanan_id,
        harga,
        stok,
        threshold_qty
        // vendor_id -- Relasi langsung aset-vendor dinonaktifkan
      );


    // Mengirim aset yang berhasil dibuat.
    res.status(201).json(aset);

  } catch (err) {

    // Meneruskan error.
    next(err);
  }
}


// Mengubah data aset.
async function updateAset(
  req,
  res,
  next
) {

  try {

    // Mengambil ID aset dari URL.
    const { id } = req.params;


    // Mengambil data perubahan dari request body.
    const {
      nama,
      level_aset_id,
      lokasi_penyimpanan_id,
      harga,
      stok,
      threshold_qty,
    } = req.body;


    // Meminta service memperbarui aset.
    const aset =
      await asetService.updateAset(
        id,
        nama,
        level_aset_id,
        lokasi_penyimpanan_id,
        harga,
        stok,
        threshold_qty
      );


    // Jika aset tidak ditemukan.
    if (!aset) {

      return res.status(404).json({
        message:
          'Aset tidak ditemukan',
      });
    }


    // Mengirim aset yang berhasil diperbarui.
    res.json(aset);

  } catch (err) {

    // Meneruskan error.
    next(err);
  }
}


// Menghapus aset.
// async function deleteAset(
//   req,
//   res,
//   next
// ) {
//
//   try {
//
//     // Mengambil ID aset dari URL.
//     const { id } = req.params;
//
//
//     // Meminta service melakukan soft delete.
//     const aset =
//       await asetService.deleteAset(id);
//
//
//     // Jika aset tidak ditemukan
//     // atau sudah pernah dihapus.
//     if (!aset) {
//
//       return res.status(404).json({
//         message:
//           'Aset tidak ditemukan',
//       });
//     }
//
//
//     // Mengirim informasi bahwa aset berhasil dihapus.
//     res.json({
//       message:
//         'Aset berhasil dihapus',
//       data: aset,
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
  getAllAset,
  getAsetById,
  createAset,
  updateAset,
  // deleteAset,
};
