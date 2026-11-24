# Panduan Setup Google Apps Script Upload PDF & Sampul e-SIPENA

Skrip [UploadDrive.gs](./UploadDrive.gs) berfungsi sebagai endpoint Web App untuk mengunggah naskah **PDF Kirim Karya (maks. 3 MB)**, **PDF Buku Katalog Kurator (maks. 16 MB)**, dan **Sampul Buku WebP/PNG/JPEG (maks. 1 MB)** ke **1 folder induk Google Drive**, yang otomatis dipilah ke dalam subfolder terpisah sehingga pemakaian Supabase Storage tetap **0 MB**.

## Struktur Subfolder Otomatis (1 Folder Induk)

Cukup sediakan **1 ID Folder Induk (`TARGET_FOLDER_ID`)**, skrip akan otomatis membuat dan memilah unggahan ke subfolder berikut:
- `covers/` — sampul buku hasil konversi `.webp` dari Ruang Pengelola (maks. 1 MB)
- `naskah-pdf/` — kiriman naskah PDF warga sekolah dari form Kirim Karya (maks. 3 MB)
- `novel-pdf/` — PDF buku/novel katalog yang diunggah kurator dari Ruang Pengelola (maks. 16 MB)

## Langkah Pemasangan / Pembaruan

1. **Siapkan 1 Folder Induk Google Drive**
   - Buka Google Drive menggunakan akun Google pengelola perpustakaan/NLC.
   - Buat satu folder induk, misalnya `eSIPENA-Drive-SMANSI`.
   - Salin **Folder ID** dari URL folder (`https://drive.google.com/drive/folders/<FOLDER_ID>`).

2. **Pasang atau Perbarui Skrip di Apps Script**
   - Buka [script.google.com](https://script.google.com) dan buka proyek Apps Script e-SIPENA (atau buat **New project**).
   - Salin seluruh isi [UploadDrive.gs](./UploadDrive.gs) ke `Code.gs`.
   - Buka **Project Settings > Script Properties**, atur properti `TARGET_FOLDER_ID` berisi ID folder induk di atas (atau pastikan konstanta `TARGET_FOLDER_ID` di bagian atas skrip sudah sesuai).

3. **Deploy sebagai Web App (atau New Version)**
   - Untuk pasang baru: klik **Deploy > New deployment** -> pilih tipe **Web app** (**Execute as**: `Me`, **Who has access**: `Anyone`).
   - Untuk memperbarui skrip yang sudah terpasang: klik **Deploy > Manage deployments** -> klik ikon pensil (**Edit**) -> pada **Version** pilih **New version** -> klik **Deploy** (URL `/exec` tetap sama).

4. **Verifikasi Health Check & Hubungkan ke Frontend**
   - Buka URL Web App (`https://script.google.com/macros/s/.../exec`) langsung di browser untuk memanggil `doGet()`: pastikan respons JSON menampilkan `"success": true` dan `"configured": true`.
   - Pastikan URL `/exec` tersebut terpasang pada `GDRIVE_UPLOAD_URL` di `../js/config.js`.

## Kontrak Request & Response

### Request (`POST`, `Content-Type: text/plain;charset=utf-8`)
- Untuk PDF (`subFolder`: `'naskah-pdf'` untuk form publik maks. 3 MB, atau `'novel-pdf'` untuk unggahan kurator maks. 16 MB):
```json
{
  "uploadKind": "pdf",
  "subFolder": "naskah-pdf",
  "fileName": "cerpen-damar-kurung.pdf",
  "mimeType": "application/pdf",
  "base64Data": "JVBERi0xLjQK..."
}
```
- Untuk Sampul WebP (`subFolder`: `'covers'`, maks. 1 MB):
```json
{
  "uploadKind": "cover",
  "subFolder": "covers",
  "fileName": "sampul-novel.webp",
  "mimeType": "image/webp",
  "base64Data": "UklGR..."
}
```

### Response Sukses (`200 OK`)

```json
{
  "success": true,
  "fileId": "1AbCdEf...",
  "viewUrl": "https://drive.google.com/file/d/1AbCdEf.../view",
  "previewUrl": "https://drive.google.com/file/d/1AbCdEf.../preview",
  "thumbnailUrl": "https://drive.google.com/thumbnail?id=1AbCdEf...&sz=w800",
  "folderName": "covers",
  "fileName": "cover_20261123-221500_sampul-novel.webp",
  "sizeBytes": 34210
}
```
*(Catatan: untuk unggahan PDF, `thumbnailUrl` bernilai string kosong `""`.)*

### Catatan Pembaca PDF Flipbook, Proxy `/api/pdf` & Deploy Cloudflare Pages

- Aplikasi pembaca buku mengambil biner PDF secara *same-origin* melalui `/api/pdf?id=<fileId>` (`../functions/api/pdf.js` otomatis aktif di Cloudflare Pages, sedangkan pengujian lokal melalui `../server.js`) lalu menyimpannya ke IndexedDB peramban.
- Semua file yang diunggah lewat [UploadDrive.gs](./UploadDrive.gs) otomatis diberi izin `ANYONE_WITH_LINK` (`VIEW`) agar dapat dibaca proxy `/api/pdf`. Bila admin memasang tautan/ID berkas PDF Google Drive secara manual, pastikan pengaturan berbagi file tersebut diset **Anyone with the link -> Viewer**.
- Folder `google-apps-script/` dikecualikan dari unggahan deploy Cloudflare Pages lewat `../.cfignore` karena skrip ini dijalankan di Google Apps Script (`https://script.google.com`).

### Validasi Keamanan Sisi Server
- Subfolder PDF hanya mengizinkan `naskah-pdf` atau `novel-pdf` (selain itu diarahkan ke `naskah-pdf`), dan sampul selalu masuk ke `covers`, dilindungi `LockService` agar tidak terjadi subfolder ganda.
- Jalur PDF memvalidasi ekstensi `.pdf`, MIME `application/pdf`, header magic bytes `%PDF-`, serta batas maks. `3.145.728` byte (3 MiB) untuk `naskah-pdf/` dan `16.777.216` byte (16 MiB) untuk `novel-pdf/`.
- Jalur Cover memvalidasi magic bytes `RIFF....WEBP`, PNG, atau JPEG serta batas maks. `1.048.576` byte (1 MiB).
