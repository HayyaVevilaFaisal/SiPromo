// Mengambil service Penggunaan.
const penggunaanService =
  require('../services/penggunaanService');


// FR-10, FR-11, FR-12, UC-06
// Controller menangani request dan response HTTP
// untuk pencatatan penggunaan aset.


// Mengambil seluruh kegiatan penggunaan.
async function getAllKegiatan(
  req,
  res,
  next
) {

  try {

    // Mengambil parameter filter dari URL.
    const {
      tahunAjaranId,
      search,
      levelAsetId,
    } = req.query;


    // Meminta service mengambil data kegiatan.
    const kegiatan =
      await penggunaanService.getAllKegiatan(
        tahunAjaranId,
        search,
        levelAsetId
      );


    // Mengirim hasil kepada frontend.
    res.json(kegiatan);

  } catch (err) {

    // Meneruskan error ke middleware error handler.
    next(err);
  }
}


// Mengambil detail satu kegiatan.
async function getKegiatanDetail(
  req,
  res,
  next
) {

  try {

    // Mengambil ID kegiatan dari parameter URL.
    const { id } = req.params;


    // Meminta service mengambil detail kegiatan.
    const kegiatan =
      await penggunaanService.getKegiatanDetail(id);


    // Jika kegiatan tidak ditemukan.
    if (!kegiatan) {

      return res.status(404).json({
        message:
          'Kegiatan tidak ditemukan',
      });
    }


    // Mengirim detail kegiatan.
    res.json(kegiatan);

  } catch (err) {

    // Meneruskan error.
    next(err);
  }
}


// Membuat pencatatan penggunaan baru.
async function createPenggunaan(
  req,
  res,
  next
) {

  try {

    // Mengambil data penggunaan dari request body.
    const {
      tahun_ajaran_id,
      nama,
      tanggal,
      catatan,
      daftar_aset,
    } = req.body;


    // Memastikan nama, tanggal,
    // dan minimal satu aset telah diisi.
    if (
      !nama ||
      !tanggal ||
      !Array.isArray(daftar_aset) ||
      daftar_aset.length === 0
    ) {

      return res.status(400).json({
        message:
          'Data kegiatan dan minimal satu aset wajib diisi',
      });
    }


    // Meminta service membuat pencatatan penggunaan.
    const result =
      await penggunaanService.createPenggunaan(
        tahun_ajaran_id,
        nama,
        tanggal,
        catatan,
        daftar_aset
      );


    // Mengirim hasil kepada frontend.
    res.status(201).json(result);

  } catch (err) {

    // Meneruskan error ke middleware error handler.
    next(err);
  }
}


// Mengubah pencatatan penggunaan.
async function updatePenggunaan(
  req,
  res,
  next
) {

  try {

    // Mengambil ID kegiatan.
    const { id } = req.params;


    // Mengambil data perubahan.
    const {
      tahun_ajaran_id,
      nama,
      tanggal,
      catatan,
      daftar_aset,
    } = req.body;


    // Memastikan data kegiatan
    // dan minimal satu aset telah diisi.
    if (
      !nama ||
      !tanggal ||
      !Array.isArray(daftar_aset) ||
      daftar_aset.length === 0
    ) {

      return res.status(400).json({
        message:
          'Data kegiatan dan minimal satu aset wajib diisi',
      });
    }


    // Meminta service memperbarui penggunaan.
    const result =
      await penggunaanService.updatePenggunaan(
        id,
        tahun_ajaran_id,
        nama,
        tanggal,
        catatan,
        daftar_aset
      );


    // Jika kegiatan tidak ditemukan.
    if (!result) {

      return res.status(404).json({
        message:
          'Kegiatan tidak ditemukan',
      });
    }


    // Mengirim hasil perubahan.
    res.json(result);

  } catch (err) {

    // Meneruskan error.
    next(err);
  }
}

// Mengekspor seluruh controller.
module.exports = {
  getAllKegiatan,
  getKegiatanDetail,
  createPenggunaan,
  updatePenggunaan,
};
