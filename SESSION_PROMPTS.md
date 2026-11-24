# Panduan Optimasi Token & Prompt Per Sesi Chat — e-SIPENA SMAN 1 Sidayu

Dokumen ini dirancang agar konsumsi token AI tetap minimal, konsisten, dan terstruktur per sesi. Saat ini **Sesi 1 sampai Sesi 3 beserta penyempurnaan pasca-uji coba telah selesai**. Pada **Sesi 4**, fokusnya adalah **PWA & Audit Siap Deploy Cloudflare Pages**, sedangkan fitur **Lembar Cetak QR A4** (`js/qr-print.js`) **tidak dieksekusi** (menunya disembunyikan sementara).

---

## Strategi Optimasi Token Paling Efektif

1. **1 Chat Baru = 1 Sesi Fokus (Jangan Lanjut Chat Panjang):** Riwayat chat yang panjang mengirim ulang seluruh percakapan di setiap giliran. Memulai chat baru per sesi memotong konsumsi token input hingga **60–75%**.
2. **Allowlist Baca File Ketat:** Setiap prompt sesi mengunci hanya 2–5 file yang boleh dibaca AI. AI dilarang membaca ulang `PRD.md`, `SESSION_PROMPTS.md`, berkas `.docx`/`.pdf` mentah, atau folder proyek lain (`Materi Interaktif` / `Sipena`) kecuali diperintahkan eksplisit.
3. **Arsitektur File Kecil & Modular (`< 400` Baris/File):** Kode JS aktif dipecah menjadi 29 modul terpisah (`config.js`, `ui-utils.js`, `modal-helper.js`, `audio.js`, `data-service.js`, `service-helpers.js`, `media-upload.js`, `yt-player.js`, `qr-helper.js`, `nav-controls.js`, `public-views.js`, `book-modal.js`, `book-reader-ui.js`, `pdf-cache.js`, `pdf-slide-viewer.js`, `text-flipbook.js`, `community-views.js`, `submission-service.js`, `tracking-panel.js`, `submission-views.js`, `admin-auth.js`, `admin-service.js`, `admin-views.js`, `admin-curation-modal.js`, `admin-catalog-views.js`, `admin-catalog-modals.js`, `admin-book-modal.js`, `barcode-scanner.js`, `app.js`), endpoint Cloudflare Pages Function (`functions/api/pdf.js`), serta CSS cetak terpisah di `css/print.css`. (`js/qr-print.js` ditunda pada Sesi 4.)
4. **Memori Ringkas di `PROGRESS.md`:** Kontrak skema SQL, nama file, dan status dikonsolidasikan di `PROGRESS.md` sehingga menjadi satu-satunya dokumen konteks lintas sesi.
5. **Satu Perintah Verifikasi Akhir:** Di akhir sesi, cukup jalankan 1 perintah terminal gabungan (`node --check` + cek batas `< 400` baris + cek JSON/CSS) tanpa perulangan.

---

## Prompt Sesi 1 — Fondasi Backend (Supabase + GDrive), Aset WebP & Kerangka 16:9 (Selesai)

> **Catatan Status:** Sesi 1 selesai. Detail acuan yang telah diterapkan:
> 1. `supabase/schema.sql`, `supabase/seed.sql`, dan migrasi lanjutan `supabase/migration_drop_books_excerpt.sql` (menghapus kolom `excerpt` dari `books`). Tabel `books`, `submissions`, `culture_prompts`, `site_settings`, view `public_mading_works`, RLS, serta RPC `track_submission` & `increment_book_like` sudah tersedia.
> 2. `google-apps-script/UploadDrive.gs` + `google-apps-script/README.md`: memakai **1 `TARGET_FOLDER_ID`** yang otomatis memilah unggahan ke `covers/` (<= 1 MB WebP/PNG/JPEG), `naskah-pdf/` (<= 3 MB PDF), dan `novel-pdf/` (<= 16 MB PDF).
> 3. `data/esipena_data.json` sinkron tanpa field `excerpt` pada data buku.
> 4. Sampul & logo WebP diekstrak ke `assets/covers/` & `assets/images/`, serta ikon PWA di `assets/icons/` lewat `scripts/build-assets.mjs`.
> 5. Proxy PDF *same-origin* tersedia di `/api/pdf` (`server.js` untuk lokal & `functions/api/pdf.js` untuk Cloudflare Pages).

