const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { getNotifikasi, resolveNotifikasi } = require('../controllers/notifikasiController');

router.use(authMiddleware);
router.get('/', getNotifikasi);
router.patch('/:id/selesai', resolveNotifikasi);

module.exports = router;
