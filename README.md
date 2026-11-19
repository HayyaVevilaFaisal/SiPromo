# Perangkat Lunak Pengelolaan Aset Promosi
Program Studi Informatika UNPAR

Kerangka proyek ini dibuat sesuai rancangan Tugas Akhir 1 (ERD, DDL, use case, dan rancangan
antarmuka) dan mengikuti Sprint 1-3 pada `Sprint_Backlog_Aset_Promosi.xlsx`.

## Struktur Folder

```
aset-promosi-app/
  backend/     -> Node.js + Express + PostgreSQL (REST API)
  frontend/    -> React + Vite (antarmuka pengguna)
```

## Menjalankan Backend

1. `cd backend`
2. `npm install`
3. Salin `.env.example` menjadi `.env`, lalu sesuaikan `DATABASE_URL` dan `JWT_SECRET`.
4. Buat database PostgreSQL (mis. `aset_promosi_db`), lalu jalankan:
   - `psql -v ON_ERROR_STOP=1 -d aset_promosi_db -f src/db/schema.sql`
   - `psql -v ON_ERROR_STOP=1 -d aset_promosi_db -f src/db/seed.sql` (opsional, data contoh untuk pengujian)
5. `npm run dev` -> API berjalan sesuai `PORT` di `.env` (contoh: `http://localhost:5000`)

Pengguna yang terdaftar dan aktif masuk menggunakan Google SSO.
JWT sesi disimpan pada cookie HttpOnly. Kaprodi mengelola PIC melalui `/kelola-pic`.
Untuk menyiapkan Kaprodi, jalankan `npm run setup:kaprodi -- email@example.com "Nama Kaprodi"`.

### Login dengan Google

Isi `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, dan `GOOGLE_CALLBACK_URL` di
`backend/.env`. Daftarkan URL callback yang sama persis di Google Cloud sebagai
*Authorized redirect URI*. Untuk pengembangan lokal gunakan
`http://localhost:5001/api/auth/google/callback` dan akses frontend melalui
`http://localhost:5173`. Frontend meneruskan `/api` ke backend, dan callback
menggunakan hostname yang sama agar browser mengirim cookie OAuth.

1. Tombol **Masuk dengan Google** membuka `/api/auth/google`. Passport membuat
   nilai `state`, menyimpannya dalam cookie bertanda tangan, lalu mengarahkan pengguna ke Google.
2. Google mengembalikan pengguna ke `/api/auth/google/callback`. Passport memeriksa
   `state` dan memperoleh profil Google. Backend mencocokkan email Gmail atau Google Workspace
   yang terverifikasi dengan akun PIC Promosi atau Kaprodi yang aktif.
3. Backend membuat cookie JWT sesi dan mengarahkan pengguna kembali ke `/login`.
   Frontend membaca sesi melalui `/api/auth/me` dan membuka Dashboard untuk Kaprodi dan PIC.

Seed menyiapkan dua akun UNPAR untuk Google SSO. Untuk database yang sudah berisi
data, gunakan migrasi `20261119_google_accounts.sql`. Akun baru memakai email
sebagai nama sementara sampai nama dari profil Google tersedia saat login.
> `schema.sql` dan `seed.sql` sudah disesuaikan dengan revisi final ERD kamu
> (`ddl_dan_data_dummy_aset_promosi_revisi_final.sql`): tabel utama bernama `aset`,
> relasi pembelian lewat `header_pembelian` & `detail_pembelian`, dan penggunaan lewat
> `aset_keluar`. Lihat bagian "Catatan Desain Revisi Final" di bawah untuk detail lengkap.

## Menjalankan Frontend

1. `cd frontend`
2. `npm install`
3. Frontend menggunakan proxy `/api` untuk mengakses backend.
4. `npm run dev` -> aplikasi berjalan di `http://localhost:5173`

Jika port backend kamu bukan `5000`, ubah juga target proxy di `frontend/vite.config.js`
(bagian `server.proxy['/api']`) supaya frontend tetap terhubung ke backend.

## Status Implementasi (mengikuti Sprint Backlog)

