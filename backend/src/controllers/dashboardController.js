const dashboardService =
  require('../services/dashboardService');


// FR-02, UC-08 - Dashboard Ringkasan Aset.


// Mengambil seluruh ringkasan Dashboard.
async function getRingkasan(
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


    // Meminta service mengambil
    // seluruh data Dashboard.
    const ringkasan =
      await dashboardService.getRingkasan(
        tahunAjaranId
      );


    // Mengirim hasil kepada frontend.
    res.json(ringkasan);

  } catch (err) {

    // Meneruskan error ke middleware error handler.
    next(err);
  }
}


// Mengekspor controller.
module.exports = {
  getRingkasan,
};