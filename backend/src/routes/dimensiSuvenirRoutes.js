const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { getAllDimensi, createDimensi } = require('../controllers/dimensiSuvenirController');

router.use(authMiddleware);
router.get('/', getAllDimensi);
router.post('/', createDimensi);

module.exports = router;