- **Sprint 1** - Sudah ada kerangka & contoh implementasi penuh: setup proyek, skema DB, login
  (FR-01), dan CRUD Aset (FR-03/FR-04/UC-01) sebagai pola referensi. Vendor, Lokasi
  Penyimpanan, Tahun Ajaran, Level Aset sudah diimplementasikan backend-nya; halaman
  frontend-nya masih berupa TODO agar dikerjakan mengikuti pola halaman Aset.
- **Sprint 2** - Backend penggunaan & pembelian aset (transaksi, update stok otomatis,
  notifikasi restock) sudah diimplementasikan. Halaman frontend penggunaan/pembelian aset
  masih TODO.
- **Sprint 3** - Backend dashboard, laporan, dan ekspor PDF sudah diimplementasikan dasar-dasarnya.
  Halaman frontend Dashboard sudah terhubung ke API; halaman Laporan masih TODO.

## Catatan Desain Revisi Final

Kode di kerangka ini sudah disesuaikan mengikuti `ddl_dan_data_dummy_aset_promosi_revisi_final.sql`:

- Tabel utama bernama **`aset`** (primary key `aset_id`). Kolom `vendor_id`
  dihapus dari tabel ini karena vendor kini hanya terhubung ke transaksi lewat
  `header_pembelian`, dan `level_aset_id` sekarang boleh `NULL` (opsional).
- Tabel `pembelian_aset` -> **`detail_pembelian`**, `kegiatan_aset` -> **`aset_keluar`**,
  `pembelian_vendor_tahun` -> **`header_pembelian`** (kolom `aset_id`).
- Kolom `vendor.catatan` berganti nama menjadi **`vendor.alamat`** dan sekarang **wajib diisi**
  (alamat fisik atau tautan toko daring). `vendorController.js` sudah menyesuaikan validasinya.
- Kolom `skala` pada tabel `kegiatan` **dihapus**. `penggunaanController.js` tidak lagi
  mengirim/menyimpan field ini.
- Tabel `pesan_notifikasi` sekarang punya kolom `aset_id` (FK ke `aset`) - ini memperbaiki gap
  desain yang sempat saya catat sebelumnya (dahulu notifikasi tidak terhubung ke aset mana pun).
  `notifikasiController.js` sudah menampilkan nama aset terkait pada setiap notifikasi.
- `level_aset.nama` masih dibatasi `CHECK` constraint ke nilai tertentu saja
  (`Kecil`/`Sedang`/`Besar`) - gunakan dropdown dengan pilihan tetap tersebut di frontend, bukan
  input bebas, kalau tidak database akan menolak data di luar daftar tersebut.
- `lokasi_penyimpanan.nama` sebelumnya juga dibatasi CHECK constraint ke 3 nilai tetap
  (`9113`/`9110`/`Laboratorium Sertifikasi`), tapi constraint itu sudah dihapus - lokasi baru
  boleh ditambah bebas. `seed.sql` tetap mengisi 3 lokasi tersebut sebagai default awal.
- Login menggunakan Google SSO melalui Passport.js.
- Endpoint "ubah" (update) untuk pencatatan penggunaan & pembelian aset belum diimplementasikan
  di kerangka ini karena perlu logika pembalikan (revert) stok lama sebelum menerapkan data baru.
  Ditandai dengan komentar `TODO` pada `penggunaanController.js` dan `pembelianController.js`.


### Aturan edit pencatatan

Pembelian, penggunaan, dan stok opname hanya dapat diedit pada tahun ajaran
belum dihapus dengan `tanggal_mulai` paling baru yang sudah tercapai, berdasarkan
waktu Asia/Jakarta. Tahun ajaran yang belum dimulai tidak menutup akses edit
periode sebelumnya. Periode terakhir yang sudah dimulai tetap menjadi acuan
hingga periode berikutnya dimulai. Pemeriksaan dilakukan pada backend, termasuk
perubahan status pembayaran dan bon pembelian. Catatan periode lain hanya dapat
dilihat; tahun ajaran asal tidak dapat dipindahkan untuk melewati pembatasan.


### Data master tanpa status dan fitur hapus

Aset, vendor, lokasi penyimpanan, dan tahun ajaran hanya menyediakan tambah dan ubah.
Daftar master tidak memakai filter `is_active`; filter aset menggunakan level,
lokasi penyimpanan, dan harga. Status stok Kritis/Aman tetap ditampilkan.
DDL dan seed baru tidak membuat kolom `is_active` pada keempat tabel master.

