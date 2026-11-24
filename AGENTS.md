# Pedoman & Batasan Kerja AI Agent (AGENTS.md) — e-SIPENA SMAN 1 Sidayu

Dokumen ini wajib dibaca di awal setiap sesi chat. Seluruh aturan di bawah mengikat perilaku AI dalam merancang UI, menulis kode, mengelola aset, dan menghemat penggunaan token.

---

## 1. Prioritas Perangkat & Aturan Orientasi Layar (Wajib Dipatuhi)

- **Target Perangkat Utama:** **Laptop, PC, dan TV Android** dengan kanvas utama rasio **16:9 widescreen** (`#app-container` dengan `max-width: 177.78vh; max-height: 56.25vw` seperti referensi `Materi Interaktif`).
- **Paksa Tampilan Landscape pada HP & Tablet:**
  - Aplikasi **wajib memaksa orientasi landscape** ketika dibuka pada layar sempit/portrait HP dan Tablet menggunakan:
    1. `manifest.json`: `"orientation": "landscape"`.
    2. API orientasi saat tombol masuk / fullscreen diklik: `screen.orientation?.lock?.('landscape').catch(() => {})`.
    3. CSS media query paksa rotasi: `@media screen and (orientation: portrait) and (max-width: 1024px)` memutar `#app-container` sebesar `90deg` (`transform: translate(-50%, -50%) rotate(90deg)`) lengkap dengan ukuran viewport `100dvh x 56.25dvh` / `177.78dvw x 100dvw`.
    4. Tombol **Putar Layar (`90° / 270°`)** pada Top Utility HUD untuk membalik arah landscape di HP/Tablet.
- **Ramah Pengguna di Laptop, PC, TV Android & HP Landscape:**
  - **Navigasi TV Android (D-Pad / Remote Control) & Keyboard:** Seluruh kartu buku, tab menu, tombol aksi, modal, dan form wajib mendukung `Tab`, `Enter`, `Space`, `Escape`, dan `ArrowLeft`/`ArrowRight` dengan indikator `:focus-visible` tebal dan kontras tinggi (outline `3px solid` terlihat jelas dari jarak 2–3 meter di layar TV).
  - **Anti-Scroll Panjang:** Karena seluruh UI berada di dalam kanvas 16:9 (terutama di TV Android & HP landscape yang tingginya ringkas), **dilarang** menumpuk semua bagian dalam 1 halaman panjang. Gunakan pola **Hub / Tab Modul** (Rak 12 Novel, Budaya Gresik, Mading, Pustakawan, Kirim/Lacak, Pengelola, Cetak QR), **paginasi ringkas** (maks. 4 atau 8 buku per tampilan grid 4 kolom), dan **modal terpusat** dengan `overflow-y: auto` internal.
  - **Keterbacaan & Kenyamanan Sentuh:** Ukuran font UI minimal `14px` (judul dan teks penting lebih besar untuk TV Android), area klik/sentuh minimal `40px x 40px`, dan padding form/modal aman dari terpotong saat keyboard virtual HP muncul.
  - **Pengecualian Print A4:** Saat mode cetak (`@media print`) diaktifkan dari halaman **Cetak QR A4**, seluruh transformasi rotasi dan batasan 16:9 `#app-container` **wajib di-reset** (`transform: none !important; width: auto; height: auto; overflow: visible`) agar halaman tercetak bersih di kertas A4 portrait.

---

## 2. Aturan Teks, Copywriting & Ikon

- **Larangan Emoji & Ikon Dekoratif:** Dilarang menggunakan emoji atau ikon alay (roket, api, bintang, piala, kilau, dll.) pada judul, daftar, tombol, kode UI, maupun balasan chat.
- **Ikon SVG Fungsional Saja:** Gunakan ikon SVG inline minimalis dengan ukuran seragam (`16px`–`20px`) hanya untuk aksi/navigasi nyata (Cari, Baca, Suka, WhatsApp, QR Code, Putar Video, Kirim, Lacak, Login, Putar Layar, Fullscreen, Pasang Aplikasi, Tutup). Jangan memasang ikon hiasan pada setiap badge atau item daftar.
- **Teks Ringkas & Lugas:** Label tombol maksimal 2–4 kata. Deskripsi maksimal 1–2 kalimat pendek. Dilarang menulis kalimat promosi klise AI. Gunakan bahasa Indonesia baku yang ramah pelajar, guru, dan dewan juri.

---

## 3. Identitas Visual & Tata Letak

