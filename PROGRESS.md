# Progress Proyek — e-SIPENA SMAN 1 Sidayu

File ini adalah memori bersama lintas sesi chat. Setiap selesai satu sesi, AI wajib memperbarui checklist sesi dan bagian **Status Terakhir** secara ringkas.

---

## Ringkasan Kontrak Teknis Terkunci

- **Aplikasi:** Portal Literasi Digital **"e-SIPENA" SMAN 1 Sidayu** (Perpustakaan Lentera Ilmu & NLC)
- **Katalog Buku Aktif:** **12 Novel Tahun 2026** dari `DAFTAR NAMA PENULIS NOVEL TAHUN 2026.docx` & `00. NASKAH FIX CETAK/` (11 Siswa XI–XII + 1 Guru SAGUSABU *Mas'Idah*). Rekam jejak 23 Buku 2025 tampil pada KPI capaian program saja.
- **Data Pendukung:** Menggunakan **data placeholder terstruktur** (`is_placeholder: true`) untuk contoh awal, WA admin, **Kegiatan Sudut Pustakawan** multi-foto (`librarian_activities`), serta **3 koleksi Pameran 3D Gresik (`models_3d`)** beraset lokal (`assets/3d_models/*.glb` + `assets/placeholders/*`) yang dapat diedit lewat Ruang Pengelola / Supabase.
- **Prioritas Layar & Orientasi (`AGENTS.md`):**
  - Kanvas **16:9 Landscape** dipertahankan untuk **Laptop, PC, dan TV Android** (navigasi drawer kiri + panel modul, paginasi ringkas maks. 4–8 kartu/halaman + swipe/panah samping rak + titik halaman, indikator `:focus-visible` & kontrol keyboard/remote D-Pad penuh).
  - **HP & Tablet memakai orientasi adaptif alami perangkat** (tanpa paksa rotasi CSS `90deg`/`270deg`, `manifest.json` `"orientation": "any"`, tanpa `screen.orientation.lock`):
    - **HP Portrait (`<= 599px`) & Tablet Portrait (`600–1024px`):** kanvas penuh `100dvw x 100dvh`, grid 2 kolom vertikal, form 1 kolom ramah keyboard virtual, dan pembaca PDF default **1 halaman (`1 Hal`)** dilengkapi tombol `Pas Lebar` / `Pas Layar` serta ketuk tepi kiri/kanan.
    - **HP Landscape (`max-height: 500px`):** kartu `2x2` horizontal ringkas dan pembaca PDF default **1 halaman (`1 Hal`)**.
    - **Tablet Landscape (`w >= 780 && h >= 440 && w > h`), Laptop, PC & TV Android:** pembaca PDF otomatis beralih ke **2 halaman (`2 Hal` flipbook)** saat diputar ke landscape (kecuali dikunci manual) serta reset transformasi pada `@media print` A4.
- **Stack Terkunci:**
  - **Frontend:** Vanilla HTML5, CSS3, ES6 Modules (`type="module"`), `PDF.js` (`pdfjs-dist@4.8.69` via CDN + IndexedDB cache), `@zxing/browser` (on-demand scan ISBN/QR), Web Audio API, Web Speech API, PWA (`manifest.json`, `sw.js`).
  - **Hosting:** **Cloudflare Pages** (`_headers`, `_redirects`, `.cfignore`, Cloudflare Pages Function `functions/api/pdf.js`, batas maks. 25 MiB/file).
  - **Database & Auth:** **Supabase Free Tier** (PostgreSQL REST/RPC via `fetch()`, RLS, Supabase Auth kurator). Storage Supabase untuk PDF = **0 MB**.
  - **PDF & Cover Storage:** **Google Drive** (1 folder induk `TARGET_FOLDER_ID` otomatis memilah `covers/` <= 1 MB WebP, `kegiatan/` <= 1 MB WebP per foto kegiatan, `naskah-pdf/` <= 3 MB, dan `novel-pdf/` <= 16 MB melalui `google-apps-script/UploadDrive.gs`).
- **Skema Supabase (`supabase/schema.sql` + `supabase/migration_drop_books_excerpt.sql` + `supabase/migration_reset_submissions_remove_antologi.sql` + `supabase/migration_models_3d.sql` + `supabase/migration_librarian_activities.sql`):**
  - Tabel: `books` (kolom `excerpt` sudah dihapus), `submissions`, `models_3d`, `site_settings`, `librarian_activities`
  - View publik: `public_mading_works` (hanya `Lolos Mading`, tanpa kolom `contact_wa`)
  - RPC: `track_submission(p_tracking_code)`, `increment_book_like(p_book_id)`

---

## Rencana & Checklist 4 Sesi Fokus

### Sesi 0 — Perencanaan & Spesifikasi (Selesai)
- [x] Finalisasi `PRD.md` v2.1 (selaras implementasi terkini)
- [x] Buat `AGENTS.md` (aturan UI Laptop/PC/TV Android + paksa Landscape HP/Tablet + batas hemat token)
- [x] Buat `PROGRESS.md` & `SESSION_PROMPTS.md`

### Sesi 1 — Backend SQL/GDrive, Ekstraksi Sampul WebP & Kerangka Stage 16:9 (Selesai)
- [x] Buat `supabase/schema.sql` (4 tabel, view `public_mading_works`, RLS policy, RPC `track_submission` & `increment_book_like`) dan `supabase/seed.sql` (12 Novel 2026 + placeholder Budaya Gresik, 8 karya Mading awal, `site_settings`)
- [x] Buat `google-apps-script/UploadDrive.gs` + `google-apps-script/README.md` untuk upload PDF & sampul ke 1 folder induk Drive (`covers/`, `naskah-pdf/`, `novel-pdf/`)
- [x] Ekstrak logo sekolah & sampul buku lokal ke `assets/covers/*.webp` & `assets/icons/*` (WebP teroptimasi via `scripts/build-assets.mjs`)
- [x] Buat `data/esipena_data.json` (dataset lokal/offline sinkron dengan `seed.sql`)
- [x] Buat `package.json`, `server.js`, `manifest.json`, `sw.js`, `_headers`, `_redirects`, `.cfignore`
- [x] Buat kerangka `index.html` + `css/style.css` + `css/print.css`
- [x] Verifikasi sintaks server + validasi JSON & ukuran aset lolos

### Sesi 2 — Core Engine, Polesan Etalase Visual & Modul Publik (Fitur 1, 2, 3) (Selesai + Penyempurnaan Reader)
- [x] Buat `js/config.js`, `js/audio.js`, `js/data-service.js`, `js/yt-player.js`, `js/qr-helper.js`, `js/ui-utils.js`, `js/modal-helper.js`
- [x] Buat `js/public-views.js`, `js/book-modal.js`, `js/book-reader-ui.js`, `js/pdf-cache.js`, `js/pdf-slide-viewer.js`, `js/text-flipbook.js`, `js/community-views.js`, `js/nav-controls.js`, `js/app.js`, serta endpoint proxy `functions/api/pdf.js` & `/api/pdf` di `server.js`
- [x] Implementasi **Fitur 1**: Hero/KPI SMAN 1 Sidayu, Rak 12 Novel 2026 (grid 4 kolom berpaginasi 4 buku/halaman, pencarian real-time, filter peran, panah rak & swipe)
- [x] Implementasi **Fitur 2**: Modal Detail & Baca Buku **otomatis fullscreen (100% kanvas)** dengan kontrol `Perkecil` / `Kanvas Penuh` dan `Layar Penuh` browser di header modal; tab **`Detail`** tanpa kartu QR (sampul 3D, `ISBN / QRCBN`, sinopsis, audio sinopsis, Suka RPC, WA, Unduh PDF); klik **`Baca Buku`** langsung memuat pembaca PDF (`PDF.js` slide 1/2 halaman + animasi flipbook 3D + mode `Fokus Baca` + animasi 3D buka sampul + auto-cache IndexedDB diam-diam tanpa bilah status cache/Drive maupun tab pemilih PDF/Teks, dengan cadangan sinopsis jika offline sebelum di-cache)
- [x] Implementasi **Fitur 3**: Menu **Jejak Budaya Gresik** (5 pemutar YouTube + artikel pemantik + CTA ke Kirim Karya), **Mading Digital** (8 contoh placeholder + filter peran + paginasi/swipe + modal baca), dan **Sudut Pustakawan**
- [x] Polesan visual etalase di `css/style.css` dan verifikasi modul lolos `< 400` baris

### Sesi 3 — Kirim Karya PDF 3 MB ke GDrive, Lacak Kode & Ruang Pustakawan (Fitur 4 & 5) (Selesai + Penyempurnaan Katalog)
- [x] Buat modul service Sesi 3 (`js/service-helpers.js`, `js/submission-service.js`, `js/admin-auth.js`, `js/admin-service.js`, `js/media-upload.js`) dan re-export di `js/data-service.js`
- [x] Buat `js/submission-views.js` + `js/tracking-panel.js` (**Fitur 4**): Formulir Kirim Karya tanpa login dengan kategori dibatasi sementara ke **`Novel`, `Cerpen`, `Puisi`** dan tanpa field/banner `Tema Budaya Gresik`; validasi PDF <= 3 MB; upload GDrive (`naskah-pdf/`); centang anti-plagiat; Kode Lacak `SPN-XXXXXX` + panel Cek Status Tanpa Login
- [x] Buat `js/admin-views.js` + `js/admin-curation-modal.js` + `js/admin-catalog-views.js` + `js/admin-catalog-modals.js` + `js/admin-book-modal.js` + `js/barcode-scanner.js` (**Fitur 5**): Login Supabase Auth / demo lokal, kurasi naskah masuk, CRUD katalog buku dinamis (unggah WebP `covers/` & PDF `novel-pdf/` <= 16 MB saat Simpan dengan progres %), penghapusan input & kolom DB `excerpt` (`supabase/migration_drop_books_excerpt.sql`), label **`Kode ISBN / QRCBN`** + fitur **`Scan Kamera`** & **`Scan Gambar`** (`EAN-13` / QR), kelola Budaya Gresik & `site_settings`
- [x] Verifikasi `node --check` seluruh `29` file `js/*.js`, batas `< 400` baris/file, dan validitas `data/esipena_data.json`

### Sesi 4 — PWA & Audit Siap Deploy Cloudflare Pages (Selesai — Tanpa Lembar Cetak QR A4)
- [ ] **[Ditunda — Tidak Dieksekusi]** Pembuatan `js/qr-print.js` (**Lembar Cetak QR A4**) ditunda sementara; `#tab-cetak-qr` di `index.html` tetap `hidden` dan `'cetak-qr'` dinonaktifkan di `VALID_TABS` (`js/app.js`)
- [x] Finalisasi **PWA (`sw.js` `esipena-shell-v4` lengkap mencakup seluruh `29` modul `js/*.js` aktif, `data/esipena_data.json`, & aset inti; `manifest.json` terverifikasi lengkap dengan ikon `192x192`, `512x512`, `maskable`, & `id`; meta iOS di `index.html`; tombol `#btn-install-pwa` di `js/nav-controls.js` + modal panduan iOS Safari)**
- [x] Audit menyeluruh sesuai `AGENTS.md` & kesiapan **Cloudflare Pages**: navigasi D-Pad/keyboard TV Android (`:focus-visible` + navigasi spasial `#top-hud`, `#stage-main`, & modal), drawer menu kiri (`Putar 90°/270°`, `Layar Penuh`, `#tab-cetak-qr` tetap tersembunyi), modal buku fullscreen (`Detail` tanpa QR & pembaca `PDF.js` Flipbook via `/api/pdf`), swipe paginasi PC/HP, layout ponsel `375x667` & tablet `600–1024px`, area sentuh minimal `40px`, 0 emoji dekoratif, `.cfignore` mengecualikan seluruh folder/berkas mentah > 25 MiB (`00. NASKAH FIX CETAK/`, `00. NASKAH GABUNGAN/`, `*.docx`, `*.cdr`, `*.pdf`, `node_modules/`, `scripts/`, `server.js`, `supabase/`, `google-apps-script/`), `_headers` (`Permissions-Policy: camera=(self)`), `_redirects`, dan `functions/api/pdf.js`
- [x] Perbarui `README.md` di root (serta cek sinkronisasi `google-apps-script/README.md`) untuk panduan lokal (`server.js`), setup Supabase (`schema.sql`, `migration_drop_books_excerpt.sql`, `seed.sql`), Google Drive `UploadDrive.gs` (`1 TARGET_FOLDER_ID`), dan deploy Cloudflare Pages
- [x] Jalankan verifikasi akhir gabungan (`node --check` seluruh `29` file `js/*.js`, `sw.js`, `server.js`, `functions/api/pdf.js`, batas `< 400` baris/file JS, validasi JSON, keseimbangan CSS, audit ukuran file deploy < 25 MiB, dan uji rute `server.js`)

---

## Status Terakhir
- **Status proyek:** **Selesai (Sesi 1–4 + Pembaruan UI/UX Adaptif HP & Tablet + Reset Kurasi + Pameran 3D Gresik AR)** dan **siap deploy ke Cloudflare Pages** (fitur **Lembar Cetak QR A4** / `js/qr-print.js` ditunda dan `#tab-cetak-qr` tetap disembunyikan).
- **Catatan terakhir:** Mengganti menu **Jejak Budaya Gresik** menjadi **Pameran 3D Gresik** (`panel-pameran3d`, `js/model-3d-modal.js`, `js/community-views.js`, `@google/model-viewer` dengan AR & pemutaran otomatis audio lokal `assets/audios/*.mpeg` via `playAudioTrack` di `js/audio.js` saat `Lihat 3D & AR` dibuka), mengoptimalkan ukuran 3 model `.glb` di `assets/3d_models/` via `scripts/optimize-3d.mjs` (total dari ~53 MiB menjadi ~4,08 MiB), memakai gambar awal dari `assets/placeholders/`, membuat tabel `models_3d` (termasuk kolom `audio_path` di `supabase/schema.sql` & `supabase/migration_models_3d.sql`), serta menambah editor judul, teks perkenalan, pemilih berkas audio, dan tombol `Uji Audio` di Ruang Pengelola (`js/admin-catalog-views.js` & `js/admin-catalog-modals.js`). Menyeragamkan input **Sinopsis Buku** di `js/admin-book-modal.js` dengan toolbar format editor `Tulis Naskah Langsung` melalui modul bersama `js/literary-editor.js`, serta merender sinopsis berformat HTML/markdown secara tersanitasi di tab Detail `js/book-modal.js` (beserta ekstraksi teks bersih untuk TTS, fallback pembaca teks slide di `js/text-flipbook.js`, pencarian di `js/public-views.js`, dan validasi di `js/admin-service.js`). Memisahkan katalog buku Ruang Pengelola (`js/admin-catalog-views.js`, `css/style.css`) menjadi 3 section berurutan (**Novel**, **Cerpen**, **Puisi**) lengkap dengan tombol lompat jenis, tombol `+ Tambah` ber-preset kategori dan nomor urut rak otomatis per kategori (`nextOrderByCategory` di `js/admin-catalog-views.js` & `js/admin-book-modal.js`), meniadakan input & kewajiban **Cover**, **Penulis**, serta **Sinopsis Buku** khusus untuk `Cerpen` dan `Puisi` (`js/admin-book-modal.js`, `js/admin-service.js`, `js/book-modal.js`, `js/admin-catalog-views.js`), serta memperbarui etalase publik (`index.html`, `js/public-views.js`, `js/app.js`, `css/style.css`) menjadi **Etalase Antologi** dengan 3 section (**Novel**, **Cerpen**, **Puisi**) dan kartu editorial tanpa sampul/penulis untuk Cerpen & Puisi. Mengganti **Dokumen Sudut Pustakawan** menjadi **Kegiatan Sudut Pustakawan** (Judul, Deskripsi Singkat opsional, dan multi-foto WebP ke subfolder Drive `kegiatan/` lewat `UploadDrive.gs`) menggunakan tabel Supabase baru `librarian_activities` (`supabase/schema.sql`, `supabase/migration_librarian_activities.sql`, `js/admin-activity-service.js`, `js/admin-activity-modal.js`, `js/activity-modal.js`, `js/admin-catalog-views.js`, `js/community-views.js`), serta menambah tombol tampilkan/sembunyikan kata sandi pada form login Ruang Pengelola (`js/admin-views.js`, `js/ui-utils.js`). Cache PWA diperbarui ke `esipena-shell-v22`.
