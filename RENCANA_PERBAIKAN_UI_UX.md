# Rencana Perbaikan UI/UX & Arsitektur — e-SIPENA SMAN 1 Sidayu

Dokumen ini merangkum temuan audit lintas perangkat (**Desktop/Laptop**, **TV Android**, **Tablet**, dan **HP**) beserta solusi terstruktur dalam **Prioritas 1–3**. Seluruh eksekusi wajib mematuhi batasan di `AGENTS.md` (Vanilla HTML5/CSS3/ES6 tanpa bundler, tanpa `@import` di CSS, orientasi adaptif alami HP/Tablet, 16:9 widescreen untuk Laptop/PC/TV, target sentuh minimal `40x40px`, tanpa emoji dekoratif, dan file JS `< 400` baris).

---

## Prioritas 1 — Perbaikan Fungsional & UX Kritis (Semua Perangkat)

Fokus pada hambatan penggunaan nyata di HP, Tablet, TV Android, dan Desktop.

### 1A. Navigasi Top HUD Desktop/TV & Tombol Pasang PWA
- **Masalah:** Menu utama (`Etalase Antologi`, `Pameran 3D Gresik`, `Cerita Gresik`, `Mading Digital`, `Sudut Pustakawan`, `Ruang Pengelola`) tersembunyi di balik tombol hamburger (`#btn-drawer-toggle`), padahal CSS `.hub-nav` dan `.hub-tab` sudah tersedia di `css/style.css` (L201–L275). Bagian tengah `#top-hud` kosong di layar lebar. Selain itu, `<span>Pasang</span>` di `#btn-install-pwa` (`index.html` L70) dalam kondisi ter-comment sehingga tombol hanya tampil sebagai ikon kecil tanpa teks.
- **Solusi:**
  1. Tampilkan bar navigasi `.hub-nav` secara horizontal di `#top-hud` pada layar lebar (`>= 1080px` landscape) untuk akses 1 klik / 1 arah D-Pad ke panel utama, dan sembunyikan di `<= 1079px` / HP agar tetap memakai Drawer.
  2. Sinkronkan status `.is-active` dan `aria-current="page"` antara tombol `.hub-tab` di Top HUD dan `.drawer-item` di `#nav-drawer` pada fungsi `switchTab()` (`js/app.js`).
  3. Aktifkan kembali label `<span>Pasang</span>` pada `#btn-install-pwa` di `index.html` (sembunyikan teks hanya bila ruang sangat sempit di HP `< 360px` dengan `aria-label` tetap jelas).

### 1B. Toolbar Pembaca PDF Ramah HP & Navigasi Saat Zoom (`js/pdf-slide-viewer.js`)
- **Masalah:** `.pdf-slide-toolbar` memuat 10 kontrol dalam satu baris `flex-wrap: nowrap; overflow-x: auto` (`css/style.css` L1864–L1888). Pada layar HP `375px`, kontrol zoom (`-`, `100%`, `+`), `Pas Lebar`, dan `Fokus Baca` terpotong ke kanan tanpa petunjuk gulir. Saat user memilih `Pas Lebar` atau zoom `> 105%`, fungsi ketuk tepi 18% dan swipe pindah halaman otomatis nonaktif (`js/pdf-slide-viewer.js` L353, L365), sementara `.pdf-edge-btn` disembunyikan di HP (`css/style.css` L4678).
- **Solusi:**
  1. Sederhanakan bar utama `.pdf-slide-toolbar` di layar sempit menjadi kontrol inti yang muat di `375px`: `<`, `Hal [input] / total`, `>`, `1/2 Hal`, tombol `Tampilan` (membuka popover/bar sekunder untuk `Pas Lebar`, `-`, `100%`, `+`), dan `Fokus`.
  2. Tetap sediakan tombol navigasi halaman kompak `40x40px` (atau tepi panah tipis yang tidak mengganggu zoom) ketika mode `Pas Lebar` atau zoomed aktif di perangkat sentuh agar pengguna tidak terkunci di satu halaman.
  3. Pastikan kontrol di dalam `.pdf-slide-toolbar` mendapat `inert` atau `visibility: hidden` saat `.pdf-slide-shell.is-hud-hidden` aktif agar navigasi `Tab` / D-Pad tidak mendarat pada tombol yang tersembunyi.

