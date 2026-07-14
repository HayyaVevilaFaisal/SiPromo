const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const {
  getAllAset,
  getAsetById,
  createAset,
  updateAset,
  archiveAset,
  restoreAset,
} = require('../controllers/asetController');

router.use(authMiddleware);

router.get('/', getAllAset); // ?search=&dimensi=&status=aktif|arsip&hargaMin=&hargaMax=
router.get('/:id', getAsetById);
router.post('/', createAset);
router.put('/:id', updateAset);
router.patch('/:id/arsip', archiveAset);
router.patch('/:id/pulihkan', restoreAset);

module.exports = router;
