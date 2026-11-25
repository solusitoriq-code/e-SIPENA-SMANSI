# Prompt Eksekusi Hemat Token AI — Prioritas 1–3 e-SIPENA

Gunakan **1 prompt per sesi chat baru** agar konteks tetap bersih dan hemat token. Setiap prompt sudah menyertakan **daftar baca ketat (allowlist)** dan **rentang baris tepat** agar AI tidak perlu membaca keseluruhan `css/style.css` (5.723 baris) maupun file yang dilarang `AGENTS.md` (`PRD.md`, `SESSION_PROMPTS.md`, `.docx`, `.pdf`, atau folder referensi).

> [!TIP]
> **Opsi Urutan Eksekusi Paling Hemat Token:**
> Anda dapat menjalankan **Prioritas 1 -> Prioritas 2 -> Prioritas 3** secara berurutan, **ATAU** menjalankan **Prioritas 3 terlebih dahulu** (memecah `css/style.css` menjadi modul kecil) sehingga sesi Prioritas 1 dan 2 menjadi jauh lebih murah token saat menyunting CSS. Semua prompt di bawah tetap bekerja dengan kedua urutan.

---

## Prompt 1 — Eksekusi Prioritas 1 (Responsiveness, Navigasi Desktop/TV, PDF HP, Sentuh & Audio)

```text
Patuhi seluruh aturan di AGENTS.md. Jalankan HANYA Prioritas 1 (sub-tugas 1A sampai 1E) dari RENCANA_PERBAIKAN_UI_UX.md.

ATURAN HEMAT TOKEN (WAJIB):
1. Baca HANYA file berikut:
   - AGENTS.md, PROGRESS.md, RENCANA_PERBAIKAN_UI_UX.md (bagian Prioritas 1 saja)
   - index.html
   - js/app.js, js/nav-controls.js, js/pdf-slide-viewer.js, js/audio.js
   - css/style.css HANYA pada rentang baris: L95-L330, L1015-L1092, L1856-L2155, L4349-L5723 (atau file CSS modular terkait bila Prioritas 3 sudah dijalankan).
2. DILARANG membaca PRD.md, SESSION_PROMPTS.md, berkas .docx/.pdf, atau file admin/modul lain yang tidak disebut di atas.

TUGAS YANG HARUS DISELESAIKAN:
1. [1A] Aktifkan kembali navigasi tab horizontal (.hub-nav) di #top-hud untuk layar lebar (>= 1080px landscape) agar pengguna Desktop & TV Android bisa pindah menu utama tanpa membuka drawer, sinkronkan state aktifnya dengan #nav-drawer di switchTab() (js/app.js), dan tampilkan kembali label <span>Pasang</span> pada #btn-install-pwa (index.html).
2. [1B] Perbaiki .pdf-slide-toolbar di js/pdf-slide-viewer.js dan CSS agar pada lebar HP 375px seluruh kontrol inti (<, input hal, >, 1/2 Hal, Fokus) muat tanpa terpotong ke kanan, dan opsi tampilan (Pas Lebar, Zoom -, %, +) dapat dibuka rapi lewat tombol/popover Tampilan. Saat Pas Lebar / zoomed aktif di HP, tetap sediakan navigasi ganti halaman yang mudah dijangkau, serta cegah tombol toolbar menerima fokus Tab saat .is-hud-hidden aktif.
3. [1C] Perkuat D-Pad TV Android: tambahkan scrollIntoView({ block: 'nearest', inline: 'nearest' }) di moveSpatialFocus() (js/nav-controls.js), pastikan ArrowLeft/ArrowRight pada modal PDF membalik halaman dengan andal, serta tingkatkan skala keterbacaan @media (min-width: 1600px) (body 17px-18px, label/badge/chip minimal 14px).
4. [1D] Perbaiki breakpoint Tablet & HP Landscape:
   - Tablet Portrait (600-1024px): izinkan .panel-header Mading dan .modal-header membungkus rapi (flex-wrap) agar judul tidak tertekan/terpotong.
   - Tablet Landscape (780-1180px, min-height: 501px): ubah .books-grid menjadi 3 kolom agar kartu & tombol tidak sempit, serta pertahankan .model3d-modal-layout 2 kolom split-view mulai lebar >= 900px.
   - HP Landscape (max-height: 500px): longgarkan .books-grid grid-auto-rows menjadi auto agar isi kartu tidak bertabrakan dengan tombol 40px, dan izinkan .modal-header membungkus saat tab modal tampil.
5. [1E] Naikkan area sentuh .swipe-dot-btn & .swipe-cue-arrow-btn menjadi minimal 40x40px (ukuran visual titik tetap 8px), dan pancarkan event dari js/audio.js saat setMuted() berubah agar updateAudioButtonUi() di js/nav-controls.js selalu sinkron.

ATURAN KODE & VERIFIKASI AKHIR:
- Jaga semua file JS < 400 baris, 0 emoji dekoratif, dan perbarui versi SHELL_CACHE di sw.js bila aset shell berubah.
- Jalankan 1 perintah verifikasi gabungan (node --check seluruh js/*.js, sw.js, server.js, functions/api/pdf.js; validasi data/esipena_data.json; cek jumlah baris tiap js/*.js < 400; cek keseimbangan kurung kurawal CSS).
- Perbarui PROGRESS.md secara ringkas.
```

