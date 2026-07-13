const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const {
  getAllTahunAjaran, createTahunAjaran, updateTahunAjaran, archiveTahunAjaran, restoreTahunAjaran,
} = require('../controllers/tahunAjaranController');

router.use(authMiddleware);
router.get('/', getAllTahunAjaran);
router.post('/', createTahunAjaran);
router.put('/:id', updateTahunAjaran);
router.patch('/:id/arsip', archiveTahunAjaran);
router.patch('/:id/pulihkan', restoreTahunAjaran);

module.exports = router;
