const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const controller = require('../controllers/stokOpnameController');

const router = express.Router();

router.use(authMiddleware);

router.get('/', controller.getAllStokOpname);
router.get('/:id', controller.getStokOpnameDetail);
router.post('/', controller.createStokOpname);
router.put('/:id', controller.updateStokOpname);

module.exports = router;