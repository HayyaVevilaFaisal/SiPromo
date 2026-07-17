const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');
const {
  getAllPembelian, getPembelianDetail, createPembelian, updatePembelian, uploadBonPembelian,
  updateStatusPembelian, archivePembelian,
} = require('../controllers/pembelianController');

router.use(authMiddleware);
router.get('/', getAllPembelian); // ?tahunAjaranId=&search=&status=aktif|arsip&statusPembelian=
router.get('/:id', getPembelianDetail);
router.post('/', createPembelian); // body: { vendor_id, tahun_ajaran_id, tanggal, status, catatan, daftar_aset: [{aset_id, qty_in}] } - unit_price diturunkan dari aset.harga
router.put('/:id', updatePembelian); // body sama seperti create
router.patch('/:id/bon', upload.single('bon'), uploadBonPembelian);
router.patch('/:id/status', updateStatusPembelian);
router.patch('/:id/arsip', archivePembelian);

module.exports = router;
