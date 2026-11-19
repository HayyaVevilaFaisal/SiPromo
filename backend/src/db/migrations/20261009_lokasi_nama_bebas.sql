-- Memperbolehkan perubahan nama lokasi tanpa menghapus data lokasi/aset.
ALTER TABLE lokasi_penyimpanan
    DROP CONSTRAINT IF EXISTS ck_lokasi_penyimpanan_nama;