- **Tema Sekolah:** Mengusung identitas **SMA Negeri 1 Sidayu** (biru navy/royal sekolah `#0f294a` / `#1d4e89`, putih bersih, aksen emas hangat `#d97706` / `#f59e0b`, latar stage gelap elegan `#09111e` di luar bingkai 16:9 agar layar TV/Laptop fokus pada panggung aplikasi, serta kartu konten kontras tinggi yang tajam dibaca).
- **Tipografi Non-Blocking:** Muat Google Fonts (`Plus Jakarta Sans` untuk UI/form/tabel dan `Merriweather` atau `Lora` untuk judul karya sastra) via `<link rel="preconnect">` dan `<link rel="stylesheet">` di `index.html`. Dilarang memakai `@import` di dalam CSS.

---

## 4. Batasan Stack Teknis & Hosting (Terkunci)

1. **Frontend Murni Tanpa Bundler:** Wajib menggunakan **Vanilla HTML5, CSS3, dan ES6 Modules (`type="module"`)**. Dilarang menginstal atau memakai React, Vite, Tailwind, Next.js, atau bundler frontend lain.
2. **Hosting Cloudflare Pages:**
   - Wajib menjaga ukuran setiap file dalam direktori deploy **di bawah 25 MiB** (batas hard Cloudflare Pages).
   - Dilarang ikut men-deploy folder `00. NASKAH FIX CETAK/`, file `.docx`, `.cdr`, atau `Kumpulan Cover - Antologi - QRCBN.pdf` (73,8 MB); kecualikan lewat `.cfignore` / struktur deploy bersih.
   - Konfigurasikan `_headers` (`Cache-Control: public, max-age=31536000, immutable` untuk `/assets/*` dan `must-revalidate` untuk `sw.js`) serta `_redirects`.
3. **Database & Auth Supabase Free Tier:**
   - Frontend terhubung ke **Supabase REST/RPC API** menggunakan `fetch()` native di `js/data-service.js` (zero external runtime bundle) dengan fallback otomatis ke `data/esipena_data.json` + `SafeStorage` bila offline.
   - Dilarang menaruh kredensial admin hardcoded di JS frontend; halaman Ruang Kerja Guru/Pustakawan wajib memakai **Supabase Auth** (`signInWithPassword`) dan kebijakan **RLS**.
   - Pemakaian **Supabase Storage = 0 MB** untuk file PDF.
4. **Google Drive untuk Seluruh PDF:**
   - **12 PDF Novel 2026** di-hosting di **Google Drive** dan disematkan lewat URL `/preview`.
   - **Upload PDF Form Kirim Karya (maks. 3 MB)** divalidasi di frontend (wajib `.pdf` dan `<= 3 MB`) lalu dikirim ke **folder Google Drive publik** lewat endpoint `google-apps-script/UploadDrive.gs`, kemudian URL hasilnya disimpan ke tabel `submissions` Supabase.
5. **Optimasi Media & PWA:**
   - Seluruh gambar sampul buku & logo wajib format **`.webp`** terkompresi dengan `loading="lazy"` dan `decoding="async"`.
   - `sw.js` hanya melakukan pre-cache pada *app shell* inti; gambar sampul dan aset lain di-cache saat runtime (*on-demand*).
   - Audio efek (`js/audio.js`) memakai Web Audio API murni (tanpa file MP3 eksternal).

---

## 5. Aturan Hemat Token AI (Wajib Tiap Sesi)

- **Baca File Seperlunya (Strict Allowlist):** Di awal sesi baru, **HANYA** baca `AGENTS.md`, `PROGRESS.md`, dan 2–4 file modul yang ditunjuk dalam prompt sesi. **Dilarang** membaca `PRD.md`, `SESSION_PROMPTS.md`, berkas `.docx`/`.pdf` mentah, atau direktori proyek referensi (`Materi Interaktif` / `Sipena`) kecuali diperintahkan eksplisit.
- **Jaga Ukuran File Tetap Modular:** Pecah logika JavaScript ke modul terpisah (`< 400` baris per file) dan pisahkan CSS cetak (`css/print.css`) agar sesi berikutnya tidak perlu membaca ribuan baris kode yang tidak relevan.
- **Jangan Duplikasi Logika:** Pusat konfigurasi di `js/config.js`, pemanggilan API/fallback di `js/data-service.js`, komponen modal/toast/helper UI di satu utilitas bersama.
- **Verifikasi Efisien:** Di akhir setiap sesi, jalankan **1 perintah verifikasi gabungan** (mis. `node --check` seluruh modul JS + validasi JSON), lalu perbarui `PROGRESS.md` secara ringkas.
