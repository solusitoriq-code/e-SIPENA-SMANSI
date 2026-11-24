# Panduan Lengkap Deploy e-SIPENA SMAN 1 Sidayu ke Cloudflare Pages

Dokumen ini berisi langkah praktis pemasangan **e-SIPENA** ke **Cloudflare Pages** (paket Gratis / Free Plan) beserta pengaktifan Cloudflare Pages Function `/api/pdf` untuk pembaca PDF Flipbook offline.

---

## 1. Prasyarat Sebelum Deploy

Pastikan seluruh komponen berikut sudah siap sebelum mengunggah proyek ke Cloudflare Pages:

1. **Akun Cloudflare:** Daftar atau masuk ke [dash.cloudflare.com](https://dash.cloudflare.com).
2. **Backend Supabase sudah aktif:**
   - [supabase/schema.sql](supabase/schema.sql) dan [supabase/seed.sql](supabase/seed.sql) sudah dijalankan di **SQL Editor** Supabase (sertakan [supabase/migration_drop_books_excerpt.sql](supabase/migration_drop_books_excerpt.sql) jika proyek berasal dari skema lama).
   - Minimal 1 akun kurator sudah dibuat pada menu **Authentication > Users** di Supabase.
3. **Google Apps Script sudah di-deploy:**
   - [google-apps-script/UploadDrive.gs](google-apps-script/UploadDrive.gs) sudah terpasang dengan `TARGET_FOLDER_ID` dan di-deploy sebagai **Web app** (`Execute as: Me`, `Who has access: Anyone`). Lihat [google-apps-script/README.md](google-apps-script/README.md).
4. **Konfigurasi frontend terisi:**
   - Periksa [js/config.js](js/config.js) dan pastikan `SUPABASE_URL`, `SUPABASE_ANON_KEY` (publishable/anon key saja, bukan `service_role`), dan `GDRIVE_UPLOAD_URL` sudah benar.
5. **Uji lokal lolos (opsional namun disarankan):**
   - Jalankan `npm start` untuk mengecek aplikasi di `http://localhost:3000` dan `npm run check` untuk memvalidasi `server.js` dan `data/esipena_data.json`.

---

## 2. Struktur Berkas Deploy & Batas 25 MiB

Cloudflare Pages membatasi ukuran maksimal **25 MiB per file** dan tidak memerlukan proses build bundler karena e-SIPENA memakai HTML/CSS/ES6 Modules murni.

### Berkas & Folder yang Wajib Ikut Di-deploy
- `index.html`, `manifest.json`, `sw.js`, `_headers`, `_redirects`
- `assets/` (seluruh gambar `.webp` dan ikon PWA `.png`)
- `css/` (`style.css`, `print.css`)
- `data/` (`esipena_data.json`)
- `js/` (`29` modul JavaScript aktif)
- `functions/` (`functions/api/pdf.js` untuk endpoint `/api/pdf`)

### Berkas & Folder yang Tidak Boleh Ikut Di-deploy
- `00. NASKAH FIX CETAK/`, `00. NASKAH GABUNGAN/`, `Kumpulan Cover - Antologi - QRCBN.pdf` (`73,8 MB` — melebihi batas 25 MiB), serta seluruh `*.docx`, `*.cdr`, `*.pdf` mentah
- `node_modules/`, `scripts/`, `server.js`, `package.json`, `package-lock.json`
- `supabase/`, `google-apps-script/`, dan berkas dokumentasi (`README.md`, `DEPLOY_CLOUDFLARE_PAGES.md`, `PROGRESS.md`, `AGENTS.md`, `PRD.md`, `SESSION_PROMPTS.md`)

> **Penting:** Berkas [.cfignore](.cfignore) sudah mencatat daftar pengecualian di atas sebagai referensi daftar bersih. Namun, pada metode **Connect to Git**, Cloudflare memproses repositori Git Anda (sehingga pengecualian wajib ditaruh di `.gitignore`), sedangkan pada metode **Direct Upload via Wrangler CLI**, `wrangler pages deploy` mengunggah isi direktori target apa adanya sehingga disarankan memakai folder staging bersih (`dist-cf/`).

---

## 3. Cara 1 — Deploy via GitHub / GitLab (Direkomendasikan)

Metode ini mengaktifkan deploy otomatis setiap kali ada pembaruan kode dan otomatis mengompilasi `functions/api/pdf.js`.

### Langkah A: Siapkan `.gitignore` dan Push ke Repositori Git
1. Buat file `.gitignore` di root proyek (jika belum ada) agar folder mentah berukuran besar dan file dev tidak pernah masuk ke repositori Git (pastikan **tanpa spasi di awal baris**):

```gitignore
00. NASKAH FIX CETAK/
00. NASKAH GABUNGAN/
Kumpulan Cover - Antologi - QRCBN.pdf
*.docx
*.cdr
*.pdf
node_modules/
dist-cf/
.DS_Store
Thumbs.db
```
2. Pastikan berkas `assets/`, `css/`, `data/`, `functions/`, `js/`, `index.html`, `manifest.json`, `sw.js`, `_headers`, dan `_redirects` ter-commit ke repositori GitHub atau GitLab Anda.

### Langkah B: Hubungkan Repositori di Dashboard Cloudflare
1. Masuk ke [dash.cloudflare.com](https://dash.cloudflare.com).
2. Di menu kiri, pilih **Workers & Pages** lalu klik **Create** (atau **Create application**).
3. Pilih tab **Pages**, lalu klik **Connect to Git** (atau **Import an existing Git repository**).
4. Otorisasi akun GitHub/GitLab dan pilih repositori **e-SIPENA SMAN 1 Sidayu**.
5. Isi pengaturan build persis sebagai berikut:
   - **Project name:** `esipena-smansi` *(menghasilkan alamat `https://esipena-smansi.pages.dev`)*
   - **Production branch:** `main`
   - **Framework preset:** `None`
   - **Build command:** *(biarkan kosong)*
   - **Build output directory:** `.` *(atau `/` untuk root proyek)*
   - **Environment variables:** *(tidak wajib ditambahkan karena kunci publik Supabase berada di `js/config.js`; jangan pernah memasukkan `service_role` key)*
6. Klik **Save and Deploy**.
7. Tunggu proses unggah selesai (~30–60 detik). Setelah status **Success**, klik URL `https://<nama-proyek>.pages.dev` untuk membuka aplikasi.

---

## 4. Cara 2 — Direct Upload via Wrangler CLI (Tanpa GitHub)

Gunakan metode ini jika Anda ingin mengunggah langsung dari komputer lokal tanpa membuat repositori GitHub/GitLab.

> **Catatan:** Jangan mengunggah folder atau arsip ZIP langsung lewat tombol *Upload assets* di browser dashboard karena Cloudflare tidak memproses folder `functions/` pada upload ZIP dashboard. Gunakan **Wrangler CLI** dari root proyek agar `functions/api/pdf.js` ikut aktif.

### Langkah 1: Pastikan Node.js Terpasang dan Login ke Cloudflare
Buka terminal (PowerShell / Command Prompt) di root folder proyek `c:\Project\solusi.toriq\SIPENA SMANSI`, lalu jalankan:

```powershell
npx wrangler login
```

Browser akan terbuka; klik **Allow** untuk memberi izin Wrangler pada akun Cloudflare Anda.

### Langkah 2: Buat Folder Staging Bersih (`dist-cf`)
Salin hanya aset web publik ke folder `dist-cf` (jangan masukkan `functions/` ke dalam `dist-cf`, karena Wrangler membaca `functions/` dari root proyek):

```powershell
if (Test-Path dist-cf) { Remove-Item dist-cf -Recurse -Force }
New-Item -ItemType Directory -Path dist-cf | Out-Null
Copy-Item index.html, manifest.json, sw.js, _headers, _redirects -Destination dist-cf
Copy-Item assets, css, data, js -Destination dist-cf -Recurse
```

Periksa bahwa tidak ada file `>= 25 MiB` di dalam `dist-cf`:

```powershell
Get-ChildItem dist-cf -Recurse -File | Where-Object { $_.Length -ge 25MB }
```

*(Perintah di atas harus menghasilkan output kosong.)*

### Langkah 3: Deploy ke Cloudflare Pages
Jalankan perintah berikut dari **root proyek** (tempat folder `functions/` dan `dist-cf/` berada):

```powershell
npx wrangler pages deploy dist-cf --project-name=esipena-smansi
```

- Jika proyek `esipena-smansi` belum ada, pilih konfirmasi pembuatan proyek baru dan isi production branch `main` saat ditanya.
- Wrangler akan mengunggah berkas statis di `dist-cf/` sekaligus mengompilasi `functions/api/pdf.js` menjadi endpoint `/api/pdf`.

### Langkah 4: Bersihkan Folder Staging
Setelah URL deploy tampil dan berhasil diakses, hapus folder sementara `dist-cf`:

```powershell
Remove-Item dist-cf -Recurse -Force
```

Untuk memperbarui situs di lain waktu dengan cara ini, ulangi Langkah 2 sampai Langkah 4.

---

## 5. Domain Kustom & Sinkronisasi URL Portal (Opsional)

1. Jika sekolah memiliki domain resmi (misal `literasi.sman1sidayu.sch.id`):
   - Buka proyek di Dashboard Cloudflare Pages > tab **Custom domains** > klik **Set up a custom domain**.
   - Ikuti petunjuk penambahan record `CNAME` pada DNS domain sekolah hingga status sertifikat SSL menjadi **Active**.
2. Buka portal yang sudah live, masuk ke drawer kiri > **Ruang Pengelola** > **Kelola Antologi** > **WA Admin & Pustakawan**, lalu perbarui kolom **URL Publik Portal** sesuai alamat produksi dan klik **Simpan Pengaturan**.

---

## 6. Daftar Cek Verifikasi Setelah Live

Setelah deploy selesai, uji seluruh fungsi berikut pada URL produksi `https://...pages.dev`:

1. **Kanvas & Rute SPA:**
   - Buka halaman utama (`/`) serta uji muat ulang langsung pada `/rak`, `/budaya`, `/mading`, `/pustakawan`, `/kirim`, `/lacak`, dan `/kelola` (memastikan [_redirects](_redirects) bekerja).
2. **Pembaca PDF Flipbook & Proxy `/api/pdf`:**
   - Buka salah satu novel yang sudah memiliki file PDF Google Drive, klik **Baca**, lalu pastikan `PDF.js` merender halaman flipbook (bukan galat 404/502).
   - Untuk uji validasi cepat endpoint fungsi, buka `https://<domain-anda>/api/pdf?id=test` di browser — respons JSON HTTP `400` dengan pesan validasi menandakan `functions/api/pdf.js` aktif.
3. **PWA & Service Worker:**
   - Pastikan tombol **Pasang** muncul di Chrome/Edge desktop atau Android (serta pada Safari iOS untuk panduan tambah ke layar utama).
   - Cek **DevTools > Application > Service Workers** untuk memastikan `sw.js` (`esipena-shell-v4`) berstatus `activated` dan `Manifest` memuat ikon `192x192`, `512x512`, dan `maskable`.
4. **Kirim Karya PDF & Kurasi + Scan Kamera ISBN/QRCBN:**
   - Uji kirim naskah PDF (<= 3 MB) di tab **Kirim & Lacak Karya** dan lacak kode `SPN-XXXXXX`.
   - Login ke **Ruang Pengelola** menggunakan akun kurator Supabase Auth, buka editor buku, lalu uji tombol **Scan Kamera** dan **Scan Gambar** (izin kamera berjalan karena [_headers](_headers) mengatur `Permissions-Policy: camera=(self)`).

---

## 7. Pemecahan Masalah Umum

- **Deploy gagal karena file melebihi `25 MiB`:**
  Pastikan berkas mentah (`00. NASKAH FIX CETAK/`, `00. NASKAH GABUNGAN/`, `Kumpulan Cover - Antologi - QRCBN.pdf`, `*.pdf`, `*.docx`, `*.cdr`) tidak ikut masuk ke Git atau ke folder staging `dist-cf/`.
- **Pembaca PDF gagal memuat dan kembali ke Mode Teks (`proxy-unavailable`):**
  1. Jika memakai Direct Upload dashboard, ganti dengan **Wrangler CLI** atau **Connect to Git** agar `functions/api/pdf.js` ikut ter-deploy.
  2. Pastikan izin berbagi file PDF di Google Drive diset **Anyone with the link -> Viewer**.
- **Tombol `Scan Kamera` tidak bisa mengakses kamera:**
  Pastikan [_headers](_headers) ikut ter-deploy di root output dan memuat `Permissions-Policy: camera=(self), microphone=(), geolocation=()`, serta akses portal memakai `HTTPS`.
- **Perubahan tampilan atau skrip belum muncul setelah deploy ulang:**
  Lakukan muat ulang paksa (*hard reload*) atau tunggu pembaruan Service Worker (`sw.js` sudah diatur `Cache-Control: no-cache, must-revalidate` di `_headers`).
