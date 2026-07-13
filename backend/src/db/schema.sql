-- Skema Basis Data (Revisi Final) - Perangkat Lunak Pengelolaan Aset Promosi
-- Program Studi Informatika UNPAR
-- Sumber: ddl_dan_data_dummy_aset_promosi_revisi_final.sql (disesuaikan dengan ERD revisi)

DROP TABLE IF EXISTS aset_keluar CASCADE;
DROP TABLE IF EXISTS detail_pembelian CASCADE;
DROP TABLE IF EXISTS header_pembelian CASCADE;
DROP TABLE IF EXISTS pesan_notifikasi CASCADE;
DROP TABLE IF EXISTS pengguna CASCADE;
DROP TABLE IF EXISTS aset CASCADE;
DROP TABLE IF EXISTS kegiatan CASCADE;
DROP TABLE IF EXISTS pembelian CASCADE;
DROP TABLE IF EXISTS lokasi_penyimpanan CASCADE;
DROP TABLE IF EXISTS dimensi_suvenir CASCADE;
DROP TABLE IF EXISTS tahun_ajaran CASCADE;
DROP TABLE IF EXISTS vendor CASCADE;

-- 1. Tabel Vendor
-- Atribut alamat dapat berisi alamat toko fisik atau URL toko online.
CREATE TABLE vendor (
    vendor_id SERIAL PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    alamat TEXT NOT NULL,
    nomor_handphone VARCHAR(30),
    email VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_vendor_alamat_tidak_kosong CHECK (BTRIM(alamat) <> '')
);

-- 2. Tabel Tahun_Ajaran
CREATE TABLE tahun_ajaran (
    tahun_ajaran_id SERIAL PRIMARY KEY,
    tahun VARCHAR(9) NOT NULL,
    semester VARCHAR(10) NOT NULL,
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_tahun_ajaran UNIQUE (tahun, semester),
    CONSTRAINT ck_tahun_ajaran_semester CHECK (semester IN ('Ganjil', 'Genap')),
    CONSTRAINT ck_tahun_ajaran_tanggal CHECK (tanggal_selesai >= tanggal_mulai)
);

-- 3. Tabel Dimensi_Suvenir (nilai dibatasi: Kecil, Sedang, Besar)
CREATE TABLE dimensi_suvenir (
    dimensi_suvenir_id SERIAL PRIMARY KEY,
    nama VARCHAR(50) NOT NULL UNIQUE,
    CONSTRAINT ck_dimensi_suvenir_nama CHECK (nama IN ('Kecil', 'Sedang', 'Besar'))
);

-- 4. Tabel Lokasi_Penyimpanan (nilai dibatasi: 9113, 9110, Laboratorium Sertifikasi)
CREATE TABLE lokasi_penyimpanan (
    lokasi_penyimpanan_id SERIAL PRIMARY KEY,
    nama VARCHAR(100) NOT NULL UNIQUE,
    deskripsi TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_lokasi_penyimpanan_nama CHECK (nama IN ('9113', '9110', 'Laboratorium Sertifikasi'))
);

