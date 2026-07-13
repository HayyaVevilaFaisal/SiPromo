const express = require('express');
const router = express.Router();

router.use('/auth', require('./authRoutes'));
router.use('/suvenir', require('./suvenirRoutes'));
router.use('/vendor', require('./vendorRoutes'));
router.use('/lokasi-penyimpanan', require('./lokasiPenyimpananRoutes'));
router.use('/tahun-ajaran', require('./tahunAjaranRoutes'));
router.use('/dimensi-suvenir', require('./dimensiSuvenirRoutes'));
router.use('/penggunaan-suvenir', require('./penggunaanRoutes'));
router.use('/pembelian-suvenir', require('./pembelianRoutes'));
router.use('/notifikasi', require('./notifikasiRoutes'));
router.use('/dashboard', require('./dashboardRoutes'));
router.use('/laporan', require('./laporanRoutes'));

module.exports = router;
