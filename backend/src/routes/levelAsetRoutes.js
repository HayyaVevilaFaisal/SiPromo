const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { getAllLevel } = require('../controllers/levelAsetController');

router.use(authMiddleware);
router.get('/', getAllLevel);

module.exports = router;
