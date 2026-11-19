DROP TABLE IF EXISTS detail_stok_opname CASCADE;
DROP TABLE IF EXISTS stok_opname CASCADE;
DROP TABLE IF EXISTS aset_keluar CASCADE;
DROP TABLE IF EXISTS kegiatan_suvenir CASCADE;
DROP TABLE IF EXISTS detail_pembelian CASCADE;
DROP TABLE IF EXISTS pembelian_suvenir CASCADE;
DROP TABLE IF EXISTS header_pembelian CASCADE;
DROP TABLE IF EXISTS pembelian_vendor_tahun CASCADE;
DROP TABLE IF EXISTS pesan_notifikasi CASCADE;
DROP TABLE IF EXISTS pengguna CASCADE;
DROP TABLE IF EXISTS aset CASCADE;
DROP TABLE IF EXISTS suvenir CASCADE;
DROP TABLE IF EXISTS kegiatan CASCADE;
DROP TABLE IF EXISTS pembelian CASCADE;
DROP TABLE IF EXISTS lokasi_penyimpanan CASCADE;
DROP TABLE IF EXISTS dimensi_suvenir CASCADE;
DROP TABLE IF EXISTS level_aset CASCADE;
DROP TABLE IF EXISTS tahun_ajaran CASCADE;
DROP TABLE IF EXISTS vendor CASCADE;

-- ============================================================
-- 1. Tabel Vendor
-- Atribut alamat dapat berisi alamat toko fisik atau URL toko online,
-- misalnya tautan toko di Shopee atau Tokopedia.
-- ============================================================
CREATE TABLE vendor (
    vendor_id SERIAL PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    alamat TEXT NOT NULL,
    nomor_handphone VARCHAR(30),
    email VARCHAR(100),
    -- is_active BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT ck_vendor_alamat_tidak_kosong
        CHECK (BTRIM(alamat) <> '')
);

-- ============================================================
-- 2. Tabel Tahun_Ajaran
-- ============================================================
CREATE TABLE tahun_ajaran (
    tahun_ajaran_id SERIAL PRIMARY KEY,
    tahun VARCHAR(9) NOT NULL,
    semester VARCHAR(10) NOT NULL,
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE NOT NULL,
    -- is_active BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT uq_tahun_ajaran UNIQUE (tahun, semester),
    CONSTRAINT ck_tahun_ajaran_semester
        -- CHECK (semester IN ('Ganjil', 'Genap')), -- Aturan lama
        CHECK (semester IN ('SP', 'Ganjil', 'Genap')),
    CONSTRAINT ck_tahun_ajaran_tanggal
        CHECK (tanggal_selesai > tanggal_mulai
            AND tanggal_selesai <= (tanggal_mulai + INTERVAL '7 months')::date)
);

-- ============================================================
-- 3. Tabel Level_Aset
-- Level aset dibatasi menjadi Sederhana, Menengah, dan Mewah.
-- ============================================================
CREATE TABLE level_aset (
    level_aset_id SERIAL PRIMARY KEY,
    nama VARCHAR(50) NOT NULL UNIQUE,

    CONSTRAINT ck_level_aset_nama
        CHECK (nama IN ('Sederhana', 'Menengah', 'Mewah'))
);