Untuk database yang sudah ada, jalankan migrasi tanpa menjalankan ulang DDL/seed
karena `schema.sql` membuat ulang tabel; `seed.sql` khusus database demo kosong:

```sh
cd backend
psql "$DATABASE_URL" -f src/db/migrations/20261013_master_tanpa_status.sql
```

Migrasi menyimpan kolom status lama sebagai `is_active_legacy`, tanpa menghapus
baris atau nilai status. Seluruh data master, termasuk data yang dahulu ditandai
terhapus, tersedia untuk dipilih dan diubah. Kode filter dan hapus lama tetap
ada sebagai komentar. Untuk memakai kembali fitur lama, aktifkan kode tersebut
dan ubah nama kolom `is_active_legacy` kembali menjadi `is_active` pada tabel
master. Status pengguna dan transaksi tetap mengikuti aturan sebelumnya.


### Data dummy lengkap

`backend/src/db/seed.sql` sekarang hanya mengisi data, terpisah dari DDL di
`schema.sql`. Seed berjalan dalam satu transaksi dan menolak database yang telah
berisi data. Gunakan database demo terpisah. Jangan jalankan `schema.sql` pada
database operasional karena DDL tersebut menghapus tabel.

Aset dummy mensimulasikan **saldo awal hasil migrasi**, bukan pembelian fiktif.
Untuk penggunaan operasional, impor aset asli melalui migrasi terpisah dan jangan
jalankan seed demo ini. Data dummy tidak dijalankan otomatis saat server hidup.

Seed ringkas memuat **10 aset, 5 vendor, 4 lokasi, 3 level, 4 semester,
6 pembelian, 5 kegiatan, dan 4 stok opname**, serta 2 akun aktif dan 1 nonaktif.
Tanggal mengikuti hari eksekusi Asia/Jakarta: empat semester terakhir termasuk
semester berjalan (Ganjil Agustus–Desember, Genap Januari–Juni, SP Juli). Tidak ada
transaksi bertanggal masa depan. Jumlah pencatatan tetap, tidak bertambah setiap bulan. Periode terbaru berisi data agar dashboard default terisi dan
aturan edit dapat diuji; semester historis hanya dapat dilihat. Untuk menguji
periode masa depan, tambahkan tahun ajaran melalui form setelah memeriksa dashboard
awal (dashboard memilih tanggal mulai terbaru).

