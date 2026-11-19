// Mengambil service Tahun Ajaran.
const tahunAjaranService =
  require('../services/tahunAjaranService');
const { validateSemesterDates } = require('../utils/semesterDates');


// FR-07, UC-04 - Kelola Data Tahun Ajaran.
//
// Kode lama: tahun diturunkan dari tanggal dan semester.
/*
// Nilai "tahun" sebenarnya diturunkan di frontend
// berdasarkan tanggal_mulai dan semester.
//
// Validasi di backend tetap dipertahankan sebagai
// pengaman jika terdapat request lain langsung ke API.


// Menentukan nilai Tahun Ajaran berdasarkan tanggal mulai,
// tanggal selesai, dan semester.
function deriveTahun(
  tanggalMulai,
  tanggalSelesai,
  semester
) {

  // Mengambil tahun dari tanggal mulai.
  const year =
    new Date(tanggalMulai).getFullYear();


  // Jika tanggal mulai tidak valid.
  if (Number.isNaN(year)) {

    return null;
  }


  // Semester Ganjil dimulai pada tahun pertama
  // dan berakhir pada tahun berikutnya.
  if (semester === 'Ganjil') {

    return `${year}/${year + 1}`;
  }


  // Semester Genap berada pada bagian kedua
  // dari Tahun Ajaran sebelumnya.
  return `${year - 1}/${year}`;
}


*/

// Tahun ajaran memakai tahun awal yang dipilih pengguna dan tahun berikutnya.
function validateTahun(tahun) {
  if (typeof tahun !== 'string' || !/^[1-9][0-9]{3}\/[1-9][0-9]{3}$/.test(tahun)) return false;
  const [awal, akhir] = tahun.split('/').map(Number);
  return akhir === awal + 1;
}

// Mengambil seluruh data Tahun Ajaran.
async function getAllTahunAjaran(
  req,
  res,
  next
) {

  try {

    // Mengambil parameter pencarian dan status.
    const {
      search,
      // status,
    } = req.query;


    // Meminta service mengambil data Tahun Ajaran.
    const tahunAjaran =
      await tahunAjaranService.getAllTahunAjaran(
        // search,
        // status
        search
      );


    // Mengirim hasil kepada frontend.
    res.json(tahunAjaran);

  } catch (err) {

    // Meneruskan error ke middleware error handler.
    next(err);
  }
}


// Menambahkan Tahun Ajaran baru.
async function createTahunAjaran(
  req,
  res,
  next
) {

  try {

    const {
      tahun,
      semester,
      tanggal_mulai,
      tanggal_selesai,
    } = req.body;


    // Validasi request tetap dilakukan di controller.
    if (
      !tahun ||
      !semester ||
      !tanggal_mulai ||
      !tanggal_selesai
    ) {

      return res.status(400).json({
        message:
          'Data tahun ajaran belum lengkap',
      });
    }


    const dateError = validateSemesterDates(tanggal_mulai, tanggal_selesai, typeof tahun === 'string' ? tahun.split('/')[0] : undefined);
    if (dateError) {

      return res.status(400).json({
        message:
          dateError,
      });
    }


    /* Kode validasi lama berdasarkan tanggal dan semester:
    const expectedTahun =
      deriveTahun(
        tanggal_mulai,
        tanggal_selesai,
        semester
      );


    if (
      expectedTahun &&
      tahun !== expectedTahun
    ) {

      return res.status(400).json({
        message:
          `Tahun ajaran tidak konsisten dengan tanggal mulai & semester (seharusnya "${expectedTahun}")`,
      });
    }


    */
    if (!validateTahun(tahun)) {
      return res.status(400).json({
        message: 'Tahun ajaran harus berupa tahun awal/tahun berikutnya, contoh: 2026/2027.',
      });
    }

    // Service menentukan apakah:
    // - membuat data baru, atau
    // - mengaktifkan kembali data lama.
    const tahunAjaran =
      await tahunAjaranService.createTahunAjaran(
        tahun,
        semester,
        tanggal_mulai,
        tanggal_selesai
      );


    res.status(201).json(tahunAjaran);

  } catch (err) {

    // Jika service memberikan statusCode tertentu.
    if (err.statusCode) {

      return res.status(
        err.statusCode
      ).json({
        message: err.message,
      });
    }


    next(err);
  }
}


// Mengubah data Tahun Ajaran.
async function updateTahunAjaran(
  req,
  res,
  next
) {

  try {

    // Mengambil ID Tahun Ajaran.
    const { id } = req.params;


    // Mengambil data perubahan.
    const {
      tahun,
      semester,
      tanggal_mulai,
      tanggal_selesai,
    } = req.body;


    // Memastikan tanggal selesai tidak lebih kecil
    // dari tanggal mulai.
    const dateError = validateSemesterDates(tanggal_mulai, tanggal_selesai, typeof tahun === 'string' ? tahun.split('/')[0] : undefined);
    if (dateError) {

      return res.status(400).json({
        message:
          dateError,
      });
    }


    /* Kode validasi lama berdasarkan tanggal dan semester:
    // Menghitung nilai tahun yang seharusnya.
    const expectedTahun =
      deriveTahun(
        tanggal_mulai,
        tanggal_selesai,
        semester
      );


    // Memastikan nilai tahun konsisten.
    if (
      expectedTahun &&
      tahun !== expectedTahun
    ) {

      return res.status(400).json({
        message:
          `Tahun ajaran tidak konsisten dengan tanggal mulai & semester (seharusnya "${expectedTahun}")`,
      });
    }


    */
    if (!validateTahun(tahun)) {
      return res.status(400).json({
        message: 'Tahun ajaran harus berupa tahun awal/tahun berikutnya, contoh: 2026/2027.',
      });
    }

    // Meminta service memperbarui Tahun Ajaran.
    const tahunAjaran =
      await tahunAjaranService.updateTahunAjaran(
        id,
        tahun,
        semester,
        tanggal_mulai,
        tanggal_selesai
      );


    // Jika data tidak ditemukan atau sudah dihapus.
    if (!tahunAjaran) {

      return res.status(404).json({
        message:
          'Tahun ajaran tidak ditemukan',
      });
    }


    // Mengirim hasil perubahan.
    res.json(tahunAjaran);

  } catch (err) {

    // Menangani duplikasi Tahun Ajaran.
    if (err.code === '23505') {

      return res.status(400).json({
        message:
          'Tahun ajaran dengan tahun & semester ini sudah ada',
      });
    }


    // Meneruskan error lainnya.
    next(err);
  }
}


// Menghapus Tahun Ajaran.
// async function deleteTahunAjaran(
//   req,
//   res,
//   next
// ) {
//
//   try {
//
//     // Mengambil ID Tahun Ajaran.
//     const { id } = req.params;
//
//
//     // Meminta service melakukan soft delete.
//     const tahunAjaran =
//       await tahunAjaranService.deleteTahunAjaran(
//         id
//       );
//
//
//     // Jika Tahun Ajaran tidak ditemukan
//     // atau sudah pernah dihapus.
//     if (!tahunAjaran) {
//
//       return res.status(404).json({
//         message:
//           'Tahun ajaran tidak ditemukan',
//       });
//     }
//
//
//     // Mengirim informasi bahwa data berhasil dihapus.
//     res.json({
//       message:
//         'Tahun ajaran berhasil dihapus',
//       data: tahunAjaran,
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
  getAllTahunAjaran,
  createTahunAjaran,
  updateTahunAjaran,
  // deleteTahunAjaran,
};