-- ============================================================
-- 4. Tabel Lokasi_Penyimpanan
-- Nama lokasi dapat diubah dan ditambahkan sesuai kebutuhan.
-- ============================================================
CREATE TABLE lokasi_penyimpanan (
    lokasi_penyimpanan_id SERIAL PRIMARY KEY,
    nama VARCHAR(100) NOT NULL UNIQUE,
    -- deskripsi TEXT, -- Kode lama
    deskripsi TEXT
    -- is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================
-- 5. Tabel Pembelian
-- Vendor dan tahun ajaran pembelian disimpan melalui relasi ternary
-- pada tabel header_pembelian.
-- ============================================================
CREATE TABLE pembelian (
    pembelian_id SERIAL PRIMARY KEY,
    tanggal DATE NOT NULL,
    status VARCHAR(20) NOT NULL,
    catatan TEXT,
    nama_file VARCHAR(255),
    url_file TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================
-- 6. Tabel Kegiatan
-- Relasi Berlangsung_Pada ditransformasikan dengan menempatkan
-- tahun_ajaran_id sebagai foreign key pada tabel kegiatan.
-- ============================================================
CREATE TABLE kegiatan (
    kegiatan_id SERIAL PRIMARY KEY,
    tahun_ajaran_id INTEGER NOT NULL,
    nama VARCHAR(150) NOT NULL,
    tanggal DATE NOT NULL,
    catatan TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_kegiatan_tahun_ajaran
        FOREIGN KEY (tahun_ajaran_id)
        REFERENCES tahun_ajaran(tahun_ajaran_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- ============================================================
-- 7. Tabel Aset
-- Nama tabel dan primary key telah disesuaikan menjadi aset dan aset_id.
-- Level aset bersifat opsional sehingga level_aset_id boleh NULL.
-- Vendor aset ditentukan melalui transaksi pembelian Lunas terbaru.
-- ============================================================
CREATE TABLE aset (
    aset_id SERIAL PRIMARY KEY,
    level_aset_id INTEGER NULL,
    -- vendor_id INTEGER NULL REFERENCES vendor(vendor_id) ON DELETE RESTRICT,
    lokasi_penyimpanan_id INTEGER NOT NULL,
    nama VARCHAR(100) NOT NULL,
    harga DECIMAL(12,2) NOT NULL,
    stok INTEGER NOT NULL DEFAULT 0,
    threshold_qty INTEGER NOT NULL DEFAULT 0,
    -- is_active BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_aset_level
        FOREIGN KEY (level_aset_id)
        REFERENCES level_aset(level_aset_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_aset_lokasi
        FOREIGN KEY (lokasi_penyimpanan_id)
        REFERENCES lokasi_penyimpanan(lokasi_penyimpanan_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT ck_aset_harga CHECK (harga >= 0),
    CONSTRAINT ck_aset_stok CHECK (stok >= 0),
    CONSTRAINT ck_aset_threshold CHECK (threshold_qty >= 0)
);

-- ============================================================
-- 8. Tabel Pengguna
-- Role membedakan PIC promosi dan Kaprodi untuk pengaturan akses.
-- ============================================================
CREATE TABLE pengguna (
    pengguna_id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password TEXT NOT NULL,
    nama_lengkap VARCHAR(150) NOT NULL,
    role VARCHAR(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT ck_pengguna_role
        CHECK (role IN ('PIC Promosi', 'Kaprodi'))
);

CREATE UNIQUE INDEX uq_pengguna_email_lower ON pengguna (LOWER(email));

-- ============================================================
-- 9. Tabel Pesan_Notifikasi
-- Relasi Memicu ditransformasikan dengan menempatkan aset_id
-- sebagai foreign key pada tabel pesan_notifikasi. Satu aset dapat
-- memicu banyak pesan notifikasi dan setiap pesan merujuk satu aset.
-- ============================================================
CREATE TABLE pesan_notifikasi (
    pesan_notifikasi_id SERIAL PRIMARY KEY,
    aset_id INTEGER NOT NULL,
    pesan VARCHAR(150) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT fk_pesan_notifikasi_aset
        FOREIGN KEY (aset_id)
        REFERENCES aset(aset_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- ============================================================
-- 10. Tabel Detail_Pembelian
-- Tabel penghubung relasi many-to-many antara Pembelian dan Aset.
-- ============================================================
CREATE TABLE detail_pembelian (
    pembelian_id INTEGER NOT NULL,
    aset_id INTEGER NOT NULL,
    qty_in INTEGER NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,

    CONSTRAINT pk_detail_pembelian
        PRIMARY KEY (pembelian_id, aset_id),

    CONSTRAINT fk_detail_pembelian_pembelian
        FOREIGN KEY (pembelian_id)
        REFERENCES pembelian(pembelian_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_detail_pembelian_aset
        FOREIGN KEY (aset_id)
        REFERENCES aset(aset_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT ck_detail_pembelian_qty_in CHECK (qty_in > 0),
    CONSTRAINT ck_detail_pembelian_unit_price CHECK (unit_price >= 0)
);

-- ============================================================
-- 11. Tabel Aset_Keluar
-- Tabel penghubung relasi many-to-many antara Kegiatan dan Aset.
-- ============================================================
CREATE TABLE aset_keluar (
    kegiatan_id INTEGER NOT NULL,
    aset_id INTEGER NOT NULL,
    qty_out INTEGER NOT NULL,

    CONSTRAINT pk_aset_keluar
        PRIMARY KEY (kegiatan_id, aset_id),

    CONSTRAINT fk_aset_keluar_kegiatan
        FOREIGN KEY (kegiatan_id)
        REFERENCES kegiatan(kegiatan_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_aset_keluar_aset
        FOREIGN KEY (aset_id)
        REFERENCES aset(aset_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT ck_aset_keluar_qty_out CHECK (qty_out > 0)
);

-- ============================================================
-- 12. Tabel Header_Pembelian
-- Tabel ini merepresentasikan relasi ternary antara Pembelian,
-- Vendor, dan Tahun_Ajaran. Pembelian_id menjadi primary key karena
-- setiap pembelian memiliki tepat satu vendor dan satu tahun ajaran.
-- ============================================================
CREATE TABLE header_pembelian (
    pembelian_id INTEGER PRIMARY KEY,
    vendor_id INTEGER NOT NULL,
    tahun_ajaran_id INTEGER NOT NULL,

    CONSTRAINT fk_header_pembelian_pembelian
        FOREIGN KEY (pembelian_id)
        REFERENCES pembelian(pembelian_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_header_pembelian_vendor
        FOREIGN KEY (vendor_id)
        REFERENCES vendor(vendor_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_header_pembelian_tahun_ajaran
        FOREIGN KEY (tahun_ajaran_id)
        REFERENCES tahun_ajaran(tahun_ajaran_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- Stok opname menyimpan snapshot; selisih dihitung fisik - sistem oleh aplikasi.
CREATE TABLE stok_opname (
    stok_opname_id SERIAL PRIMARY KEY,
    tahun_ajaran_id INTEGER NOT NULL REFERENCES tahun_ajaran(tahun_ajaran_id) ON DELETE RESTRICT,
    tanggal DATE NOT NULL,
    catatan TEXT
);
CREATE TABLE detail_stok_opname (
    stok_opname_id INTEGER NOT NULL REFERENCES stok_opname(stok_opname_id) ON DELETE CASCADE,
    aset_id INTEGER NOT NULL REFERENCES aset(aset_id) ON DELETE RESTRICT,
    stok_sistem INTEGER NOT NULL CHECK (stok_sistem >= 0),
    stok_fisik INTEGER NOT NULL CHECK (stok_fisik >= 0),
    PRIMARY KEY (stok_opname_id, aset_id)
);
CREATE INDEX idx_stok_opname_periode ON stok_opname(tahun_ajaran_id, tanggal);

-- ============================================================
-- Reset sequence agar ID otomatis berikutnya tidak bentrok
-- dengan data dummy yang dimasukkan secara eksplisit.
-- ============================================================
SELECT setval(pg_get_serial_sequence('vendor', 'vendor_id'), COALESCE(MAX(vendor_id), 1), TRUE) FROM vendor;
SELECT setval(pg_get_serial_sequence('tahun_ajaran', 'tahun_ajaran_id'), COALESCE(MAX(tahun_ajaran_id), 1), TRUE) FROM tahun_ajaran;
SELECT setval(pg_get_serial_sequence('level_aset', 'level_aset_id'), COALESCE(MAX(level_aset_id), 1), TRUE) FROM level_aset;
SELECT setval(pg_get_serial_sequence('lokasi_penyimpanan', 'lokasi_penyimpanan_id'), COALESCE(MAX(lokasi_penyimpanan_id), 1), TRUE) FROM lokasi_penyimpanan;
SELECT setval(pg_get_serial_sequence('pembelian', 'pembelian_id'), COALESCE(MAX(pembelian_id), 1), TRUE) FROM pembelian;
SELECT setval(pg_get_serial_sequence('kegiatan', 'kegiatan_id'), COALESCE(MAX(kegiatan_id), 1), TRUE) FROM kegiatan;
SELECT setval(pg_get_serial_sequence('aset', 'aset_id'), COALESCE(MAX(aset_id), 1), TRUE) FROM aset;
SELECT setval(pg_get_serial_sequence('pengguna', 'pengguna_id'), COALESCE(MAX(pengguna_id), 1), TRUE) FROM pengguna;
SELECT setval(pg_get_serial_sequence('pesan_notifikasi', 'pesan_notifikasi_id'), COALESCE(MAX(pesan_notifikasi_id), 1), TRUE) FROM pesan_notifikasi;
