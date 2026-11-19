const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const {
//   getAllVendor, createVendor, updateVendor, deleteVendor,
  getAllVendor, createVendor, updateVendor,
} = require('../controllers/vendorController');

router.use(authMiddleware);
router.get('/', getAllVendor);
router.post('/', createVendor);
router.put('/:id', updateVendor);
// router.delete('/:id', deleteVendor);

module.exports = router;
