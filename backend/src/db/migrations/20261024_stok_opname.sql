-- Untuk database yang sudah ada; tidak menghapus data.
BEGIN;
-- Stok opname menyimpan snapshot; selisih dihitung fisik - sistem oleh aplikasi.
CREATE TABLE IF NOT EXISTS stok_opname (
    stok_opname_id SERIAL PRIMARY KEY,
    tahun_ajaran_id INTEGER NOT NULL REFERENCES tahun_ajaran(tahun_ajaran_id) ON DELETE RESTRICT,
    tanggal DATE NOT NULL,
    catatan TEXT
);
CREATE TABLE IF NOT EXISTS detail_stok_opname (
    stok_opname_id INTEGER NOT NULL REFERENCES stok_opname(stok_opname_id) ON DELETE CASCADE,
    aset_id INTEGER NOT NULL REFERENCES aset(aset_id) ON DELETE RESTRICT,
    stok_sistem INTEGER NOT NULL CHECK (stok_sistem >= 0),
    stok_fisik INTEGER NOT NULL CHECK (stok_fisik >= 0),
    PRIMARY KEY (stok_opname_id, aset_id)
);
CREATE INDEX IF NOT EXISTS idx_stok_opname_periode ON stok_opname(tahun_ajaran_id, tanggal);

COMMIT;
