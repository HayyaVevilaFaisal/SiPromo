-- Opsional untuk database lama: hapus kolom identitas penyedia login lama.
-- Password dan seluruh akun pengguna tetap dipertahankan.
BEGIN;
ALTER TABLE pengguna DROP COLUMN IF EXISTS google_sub;
COMMIT;
