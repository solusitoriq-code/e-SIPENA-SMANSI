/**
 * Google Apps Script Web App — Upload Karya PDF, Sampul Buku & Foto Kegiatan (.webp/.png/.jpg) ke Google Drive
 * Portal Literasi Digital e-SIPENA SMA Negeri 1 Sidayu
 *
 * Menggunakan 1 Folder Induk (TARGET_FOLDER_ID) lalu memilah file otomatis ke subfolder:
 * - covers/      : Sampul buku WebP terkompresi (maks. 1 MB)
 * - kegiatan/    : Foto dokumentasi kegiatan Sudut Pustakawan (maks. 1 MB per foto)
 * - naskah-pdf/  : Kiriman karya PDF warga sekolah dari form Kirim Karya (maks. 3 MB)
 * - novel-pdf/   : Unggahan PDF buku katalog oleh kurator dari Ruang Pengelola (maks. 16 MB)
 */

const TARGET_FOLDER_ID = '1jqVR3qnJjnw-QB3uxo8gbPWaRcAL3s5X';
const PLACEHOLDER_FOLDER_ID = 'GANTI_DENGAN_ID_FOLDER_GOOGLE_DRIVE_ANDA';
const MAX_PDF_SIZE_BYTES = 3 * 1024 * 1024; // 3 MiB (naskah kiriman warga)
const MAX_CATALOG_PDF_SIZE_BYTES = 16 * 1024 * 1024; // 16 MiB (khusus buku kurator)
const MAX_COVER_SIZE_BYTES = 1 * 1024 * 1024; // 1 MiB (sampul buku & foto kegiatan)
const ALLOWED_PDF_FOLDERS = { 'naskah-pdf': true, 'novel-pdf': true };
const ALLOWED_IMAGE_FOLDERS = { covers: true, kegiatan: true };

function getRootFolderId_() {
  const props = PropertiesService.getScriptProperties();
  const propId = props.getProperty('TARGET_FOLDER_ID');
  return (propId && propId.trim()) ? propId.trim() : TARGET_FOLDER_ID;
}