---

## Prompt Sesi 2 — Core Engine, Etalase Visual & Modul Publik (Selesai + Penyempurnaan Reader)

> **Catatan Status:** Sesi 2 selesai beserta peningkatan pembaca buku interaktif:
> 1. **Fitur 1 (Etalase Utama):** Hero SMAN 1 Sidayu, KPI capaian, pencarian real-time, filter peran (`Semua`, `Siswa XI`, `Siswa XII`, `Guru`), grid 4 kolom berpaginasi 4 buku/halaman, panah rak & swipe.
> 2. **Fitur 2 (`js/book-modal.js`, `js/modal-helper.js`, `js/book-reader-ui.js`, `js/pdf-cache.js`, `js/pdf-slide-viewer.js`):**
>    - Modal terbuka **fullscreen (100% kanvas)** otomatis dengan tombol `Perkecil` / `Kanvas Penuh` dan `Layar Penuh` browser di header modal.
>    - Tab **`Detail`**: sampul 3D, badge peran/tahun/`ISBN / QRCBN`, sinopsis, tombol `Baca Buku (PDF)`, `Unduh PDF`, `Dengar Sinopsis`, Suka via RPC, dan `Pesan Cetak via WA` (**tanpa kartu QR**).
>    - Tab **`Baca Buku`**: langsung membuka pembaca PDF (`PDF.js` slide 1/2 halaman + efek flipbook 3D balik halaman + tombol `Fokus Baca`) disertai animasi 3D membuka sampul dan auto-cache IndexedDB via `/api/pdf` (**tanpa tab pilihan PDF/Teks** dan **tanpa bilah cache/Drive**; cadangan teks sinopsis muncul otomatis jika offline sebelum di-cache).
> 3. **Fitur 3:** Panel **Jejak Budaya Gresik** (5 video YouTube + pemantik + CTA ke Kirim Karya), **Mading Digital**, dan **Sudut Pustakawan**.

---

## Prompt Sesi 3 — Kirim Karya PDF, Lacak Kode & Ruang Pengelola + Scanner ISBN (Selesai)

> **Catatan Status:** Sesi 3 selesai beserta penyesuaian form:
> 1. **Fitur 4 (`js/submission-views.js`, `js/submission-service.js`, `js/tracking-panel.js`):**
>    - Formulir **Kirim Karya Tanpa Login**: kategori karya dibatasi sementara ke **`Novel`, `Cerpen`, `Puisi`**, tanpa field/banner `Tema Budaya Gresik`; mendukung ringkasan/teks + upload PDF maks. 3 MB ke Drive (`naskah-pdf/`) + anti-plagiat + Kode Lacak `SPN-XXXXXX` + panel **Cek Status Tanpa Login**.
> 2. **Fitur 5 (`js/admin-views.js`, `js/admin-curation-modal.js`, `js/admin-catalog-views.js`, `js/admin-catalog-modals.js`, `js/admin-book-modal.js`, `js/barcode-scanner.js`):**
>    - Login kurator Supabase Auth / demo lokal, kurasi naskah masuk, manajemen placeholder Budaya Gresik & `site_settings`, serta CRUD Katalog Buku (`covers/` WebP <= 1 MB & `novel-pdf/` <= 16 MB diunggah saat Simpan ditekan).
>    - Input buku tanpa field `Cuplikan / excerpt`, label **`Kode ISBN / QRCBN`** dilengkapi **`Scan Kamera`** dan **`Scan Gambar`** (`EAN-13` / QR Code) via `@zxing/browser` on-demand + `BarcodeDetector` native.

---

## Prompt Sesi 4 — PWA & Audit Siap Deploy Cloudflare Pages (Tanpa Lembar Cetak QR A4)

