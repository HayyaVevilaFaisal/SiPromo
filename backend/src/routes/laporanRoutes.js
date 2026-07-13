const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { getLaporan, exportLaporanPdf } = require('../controllers/laporanController');

router.use(authMiddleware);
router.get('/', getLaporan); // ?tahunAjaranId=
router.get('/export-pdf', exportLaporanPdf); // ?tahunAjaranId=

module.exports = router;
