-- Aturan lama dipertahankan sebagai referensi:
-- CONSTRAINT ck_tahun_ajaran_semester CHECK (semester IN ('Ganjil', 'Genap'))
-- Mengganti batasan semester tanpa menghapus data tahun ajaran.
BEGIN;
ALTER TABLE tahun_ajaran DROP CONSTRAINT IF EXISTS ck_tahun_ajaran_semester;
ALTER TABLE tahun_ajaran ADD CONSTRAINT ck_tahun_ajaran_semester
    CHECK (semester IN ('SP', 'Ganjil', 'Genap'));
COMMIT;
