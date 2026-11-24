# e-SIPENA — Portal Literasi Digital SMA Negeri 1 Sidayu

Portal literasi digital **Perpustakaan Lentera Ilmu & NLC (Naskah Literasi Cendekia)** SMA Negeri 1 Sidayu, Gresik. Aplikasi ini dirancang dengan kanvas widescreen **16:9 Landscape** untuk Laptop, PC, dan TV Android (dukungan navigasi keyboard dan remote D-Pad), serta tampilan paksa-landscape pada HP dan Tablet.

---

## Ringkasan Fitur & Status Pengembangan

Seluruh fitur inti aplikasi (**Sesi 1 sampai Sesi 4**) telah selesai dibangun dengan **29 modul aktif** di `js/*.js`, PWA offline-ready, dan konfigurasi siap deploy ke Cloudflare Pages:

1. **Etalase Antologi Novel 2026:** Katalog 12 Novel Tahun 2026 (11 Siswa XI–XII + 1 Guru SAGUSABU), KPI capaian program (termasuk rekam jejak 23 Buku 2025), pencarian real-time, filter peran, serta paginasi rak 4/8 buku per halaman dengan tombol panah, titik halaman, dan gestur geser (swipe).
2. **Modal Detail & Pembaca PDF Flipbook Offline:** Modal otomatis fullscreen kanvas dengan tab **Detail** (sampul 3D, `ISBN / QRCBN`, sinopsis, audio sinopsis Web Speech API Bahasa Indonesia, tombol Suka RPC, dan pesan cetak via WhatsApp) serta tab **Baca Buku** (animasi 3D buka sampul, pembaca `PDF.js` 1/2 halaman + efek balik halaman flipbook + `Fokus Baca`, serta auto-cache diam-diam ke IndexedDB melalui proxy `/api/pdf` dengan cadangan teks saat luring).
3. **Komunitas & Edukasi:** **Jejak Budaya Gresik** (5 pemutar YouTube + artikel pemantik + tombol tulis karya), **Mading Digital** (karya lolos kurasi + filter peran + paginasi/swipe + modal baca + tombol **Ajukan Karya**), dan **Sudut Pustakawan** (pedoman penulis, anti-plagiat, alur kurasi, dan kontak perpustakaan).
4. **Kirim Karya PDF & Cek Status Tanpa Login:** Diakses melalui tombol **Ajukan Karya** di Mading Digital, **Tulis Karya** di Jejak Budaya Gresik, atau tautan `/kirim` (`/lacak`), mencakup formulir pengiriman karya (kategori `Novel`, `Cerpen`, `Puisi`) dengan validasi berkas `.pdf` maksimal **3 MB**, unggah ke subfolder `naskah-pdf/` Google Drive lewat Apps Script, kode lacak `SPN-XXXXXX`, dan pelacakan status tanpa login.
5. **Ruang Kerja Pengelola & Kurasi:** Autentikasi kurator via **Supabase Auth** (dengan fallback mode demo lokal bila offline/belum terhubung), kurasi status dan catatan naskah masuk, CRUD katalog buku beserta unggah sampul WebP (`covers/` <= 1 MB) dan PDF buku (`novel-pdf/` <= 16 MB) ke Google Drive, pemindai barcode **`Scan Kamera`** / **`Scan Gambar`** untuk `Kode ISBN / QRCBN`, serta editor Budaya Gresik dan `site_settings`.
6. **PWA & Kontrol Layar:** Drawer menu kiri (`Putar 90°/270°`, `Layar Penuh`), efek suara Web Audio API, instalasi PWA (`sw.js`, `manifest.json`, dan panduan pemasangan iOS Safari).

> **Catatan Fitur Ditunda:** Menu **Lembar Cetak QR A4** (`#tab-cetak-qr` di [index.html](index.html) dan `'cetak-qr'` di `VALID_TABS` [js/app.js](js/app.js)) dinonaktifkan sementara sesuai keputusan Sesi 4 (`js/qr-print.js` tidak disertakan).

---

## 1. Menjalankan Secara Lokal (`server.js`)

Pastikan **Node.js** sudah terpasang (v18+ disarankan agar `fetch` native tersedia untuk proxy `/api/pdf`), lalu jalankan di direktori proyek:

```bash
npm start
```

Server lokal [server.js](server.js) berjalan di `http://localhost:3000` (atau `PORT` dari environment) dan menyediakan:
- Penyajian berkas statis frontend beserta header `no-cache, must-revalidate` untuk `sw.js`.
- Routing SPA (`/`, `/rak`, `/budaya`, `/mading`, `/pustakawan`, `/kirim`, `/lacak`, `/kelola`).
- Endpoint proxy PDF same-origin `GET /api/pdf?id=<GDRIVE_FILE_ID>` untuk menguji pembaca `PDF.js` Flipbook dan caching IndexedDB secara lokal.

Untuk memeriksa sintaks server dan validitas dataset JSON:

```bash
npm run check
```

---

## 2. Setup Backend Supabase (Free Tier)

1. Buat proyek baru di [Supabase](https://supabase.com).
2. Buka menu **SQL Editor**, jalankan isi [supabase/schema.sql](supabase/schema.sql) untuk membuat 5 tabel (`books`, `submissions`, `models_3d`, `site_settings`, `librarian_activities`), view publik `public_mading_works`, kebijakan **RLS** ketat, serta RPC `track_submission(p_tracking_code)` dan `increment_book_like(p_book_id)`.
3. *(Opsional / Migrasi DB Lama)* Jika proyek Supabase berasal dari skema lama, jalankan skrip migrasi yang sesuai di folder `supabase/`: [supabase/migration_drop_books_excerpt.sql](supabase/migration_drop_books_excerpt.sql), [supabase/migration_reset_submissions_remove_antologi.sql](supabase/migration_reset_submissions_remove_antologi.sql), [supabase/migration_models_3d.sql](supabase/migration_models_3d.sql), serta [supabase/migration_librarian_activities.sql](supabase/migration_librarian_activities.sql) untuk fitur Kegiatan Sudut Pustakawan.
4. Jalankan isi [supabase/seed.sql](supabase/seed.sql) di **SQL Editor** untuk mengisi data awal 12 Novel 2026, koleksi *Pameran 3D Gresik*, dan `site_settings` (data naskah kurasi & kegiatan dimulai kosong).
5. Buka **Authentication > Users** dan buat minimal satu akun email & kata sandi untuk Guru/Pustakawan (kurator).
6. Buka **Project Settings > API**, salin **Project URL** dan **anon / publishable public key**, lalu pasang pada `SUPABASE_URL` dan `SUPABASE_ANON_KEY` di [js/config.js](js/config.js). **Jangan pernah** menaruh `service_role key` atau kata sandi admin di berkas frontend.

---

## 3. Setup Google Drive & Apps Script (`UploadDrive.gs`)

Seluruh berkas PDF dan sampul unggahan disimpan di Google Drive (pemakaian **Supabase Storage = 0 MB**) menggunakan **1 Folder Induk (`TARGET_FOLDER_ID`)**:

1. Buat satu folder induk di Google Drive akun pengelola perpustakaan/NLC (misalnya `eSIPENA-Drive-SMANSI`) dan salin **Folder ID** dari URL folder (`https://drive.google.com/drive/folders/<FOLDER_ID>`).
2. Buka [script.google.com](https://script.google.com), buat atau buka proyek Apps Script e-SIPENA, lalu salin seluruh isi [google-apps-script/UploadDrive.gs](google-apps-script/UploadDrive.gs) ke `Code.gs`.
3. Buka **Project Settings > Script Properties** dan atur properti `TARGET_FOLDER_ID` dengan ID folder induk tersebut (atau perbarui konstanta `TARGET_FOLDER_ID` di baris atas skrip). Skrip otomatis membuat dan memilah unggahan ke 4 subfolder:
   - `covers/` — sampul `.webp` terkompresi dari Ruang Pengelola (maks. 1 MB)
   - `kegiatan/` — foto dokumentasi kegiatan Sudut Pustakawan `.webp` (maks. 1 MB per foto)
   - `naskah-pdf/` — kiriman PDF publik dari formulir Kirim Karya (maks. 3 MB)
   - `novel-pdf/` — PDF buku katalog unggahan kurator dari Ruang Pengelola (maks. 16 MB)
4. Klik **Deploy > New deployment** (atau **Manage deployments > Edit > New version** bila memperbarui), pilih tipe **Web app** dengan **Execute as**: `Me` dan **Who has access**: `Anyone`.
5. Buka URL `/exec` langsung di browser untuk verifikasi health-check `doGet()` (`"success": true`, `"configured": true`), lalu tempelkan URL `/exec` ke `GDRIVE_UPLOAD_URL` pada [js/config.js](js/config.js).
6. Panduan detail kontrak JSON dan keamanan sisi server tersedia di [google-apps-script/README.md](google-apps-script/README.md). Untuk tautan PDF Google Drive yang dimasukkan manual ke katalog, pastikan izin berbagi file diset **Anyone with the link -> Viewer** agar proxy `/api/pdf` dapat mengambilnya.

---

## 4. Panduan Deploy ke Cloudflare Pages

1. Buat proyek Cloudflare Pages (hubungkan repositori Git atau unggah direktori proyek):
   - **Framework preset:** `None`
   - **Build command:** *(kosongkan)*
   - **Build output directory:** `.`
2. **Cloudflare Pages Function `/api/pdf`:** Berkas [functions/api/pdf.js](functions/api/pdf.js) otomatis aktif pada rute `GET /api/pdf?id=<GDRIVE_FILE_ID>` untuk meneruskan stream biner PDF Google Drive secara *same-origin* ke pembaca `PDF.js` Flipbook dan IndexedDB.
3. **Header & Routing:**
   - [_headers](_headers) mengatur header keamanan (`Permissions-Policy: camera=(self), microphone=(), geolocation=()` untuk mendukung `Scan Kamera` ISBN/QRCBN di Ruang Pengelola), cache `/assets/*` (`immutable`), `sw.js` (`no-cache, must-revalidate`), `manifest.json`, dan `/data/*`.
   - [_redirects](_redirects) meneruskan rute SPA (`/rak`, `/budaya`, `/mading`, `/pustakawan`, `/kirim`, `/lacak`, `/kelola`) ke `/index.html` dengan status `200`.
4. **Pengecualian Berkas Besar (`.cfignore`):** Berkas [.cfignore](.cfignore) otomatis memblokir folder dan berkas mentah/dev agar tidak ikut ter-deploy (`00. NASKAH FIX CETAK/`, `00. NASKAH GABUNGAN/`, `Kumpulan Cover - Antologi - QRCBN.pdf`, `*.docx`, `*.cdr`, `*.pdf`, `node_modules/`, `scripts/`, `server.js`, `package*.json`, `supabase/`, `google-apps-script/`, dan berkas dokumentasi), sehingga seluruh berkas deploy aman jauh di bawah batas **25 MiB/file** Cloudflare Pages.

> Untuk tutorial langkah demi langkah (baik via **GitHub/GitLab** maupun **Direct Upload Wrangler CLI** tanpa GitHub), lihat panduan khusus di [DEPLOY_CLOUDFLARE_PAGES.md](DEPLOY_CLOUDFLARE_PAGES.md).

---

## Arsitektur & Batasan Teknis

- **Frontend:** Vanilla HTML5, CSS3, ES6 Modules (`type="module"`) tanpa bundler, dengan `29` modul di `js/*.js` (masing-masing `< 400` baris).
- **Database & Auth:** Supabase PostgreSQL REST/RPC + Row Level Security (RLS) + fallback dataset lokal [data/esipena_data.json](data/esipena_data.json) dan `SafeStorage`.
- **Media & PWA:** Sampul `.webp` terkompresi (`assets/covers/*.webp`), ikon PWA di `assets/icons/` (`192x192`, `512x512`, `maskable`, dan `apple-touch-icon`), Web Audio API murni ([js/audio.js](js/audio.js)), serta Service Worker ([sw.js](sw.js)) untuk app shell luring.
- **Pembuatan Ulang Aset WebP (Dev Lokal):** Skrip `node scripts/build-assets.mjs` menghasilkan logo, ikon PWA, dan 12 sampul novel WebP menggunakan `sharp` dan `mupdf` (`devDependencies`).