-- 5. Tabel Pembelian (vendor & tahun ajaran disimpan lewat header_pembelian)
CREATE TABLE pembelian (
    pembelian_id SERIAL PRIMARY KEY,
    tanggal DATE NOT NULL,
    status VARCHAR(20) NOT NULL,
    catatan TEXT,
    nama_file VARCHAR(255),
    url_file TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 6. Tabel Kegiatan (kolom skala dihapus pada revisi final)
CREATE TABLE kegiatan (
    kegiatan_id SERIAL PRIMARY KEY,
    tahun_ajaran_id INTEGER NOT NULL,
    nama VARCHAR(150) NOT NULL,
    tanggal DATE NOT NULL,
    catatan TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_kegiatan_tahun_ajaran
        FOREIGN KEY (tahun_ajaran_id) REFERENCES tahun_ajaran(tahun_ajaran_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

-- 7. Tabel Aset (dahulu bernama suvenir; vendor_id dihapus, dimensi opsional)
CREATE TABLE aset (
    aset_id SERIAL PRIMARY KEY,
    dimensi_suvenir_id INTEGER NULL,
    lokasi_penyimpanan_id INTEGER NOT NULL,
    nama VARCHAR(100) NOT NULL,
    harga DECIMAL(12,2) NOT NULL,
    stok INTEGER NOT NULL DEFAULT 0,
    threshold_qty INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_aset_dimensi
        FOREIGN KEY (dimensi_suvenir_id) REFERENCES dimensi_suvenir(dimensi_suvenir_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_aset_lokasi
        FOREIGN KEY (lokasi_penyimpanan_id) REFERENCES lokasi_penyimpanan(lokasi_penyimpanan_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_aset_harga CHECK (harga >= 0),
    CONSTRAINT ck_aset_stok CHECK (stok >= 0),
    CONSTRAINT ck_aset_threshold CHECK (threshold_qty >= 0)
);

-- 8. Tabel Pengguna
CREATE TABLE pengguna (
    pengguna_id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password TEXT NOT NULL,
    nama_lengkap VARCHAR(150) NOT NULL,
    status_aktif BOOLEAN NOT NULL DEFAULT TRUE
);

-- 9. Tabel Pesan_Notifikasi (sekarang memiliki relasi ke aset)
CREATE TABLE pesan_notifikasi (
    pesan_notifikasi_id SERIAL PRIMARY KEY,
    aset_id INTEGER NOT NULL,
    pesan VARCHAR(150) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_pesan_notifikasi_aset
        FOREIGN KEY (aset_id) REFERENCES aset(aset_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

-- 10. Tabel Detail_Pembelian (dahulu pembelian_suvenir)
CREATE TABLE detail_pembelian (
    pembelian_id INTEGER NOT NULL,
    aset_id INTEGER NOT NULL,
    qty_in INTEGER NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    CONSTRAINT pk_detail_pembelian PRIMARY KEY (pembelian_id, aset_id),
    CONSTRAINT fk_detail_pembelian_pembelian
        FOREIGN KEY (pembelian_id) REFERENCES pembelian(pembelian_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_detail_pembelian_aset
        FOREIGN KEY (aset_id) REFERENCES aset(aset_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_detail_pembelian_qty_in CHECK (qty_in > 0),
    CONSTRAINT ck_detail_pembelian_unit_price CHECK (unit_price >= 0)
);

-- 11. Tabel Aset_Keluar (dahulu kegiatan_suvenir)
CREATE TABLE aset_keluar (
    kegiatan_id INTEGER NOT NULL,
    aset_id INTEGER NOT NULL,
    qty_out INTEGER NOT NULL,
    CONSTRAINT pk_aset_keluar PRIMARY KEY (kegiatan_id, aset_id),
    CONSTRAINT fk_aset_keluar_kegiatan
        FOREIGN KEY (kegiatan_id) REFERENCES kegiatan(kegiatan_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_aset_keluar_aset
        FOREIGN KEY (aset_id) REFERENCES aset(aset_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_aset_keluar_qty_out CHECK (qty_out > 0)
);

-- 12. Tabel Header_Pembelian (dahulu pembelian_vendor_tahun) - relasi ternary
CREATE TABLE header_pembelian (
    pembelian_id INTEGER PRIMARY KEY,
    vendor_id INTEGER NOT NULL,
    tahun_ajaran_id INTEGER NOT NULL,
    CONSTRAINT fk_header_pembelian_pembelian
        FOREIGN KEY (pembelian_id) REFERENCES pembelian(pembelian_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_header_pembelian_vendor
        FOREIGN KEY (vendor_id) REFERENCES vendor(vendor_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_header_pembelian_tahun_ajaran
        FOREIGN KEY (tahun_ajaran_id) REFERENCES tahun_ajaran(tahun_ajaran_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);
