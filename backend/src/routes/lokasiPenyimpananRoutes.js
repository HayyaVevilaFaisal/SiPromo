const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const {
  getAllLokasi, createLokasi, updateLokasi, archiveLokasi, restoreLokasi,
} = require('../controllers/lokasiPenyimpananController');

router.use(authMiddleware);
router.get('/', getAllLokasi);
router.post('/', createLokasi);
router.put('/:id', updateLokasi);
router.patch('/:id/arsip', archiveLokasi);
router.patch('/:id/pulihkan', restoreLokasi);

module.exports = router;