---

## Prompt 2 — Eksekusi Prioritas 2 (Desain Editorial Anti-Template, Konsistensi Pembaca & Admin HP)

```text
Patuhi seluruh aturan di AGENTS.md. Jalankan HANYA Prioritas 2 (sub-tugas 2A sampai 2C) dari RENCANA_PERBAIKAN_UI_UX.md.

ATURAN HEMAT TOKEN (WAJIB):
1. Baca HANYA file berikut:
   - AGENTS.md, PROGRESS.md, RENCANA_PERBAIKAN_UI_UX.md (bagian Prioritas 2 saja)
   - index.html (bagian #panel-rak L75-L297)
   - js/public-views.js, js/book-modal.js, js/book-reader-ui.js, js/community-views.js, js/tracking-panel.js, js/admin-views.js
   - css/style.css HANYA pada rentang baris yang relevan via Select-String/StartLine-EndLine (terutama hero/antologi L366-L1266, book-detail L1478-L1635, mading/track/admin L2505-L2630, L3704-L3930, serta media query tablet/HP L4359-L5329).
2. DILARANG membaca PRD.md, SESSION_PROMPTS.md, berkas .docx/.pdf, atau file service backend yang tidak disentuh.

TUGAS YANG HARUS DISELESAIKAN:
1. [2A] Optimalkan above-the-fold di #panel-rak: rampingkan tinggi .hero-school-banner pada laptop/tablet/HP dan padatkan kontrol header antologi agar baris pertama kartu Novel langsung terlihat tanpa scroll berlebih. Jika jumlah karya Cerpen atau Puisi adalah 0 (dan tidak sedang ada query pencarian), ringkas/sembunyikan kotak kosong section-nya agar tidak memenuhi bagian bawah halaman utama.
2. [2B] Hilangkan kesan dashboard AI template:
   - Kurangi pengulangan kotak bertumpuk ber-border-left tebal; gunakan hierarki tipografi dan pemisah garis tipis yang lebih editorial.
   - Lakukan "badge diet": maks. 2 penanda per kartu (hilangkan pil kategori berulang pada kartu Cerpen/Puisi, rapikan metadata di Detail Buku menjadi baris info editorial terstruktur).
   - Rapikan kode yatim pada js/book-modal.js dan js/book-reader-ui.js terkait #btn-book-wa-order (hidden) dan #btn-detail-download-pdf (ter-comment): aktifkan secara bersih jika relevan atau hapus referensi matinya.
3. [2C] Samakan pengalaman baca & kurasi di semua layar:
   - Tambahkan kontrol ukuran huruf (A-/A+) dan Tema Gelap pada modal teks Mading Digital (js/community-views.js) dengan mengekstrak atau memakai ulang utilitas bersama tanpa duplikasi.
   - Gunakan viewer PDF.js (createBookReaderController) pada modal Pratinjau PDF di js/tracking-panel.js menggantikan iframe Google Drive mentah (tetap sediakan fallback Drive jika proxy tidak tersedia).
   - Pada layar < 768px, ubah .admin-table di js/admin-views.js menjadi tampilan kartu vertikal (menggunakan atribut data-label di <td>) agar kurator di HP tidak perlu scroll tabel secara horizontal.

ATURAN KODE & VERIFIKASI AKHIR:
- Jaga semua file JS < 400 baris, 0 emoji dekoratif, tanpa duplikasi logika.
- Naikkan versi SHELL_CACHE di sw.js jika mengubah index.html/JS/CSS.
- Jalankan 1 perintah verifikasi gabungan (node --check seluruh js/*.js, sw.js, server.js, functions/api/pdf.js; validasi JSON; cek < 400 baris/file JS; cek keseimbangan CSS) dan perbarui PROGRESS.md secara ringkas.
```

