-- Jalankan satu kali pada database yang sudah ada; tidak menghapus data.
BEGIN;
ALTER TABLE pengguna ADD COLUMN IF NOT EXISTS role VARCHAR(20);
-- Role lama yang belum ditentukan menjadi PIC. Kaprodi ditetapkan melalui setup:kaprodi.
UPDATE pengguna SET role = 'PIC Promosi' WHERE role IS NULL;
ALTER TABLE pengguna ALTER COLUMN role SET NOT NULL;
ALTER TABLE pengguna DROP CONSTRAINT IF EXISTS ck_pengguna_role;
ALTER TABLE pengguna ADD CONSTRAINT ck_pengguna_role CHECK (role IN ('PIC Promosi', 'Kaprodi'));
-- Jika email berbeda kapitalisasi ternyata duplikat, selesaikan duplikasi sebelum migrasi.
CREATE UNIQUE INDEX IF NOT EXISTS uq_pengguna_email_lower ON pengguna (LOWER(email));
COMMIT;
