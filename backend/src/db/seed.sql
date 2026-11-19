-- DATA DUMMY PENGUJIAN / DEMO, bukan data operasional.
-- Jalankan schema.sql dahulu pada database kosong, lalu seed.sql dengan ON_ERROR_STOP.
-- Seed tidak DROP/TRUNCATE dan menolak database berisi data agar aset migrasi tidak tertimpa.
-- Tanggal relatif terhadap hari eksekusi Asia/Jakarta; periode terbaru sudah dimulai.
-- Aset di bawah mensimulasikan migrasi stok awal, BUKAN pembelian awal fiktif.
-- Pengguna aktif: pic.promosi@if.unpar.ac.id (PIC Promosi), kaprodi@if.unpar.ac.id (Kaprodi).
-- Pengguna nonaktif: nonaktif@example.test (PIC Promosi).
-- Dua akun UNPAR juga disiapkan untuk login Google.
-- Skenario dan hasil yang diharapkan: lihat README bagian Data dummy.
BEGIN;
SET LOCAL TIME ZONE 'Asia/Jakarta';
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM aset) OR EXISTS (SELECT 1 FROM vendor)
       OR EXISTS (SELECT 1 FROM tahun_ajaran) OR EXISTS (SELECT 1 FROM pengguna)
       OR EXISTS (SELECT 1 FROM pembelian) OR EXISTS (SELECT 1 FROM kegiatan)
       OR EXISTS (SELECT 1 FROM stok_opname) OR EXISTS (SELECT 1 FROM lokasi_penyimpanan)
       OR EXISTS (SELECT 1 FROM level_aset) THEN
        RAISE EXCEPTION 'Seed demo memerlukan database kosong. Gunakan database uji terpisah; jangan jalankan schema.sql pada database operasional.';
    END IF;
END $$;

INSERT INTO level_aset (nama) VALUES ('Sederhana'), ('Menengah'), ('Mewah');
INSERT INTO lokasi_penyimpanan (nama, deskripsi) VALUES
('9113', 'Lemari suvenir utama.'), ('9110', 'Rak kebutuhan promosi harian.'),
('Laboratorium Sertifikasi', 'Penyimpanan perlengkapan acara.'),
('Ruang Cadangan', 'Lokasi kosong untuk pengujian master tanpa unit.');
INSERT INTO vendor (nama, alamat, nomor_handphone, email) VALUES
('CV Souvenir Bandung', 'Jl. Cihampelas No. 123, Bandung', '080000000001', 'souvenir@example.test'),
('Toko Kreatif Jaya', 'https://example.test/toko/kreatif', NULL, 'kreatif@example.test'),
('Print Media Parahyangan', 'Jl. Merdeka No. 10, Bandung', '080000000003', NULL),
('Sentra Suvenir Bandung', 'Jl. Setiabudi No. 45, Bandung', NULL, NULL),
('Vendor Belum Bertransaksi', 'Jl. Contoh No. 12, Bandung', NULL, NULL);
INSERT INTO pengguna (email, password, nama_lengkap, role, is_active)
VALUES
('pic.promosi@if.unpar.ac.id', '', 'PIC Promosi Informatika', 'PIC Promosi', true),
('kaprodi@if.unpar.ac.id', '', 'Kepala Program Studi Informatika', 'Kaprodi', true),
('nonaktif@example.test', '', 'Pengguna Nonaktif Demo', 'PIC Promosi', false);

-- Nama sementara diisi dengan email dan diganti dari profil saat login Google.
INSERT INTO pengguna (email, password, nama_lengkap, role, is_active) VALUES
('mariskha@unpar.ac.id', '', 'mariskha@unpar.ac.id', 'Kaprodi', TRUE),
('maria.veronica@unpar.ac.id', '', 'maria.veronica@unpar.ac.id', 'PIC Promosi', TRUE);

-- Empat semester terakhir termasuk semester berjalan. Tidak membuat semester masa depan
-- supaya dashboard default (tanggal_mulai terbaru) berisi data yang dapat diedit.
CREATE TEMP TABLE seed_periode ON COMMIT DROP AS
WITH tahun AS (
    SELECT extract(year FROM current_date)::int - CASE WHEN extract(month FROM current_date) < 8 THEN 1 ELSE 0 END AS awal
), daftar AS (
    SELECT y, semester, mulai, selesai
    FROM tahun CROSS JOIN LATERAL generate_series(awal - 2, awal) AS y
    CROSS JOIN LATERAL (VALUES
        ('Ganjil', make_date(y,8,1), make_date(y,12,31)),
        ('Genap', make_date(y+1,1,1), make_date(y+1,6,30)),
        ('SP', make_date(y+1,7,1), make_date(y+1,7,31))
    ) AS s(semester,mulai,selesai)
)
SELECT y::text || '/' || (y+1)::text AS tahun, semester, mulai, selesai
FROM daftar WHERE mulai <= current_date ORDER BY mulai DESC LIMIT 4;
INSERT INTO tahun_ajaran (tahun, semester, tanggal_mulai, tanggal_selesai)
SELECT tahun, semester, mulai, selesai FROM seed_periode ORDER BY mulai;

