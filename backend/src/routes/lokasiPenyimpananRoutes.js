const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const {
//   getAllLokasi, createLokasi, updateLokasi, deleteLokasi,
  getAllLokasi, createLokasi, updateLokasi,
} = require('../controllers/lokasiPenyimpananController');

router.use(authMiddleware);
router.get('/', getAllLokasi);
router.post('/', createLokasi);
router.put('/:id', updateLokasi);
// router.delete('/:id', deleteLokasi);

module.exports = router;
