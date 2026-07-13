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
   - `psql -d aset_promosi_db -f src/db/schema.sql`
   - `psql -d aset_promosi_db -f src/db/seed.sql` (opsional, data contoh untuk pengujian)
5. `npm run dev` -> API berjalan sesuai `PORT` di `.env` (contoh: `http://localhost:5000`)

Akun contoh dari `seed.sql` (password sama untuk keduanya): `password123`
- pic.promosi@if.unpar.ac.id
- kaprodi@if.unpar.ac.id

> `schema.sql` dan `seed.sql` sudah disesuaikan dengan revisi final ERD kamu
> (`ddl_dan_data_dummy_aset_promosi_revisi_final.sql`): tabel utama bernama `aset` (bukan lagi
> `suvenir`), relasi pembelian lewat `header_pembelian` & `detail_pembelian`, dan penggunaan lewat
> `aset_keluar`. Lihat bagian "Catatan Desain Revisi Final" di bawah untuk detail lengkap.

## Menjalankan Frontend

1. `cd frontend`
2. `npm install`
3. `npm run dev` -> aplikasi berjalan di `http://localhost:5173`

Jika port backend kamu bukan `5000`, ubah juga target proxy di `frontend/vite.config.js`
(bagian `server.proxy['/api']`) supaya frontend tetap terhubung ke backend.

## Status Implementasi (mengikuti Sprint Backlog)

- **Sprint 1** - Sudah ada kerangka & contoh implementasi penuh: setup proyek, skema DB, login
  (FR-01), dan CRUD Suvenir (FR-03/FR-04/UC-01) sebagai pola referensi. Vendor, Lokasi
  Penyimpanan, Tahun Ajaran, Dimensi Suvenir sudah diimplementasikan backend-nya; halaman
  frontend-nya masih berupa TODO agar dikerjakan mengikuti pola halaman Suvenir.
- **Sprint 2** - Backend penggunaan & pembelian suvenir (transaksi, update stok otomatis,
  notifikasi restock) sudah diimplementasikan. Halaman frontend penggunaan/pembelian suvenir
  masih TODO.
- **Sprint 3** - Backend dashboard, laporan, dan ekspor PDF sudah diimplementasikan dasar-dasarnya.
  Halaman frontend Dashboard sudah terhubung ke API; halaman Laporan masih TODO.

## Catatan Desain Revisi Final

Kode di kerangka ini sudah disesuaikan mengikuti `ddl_dan_data_dummy_aset_promosi_revisi_final.sql`:

- Tabel `suvenir` berganti nama menjadi **`aset`** (primary key `aset_id`). Kolom `vendor_id`
  dihapus dari tabel ini karena vendor kini hanya terhubung ke transaksi lewat
  `header_pembelian`, dan `dimensi_suvenir_id` sekarang boleh `NULL` (opsional).
- Tabel `pembelian_suvenir` -> **`detail_pembelian`**, `kegiatan_suvenir` -> **`aset_keluar`**,
  `pembelian_vendor_tahun` -> **`header_pembelian`** (kolom `suvenir_id` menjadi `aset_id`).
- Kolom `vendor.catatan` berganti nama menjadi **`vendor.alamat`** dan sekarang **wajib diisi**
  (alamat fisik atau tautan toko daring). `vendorController.js` sudah menyesuaikan validasinya.
- Kolom `skala` pada tabel `kegiatan` **dihapus**. `penggunaanController.js` tidak lagi
  mengirim/menyimpan field ini.
- Tabel `pesan_notifikasi` sekarang punya kolom `aset_id` (FK ke `aset`) - ini memperbaiki gap
  desain yang sempat saya catat sebelumnya (dahulu notifikasi tidak terhubung ke aset mana pun).
  `notifikasiController.js` sudah menampilkan nama aset terkait pada setiap notifikasi.
- `dimensi_suvenir.nama` dan `lokasi_penyimpanan.nama` sekarang dibatasi `CHECK` constraint ke
  nilai tertentu saja (`Kecil`/`Sedang`/`Besar` dan `9113`/`9110`/`Laboratorium Sertifikasi`).
  Saat membangun form di frontend, gunakan dropdown dengan pilihan tetap tersebut, bukan input
  bebas - kalau tidak, database akan menolak data yang di luar daftar tersebut.
- **Perbaikan penting**: hash password akun contoh di `seed.sql` sebelumnya berupa teks
  placeholder (`$2b$10$dummyhash...`) yang bukan hash bcrypt asli, sehingga login tidak akan
  pernah berhasil walau kredensialnya benar. Sudah diganti dengan hash bcrypt asli untuk
  password `password123`.
- Endpoint "ubah" (update) untuk pencatatan penggunaan & pembelian aset belum diimplementasikan
  di kerangka ini karena perlu logika pembalikan (revert) stok lama sebelum menerapkan data baru.
  Ditandai dengan komentar `TODO` pada `penggunaanController.js` dan `pembelianController.js`.
