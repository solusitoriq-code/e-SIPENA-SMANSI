# Product Requirements Document (PRD) — Portal Literasi Digital "e-SIPENA" SMAN 1 Sidayu

**Versi Dokumen:** 2.1 (Penyesuaian Implementasi Terkini)  
**Tanggal:** 24 November 2026  
**Institusi:** SMA Negeri 1 Sidayu — Perpustakaan Lentera Ilmu  
**Sponsor / Pimpinan Proyek:** Abdul Hasib, S.Pd., MM (Kepala SMA Negeri 1 Sidayu)  
**Dokumen Acuan:**
- `Penawaran e-SIPENA DIGITALISASI SMAN1 Sidayu.pdf` (Kontrak Fitur & Lingkup)
- `LAPORAN INOVASI KEPALA SMAN 1 SIDAYU 2025.docx` (Konteks Program SEMARAK SIPENA 2025)
- `DAFTAR NAMA PENULIS NOVEL TAHUN 2026.docx` & aset `00. NASKAH FIX CETAK/` (12 Novel Tahun 2026)
- Arsitektur Referensi: `C:\Project\solusi.toriq\Materi Interaktif`

---

## 1. Ringkasan Eksekutif & Latar Belakang Masalah

SMA Negeri 1 Sidayu telah menjalankan program literasi **SEMARAK SIPENA** (*Semangat Menulis dan Berkarya Puisi, Cerpen, Esai, Novel, dan Artikel*) yang dimotori **Perpustakaan Lentera Ilmu** bekerja sama dengan **Nizamia Learning Center (NLC)**. Pada angkatan tahun 2025 telah terbit **23 buku fisik ber-ISBN dan ber-QRBN**, dan pada tahun **2026** berlanjut dengan **12 Novel Terbaru Tahun 2026** (11 karya siswa Kelas XI–XII serta 1 karya guru program SAGUSABU).

Untuk menjawab kendala biaya cetak ulang, proses panjang penentuan ide tulisan, serta perluasan sasaran ke Kelas X–XII, Guru, dan Tendik:

**Solusi Produk:**  
Membangun aplikasi web Progressive Web App (**e-SIPENA SMAN 1 Sidayu**) menggunakan **Vanilla HTML5, CSS3, dan ES Modules** (tanpa bundler), di-hosting di **Cloudflare Pages** (disertai Pages Function `/api/pdf`), memakai **Supabase (Free Tier)** sebagai basis data & autentikasi kurator, serta **Google Drive** sebagai penyimpanan seluruh sampul unggahan & file PDF (sehingga pemakaian Supabase Storage untuk PDF = **0 MB**). Data pendukung awal disiapkan dengan **data placeholder terstruktur** (`is_placeholder: true`) agar langsung siap pakai dan mudah dikelola.

---

## 2. Tujuan Produk & Status Implementasi

| Tujuan Bisnis & Inovasi | Realisasi Saat Ini |
|---|---|
| Digitalisasi koleksi buku terbaru 2026 agar nyaman dibaca di Laptop, TV & HP | Seluruh **12 Novel Tahun 2026** tampil di Rak Buku Digital lengkap dengan sampul WebP, sinopsis, pembaca **PDF Flipbook (`PDF.js` 1/2 halaman + cache otomatis IndexedDB via `/api/pdf`)**, audio sinopsis, tombol Suka, Unduh PDF, dan pesan cetak WA. |
| Pemantik ide menulis berbasis kearifan lokal Gresik | Tersedia 5 modul **Jejak Budaya Gresik** (video YouTube + artikel pemantik + CTA menuju form Kirim Karya). |
| Partisipasi lintas jenjang (Siswa X–XII, Guru, Tendik) | Menu **Kirim Karya Tanpa Login** (kategori awal dibatasi ke **Novel, Cerpen, Puisi**, upload PDF <= 3 MB ke Google Drive), **Cek Status (`SPN-XXXXXX`)**, dan **Mading Digital** berfungsi penuh. |
| Kemudahan kurasi & pembaruan mandiri oleh pengelola | **Ruang Kerja Pengelola** (Supabase Auth) untuk kurasi naskah, CRUD katalog buku (unggah sampul WebP & PDF hingga 16 MB, plus fitur **Scan Kamera / Scan Gambar ISBN & QRCBN**), kelola Budaya Gresik, dan pengaturan portal. |
| Instalasi perangkat & halaman cetak QR | Aplikasi **PWA Installable** & offline PDF auto-cache berjalan aktif. Fitur **Lembar Cetak QR A4** (`Sesi 4`) **ditunda sementara dan menunya disembunyikan**. |

