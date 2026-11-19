BEGIN;

-- Email menjadi nama sementara sampai profil Google tersedia.
-- Kolom password lama diisi kosong untuk memenuhi skema database.
INSERT INTO pengguna (email, password, nama_lengkap, role, is_active)
VALUES
    ('mariskha@unpar.ac.id', '', 'mariskha@unpar.ac.id', 'Kaprodi', TRUE),
    ('maria.veronica@unpar.ac.id', '', 'maria.veronica@unpar.ac.id', 'PIC Promosi', TRUE)
ON CONFLICT (LOWER(email)) DO UPDATE
SET role = EXCLUDED.role, is_active = TRUE
WHERE pengguna.role IS DISTINCT FROM EXCLUDED.role OR pengguna.is_active IS DISTINCT FROM TRUE;

COMMIT;
