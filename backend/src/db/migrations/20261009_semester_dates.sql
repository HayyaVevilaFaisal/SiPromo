BEGIN;
ALTER TABLE tahun_ajaran DROP CONSTRAINT IF EXISTS ck_tahun_ajaran_tanggal;
-- Data lama tetap tersimpan; aturan berlaku untuk setiap insert/update berikutnya.
ALTER TABLE tahun_ajaran ADD CONSTRAINT ck_tahun_ajaran_tanggal
    CHECK (tanggal_selesai > tanggal_mulai
        AND tanggal_selesai <= (tanggal_mulai + INTERVAL '7 months')::date) NOT VALID;
COMMIT;
