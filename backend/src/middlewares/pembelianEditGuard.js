const pool = require('../config/db');
const { canEditSql, editError } = require('../utils/periodeEdit');

module.exports = async function pembelianEditGuard(req, res, next) {
  try {
    const { rows } = await pool.query(`
      SELECT ${canEditSql('hp.tahun_ajaran_id')} AS can_edit
      FROM pembelian p JOIN header_pembelian hp ON hp.pembelian_id = p.pembelian_id
      WHERE p.pembelian_id = $1
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Pembelian tidak ditemukan' });
    if (!rows[0].can_edit) throw editError();
    next();
  } catch (error) { next(error); }
};