> **Salin ke chat baru:**
>
> Baca `AGENTS.md`, `PROGRESS.md`, `index.html`, `sw.js`, `manifest.json`, dan `.cfignore`. Jangan baca `PRD.md`, `SESSION_PROMPTS.md`, atau folder proyek mentah (`00. NASKAH FIX CETAK`, `00. NASKAH GABUNGAN`).
> Kerjakan target **Sesi 4** di workspace `c:\Project\solusi.toriq\SIPENA SMANSI` (**CATATAN:** Fitur **Lembar Cetak QR A4** / `js/qr-print.js` **TIDAK dieksekusi** — biarkan tombol `#tab-cetak-qr` tetap `hidden` di `index.html` dan `'cetak-qr'` tetap nonaktif di `VALID_TABS` `js/app.js`):
> 1. Finalisasi **PWA (`sw.js`, `manifest.json`, dan `js/nav-controls.js`)**:
>    - Perbarui daftar `APP_SHELL_ASSETS` (serta naikkan versi cache bila diperbarui) pada `sw.js` agar mencakup seluruh **29 modul aktif** `js/*.js` (`admin-auth.js`, `admin-book-modal.js`, `admin-catalog-modals.js`, `admin-catalog-views.js`, `admin-curation-modal.js`, `admin-service.js`, `admin-views.js`, `app.js`, `audio.js`, `barcode-scanner.js`, `book-modal.js`, `book-reader-ui.js`, `community-views.js`, `config.js`, `data-service.js`, `media-upload.js`, `modal-helper.js`, `nav-controls.js`, `pdf-cache.js`, `pdf-slide-viewer.js`, `public-views.js`, `qr-helper.js`, `service-helpers.js`, `submission-service.js`, `submission-views.js`, `text-flipbook.js`, `tracking-panel.js`, `ui-utils.js`, `yt-player.js`) serta `data/esipena_data.json` dan aset inti.
>    - Verifikasi seluruh ikon pada `manifest.json` (`assets/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`), cek perilaku tombol `#btn-install-pwa` di `js/nav-controls.js`, dan pastikan panduan pasang iOS Safari ringkas tersedia bila diperlukan.
> 2. Lakukan **Audit Menyeluruh `AGENTS.md` & Kesiapan Deploy Cloudflare Pages**:
>    - Audit seluruh panel aktif pada kanvas 16:9 (Laptop/PC), fokus keyboard/D-Pad TV Android (`:focus-visible`), drawer kiri (`Putar 90°/270°`, `Layar Penuh`, serta memastikan `#tab-cetak-qr` tetap tersembunyi), modal buku fullscreen (`Detail` tanpa QR & `Baca Buku` PDF Flipbook via `/api/pdf`), swipe paginasi, layout ponsel `375x667` & tablet `600–1024px`, area sentuh minimal `40px`, dan pastikan **0 emoji dekoratif** pada kode UI.
>    - Audit folder deploy Cloudflare Pages: cek `.cfignore` agar seluruh folder/berkas mentah dan >25 MiB (`00. NASKAH FIX CETAK/`, `00. NASKAH GABUNGAN/`, `*.docx`, `*.cdr`, `*.pdf`, `node_modules/`, `scripts/`, `server.js`, `supabase/`, `google-apps-script/`) terblokir dan **0 file deploy >= 25 MiB**; cek juga `_headers`, `_redirects`, dan `functions/api/pdf.js`.
> 3. Perbarui `README.md` di root (dan cek sinkronisasi dengan `google-apps-script/README.md`) agar panduan menjalankan lokal (`server.js`), setup Supabase (`schema.sql`, `migration_drop_books_excerpt.sql`, `seed.sql`), setup Apps Script `UploadDrive.gs` (1 `TARGET_FOLDER_ID`), serta langkah deploy Cloudflare Pages akurat 100%.
> 4. Jalankan 1 perintah verifikasi gabungan (`node --check` semua file `js/*.js`, `sw.js`, `server.js`, `functions/api/pdf.js`; batas `< 400` baris/file JS; validasi JSON `data/esipena_data.json` & `manifest.json`; keseimbangan CSS; uji rute `server.js`), lalu tandai Sesi 4 selesai pada `PROGRESS.md`.
>
> *(Catatan lanjutan bila suatu saat Lembar Cetak QR A4 ingin diaktifkan: hapus atribut `hidden` pada `#tab-cetak-qr` di `index.html`, tambahkan `'cetak-qr'` kembali ke `VALID_TABS` di `js/app.js`, lalu buat `js/qr-print.js` sesuai `css/print.css`.)*
