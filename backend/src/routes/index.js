const express = require('express');
const router = express.Router();

router.use('/auth', require('./authRoutes'));
router.use('/pic', require('./picRoutes'));
router.use('/aset', require('./asetRoutes'));
router.use('/vendor', require('./vendorRoutes'));
router.use('/lokasi-penyimpanan', require('./lokasiPenyimpananRoutes'));
router.use('/tahun-ajaran', require('./tahunAjaranRoutes'));
router.use('/level-aset', require('./levelAsetRoutes'));
router.use('/penggunaan-aset', require('./penggunaanRoutes'));
router.use('/pembelian-aset', require('./pembelianRoutes'));
router.use('/stok-opname', require('./stokOpnameRoutes'));
router.use('/notifikasi', require('./notifikasiRoutes'));
router.use('/dashboard', require('./dashboardRoutes'));
router.use('/laporan', require('./laporanRoutes'));

module.exports = router;