---

## 3. Target Pengguna & Peran (User Personas)

| Peran | Akses & Kebutuhan Utama |
|---|---|
| **Siswa (Kelas X, XI, XII)** | Membaca novel/buku gratis dengan efek flipbook, mencari inspirasi dari video Jejak Budaya Gresik, mengirim karya teks/PDF (maks. 3 MB) tanpa login, dan memantau status kurasi dengan Kode Lacak |
| **Guru & Tendik (SAGUSAKA/SAGUSABU)** | Mengirim naskah karya (Novel, Cerpen, Puisi) melalui formulir terpadu serta membaca karya rekan sejawat di Mading Digital |
| **Admin Perpustakaan / Guru Kurator** | Masuk dengan Supabase Auth untuk kurasi naskah masuk, menulis catatan revisi, menerbitkan ke Mading, mengelola katalog buku lengkap dengan scan barcode ISBN/QRCBN, serta memperbarui konten Budaya Gresik & pengaturan portal |
| **Masyarakat Umum & Dewan Juri Lomba** | Mengakses portal lewat URL langsung atau tautan buku (`?book=<slug>`), membaca buku fullscreen, menguji kirim karya & lacak status, serta menyukai karya |

---

## 4. Lingkup Fitur & Kondisi Aktual

### Fitur 1 — Halaman Utama & Rak Buku Digital (12 Novel Tahun 2026)
- **Identitas & Branding Sekolah:** Hero bertema SMA Negeri 1 Sidayu (`Perpustakaan Lentera Ilmu` & `NLC`) dengan KPI capaian (`12 Novel 2026`, `23 Buku 2025`, `5 Topik Budaya Gresik`).
- **Rak Buku Digital Interaktif:**
  - Pencarian *real-time* berdasarkan judul, nama penulis, atau kelas/peran.
  - Filter cepat: `Semua`, `Siswa XI`, `Siswa XII`, `Guru`.
  - Grid 4 kolom berpaginasi ringkas (`BOOK_PAGE_SIZE = 4`) dengan panah rak & dukungan swipe.

| No | Judul Novel | Penulis | Kelas / Peran |
|---|---|---|---|
| 1 | Dibalik Pantulan Cermin | Nadine Zivana Khaalishah Rosyidi | Siswa XI-7 |
| 2 | Angin Mendung Untukmu | Devlin Kalevi Putra Kanaya | Siswa XII-6 |
| 3 | Fate and The Divine | Puan Talida Bahira | Siswa XII-11 |
| 4 | Singgah | Kyna Zhafirah Dimion | Siswa XI-6 |
| 5 | Secangkir Matcha | Thalita Nabila Firdaus | Siswa XII-5 |
| 6 | Keluarga yang Sesungguhnya | Ahmad Akif | Siswa XI-6 |
| 7 | Esok Cerita Lagi | Gendhis Ajeng Kirana | Siswa XII-8 |
| 8 | Bukan Lingkaran Dosa | Intan Nur Qaulan Sadida | Siswa XI-5 |
| 9 | Sela Waktu | Nur Fajriyah 'Aini | Siswa XII-8 |
| 10 | Etherea | Naadhira Putri Maulidatur Rohmah | Siswa XII-5 |
| 11 | Perjalanan Angga Menuju Cahaya | Natasya Syafa Kamilah | Siswa XI-7 |
| 12 | Diantara Luka dan Sajadah | Mas'Idah | Guru (SAGUSABU) |

