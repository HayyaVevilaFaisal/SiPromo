const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const {
  getAllSuvenir,
  getSuvenirById,
  createSuvenir,
  updateSuvenir,
  archiveSuvenir,
  restoreSuvenir,
} = require('../controllers/suvenirController');

router.use(authMiddleware);

router.get('/', getAllSuvenir); // ?search=&dimensi=&status=aktif|arsip&hargaMin=&hargaMax=
router.get('/:id', getSuvenirById);
router.post('/', createSuvenir);
router.put('/:id', updateSuvenir);
router.patch('/:id/arsip', archiveSuvenir);
router.patch('/:id/pulihkan', restoreSuvenir);

module.exports = router;
