const pembelianService =
  require('../services/pembelianService');


// Status pembayaran yang diperbolehkan.
const STATUS_PEMBELIAN = [
  'Belum Bayar',
  'DP',
  'Lunas',
];


// Mengambil seluruh pencatatan pembelian.
async function getAllPembelian(
  req,
  res,
  next
) {

  try {

    const {
      tahunAjaranId,
      search,
      statusPembelian,
    } = req.query;


    const pembelian =
      await pembelianService.getAllPembelian(
        tahunAjaranId,
        search,
        statusPembelian
      );


    res.json(pembelian);

  } catch (err) {

    next(err);
  }
}


// Mengambil detail pembelian.
async function getPembelianDetail(
  req,
  res,
  next
) {

  try {

    const { id } = req.params;


    const pembelian =
      await pembelianService.getPembelianDetail(id);


    if (!pembelian) {

      return res.status(404).json({
        message:
          'Pembelian tidak ditemukan',
      });
    }


    res.json(pembelian);

  } catch (err) {

    next(err);
  }
}


// Membuat pencatatan pembelian.
async function createPembelian(
  req,
  res,
  next
) {

  try {

    const {
      vendor_id,
      tahun_ajaran_id,
      tanggal,
      status,
      catatan,
      daftar_aset,
    } = req.body;


    // Memastikan data wajib tersedia.
    if (
      !vendor_id ||
      !tahun_ajaran_id ||
      !tanggal ||
      !status ||
      !Array.isArray(daftar_aset) ||
      daftar_aset.length === 0
    ) {

      return res.status(400).json({
        message:
          'Data pembelian dan minimal satu aset wajib diisi',
      });
    }


    // Validasi status pembayaran.
    if (
      !STATUS_PEMBELIAN.includes(status)
    ) {

      return res.status(400).json({
        message:
          `Status pembelian tidak valid (harus salah satu dari: ${STATUS_PEMBELIAN.join(', ')})`,
      });
    }


    const result =
      await pembelianService.createPembelian(
        vendor_id,
        tahun_ajaran_id,
        tanggal,
        status,
        catatan,
        daftar_aset
      );


    res.status(201).json(result);

  } catch (err) {

    next(err);
  }
}


// Mengubah pencatatan pembelian.
async function updatePembelian(
  req,
  res,
  next
) {

  try {

    const { id } = req.params;


    const {
      vendor_id,
      tahun_ajaran_id,
      tanggal,
      status,
      catatan,
      daftar_aset,
    } = req.body;


    // Validasi data wajib.
    if (
      !vendor_id ||
      !tahun_ajaran_id ||
      !tanggal ||
      !status ||
      !Array.isArray(daftar_aset) ||
      daftar_aset.length === 0
    ) {

      return res.status(400).json({
        message:
          'Data pembelian dan minimal satu aset wajib diisi',
      });
    }


    // Validasi status pembayaran.
    if (
      !STATUS_PEMBELIAN.includes(status)
    ) {

      return res.status(400).json({
        message:
          `Status pembelian tidak valid (harus salah satu dari: ${STATUS_PEMBELIAN.join(', ')})`,
      });
    }


    const result =
      await pembelianService.updatePembelian(
        id,
        vendor_id,
        tahun_ajaran_id,
        tanggal,
        status,
        catatan,
        daftar_aset
      );


    if (!result) {

      return res.status(404).json({
        message:
          'Pembelian tidak ditemukan',
      });
    }


    res.json(result);

  } catch (err) {

    next(err);
  }
}


// Mengunggah bon pembelian.
async function uploadBonPembelian(
  req,
  res,
  next
) {

  try {

    const { id } = req.params;


    // Memastikan file telah dikirim.
    if (!req.file) {

      return res.status(400).json({
        message:
          'File bon pembelian wajib diunggah',
      });
    }


    const pembelian =
      await pembelianService.uploadBonPembelian(
        id,
        req.file.originalname,
        req.file.filename
      );


    if (!pembelian) {

      return res.status(404).json({
        message:
          'Pembelian tidak ditemukan',
      });
    }


    res.json(pembelian);

  } catch (err) {

    next(err);
  }
}


// Mengubah status pembayaran pembelian.
async function updateStatusPembelian(
  req,
  res,
  next
) {

  try {

    const { id } = req.params;

    const { status } = req.body;


    // Validasi status.
    if (
      !STATUS_PEMBELIAN.includes(status)
    ) {

      return res.status(400).json({
        message:
          `Status pembelian tidak valid (harus salah satu dari: ${STATUS_PEMBELIAN.join(', ')})`,
      });
    }


    const pembelian =
      await pembelianService.updateStatusPembelian(
        id,
        status
      );


    if (!pembelian) {

      return res.status(404).json({
        message:
          'Pembelian tidak ditemukan',
      });
    }


    res.json(pembelian);

  } catch (err) {

    next(err);
  }
}

module.exports = {
  getAllPembelian,
  getPembelianDetail,
  createPembelian,
  updatePembelian,
  uploadBonPembelian,
  updateStatusPembelian,
};