| Area | Skenario data dan cara memeriksa |
| --- | --- |
| Login | Gunakan akun Google aktif yang emailnya terdaftar di database. Akun nonaktif dan email yang belum terdaftar ditolak. |
| Master aset | Semua level dan level kosong; tiga lokasi berisi aset, Ruang Cadangan kosong; harga nol, desimal, dan tinggi; vendor pemasok dan vendor kosong. |
| Filter aset | Gabungkan nama/level/lokasi/rentang harga/status Aman atau Kritis. Cari `Payung Informatika` pada harga 50000 untuk aset tanpa transaksi. Cari `tidak-ada-data-xyz` untuk hasil kosong. |
| Batas stok | Aset aman di atas threshold, tepat threshold (tetap Aman), di bawah threshold, dan habis. Flyer Informatika memiliki stok dan threshold nol (Aman); Gantungan Kunci stok nol/threshold 10 (Kritis). |
| Pembelian | Hanya 6 transaksi: 1 Lunas historis, lalu 2 Lunas, 2 DP, dan 1 Belum Bayar semester berjalan. Ada pembelian satu aset dan beberapa aset, pengadaan ulang Pulpen dengan harga/vendor berbeda, serta Brosur berharga nol. Hanya Lunas menambah stok dan menentukan harga terbaru. Filter tahun/status/nama vendor/nama aset/catatan dapat digabung. |
| Bon | Pembelian historis memakai `/uploads/demo-nota-pembelian.pdf`. Lima pembelian semester berjalan belum memiliki bon, sehingga semuanya dapat Anda lengkapi foto melalui fitur unggah bon. Lampiran historis ditandai data dummy. |
| Penggunaan | Lima kegiatan: satu historis dan empat semester berjalan, masing-masing dua atau tiga aset dengan level beragam. Filter level memilih kegiatan tanpa menghilangkan detail aset level lain. Ada catatan terisi dan kosong. |
| Dashboard | Total stok/jenis/restock, nilai pembelian, jumlah kegiatan, grafik bulanan, empat aset terpopuler, serta pembelian/penggunaan terbaru terisi. Penggunaan tersebar pada beberapa bulan jika semester sudah berjalan cukup lama; bulan lain menghasilkan titik nol. Di awal semester, tanggal contoh dibatasi ke hari eksekusi. |
| Periode kosong | SP paling lama tidak memiliki transaksi/opname: ringkasan nol, tabel kosong, dan PDF kosong. Total stok dashboard tetap stok master saat ini, sesuai perilaku sistem. |
| Stok opname | Empat pemeriksaan pada tujuh aset mencakup selisih negatif, positif, nol. Dua pemeriksaan penutup bertanggal hari yang sama tetap terpisah; pemeriksaan terakhir seluruhnya sesuai. |
| Laporan/PDF | Rincian lintas semester, banyak halaman, kelompok opname, subtotal hilang/berlebih per pencatatan dan total semester. Tiga aset tanpa pembelian/penggunaan/opname tersedia untuk memeriksa rekap stok yang tidak berubah. |
| Notifikasi | Satu notifikasi aktif per aset kritis serta riwayat resolved untuk aset yang pulih. Jumlah aktif sama dengan indikator restock dashboard. |
| Edit | Transaksi periode terbaru dapat diedit, periode lama terkunci. DP/Belum Bayar dapat dilunasi; stok tersedia untuk penggunaan dan opname baru. Penolakan duplikat, stok tidak cukup, format salah, dan konflik edit harus diuji melalui form/API, bukan disimpan sebagai baris SQL invalid. |

Stok diputar ulang secara kronologis dari saldo awal: pembelian Lunas ditambahkan,
penggunaan dikurangi, dan setiap opname menyimpan snapshot stok sebelum dan sesudah
pemeriksaan. Seed memvalidasi saldo akhir dan kesesuaian tanggal transaksi sebelum
commit. Harga mengikuti pengadaan Lunas terbaru. Semua ID memakai sequence otomatis.

Skema baru juga memuat tabel stok opname. Untuk database lama yang belum memiliki
tabel tersebut, tersedia migrasi tanpa penghapusan data:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/src/db/migrations/20261024_stok_opname.sql
```

Pengujian integrasi seed memakai schema sementara yang unik pada PostgreSQL uji,
memuat DDL dan seed, lalu menguji service login, filter, dashboard, laporan/PDF,
dan penolakan seed berulang. Schema sementara dibuang sesudah pengujian:

```sh
cd backend
SEED_TEST_DATABASE_URL=postgresql://localhost/aset_promosi_test npm test -- --runInBand tests/integration/seed.pg.test.js
```


Pembelian ringkas diurutkan dari lama ke baru (jika tanggal sama, berdasarkan ID):

| Contoh | Periode / status | Kasus yang digambarkan |
| --- | --- | --- |
| 1 | Historis / Lunas | Periode terkunci, dua aset, sudah memiliki bon contoh. |
| 2 | Berjalan / Lunas | Pulpen dan Tumbler, harga pengadaan awal. |
| 3 | Berjalan / Lunas | Pulpen dari vendor berbeda dengan harga terbaru Rp6.000; Brosur gratis. |
| 4 | Berjalan / DP | Satu aset Pulpen berharga Rp6.500; harga dan stok belum terpengaruh. |
| 5 | Berjalan / Belum Bayar | Dua aset Totebag dan Lanyard; siap diuji perubahan pembayaran. |
| 6 | Berjalan / DP | Dua aset Tumbler dan Buku Catatan; contoh uang muka paket suvenir. |

Kelima pembelian semester berjalan tidak diisi bon otomatis. Setelah memuat seed
baru pada database demo kosong, unggah foto untuk kelima pencatatan tersebut.
Perubahan file seed tidak mengubah database yang sudah pernah diisi seed lama.
