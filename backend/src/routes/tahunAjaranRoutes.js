const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const {
//   getAllTahunAjaran, createTahunAjaran, updateTahunAjaran, deleteTahunAjaran,
  getAllTahunAjaran, createTahunAjaran, updateTahunAjaran,
} = require('../controllers/tahunAjaranController');

router.use(authMiddleware);
router.get('/', getAllTahunAjaran);
router.post('/', createTahunAjaran);
router.put('/:id', updateTahunAjaran);
// router.delete('/:id', deleteTahunAjaran);

module.exports = router;
