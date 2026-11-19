const laporanService =
  require('../services/laporanService');


// FR-18, UC-09
// Mengambil laporan berdasarkan Tahun Ajaran.
async function getLaporan(
  req,
  res,
  next
) {

  try {

    // Mengambil ID Tahun Ajaran
    // dari query parameter.
    const {
      tahunAjaranId,
    } = req.query;


    // Memastikan parameter Tahun Ajaran tersedia.
    if (!tahunAjaranId) {

      return res.status(400).json({
        message:
          'Parameter tahunAjaranId wajib diisi',
      });

    }


    // Meminta service membuat data laporan.
    const laporan =
      await laporanService.buildLaporan(
        tahunAjaranId
      );


    // Jika Tahun Ajaran tidak ditemukan.
    if (!laporan) {

      return res.status(404).json({
        message:
          'Tahun ajaran tidak ditemukan',
      });

    }


    // Mengirim laporan kepada frontend.
    res.json(laporan);

  } catch (err) {

    // Meneruskan error ke middleware error handler.
    next(err);

  }

}


// FR-19, NFR-14, UC-10
// Mengekspor laporan menjadi PDF.
async function exportLaporanPdf(
  req,
  res,
  next
) {

  try {

    // Mengambil ID Tahun Ajaran
    // dari query parameter.
    const {
      tahunAjaranId,
    } = req.query;


    // Memastikan parameter tersedia.
    if (!tahunAjaranId) {

      return res.status(400).json({
        message:
          'Parameter tahunAjaranId wajib diisi',
      });

    }


    // Mengambil data laporan.
    const laporan =
      await laporanService.buildLaporan(
        tahunAjaranId
      );


    // Jika Tahun Ajaran tidak ditemukan.
    if (!laporan) {

      return res.status(404).json({
        message:
          'Tahun ajaran tidak ditemukan',
      });

    }


    // Mengambil data Tahun Ajaran
    // untuk nama file PDF.
    const {
      tahun_ajaran: tahunAjaran,
    } = laporan;


    // Menentukan jenis response sebagai PDF.
    res.setHeader(
      'Content-Type',
      'application/pdf'
    );


    // Menentukan nama file ketika diunduh.
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=laporan-aset-promosi-${tahunAjaran.tahun.replace('/', '-')}-${tahunAjaran.semester}.pdf`
    );


    // Meminta service membuat dokumen PDF.
    const doc =
      laporanService.createLaporanPdf(
        laporan
      );


    // Menghubungkan PDF dengan response.
    doc.pipe(res);


    // Menyelesaikan dokumen PDF.
    doc.end();

  } catch (err) {

    // Meneruskan error ke middleware error handler.
    next(err);

  }

}


module.exports = {
  getLaporan,
  exportLaporanPdf,
};