### Fitur 2 — Modal Detail & Pembaca Buku Fullscreen
- **Jendela Modal Otomatis Fullscreen:** Saat dibuka, `book-modal.js` langsung memenuhi **100% kanvas aplikasi** dengan tombol header **`Perkecil` / `Kanvas Penuh`** serta tombol **`Layar Penuh` / `Keluar Penuh`** browser (`js/modal-helper.js`).
- **Tab `Detail`:**
  - Sampul buku 3D, badge peran penulis, kelas, tahun terbit, serta badge **`ISBN` / `ISBN/QRCBN`** (tanpa kartu QR di tab Detail).
  - Sinopsis karya, tombol **`Baca Buku (PDF)`**, **`Unduh PDF`**, **`Dengar Sinopsis`** (`speechSynthesis` Bahasa Indonesia), tombol **`Suka`** via RPC `increment_book_like`, dan tombol **`Pesan Cetak via WA`**.
- **Tab `Baca Buku` (Langsung Pembaca PDF):**
  - Menekan `Baca Buku` langsung membuka pembaca PDF **tanpa pilihan tab mode** (`PDF` vs `Baca Teks`) dan **tanpa bilah status cache / tautan Drive** agar tampilan pembaca bersih untuk pengunjung.
  - Memutar animasi 3D membuka sampul buku (`js/book-reader-ui.js`), mengunduh & menyimpan PDF otomatis ke IndexedDB melalui proxy *same-origin* `/api/pdf` (`js/pdf-cache.js`), lalu merender melalui `PDF.js` (`js/pdf-slide-viewer.js`) dengan tampilan **2 Halaman / 1 Halaman** responsif, efek **flipbook 3D** tiap pergantian halaman, zoom, lompat halaman, dan tombol **`Fokus Baca`**.
  - Apabila perangkat sedang offline dan PDF belum di-cache (atau buku belum punya berkas PDF), pembaca otomatis jatuh ke tampilan teks cadangan berdasar sinopsis (`js/text-flipbook.js`).

### Fitur 3 — Video "Jejak Budaya Gresik", Mading Digital & Sudut Pustakawan
1. **Menu "Jejak Budaya Gresik":** Menampilkan 5 topik kearifan lokal Gresik dengan pemutar video YouTube (`js/yt-player.js`), artikel pemantik, tugas tulis, dan tombol **`Tulis Karya`** yang langsung membuka tab Kirim Karya.
2. **Mading Digital:** Menampilkan karya berstatus `Lolos Mading` dan `Masuk Antologi` (dengan 8 contoh placeholder terstruktur awal), filter peran, paginasi/swipe, audio pembacaan teks, dan modal baca teks/PDF.
3. **Sudut Pustakawan:** Daftar dokumen panduan resmi perpustakaan & kontak admin dari `site_settings`.

### Fitur 4 — Formulir Kirim Karya (PDF Maks. 3 MB) & Cek Status Tanpa Login
- **Formulir Kirim Karya Terpadu (`js/submission-views.js`):**
  - **Field Input Aktif:** `Peran Penulis` (`Siswa X`, `Siswa XI`, `Siswa XII`, `Guru`, `Tendik`), `Kelas / Unit Tugas`, `Nama Lengkap`, `No. WhatsApp (Opsional)`, `Judul Karya`, `Kategori Karya` (**sementara dibatasi ke `Novel`, `Cerpen`, `Puisi`**; kategori lain akan dibuka menyusul sesuai kebutuhan), `Ringkasan Karya`, `Teks Naskah` dan/atau `Unggah Berkas PDF` (`.pdf` maks. `3 MB`), serta centang `Pernyataan Anti-Plagiat`.
  - Field **`Tema Budaya Gresik`** dihapus dari formulir agar pengisian lebih ringkas (`culture_theme` dikirim sebagai string kosong ke database).
  - PDF diunggah ke subfolder `naskah-pdf/` melalui `UploadDrive.gs`, metadata disimpan ke tabel `submissions` Supabase, dan sistem menampilkan kartu **Kode Lacak `SPN-XXXXXX`** beserta tombol salin.
