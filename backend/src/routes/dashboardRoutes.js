const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { getRingkasan } = require('../controllers/dashboardController');

router.use(authMiddleware);
router.get('/', getRingkasan); // ?tahunAjaranId=

module.exports = router;
