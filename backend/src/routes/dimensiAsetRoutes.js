const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { getAllDimensi, createDimensi } = require('../controllers/dimensiAsetController');

router.use(authMiddleware);
router.get('/', getAllDimensi);
router.post('/', createDimensi);

module.exports = router;