- **Panel Cek Status Tanpa Login (`js/tracking-panel.js`):** Melacak status kurasi & catatan pembimbing secara *real-time* lewat RPC `track_submission(p_tracking_code)`.

### Fitur 5 — Ruang Kerja Guru / Pustakawan (`js/admin-views.js` & `js/admin-book-modal.js`)
- **Akses Terproteksi Supabase Auth** (serta mode demo lokal ketika Supabase belum diisi).
- **Tab Kurasi Naskah:** Filter status/peran, cari kode/judul, baca teks atau pratinjau PDF Drive, isi catatan pembimbing, ubah status, dan terbitkan ke Mading.
- **Tab Kelola Novel (Katalog & Placeholder):**
  - **CRUD Buku / Novel:** Tambah, sunting, dan hapus buku, dengan unggahan sampul WebP terkompresi (`covers/`, maks. 1 MB) dan berkas PDF katalog (`novel-pdf/`, maks. 16 MB) yang ditunda hingga tombol Simpan ditekan beserta persentase progres.
  - Field **`Cuplikan / Teks Baca Offline` (`excerpt`) sudah dihapus** dari formulir maupun skema database (`supabase/migration_drop_books_excerpt.sql`).
  - Field **`Kode ISBN / QRCBN`** dilengkapi tombol **`Scan Kamera`** dan **`Scan Gambar`** (`js/barcode-scanner.js` berbasis `@zxing/browser` on-demand + `BarcodeDetector` native) untuk memindai barcode batang `EAN-13` (ISBN) maupun QR Code (QRCBN) langsung ke kolom input, serta opsi kategori awal `Novel`, `Cerpen`, `Puisi`.
  - Editor 5 topik Budaya Gresik dan pengaturan portal (`contact_admin`, `librarian_corner`, `school_profile`, `kpi_stats`).

### Fitur 6 — PWA, Cloudflare Pages & Lembar Cetak QR A4 [Cetak QR Ditunda Sementara]
- **Lembar Cetak QR A4 (`#tab-cetak-qr` / `js/qr-print.js`):** **Belum dieksekusi / ditunda sementara** atas keputusan proyek; tombol menu `#tab-cetak-qr` di drawer disembunyikan (`hidden`) dan rute `'cetak-qr'` dinonaktifkan di `js/app.js`.
- **PWA & Proxy PDF Cloudflare Pages:** `manifest.json` (`orientation: landscape`), `sw.js` (`v3` network-first untuk app shell & cache CDN `PDF.js`), `_headers`, `_redirects`, `.cfignore`, serta `functions/api/pdf.js` sebagai proxy *same-origin* pembaca PDF.

---

## 5. Adaptasi Arsitektur (`Cloudflare Pages + Supabase + Google Drive`)

| Komponen | Implementasi di `e-SIPENA SMAN 1 Sidayu` |
|---|---|
| **Frontend Core** | Vanilla HTML5, CSS3, ES6 Modules (`type="module"`), tanpa bundler (`29` modul `js/*.js`, setiap file `< 400` baris) |
| **Desain UI & Layar** | Kanvas 16:9 untuk Laptop, PC, TV Android (D-Pad/keyboard `:focus-visible`); HP & Tablet portrait dipaksa landscape (`rotate(90deg)` + tombol Putar `90° / 270°` & `Layar Penuh`) |
| **Pembaca PDF & Scanner** | `PDF.js` (`pdfjs-dist@4.8.69`) + IndexedDB cache via proxy `/api/pdf`, serta `@zxing/browser@0.1.5` + `BarcodeDetector` on-demand |
| **Hosting & Proxy** | Cloudflare Pages (`_headers`, `.cfignore` pengecualian aset mentah > 25 MiB) + Pages Function `functions/api/pdf.js` |
| **Database & Auth** | Supabase Free Tier PostgreSQL REST/RPC (`fetch()` native), RLS ketat, View `public_mading_works`, RPC `track_submission` & `increment_book_like`, Auth kurator |
| **Storage PDF & Cover** | 100% Google Drive via `UploadDrive.gs` (**1 `TARGET_FOLDER_ID`** -> `covers/`, `naskah-pdf/`, `novel-pdf/`); **Supabase Storage = 0 MB** |