-- Saldo awal simulasi migrasi: 10 jenis, semua level/lokasi, level/vendor opsional,
-- harga nol/desimal/tinggi, stok nol, stok tepat threshold, dan aset tanpa transaksi.
CREATE TEMP TABLE seed_aset (
    urut int PRIMARY KEY, nama text, level_nama text, lokasi text, harga numeric(12,2), awal int, batas int
) ON COMMIT DROP;
INSERT INTO seed_aset VALUES
(1,'Pulpen Informatika','Sederhana','9110',5000,80,50),
(2,'Stiker Informatika','Sederhana','9113',1250.50,100,40),
(3,'Totebag Informatika','Menengah','9110',35000,60,20),
(4,'Tumbler Premium','Mewah','Laboratorium Sertifikasi',125000,30,10),
(5,'Brosur Informatika',NULL,'9113',0,150,100),
(6,'Lanyard Informatika','Menengah','Laboratorium Sertifikasi',15000,60,30),
(7,'Buku Catatan','Menengah','9113',22000,50,15),
(8,'Payung Informatika','Menengah','9113',50000,20,20),
(9,'Flyer Informatika',NULL,'Laboratorium Sertifikasi',0,0,0),
(10,'Gantungan Kunci','Sederhana','9110',6000,0,10);
-- vendor_id pada aset dinonaktifkan; vendor berasal dari transaksi pembelian.
INSERT INTO aset (nama, level_aset_id, lokasi_penyimpanan_id, harga, stok, threshold_qty)
SELECT s.nama, l.level_aset_id,
       -- CASE WHEN s.urut IN (5,9,10) THEN NULL ELSE (SELECT vendor_id FROM vendor WHERE nama='Sentra Suvenir Bandung') END,
       p.lokasi_penyimpanan_id, s.harga, s.awal, s.batas
FROM seed_aset s LEFT JOIN level_aset l ON l.nama=s.level_nama
JOIN lokasi_penyimpanan p ON p.nama=s.lokasi ORDER BY s.urut;
CREATE TEMP TABLE seed_map ON COMMIT DROP AS
SELECT s.*, a.aset_id FROM seed_aset s JOIN aset a ON a.nama=s.nama;

