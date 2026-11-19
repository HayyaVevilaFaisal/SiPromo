const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const {
  getAllAset,
  getAsetById,
  createAset,
  updateAset,
  // deleteAset,
} = require('../controllers/asetController');

router.use(authMiddleware);

router.get('/', getAllAset); // ?search=&level=&status=aktif|arsip&hargaMin=&hargaMax=
router.get('/:id', getAsetById);
router.post('/', createAset);
router.put('/:id', updateAset);
// router.delete('/:id', deleteAset);

module.exports = router;