---

## 6. Struktur Direktori Proyek Aktual

```text
SIPENA SMANSI/
├── assets/
│   ├── icons/                      # Ikon PWA (192x192, 512x512 PNG/WebP, favicon)
│   ├── covers/                     # Sampul 12 Novel 2026 format .webp
│   └── images/                     # Logo SMAN 1 Sidayu (.webp)
├── css/
│   ├── style.css                   # Tema SMAN 1 Sidayu, panggung 16:9, modal fullscreen, flipbook 3D, responsive
│   └── print.css                   # Aturan @media print A4 (siap untuk Sesi 4 nanti)
├── data/
│   └── esipena_data.json           # Dataset fallback lokal & placeholder terstruktur (tanpa excerpt)
├── functions/
│   └── api/
│       └── pdf.js                  # Cloudflare Pages Function proxy PDF Google Drive (/api/pdf?id=...)
├── google-apps-script/
│   ├── UploadDrive.gs              # Endpoint upload 1 Root ID -> covers/, naskah-pdf/, novel-pdf/
│   └── README.md                   # Panduan pemasangan, verifikasi doGet, dan kontrak payload
├── supabase/
│   ├── schema.sql                  # Skema PostgreSQL (books tanpa excerpt, submissions, culture_prompts, site_settings)
│   ├── seed.sql                    # Seed 12 Novel 2026 + placeholder Budaya Gresik, Mading, site_settings
│   └── migration_drop_books_excerpt.sql # Migrasi SQL DROP COLUMN excerpt untuk database existing
├── js/
│   ├── admin-auth.js               # Autentikasi Supabase & sesi demo lokal pengelola
│   ├── admin-book-modal.js         # Modal tambah/sunting/hapus buku + scan ISBN + upload WebP/PDF
│   ├── admin-catalog-modals.js     # Modal penyuntingan topik Budaya Gresik & dokumen Pustakawan
│   ├── admin-catalog-views.js      # Tampilan manajemen katalog, Budaya Gresik & pengaturan portal
│   ├── admin-curation-modal.js     # Modal kurasi naskah masuk
│   ├── admin-service.js            # CRUD REST Supabase & demo lokal untuk buku, karya, budaya, settings
│   ├── admin-views.js              # Shell Ruang Kerja Pengelola / Pustakawan
│   ├── app.js                      # Controller utama kanvas 16:9, routing tab, filter & deep-link
│   ├── audio.js                    # Web Audio API SFX & Web Speech API sinopsis/teks
│   ├── barcode-scanner.js          # Pemindai barcode ISBN (EAN-13) & QR Code kamera/gambar
│   ├── book-modal.js               # Modal buku fullscreen (tab Detail tanpa QR & tab Baca Buku PDF)
│   ├── book-reader-ui.js           # Pengendali animasi 3D buka sampul & auto-cache PDF offline
│   ├── community-views.js          # Jejak Budaya Gresik, Mading Digital, Sudut Pustakawan
│   ├── config.js                   # Konfigurasi terpusat Supabase, Apps Script & paginasi
│   ├── data-service.js             # Pengambilan data publik + re-export modul layanan Sesi 3
│   ├── media-upload.js             # Kompresi sampul WebP & unggah aset tertunda ke GDrive
│   ├── modal-helper.js             # Pengelola modal terpusat & kontrol fullscreen kanvas/browser
│   ├── nav-controls.js             # Drawer, putar layar 90/270, fullscreen, D-Pad & swipe
│   ├── pdf-cache.js                # Penyimpanan cache biner PDF di IndexedDB & proxy fetch
│   ├── pdf-slide-viewer.js         # Renderer PDF.js 1/2 halaman + flipbook 3D + Fokus Baca
│   ├── public-views.js             # Etalase Hero/KPI & grid 12 Novel 2026
│   ├── qr-helper.js                # Generator QR Code SVG/Canvas client-side
│   ├── qr-print.js                 # [Ditunda — belum dibuat hingga Sesi 4 diaktifkan]
│   ├── service-helpers.js          # Helper bersama fetch Supabase, Apps Script & override lokal
│   ├── submission-service.js       # Layanan Kirim Karya & pelacakan kode SPN
│   ├── submission-views.js         # Antarmuka Formulir Kirim Karya (Novel/Cerpen/Puisi)
│   ├── text-flipbook.js            # Pembaca teks cadangan mode slide berhalaman
│   ├── tracking-panel.js           # Antarmuka cek status SPN tanpa login & kartu tanda terima
│   ├── ui-utils.js                 # Sanitasi HTML, ikon SVG, toast, WA, helper tautan Drive
│   └── yt-player.js                # YouTube IFrame API & modal pemutar Budaya Gresik
├── scripts/
│   └── build-assets.mjs            # Utilitas ekstraksi & konversi aset ke WebP & ikon PWA
├── _headers, _redirects, .cfignore # Konfigurasi deploy Cloudflare Pages
├── index.html                      # Dokumen utama HTML5 (#tab-cetak-qr dalam kondisi hidden)
├── manifest.json                   # Konfigurasi PWA e-SIPENA SMAN 1 Sidayu
├── package.json                    # Dependensi utilitas lokal (sharp, dll.)
├── PROGRESS.md                     # Pelacakan progres per sesi
├── README.md                       # Dokumentasi umum proyek
├── server.js                       # Server dev lokal Node + proxy lokal /api/pdf
├── SESSION_PROMPTS.md              # Panduan prompt lintas sesi
└── sw.js                           # Service Worker v3
```