---

## Prompt 3 — Eksekusi Prioritas 3 (Refactor Modular CSS & Pembersihan Shell PWA)

```text
Patuhi seluruh aturan di AGENTS.md. Jalankan HANYA Prioritas 3 dari RENCANA_PERBAIKAN_UI_UX.md.

ATURAN HEMAT TOKEN & EKSEKUSI CERDAS (WAJIB):
1. Baca HANYA: AGENTS.md, PROGRESS.md, RENCANA_PERBAIKAN_UI_UX.md (bagian Prioritas 3), index.html (L1-L30), dan sw.js (L1-L60).
2. JANGAN membaca seluruh 5.723 baris css/style.css ke konteks percakapan dan JANGAN menulis ulang ribuan baris CSS secara manual di output tool write_file. Sebagai gantinya:
   - Gunakan Select-String pada css/style.css untuk memetakan indeks baris batas antar-bagian.
   - Gunakan skrip Node sementara (atau perintah Node one-liner) untuk memvalidasi kelas yang benar-benar terpakai di index.html & js/*.js, memangkas aturan yatim yang terkonfirmasi tidak dipakai (mis. .book-qr-card jika tidak ada di HTML/JS), dan memecah css/style.css secara presisi dengan mempertahankan urutan kaskade CSS yang identik.
3. DILARANG memakai @import di dalam berkas CSS (dilarang AGENTS.md Pasal 3). Muat seluruh berkas CSS hasil pemecahan lewat tag <link rel="stylesheet"> di index.html dalam urutan kaskade yang persis sama.

TARGET BERKAS CSS MODULAR:
- css/base.css (token :root, reset, :focus-visible, kanvas #app-container 16:9 & adaptive fullscreen)
- css/layout.css (.top-hud, .hub-nav, .stage-main, .nav-drawer, .modal-backdrop, .app-modal, .toast-container)
- css/catalog.css (hero banner, toolbar antologi, kartu novel/cerpen/puisi, swipe cue, empty state)
- css/reader-3d.css (detail buku, pembaca teks & PDF.js flipbook, Pameran 3D & AR, Cerita Gresik, Mading, Sudut Pustakawan)
- css/forms-admin.css (formulir Kirim Karya, Lacak Kode SPN, Ruang Pengelola, modal kurasi/editor/scanner)
- css/responsive.css (seluruh @media Tablet, HP Portrait, HP Landscape, Mobile 3D sheet, TV >= 1600px)
- Pertahankan css/print.css tetap terpisah dengan media="print".
- Hapus css/style.css lama hanya setelah index.html, sw.js, dan verifikasi terkonfirmasi bersih.

WAJIB PWA & VERIFIKASI AKHIR:
1. Perbarui daftar APP_SHELL_ASSETS di sw.js agar memuat semua berkas css/*.css baru (ganti ./css/style.css) dan naikkan versi SHELL_CACHE.
2. Verifikasi seluruh selector di index.html dan js/*.js tetap cocok, tidak ada aturan @import di CSS, kurung kurawal tiap CSS seimbang, semua file JS < 400 baris, dan node --check + JSON check lolos dalam 1 perintah verifikasi gabungan.
3. Perbarui PROGRESS.md secara ringkas.
```