function getOrCreateSubfolder_(rootFolder, subFolderName) {
  const existing = rootFolder.getFoldersByName(subFolderName);
  if (existing.hasNext()) {
    return existing.next();
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const recheck = rootFolder.getFoldersByName(subFolderName);
    if (recheck.hasNext()) {
      return recheck.next();
    }
    return rootFolder.createFolder(subFolderName);
  } finally {
    lock.releaseLock();
  }
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function sanitizeFileName_(rawName, prefix, ext) {
  const cleaned = String(rawName || ('berkas' + ext))
    .replace(/[^a-zA-Z0-9._ -]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[._-]+/, '');
  const base = cleaned.toLowerCase().endsWith(ext)
    ? cleaned.slice(0, -ext.length)
    : cleaned.replace(/\.[a-z0-9]+$/i, '');
  const safeBase = (base || prefix || 'berkas').slice(0, 72);
  const stamp = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMMdd-HHmmss');
  return (prefix ? prefix + '_' : '') + stamp + '_' + safeBase + ext;
}

function toUnsignedByte_(b) {
  return b < 0 ? b + 256 : b;
}

function isPdfMagicHeader_(bytes) {
  if (!bytes || bytes.length < 5) return false;
  return toUnsignedByte_(bytes[0]) === 37 &&
    toUnsignedByte_(bytes[1]) === 80 &&
    toUnsignedByte_(bytes[2]) === 68 &&
    toUnsignedByte_(bytes[3]) === 70 &&
    toUnsignedByte_(bytes[4]) === 45;
}

function detectImageType_(bytes) {
  if (!bytes || bytes.length < 12) return null;
  const b0 = toUnsignedByte_(bytes[0]);
  const b1 = toUnsignedByte_(bytes[1]);
  const b2 = toUnsignedByte_(bytes[2]);
  const b3 = toUnsignedByte_(bytes[3]);
  // RIFF....WEBP
  if (b0 === 82 && b1 === 73 && b2 === 70 && b3 === 70 &&
    toUnsignedByte_(bytes[8]) === 87 && toUnsignedByte_(bytes[9]) === 69 &&
    toUnsignedByte_(bytes[10]) === 66 && toUnsignedByte_(bytes[11]) === 80) {
    return { mime: 'image/webp', ext: '.webp' };
  }
  // PNG
  if (b0 === 137 && b1 === 80 && b2 === 78 && b3 === 71) {
    return { mime: 'image/png', ext: '.png' };
  }
  // JPEG
  if (b0 === 255 && b1 === 216 && b2 === 255) {
    return { mime: 'image/jpeg', ext: '.jpg' };
  }
  return null;
}

function doGet() {
  const folderId = getRootFolderId_();
  const configured = folderId && folderId !== PLACEHOLDER_FOLDER_ID;
  return jsonResponse_({
    success: true,
    service: 'e-SIPENA GDrive Uploader (1 Root ID -> covers / kegiatan / naskah-pdf / novel-pdf)',
    configured: Boolean(configured),
    maxBytes: MAX_PDF_SIZE_BYTES,
    maxCatalogPdfBytes: MAX_CATALOG_PDF_SIZE_BYTES,
    maxCoverBytes: MAX_COVER_SIZE_BYTES
  });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse_({ success: false, error: 'Payload kosong.' });
    }

    const rootFolderId = getRootFolderId_();
    if (!rootFolderId || rootFolderId === PLACEHOLDER_FOLDER_ID) {
      return jsonResponse_({
        success: false,
        error: 'TARGET_FOLDER_ID belum dikonfigurasi pada Google Apps Script.'
      });
    }

    let body;
    try {
      body = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return jsonResponse_({ success: false, error: 'Format JSON tidak valid.' });
    }

    const uploadKind = String(body.uploadKind || '').trim().toLowerCase();
    const requestedSub = String(body.subFolder || '').trim().toLowerCase();
    const fileName = String(body.fileName || '').trim();
    const mimeType = String(body.mimeType || '').trim().toLowerCase();
    const rawBase64 = String(body.base64Data || '').trim();

    if (!rawBase64) {
      return jsonResponse_({ success: false, error: 'Data base64 berkas tidak ditemukan.' });
    }

    const cleanBase64 = rawBase64.replace(/^data:[^;]+;base64,/i, '');
    const bytes = Utilities.base64Decode(cleanBase64);
    if (!bytes || bytes.length === 0) {
      return jsonResponse_({ success: false, error: 'Berkas kosong.' });
    }

    const isCover = uploadKind === 'cover' ||
      uploadKind === 'activity-photo' ||
      /^image\/(webp|png|jpeg)$/i.test(mimeType) ||
      /\.(webp|png|jpe?g)$/i.test(fileName);

    let finalMime = 'application/pdf';
    let safeName = '';
    let subFolderName = 'naskah-pdf';

    if (isCover) {
      if (bytes.length > MAX_COVER_SIZE_BYTES) {
        return jsonResponse_({ success: false, error: 'Ukuran gambar melebihi batas 1 MB.' });
      }
      const detected = detectImageType_(bytes);
      if (!detected) {
        return jsonResponse_({ success: false, error: 'Format gambar wajib WebP, PNG, atau JPEG.' });
      }
      finalMime = detected.mime;
      subFolderName = ALLOWED_IMAGE_FOLDERS[requestedSub]
        ? requestedSub
        : uploadKind === 'activity-photo'
          ? 'kegiatan'
          : 'covers';
      const imgPrefix = subFolderName === 'kegiatan' ? 'kegiatan' : 'cover';
      safeName = sanitizeFileName_(fileName, imgPrefix, detected.ext);
    } else {
      if (!fileName || !fileName.toLowerCase().endsWith('.pdf')) {
        return jsonResponse_({ success: false, error: 'Nama file harus berekstensi .pdf.' });
      }
      if (mimeType && mimeType !== 'application/pdf') {
        return jsonResponse_({ success: false, error: 'Tipe MIME wajib application/pdf.' });
      }
      subFolderName = ALLOWED_PDF_FOLDERS[requestedSub] ? requestedSub : 'naskah-pdf';
      const maxAllowedPdfBytes =
        subFolderName === 'novel-pdf' ? MAX_CATALOG_PDF_SIZE_BYTES : MAX_PDF_SIZE_BYTES;
      const maxAllowedMb = Math.round(maxAllowedPdfBytes / (1024 * 1024));
      if (bytes.length > maxAllowedPdfBytes) {
        return jsonResponse_({
          success: false,
          error: 'Ukuran berkas melebihi batas maksimum ' + maxAllowedMb + ' MB.'
        });
      }
      if (!isPdfMagicHeader_(bytes)) {
        return jsonResponse_({ success: false, error: 'Konten berkas bukan dokumen PDF yang valid.' });
      }
      safeName = sanitizeFileName_(fileName, '', '.pdf');
    }

    const rootFolder = DriveApp.getFolderById(rootFolderId);
    const targetFolder = getOrCreateSubfolder_(rootFolder, subFolderName);
    const blob = Utilities.newBlob(bytes, finalMime, safeName);
    const file = targetFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const fileId = file.getId();
    const thumbWidth = subFolderName === 'kegiatan' ? 'w1200' : 'w800';
    return jsonResponse_({
      success: true,
      fileId: fileId,
      viewUrl: 'https://drive.google.com/file/d/' + fileId + '/view',
      previewUrl: 'https://drive.google.com/file/d/' + fileId + '/preview',
      thumbnailUrl: isCover ? ('https://drive.google.com/thumbnail?id=' + fileId + '&sz=' + thumbWidth) : '',
      folderName: subFolderName,
      fileName: safeName,
      sizeBytes: bytes.length
    });
  } catch (err) {
    return jsonResponse_({
      success: false,
      error: err && err.message ? err.message : 'Gagal mengunggah berkas ke Google Drive.'
    });
  }
}
