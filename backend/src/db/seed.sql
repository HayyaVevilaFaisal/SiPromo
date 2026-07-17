-- Data contoh (dummy) - Revisi Final - opsional untuk pengujian
-- PENTING: hash password di bawah adalah hash bcrypt ASLI untuk password "password123".
-- (Berbeda dari draf sebelumnya yang memakai teks placeholder dan tidak akan pernah cocok saat login.)

INSERT INTO vendor (vendor_id, nama, alamat, nomor_handphone, email, is_active) VALUES
(1, 'CV Souvenir Bandung', 'Jl. Cihampelas No. 123, Bandung', '081234567890', 'admin@souvenirbandung.co.id', TRUE),
(2, 'Toko Kreatif Jaya', 'https://www.tokopedia.com/tokokreatifjaya', '081298765432', 'kontak@kreatifjaya.co.id', TRUE),
(3, 'Print Media Parahyangan', 'https://shopee.co.id/printmediaparahyangan', '081377788899', 'sales@printparahyangan.co.id', TRUE);

INSERT INTO tahun_ajaran (tahun_ajaran_id, tahun, semester, tanggal_mulai, tanggal_selesai, is_active) VALUES
(1, '2024/2025', 'Ganjil', '2024-08-01', '2024-12-31', FALSE),
(2, '2024/2025', 'Genap', '2025-01-01', '2025-07-31', TRUE),
(3, '2025/2026', 'Ganjil', '2025-08-01', '2025-12-31', TRUE);

INSERT INTO dimensi_aset (dimensi_aset_id, nama) VALUES
(1, 'Kecil'), (2, 'Sedang'), (3, 'Besar');

INSERT INTO lokasi_penyimpanan (lokasi_penyimpanan_id, nama, deskripsi, is_active) VALUES
(1, '9113', 'Penyimpanan aset promosi di ruang 9113.', TRUE),
(2, '9110', 'Penyimpanan aset promosi di ruang 9110.', TRUE),
(3, 'Laboratorium Sertifikasi', 'Penyimpanan aset promosi di Laboratorium Sertifikasi.', TRUE);

INSERT INTO pembelian (pembelian_id, tanggal, status, catatan, nama_file, url_file, is_active) VALUES
(1, '2025-02-10', 'Lunas', 'Pembelian aset untuk kegiatan open house.', 'nota_pembelian_001.pdf', '/uploads/nota_pembelian_001.pdf', TRUE),
(2, '2025-03-05', 'Lunas', 'Pembelian brosur untuk kebutuhan promosi semester genap.', 'nota_pembelian_002.pdf', '/uploads/nota_pembelian_002.pdf', TRUE),
(3, '2025-05-15', 'Belum Bayar', 'Rencana pembelian tambahan tumbler dan buku catatan.', NULL, NULL, TRUE);

INSERT INTO header_pembelian (pembelian_id, vendor_id, tahun_ajaran_id) VALUES
(1, 1, 2), (2, 3, 2), (3, 2, 2);

INSERT INTO kegiatan (kegiatan_id, tahun_ajaran_id, nama, tanggal, catatan, is_active) VALUES
(1, 2, 'Open House Informatika', '2025-02-22', 'Kegiatan promosi program studi untuk calon mahasiswa.', TRUE),
(2, 2, 'Campus Expo', '2025-03-10', 'Kegiatan pameran pendidikan di lingkungan kampus.', TRUE),
(3, 2, 'Kunjungan SMA Mitra', '2025-04-18', 'Kunjungan siswa SMA ke Program Studi Informatika.', TRUE);

INSERT INTO aset (aset_id, dimensi_aset_id, lokasi_penyimpanan_id, nama, harga, stok, threshold_qty, is_active) VALUES
(1, 1, 2, 'Pulpen Informatika', 5000.00, 120, 50, TRUE),
(2, 2, 2, 'Totebag Informatika', 35000.00, 18, 20, TRUE),
(3, 2, 1, 'Tumbler Informatika', 60000.00, 8, 10, TRUE),
(4, 1, 3, 'Brosur Prodi Informatika', 1500.00, 500, 100, TRUE),
(5, 2, 2, 'Buku Catatan Informatika', 20000.00, 45, 15, TRUE);

