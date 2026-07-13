const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const {
  getAllKegiatan, getKegiatanDetail, createPenggunaan, archiveKegiatan,
} = require('../controllers/penggunaanController');

router.use(authMiddleware);
router.get('/', getAllKegiatan); // ?tahunAjaranId=
router.get('/:id', getKegiatanDetail);
router.post('/', createPenggunaan); // body: { tahun_ajaran_id, nama, tanggal, catatan, daftar_aset: [{aset_id, qty_out}] }
router.patch('/:id/arsip', archiveKegiatan);

module.exports = router;