-- Jumlah tetap: 6 pembelian, 5 kegiatan, 4 opname.
-- SP historis paling lama kosong. Lima pembelian terbaru dapat diunggah bonnya.
DO $$
DECLARE lama record; aktif record; r record; pid int; kid int; vid int;
BEGIN
  SELECT * INTO aktif FROM tahun_ajaran ORDER BY tanggal_mulai DESC LIMIT 1;
  SELECT * INTO lama FROM tahun_ajaran WHERE semester<>'SP' AND tahun_ajaran_id<>aktif.tahun_ajaran_id ORDER BY tanggal_mulai LIMIT 1;
  FOR r IN SELECT * FROM (VALUES
    (1,true,0,'Lunas','CV Souvenir Bandung','DEMO historis: pengadaan awal semester; bon contoh tersedia.'),
    (2,false,0,'Lunas','CV Souvenir Bandung','DEMO pengadaan awal: dua aset; bon foto belum diunggah.'),
    (3,false,10,'Lunas','Toko Kreatif Jaya','DEMO pengadaan ulang: harga dan vendor Pulpen berubah; Brosur gratis; bon foto belum diunggah.'),
    (4,false,20,'DP','Toko Kreatif Jaya','DEMO uang muka: satu aset; harga pending tidak menimpa harga Lunas; bon foto belum diunggah.'),
    (5,false,30,'Belum Bayar','Print Media Parahyangan','DEMO tagihan belum dibayar: dua aset; bon foto belum diunggah.'),
    (6,false,40,'DP','CV Souvenir Bandung','DEMO uang muka paket suvenir: dua aset; bon foto belum diunggah.')
  ) AS t(no,historis,hari,status,vendor,catatan) ORDER BY no LOOP
    SELECT vendor_id INTO vid FROM vendor WHERE nama=r.vendor;
    INSERT INTO pembelian(tanggal,status,catatan,nama_file,url_file)
    VALUES(CASE WHEN r.historis THEN lama.tanggal_mulai ELSE LEAST(aktif.tanggal_mulai+r.hari,current_date) END,
      r.status,r.catatan,CASE WHEN r.historis THEN 'demo-nota-pembelian.pdf' END,
      CASE WHEN r.historis THEN '/uploads/demo-nota-pembelian.pdf' END) RETURNING pembelian_id INTO pid;
    INSERT INTO header_pembelian VALUES(pid,vid,CASE WHEN r.historis THEN lama.tahun_ajaran_id ELSE aktif.tahun_ajaran_id END);
    INSERT INTO detail_pembelian(pembelian_id,aset_id,qty_in,unit_price)
    SELECT pid,m.aset_id,d.qty,d.harga FROM (VALUES
      (1,1,10,5000),(1,3,10,35000),
      (2,1,20,5500),(2,4,10,120000),
      (3,1,10,6000),(3,5,100,0),
      (4,1,10,6500),
      (5,3,10,36000),(5,6,20,15000),
      (6,4,5,150000),(6,7,10,22000)
    ) AS d(no,urut,qty,harga) JOIN seed_map m USING(urut) WHERE d.no=r.no;
  END LOOP;
  FOR r IN SELECT * FROM (VALUES
    (1,true,15,'Open House Historis','DEMO: penggunaan periode lama, hanya dapat dilihat.'),
    (2,false,5,'Open House Informatika','DEMO: suvenir lintas level.'),
    (3,false,15,'Campus Expo',NULL),
    (4,false,35,'Kunjungan SMA Mitra','DEMO: distribusi materi promosi.'),
    (5,false,60,'Workshop Sekolah','DEMO: penggunaan lanjutan semester berjalan.')
  ) AS t(no,historis,hari,nama,catatan) ORDER BY no LOOP
    INSERT INTO kegiatan(tahun_ajaran_id,nama,tanggal,catatan)
    VALUES(CASE WHEN r.historis THEN lama.tahun_ajaran_id ELSE aktif.tahun_ajaran_id END,r.nama,
      CASE WHEN r.historis THEN lama.tanggal_mulai+r.hari ELSE LEAST(aktif.tanggal_mulai+r.hari,current_date) END,r.catatan)
    RETURNING kegiatan_id INTO kid;
    INSERT INTO aset_keluar(kegiatan_id,aset_id,qty_out)
    SELECT kid,m.aset_id,d.qty FROM (VALUES
      (1,1,5),(1,3,5),
      (2,1,10),(2,3,5),(2,4,2),
      (3,2,10),(3,4,3),(3,6,5),
      (4,1,5),(4,5,20),
      (5,2,5),(5,7,5)
    ) AS d(no,urut,qty) JOIN seed_map m USING(urut) WHERE d.no=r.no;
  END LOOP;
  INSERT INTO stok_opname(tahun_ajaran_id,tanggal,catatan) VALUES
    (lama.tahun_ajaran_id,lama.tanggal_selesai,'DEMO: pemeriksaan historis; hilang, berlebih, dan sesuai.'),
    (aktif.tahun_ajaran_id,LEAST(aktif.tanggal_mulai+45,current_date),'DEMO: pemeriksaan semester berjalan; selisih negatif, positif, dan nol.'),
    (aktif.tahun_ajaran_id,current_date,'DEMO: pemeriksaan penutup; variasi stok kritis, aman, dan tepat batas.'),
    (aktif.tahun_ajaran_id,current_date,'DEMO: verifikasi kedua pada tanggal sama; seluruh stok sesuai.');
END $$;

-- Putar ulang event: stok awal + hanya pembelian Lunas - penggunaan + selisih opname.
-- Untuk tanggal sama: pembelian -> penggunaan -> opname berurutan ID.
-- Dengan demikian setiap snapshot cocok dengan saldo tepat sebelum pemeriksaan.
DO $$
DECLARE e record; item record; stok_lama int; fisik int; target int;
        penutup int := (SELECT max(stok_opname_id)-1 FROM stok_opname);
        verifikasi int := (SELECT max(stok_opname_id) FROM stok_opname);