INSERT INTO pengguna (pengguna_id, email, password, nama_lengkap, status_aktif) VALUES
(1, 'pic.promosi@if.unpar.ac.id', '$2b$10$dD93jlpYKpbs7FTn6FJfROfDkMxhSW30/6.aocvkuQ4adZskvk/KK', 'PIC Promosi Informatika', TRUE),
(2, 'kaprodi@if.unpar.ac.id', '$2b$10$dD93jlpYKpbs7FTn6FJfROfDkMxhSW30/6.aocvkuQ4adZskvk/KK', 'Kepala Program Studi Informatika', TRUE);

INSERT INTO pesan_notifikasi (pesan_notifikasi_id, aset_id, pesan, created_at, is_resolved) VALUES
(1, 3, 'Stok Tumbler Informatika tersisa 8 dan telah mencapai batas minimum.', '2025-05-20 09:00:00', FALSE),
(2, 2, 'Stok Totebag Informatika tersisa 18 dan telah mencapai batas minimum.', '2025-05-21 10:30:00', FALSE),
(3, 4, 'Stok Brosur Prodi Informatika telah kembali berada di atas batas minimum.', '2025-03-05 14:15:00', TRUE);

INSERT INTO detail_pembelian (pembelian_id, aset_id, qty_in, unit_price) VALUES
(1, 1, 200, 4500.00), (1, 2, 50, 33000.00),
(2, 4, 1000, 1200.00),
(3, 3, 40, 58000.00), (3, 5, 60, 18000.00);

INSERT INTO aset_keluar (kegiatan_id, aset_id, qty_out) VALUES
(1, 1, 80), (1, 2, 20), (1, 4, 200),
(2, 1, 50), (2, 4, 150),
(3, 1, 25), (3, 5, 10), (3, 4, 75);

-- Reset sequence agar ID auto-increment berikutnya tidak bentrok dengan data eksplisit di atas
SELECT setval(pg_get_serial_sequence('vendor', 'vendor_id'), COALESCE(MAX(vendor_id), 1), TRUE) FROM vendor;
SELECT setval(pg_get_serial_sequence('tahun_ajaran', 'tahun_ajaran_id'), COALESCE(MAX(tahun_ajaran_id), 1), TRUE) FROM tahun_ajaran;
SELECT setval(pg_get_serial_sequence('dimensi_aset', 'dimensi_aset_id'), COALESCE(MAX(dimensi_aset_id), 1), TRUE) FROM dimensi_aset;
SELECT setval(pg_get_serial_sequence('lokasi_penyimpanan', 'lokasi_penyimpanan_id'), COALESCE(MAX(lokasi_penyimpanan_id), 1), TRUE) FROM lokasi_penyimpanan;
SELECT setval(pg_get_serial_sequence('pembelian', 'pembelian_id'), COALESCE(MAX(pembelian_id), 1), TRUE) FROM pembelian;
SELECT setval(pg_get_serial_sequence('kegiatan', 'kegiatan_id'), COALESCE(MAX(kegiatan_id), 1), TRUE) FROM kegiatan;
SELECT setval(pg_get_serial_sequence('aset', 'aset_id'), COALESCE(MAX(aset_id), 1), TRUE) FROM aset;
SELECT setval(pg_get_serial_sequence('pengguna', 'pengguna_id'), COALESCE(MAX(pengguna_id), 1), TRUE) FROM pengguna;
SELECT setval(pg_get_serial_sequence('pesan_notifikasi', 'pesan_notifikasi_id'), COALESCE(MAX(pesan_notifikasi_id), 1), TRUE) FROM pesan_notifikasi;
