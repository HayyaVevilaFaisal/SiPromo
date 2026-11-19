const vendorService = require('../services/vendorService');


async function getAllVendor(req, res, next) {
  try {

    // Mengambil parameter pencarian dan status dari URL.
    const {
      search,
      // status,
    } = req.query;


    // Meminta service mengambil vendor
    // berdasarkan pencarian dan status.
    const vendors =
      await vendorService.getAllVendor(
        // search,
        // status
        search
      );


    // Mengirim hasil kepada frontend.
    res.json(vendors);

  } catch (err) {

    // Meneruskan error ke error handler.
    next(err);
  }
}


// Menambahkan vendor baru.
async function createVendor(req, res, next) {

  try {

    // Mengambil data vendor dari request body.
    const {
      nama,
      alamat,
      nomor_handphone,
      email,
    } = req.body;


    // Validasi data wajib.
    if (!nama || !alamat || !alamat.trim()) {

      return res.status(400).json({
        message:
          'Nama dan alamat/tautan toko vendor wajib diisi',
      });
    }


    // Meminta service membuat vendor.
    const vendor =
      await vendorService.createVendor(
        nama,
        alamat,
        nomor_handphone,
        email
      );


    // Mengirim vendor yang berhasil dibuat.
    res.status(201).json(vendor);

  } catch (err) {

    // Meneruskan error.
    next(err);
  }
}


// Mengubah data vendor.
async function updateVendor(req, res, next) {

  try {

    // Mengambil ID vendor.
    const { id } = req.params;


    // Mengambil data vendor dari request body.
    const {
      nama,
      alamat,
      nomor_handphone,
      email,
    } = req.body;


    // Validasi alamat vendor.
    if (!alamat || !alamat.trim()) {

      return res.status(400).json({
        message:
          'Alamat/tautan toko vendor wajib diisi',
      });
    }


    // Meminta service memperbarui vendor.
    const vendor =
      await vendorService.updateVendor(
        id,
        nama,
        alamat,
        nomor_handphone,
        email
      );


    // Jika vendor tidak ditemukan atau sudah tidak aktif.
    if (!vendor) {

      return res.status(404).json({
        message: 'Vendor tidak ditemukan',
      });
    }


    // Mengirim vendor yang berhasil diperbarui.
    res.json(vendor);

  } catch (err) {

    // Meneruskan error.
    next(err);
  }
}


// Menghapus vendor.
// async function deleteVendor(req, res, next) {
//
//   try {
//
//     // Mengambil ID vendor dari URL.
//     const { id } = req.params;
//
//
//     // Meminta service melakukan soft delete.
//     const vendor =
//       await vendorService.deleteVendor(id);
//
//
//     // Jika vendor tidak ditemukan
//     // atau sudah pernah dihapus sebelumnya.
//     if (!vendor) {
//
//       return res.status(404).json({
//         message: 'Vendor tidak ditemukan',
//       });
//     }
//
//
//     // Mengirim informasi bahwa vendor berhasil dihapus.
//     res.json({
//       message: 'Vendor berhasil dihapus',
//       data: vendor,
//     });
//
//   } catch (err) {
//
//     // Meneruskan error.
//     next(err);
//   }
// }


// Mengekspor controller.
module.exports = {
  getAllVendor,
  createVendor,
  updateVendor,
  // deleteVendor,
};