### 1C. Navigasi D-Pad TV Android & Skala Keterbacaan (`js/nav-controls.js`, `css/style.css`)
- **Masalah:**
  - `moveSpatialFocus()` (`js/nav-controls.js` L167–L195) memanggil `best.focus()` tanpa `scrollIntoView`, sehingga elemen di bawah area gulir `.panel-body-scroll` bisa menerima fokus di luar layar.
  - Elemen pemicu kartu seperti `.book-cover-stage`, `.model3d-card-media`, `.cerita-video-media`, dan `.librarian-activity-media` berupa `<div>` tanpa fokus keyboard.
  - Pada modal pembaca PDF, `ArrowLeft`/`ArrowRight` hanya membalik halaman jika fokus berada di dalam `#pdf-reader-stage-content`.
  - Media query TV `@media screen and (min-width: 1600px)` (`css/style.css` L5683–L5723) hanya menaikkan `body` ke `16px`, sedangkan label/badge/penulis masih `11px–13px`.
- **Solusi:**
  1. Panggil `best.scrollIntoView({ block: 'nearest', inline: 'nearest' })` setelah `best.focus()` pada `moveSpatialFocus()`.
  2. Buat alur D-Pad kartu tetap bersih: pastikan tombol aksi utama kartu mudah terjangkau tanpa sudut mati pada perhitungan jarak `dx`/`dy`, atau tambahkan dukungan `Enter` pada kartu fokus-abel.
  3. Pada modal pembaca PDF aktif (`#app-modal.is-reading-mode`), izinkan `ArrowLeft`/`ArrowRight`/`PageUp`/`PageDown` membalik halaman selama fokus tidak berada di `input`/`textarea`/`select` atau di dalam bar kontrol toolbar yang sedang terbuka.
  4. Naikkan ukuran tipografi pada `@media screen and (min-width: 1600px)`: `body` ke `17px–18px`, serta teks sekunder/badge/penulis/chip minimal `14px` agar terbaca jelas dari jarak 2–3 meter.

### 1D. Perbaikan Breakpoint Tablet & HP Landscape (`css/style.css`)
- **Masalah:**
  - **Tablet Portrait (`600–1024px`):** `#panel-mading .panel-header` masih rapat tanpa aturan wrap khusus; `.modal-header` baru membungkus di `<= 599px` sehingga pada lebar `600–820px` judul novel di modal terpotong sempit oleh tab dan tombol header.
  - **Tablet Landscape (`1024×768`, `<= 1180px`):** `.books-grid` dibiarkan tetap 4 kolom sempit sementara grid modul lain diubah ke 2 kolom; `.model3d-modal-layout` dipaksa menumpuk 1 kolom (`1fr`) meski lebar cukup untuk split-view.
  - **HP Landscape (`max-height: 500px`):** `.books-grid` memakai `grid-auto-rows: minmax(98px, 1fr)` yang menjepit 4 baris isi kartu + tombol `min-height: 40px`; `.modal-header` tidak membungkus saat tab modal tampil di layar sempit seperti `568×320`.
- **Solusi:**
  1. Izinkan `.panel-header` (terutama `#panel-mading`) membungkus rapi di `<= 1024px`.
  2. Terapkan `flex-wrap: wrap` yang bersih pada `.modal-header` saat `.modal-header-tabs:not([hidden])` aktif di rentang `<= 820px` dan pada `max-height: 500px`.
  3. Pada Tablet Landscape (`780px–1180px`, `min-height: 501px`), tampilkan `.books-grid` dalam **3 kolom** yang proporsional (atau 2 kolom untuk kartu editorial bila sempit) dan pertahankan `.model3d-modal-layout` dalam **2 kolom split-view** mulai lebar `>= 900px`.
  4. Pada HP Landscape (`max-height: 500px`), ubah `.books-grid` menjadi `grid-auto-rows: auto` dengan padding kompak agar tombol `40px` tidak berdesakan dengan judul dan penulis.