BEGIN
  FOR e IN
    SELECT p.tanggal, 1 AS jenis, p.pembelian_id AS id FROM pembelian p WHERE p.status='Lunas'
    UNION ALL SELECT k.tanggal, 2, k.kegiatan_id FROM kegiatan k
    UNION ALL SELECT so.tanggal, 3, so.stok_opname_id FROM stok_opname so
    ORDER BY 1,2,3
  LOOP
    IF e.jenis=1 THEN
      UPDATE aset a SET stok=a.stok+d.qty_in FROM detail_pembelian d WHERE d.pembelian_id=e.id AND d.aset_id=a.aset_id;
    ELSIF e.jenis=2 THEN
      UPDATE aset a SET stok=a.stok-d.qty_out FROM aset_keluar d WHERE d.kegiatan_id=e.id AND d.aset_id=a.aset_id;
    ELSE
      FOR item IN SELECT m.*, s.stok FROM seed_map m JOIN aset s ON s.aset_id=m.aset_id WHERE m.urut<=7 ORDER BY m.urut LOOP
        stok_lama := item.stok;
        IF e.id=penutup THEN
          target := CASE item.urut % 5 WHEN 0 THEN 0 WHEN 1 THEN GREATEST(item.batas-1,0) WHEN 2 THEN item.batas WHEN 3 THEN item.batas+1 ELSE item.batas+100 END;
          fisik := target;
        ELSIF e.id=verifikasi THEN fisik := stok_lama;
        ELSE fisik := stok_lama + CASE item.urut % 3 WHEN 0 THEN -2 WHEN 1 THEN 3 ELSE 0 END;
        END IF;
        INSERT INTO detail_stok_opname VALUES(e.id,item.aset_id,stok_lama,fisik);
        UPDATE aset SET stok=fisik WHERE aset_id=item.aset_id;
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- Harga saat ini mengikuti pembelian Lunas terbaru; DP/Belum Bayar tidak menimpa harga.
UPDATE aset a SET harga=latest.unit_price FROM (
  SELECT DISTINCT ON (d.aset_id) d.aset_id,d.unit_price
  FROM detail_pembelian d JOIN pembelian p USING(pembelian_id)
  WHERE p.status='Lunas' ORDER BY d.aset_id,p.tanggal DESC,p.pembelian_id DESC
) latest WHERE latest.aset_id=a.aset_id;
-- Riwayat resolved untuk stok yang telah pulih, satu notifikasi aktif per aset kritis.
INSERT INTO pesan_notifikasi(aset_id,pesan,created_at,is_resolved)
SELECT aset_id,format('DEMO riwayat: stok %s pernah berada di bawah batas minimum.',nama),current_date-interval '1 month',true
FROM aset WHERE stok>=threshold_qty AND threshold_qty>0 ORDER BY aset_id LIMIT 4;
INSERT INTO pesan_notifikasi(aset_id,pesan,created_at,is_resolved)
SELECT aset_id,format('Stok %s tersisa %s. Segera pertimbangkan penambahan stok (threshold: %s).',nama,stok,threshold_qty),current_timestamp,false
FROM aset WHERE stok<threshold_qty;

-- Validasi integral seed: jangan commit jika saldo atau tanggal tidak konsisten.
DO $$
BEGIN
 IF EXISTS (
    SELECT 1 FROM aset a JOIN seed_map m USING(aset_id)
    WHERE a.stok <> m.awal
      + COALESCE((SELECT sum(d.qty_in) FROM detail_pembelian d JOIN pembelian p USING(pembelian_id) WHERE d.aset_id=a.aset_id AND p.status='Lunas'),0)
      - COALESCE((SELECT sum(d.qty_out) FROM aset_keluar d WHERE d.aset_id=a.aset_id),0)
      + COALESCE((SELECT sum(d.stok_fisik-d.stok_sistem) FROM detail_stok_opname d WHERE d.aset_id=a.aset_id),0)
 ) THEN RAISE EXCEPTION 'Saldo stok dummy tidak cocok dengan riwayat'; END IF;
 IF EXISTS (
    SELECT 1 FROM (
      SELECT hp.tahun_ajaran_id,p.tanggal FROM pembelian p JOIN header_pembelian hp USING(pembelian_id)
      UNION ALL SELECT tahun_ajaran_id,tanggal FROM kegiatan
      UNION ALL SELECT tahun_ajaran_id,tanggal FROM stok_opname
    ) e JOIN tahun_ajaran ta USING(tahun_ajaran_id)
    WHERE e.tanggal NOT BETWEEN ta.tanggal_mulai AND ta.tanggal_selesai OR e.tanggal>current_date
 ) THEN RAISE EXCEPTION 'Tanggal transaksi dummy di luar periode'; END IF;
END $$;
COMMIT;
