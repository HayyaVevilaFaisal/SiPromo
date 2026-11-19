-- Data master tidak memakai status dan tidak memiliki fitur hapus.
-- Simpan nilai status lama dengan nama is_active_legacy agar dapat dipulihkan.
-- DDL lama: is_active BOOLEAN NOT NULL DEFAULT TRUE.
-- Untuk mengembalikan kode lama, rename is_active_legacy menjadi is_active.
-- Migrasi ini tidak menghapus baris atau kolom data.
BEGIN;
DO $$
DECLARE master_table TEXT;
BEGIN
    FOREACH master_table IN ARRAY ARRAY['vendor', 'tahun_ajaran', 'lokasi_penyimpanan', 'aset']
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = current_schema()
                AND table_name = master_table AND column_name = 'is_active'
        ) THEN
            EXECUTE format('ALTER TABLE %I RENAME COLUMN is_active TO is_active_legacy', master_table);
            EXECUTE format('COMMENT ON COLUMN %I.is_active_legacy IS %L', master_table,
                'Status master lama; tidak digunakan aplikasi. Dipertahankan untuk pemulihan kode lama.');
        END IF;
    END LOOP;
END $$;
COMMIT;