### 1E. Area Sentuh Minimal `40x40px` & Sinkronisasi Status Audio
- **Masalah:**
  - `.swipe-dot-btn` (`18x18px`) dan `.swipe-cue-arrow-btn` (`24x22px`) di `css/style.css` (L1032–L1068) berada di bawah standar `40x40px` (`AGENTS.md`).
  - `playAudioTrack()` dan `speak()` di `js/audio.js` (L172–L174, L267–L269) memanggil `setMuted(false)` secara diam-diam tanpa memperbarui label tombol `#btn-audio-toggle` di Top HUD.
- **Solusi:**
  1. Naikkan `min-width: 40px; min-height: 40px` pada `.swipe-dot-btn` dan `.swipe-cue-arrow-btn` (pertahankan ukuran visual `.swipe-dot-pill` tetap `8px` agar tampilannya tetap ramping).
  2. Pancarkan event kustom (mis. `esipena:audio-mute-changed`) dari `setMuted()` di `js/audio.js` dan dengarkan di `js/nav-controls.js` untuk memanggil `updateAudioButtonUi()` secara otomatis.

---

## Prioritas 2 — Pembenahan Desain Editorial (Menjauhkan Kesan "AI Template")

Fokus mengubah nuansa dari *dashboard kartu seragam* menjadi *portal literasi sekolah yang hangat dan terfokus pada karya*.

### 2A. Penyederhanaan Header & Optimasi Above-the-Fold (`#panel-rak`)
- **Masalah:** Empat lapis bar sebelum kartu buku (`#top-hud` + `.antologi-global-bar` + `.hero-school-banner` + `.antologi-section-head`) mendorong rak novel terlalu ke bawah pada laptop `1366×768` dan HP. Selain itu, section `Cerpen` dan `Puisi` tetap dirender penuh sebagai kotak kosong saat belum ada karya.
- **Solusi:**
  1. Rampingkan `.hero-school-banner` pada laptop/tablet/HP dan satukan navigasi jenis antologi (`.antologi-jump-bar`) + pencarian dengan kontrol section secara ringkas agar baris pertama sampul novel terlihat utuh *above the fold*.
  2. Saat jumlah karya `Cerpen` atau `Puisi` sama dengan `0` (dan tidak sedang ada hasil pencarian), ringkas atau sembunyikan kotak kosongnya (cukup tampilkan status non-aktif / catatan 1 baris ringkas di bawah atau di chip lompat) agar halaman utama tidak diakhiri dua blok kosong besar.

### 2B. "Badge Diet" & Gaya Editorial Sastra
- **Masalah:** Pola `kotak putih + border tipis + border-left tebal + tumpukan pill` berulang di kartu buku, detail buku, mading, video, dan admin sehingga terasa seperti template UI otomatis.
- **Solusi:**
  1. Kurangi `border-left` berulang pada header/kartu dan gantikan dengan hierarki tipografi + pembatas garis halus (`border-bottom: 1px solid #e2e8f0`) serta aksen warna sekolah yang lebih selektif.
  2. Terapkan batas maks. 2 penanda per kartu:
     - Kartu Novel: cukup tampilkan **Tahun** di sudut sampul dan **1 penanda ringkas** (`Siswa XI · XI-7` atau `Guru`).
     - Kartu Cerpen/Puisi: hilangkan pil nama kategori yang mengulang judul section (`Cerpen`/`Puisi`).
     - Detail Buku (`js/book-modal.js`): tampilkan metadata sekunder (`Kategori · Kelas · Tahun · ISBN/QRCBN`) dalam satu baris metadata editorial yang bersih, bukan 5 pill terpisah.
  3. Putuskan status final tombol `#btn-book-wa-order` (`hidden` di `book-modal.js` L107) dan `#btn-detail-download-pdf` (ter-comment di L114 padahal masih direferensikan di `book-reader-ui.js` L185): aktifkan bila dibutuhkan atau bersihkan kode yatimnya.