---

## 7. Skema Database Supabase, RLS & Integrasi Google Drive

### 7.1 Skema Tabel PostgreSQL (`supabase/schema.sql`)

1. **`books`** (Katalog Novel & Buku Digital):
   - `id` (`uuid` PK), `slug` (`text` unique), `title` (`text`), `author_name` (`text`), `author_role` (`text`: `Siswa XI` | `Siswa XII` | `Guru` | `Tendik` | `Kepala Sekolah`), `author_class` (`text`), `publication_year` (`integer`), `category` (`text`, default `'Novel'`), `synopsis` (`text`), `cover_url` (`text`), `gdrive_file_id` (`text`), `gdrive_preview_url` (`text`), `qrcbn_code` (`text`), `likes_count` (`integer`), `sort_order` (`integer`), `is_published` (`boolean`), `is_featured` (`boolean`), `is_placeholder` (`boolean`), `created_at` (`timestamptz`), `updated_at` (`timestamptz`). *(Kolom `excerpt` sudah dihapus; database eksisting dimigrasikan melalui `supabase/migration_drop_books_excerpt.sql`.)*
2. **`submissions`** (Kirim Karya, Lacak Kode, Kurasi & Mading Digital):
   - `id` (`uuid` PK), `tracking_code` (`text` unique), `title` (`text`), `author_name` (`text`), `author_role` (`text`), `author_class_unit` (`text`), `category` (`text` CHECK `('Cerpen', 'Esai Budaya', 'Puisi', 'Resensi Buku', 'Artikel Literasi', 'Novel')`), `culture_theme` (`text` default `''`), `summary` (`text`), `body_text` (`text`), `gdrive_file_id` (`text`), `gdrive_view_url` (`text`), `gdrive_preview_url` (`text`), `file_name` (`text`), `file_size_bytes` (`integer`), `contact_wa` (`text`), `anti_plagiarism_agreed` (`boolean`), `status` (`text`), `reviewer_notes` (`text`), `is_placeholder` (`boolean`), `published_at` (`timestamptz`), `created_at` (`timestamptz`), `updated_at` (`timestamptz`).
