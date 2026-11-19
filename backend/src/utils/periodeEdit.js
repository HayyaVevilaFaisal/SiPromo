// is_active adalah status data (belum dihapus), bukan penentu periode waktu.
const currentPeriodSql = `(
  SELECT periode.tahun_ajaran_id FROM tahun_ajaran periode
  -- WHERE periode.is_active = true -- Aturan master lama
  -- AND periode.tanggal_mulai <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date
  WHERE periode.tanggal_mulai <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date
  ORDER BY periode.tanggal_mulai DESC, periode.tahun_ajaran_id DESC
  LIMIT 1
)`;

function canEditSql(yearExpression) {
  return `COALESCE(${yearExpression} = ${currentPeriodSql}, false)`;
}

function editError() {
  const error = new Error('Pencatatan hanya dapat diedit pada tahun ajaran terbaru yang sudah berjalan.');
  error.statusCode = 403;
  return error;
}

async function assertPeriodeEdit(client, yearId, targetYearId = yearId, tanggal) {
  const { rows } = await client.query(`
    SELECT periode_berjalan.tahun_ajaran_id,
           periode_berjalan.tanggal_mulai::text AS tanggal_mulai,
           periode_berjalan.tanggal_selesai::text AS tanggal_selesai
    FROM tahun_ajaran periode_berjalan
    WHERE periode_berjalan.tahun_ajaran_id = ${currentPeriodSql}
    FOR SHARE
  `);
  const periode = rows[0];
  if (!periode || Number(yearId) !== Number(periode.tahun_ajaran_id)) throw editError();
  // Periksa tahun ajaran asal sebelum menerima tahun ajaran yang dikirim form.
  if (Number(targetYearId) !== Number(periode.tahun_ajaran_id)) throw editError();
  if (tanggal !== undefined && (typeof tanggal !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(tanggal) ||
      tanggal < periode.tanggal_mulai || tanggal > periode.tanggal_selesai)) {
    const error = new Error('Tanggal pencatatan harus berada dalam tahun ajaran yang sedang berjalan.');
    error.statusCode = 400;
    throw error;
  }
}

module.exports = { currentPeriodSql, canEditSql, assertPeriodeEdit, editError };
