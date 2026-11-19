require('dotenv').config();
const pool = require('../src/config/db');
const { normalizeEmail, isValidEmail } = require('../src/utils/email');

async function main() {
  const email = normalizeEmail(process.argv[2]);
  const nama = (process.argv[3] || '').trim();
  if (!isValidEmail(email) || email.length > 255 || !nama || nama.length > 150) {
    throw new Error('Gunakan: npm run setup:kaprodi -- email@example.com "Nama Kaprodi"');
  }
  await pool.query(`INSERT INTO pengguna (email, nama_lengkap, password, role, is_active)
    VALUES ($1, $2, '', 'Kaprodi', TRUE)
    ON CONFLICT (LOWER(email)) DO UPDATE SET nama_lengkap = EXCLUDED.nama_lengkap, role = 'Kaprodi', is_active = TRUE`, [email, nama]);
  console.log('Akun Kaprodi berhasil disiapkan. Silakan masuk menggunakan Google.');
}
main().catch(err => { console.error(err.message); process.exitCode = 1; }).finally(() => pool.end());