### 2C. Konsistensi Pembaca Mading, Lacak PDF, dan Admin Mobile
- **Masalah:**
  - Pembaca teks fallback di Mading (`js/community-views.js` L118, L133) belum memiliki kontrol ukuran font (`A-`/`A+`) dan `Tema Gelap` seperti pembaca buku (`js/book-modal.js`).
  - Pratinjau PDF pada Lacak Kode SPN (`js/tracking-panel.js` L145–L158) masih membuka `<iframe>` Google Drive mentah, bukan `PDF.js` viewer (`createBookReaderController`).
  - Tabel kurasi admin (`.admin-table` di `js/admin-views.js` L119–L154) memaksa gulir horizontal pada HP `< 768px`.
- **Solusi:**
  1. Ekstrak pembungkus pembaca teks bersama (atau gunakan helper bersama) agar modal Mading teks dan buku sama-sama memiliki pengaturan ukuran huruf dan tema gelap tanpa duplikasi logika.
  2. Gunakan `createBookReaderController` (atau `mountPdfSlideViewer`) pada modal pratinjau PDF di `js/tracking-panel.js` agar pengalaman baca konsisten dan bisa di-zoom di HP.
  3. Pada `@media screen and (max-width: 767px)`, ubah baris `<tr>` `.admin-table` menjadi tampilan kartu tumpuk (*stacked card*) dengan `data-label` agar kurator dapat meninjau dan menekan tombol `Kurasi` di HP tanpa scroll samping.

---

## Prioritas 3 — Refactor Modular CSS & Kebersihan Kode (`css/` & `sw.js`)

Fokus menekan konsumsi token AI pada sesi berikutnya dan mempermudah pemeliharaan jangka panjang.

- **Masalah:** `css/style.css` membengkak hingga **5.723 baris** (sarat *override* dan kelas tak terpakai seperti `.book-qr-card` L1511–L1540), sehingga tiap sesi AI yang memeriksa styling berisiko menghabiskan konteks hanya untuk membaca CSS.
- **Solusi:**
  1. Pecah `css/style.css` menjadi beberapa stylesheet modular yang dimuat lewat tag `<link rel="stylesheet">` terpisah di `index.html` (**dilarang** memakai `@import` di dalam CSS sesuai `AGENTS.md` Pasal 3):
     - `css/base.css` (variabel `:root`, reset, fokus TV, kanvas `#app-container`, tipografi dasar)
     - `css/layout.css` (`.top-hud`, `.hub-nav`, `.stage-main`, `.nav-drawer`, `.modal-backdrop`, `.toast-container`)
     - `css/catalog.css` (hero banner, section antologi, kartu novel/cerpen/puisi, swipe cue)
     - `css/reader-3d.css` (modal detail buku, pembaca teks, `PDF.js` flipbook, Pameran 3D & AR, Cerita Gresik, Mading, Sudut Pustakawan)
     - `css/forms-admin.css` (Kirim Karya, Lacak Kode SPN, Ruang Pengelola, modal editor & scanner)
     - `css/responsive.css` (seluruh `@media` Tablet, HP Portrait, HP Landscape, Mobile 3D sheet, dan TV `>= 1600px`)
  2. Hapus aturan yatim yang sudah tidak dipakai (mis. `.book-qr-card`, `.book-modal-tabs` jika sudah dipindah ke header modal) setelah memverifikasi tidak ada pemakaian di `js/*.js` dan `index.html`.
  3. Daftarkan seluruh berkas `css/*.css` baru ke array `APP_SHELL_ASSETS` di `sw.js` dan naikkan versi `SHELL_CACHE` (dari `esipena-shell-v30` ke versi berikutnya) agar PWA offline tetap utuh.
  4. Jalankan verifikasi gabungan akhir (`node --check` seluruh `js/*.js`, `sw.js`, `server.js`, `functions/api/pdf.js`, validasi `data/esipena_data.json`, cek kurung kurawal CSS seimbang, dan perbarui `PROGRESS.md`).
