const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const {
  getAllVendor, createVendor, updateVendor, archiveVendor, restoreVendor,
} = require('../controllers/vendorController');

router.use(authMiddleware);
router.get('/', getAllVendor);
router.post('/', createVendor);
router.put('/:id', updateVendor);
router.patch('/:id/arsip', archiveVendor);
router.patch('/:id/pulihkan', restoreVendor);

module.exports = router;