3. **`culture_prompts`** (5 Topik Jejak Budaya Gresik):
   - `id` (`uuid` PK), `slug` (`text` unique), `title` (`text`), `subtitle` (`text`), `youtube_id` (`text`), `article_summary` (`text`), `writing_prompt` (`text`), `location_tag` (`text`), `duration_label` (`text`), `sort_order` (`integer`), `is_active` (`boolean`), `is_placeholder` (`boolean`), `created_at` (`timestamptz`), `updated_at` (`timestamptz`).
4. **`site_settings`** (`key` PK, `value` `jsonb`, `description`, `is_public`, `is_placeholder`, `updated_at`).

### 7.2 RLS & RPC
- `anon`: boleh `SELECT` `books` (`is_published = true`), `public_mading_works` (tanpa `contact_wa`), `culture_prompts` (`is_active = true`), `site_settings` (`is_public = true`), serta `INSERT` ke `submissions` (`anti_plagiarism_agreed = true` & `status = 'Menunggu Kurasi'`).
- RPC `track_submission(p_tracking_code)` & `increment_book_like(p_book_id)` menggunakan `SECURITY DEFINER`.
- `authenticated`: akses penuh CRUD seluruh tabel.

### 7.3 Alur Google Drive (`UploadDrive.gs` + Proxy `/api/pdf`)
- `UploadDrive.gs` memakai **1 `TARGET_FOLDER_ID`** dan memilah otomatis:
  - `covers/`: gambar sampul `.webp`/`.png`/`.jpg` maks. `1 MB`
  - `naskah-pdf/`: PDF kiriman form publik maks. `3 MB`
  - `novel-pdf/`: PDF buku katalog kurator maks. `16 MB`
- Pembaca buku memuat biner PDF melalui proxy *same-origin* `/api/pdf?id=<fileId>` (`functions/api/pdf.js` / `server.js`) ke IndexedDB untuk dirender oleh `PDF.js`.

---

## 8. Checklist Penerimaan & Status Terbaru

- [x] Rak Buku Digital menampilkan **12 Novel Tahun 2026** lengkap dengan pencarian, filter peran (`Siswa XI`, `Siswa XII`, `Guru`), dan sampul WebP teroptimasi.
- [x] Modal buku terbuka **fullscreen**; tab `Detail` menampilkan informasi, `ISBN / QRCBN`, audio sinopsis, tombol Suka via RPC, tombol Pesan WA, dan Unduh PDF (tanpa QR); tab `Baca Buku` langsung membuka pembaca **PDF.js Flipbook 1/2 halaman** dengan animasi buka buku & cache IndexedDB otomatis (tanpa bilah cache/Drive maupun tab pemilih mode).
- [x] 5 topik Jejak Budaya Gresik berjalan dengan pemutar YouTube, artikel pemantik, dan tombol menuju Kirim Karya.
- [x] Formulir Kirim Karya menyediakan kategori sementara **`Novel`, `Cerpen`, `Puisi`** (tanpa field Tema Budaya Gresik), validasi PDF `<= 3 MB`, centang anti-plagiat, unggah ke GDrive `naskah-pdf/`, simpan ke Supabase, dan tampilkan Kode Lacak `SPN-XXXXXX`.
- [x] Panel Cek Status Tanpa Login menampilkan status dan catatan pembimbing berdasarkan Kode Lacak tanpa membocorkan data pengguna lain.
- [x] Ruang Pengelola terproteksi Supabase Auth mendukung kurasi naskah, CRUD katalog buku (unggah WebP & PDF hingga 16 MB, label `Kode ISBN / QRCBN` + **Scan Kamera / Scan Gambar**, tanpa field `excerpt`), dan pengelolaan placeholder.
- [x] Tata letak utama **16:9 Landscape** mendukung navigasi Keyboard/D-Pad TV Android (`:focus-visible`) dan paksa landscape di HP/Tablet (`Putar 90°/270°` & `Layar Penuh`).
- [ ] **[Ditunda sementara — Menu disembunyikan]** Halaman Cetak QR A4 (`Sesi 4`: `js/qr-print.js` & aktivasi `#tab-cetak-qr`).
- [ ] Audit final daftar app-shell PWA `sw.js` & uji akhir menyeluruh sebelum deploy produksi Cloudflare Pages.
