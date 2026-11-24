/**
 * Utilitas Kompresi & Unggah Gambar WebP — e-SIPENA SMAN 1 Sidayu
 * Mengompres sampul buku (296x420 -> covers/) dan foto dokumentasi kegiatan
 * (rasio asli maks. 1280px -> kegiatan/) ke WebP, lalu mengunggah ke Google Drive
 * melalui UploadDrive.gs dengan fallback Data URL WebP aman saat luring.
 */

import { APP_CONFIG, isGDriveUploadConfigured } from './config.js';
import { fetchWithTimeout } from './service-helpers.js';
import { uploadPdfToGDrive } from './submission-service.js';

const COVER_WIDTH = 296;
const COVER_HEIGHT = 420;
const ACTIVITY_MAX_DIMENSION = 1280;
const MAX_INPUT_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MiB sebelum kompresi

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Berkas gambar tidak dapat dibaca.'));
    };
    img.src = objectUrl;
  });
}

async function compressImageToWebp(
  file,
  { coverCrop = false, width = COVER_WIDTH, height = COVER_HEIGHT, maxDimension = ACTIVITY_MAX_DIMENSION, maxDataUrlLen = 140000, minQuality = 0.45 } = {}
) {
  if (!file || typeof file.name !== 'string') {
    throw new Error('Pilih berkas gambar terlebih dahulu.');
  }
  if (!/^image\/(webp|png|jpeg|jpg)$/i.test(String(file.type || '')) && !/\.(webp|png|jpe?g)$/i.test(file.name)) {
    throw new Error('Format gambar harus WebP, PNG, atau JPG/JPEG.');
  }
  if (file.size > MAX_INPUT_IMAGE_BYTES) {
    throw new Error('Ukuran gambar awal maksimal 10 MB.');
  }

  const img = await loadImageElement(file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Peramban tidak mendukung kompresi kanvas.');
  }

  if (coverCrop) {
    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle = '#0f294a';
    ctx.fillRect(0, 0, width, height);

    const srcRatio = img.naturalWidth / Math.max(1, img.naturalHeight);
    const dstRatio = width / height;
    let drawW = width;
    let drawH = height;
    let offsetX = 0;
    let offsetY = 0;
    if (srcRatio > dstRatio) {
      drawW = height * srcRatio;
      offsetX = (width - drawW) / 2;
    } else {
      drawH = width / srcRatio;
      offsetY = (height - drawH) / 2;
    }
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
  } else {
    const longest = Math.max(1, img.naturalWidth, img.naturalHeight);
    const scale = Math.min(1, maxDimension / longest);
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }

  let quality = 0.84;
  let dataUrl = canvas.toDataURL('image/webp', quality);
  while (dataUrl.length > maxDataUrlLen && quality > minQuality) {
    quality = Math.max(minQuality, quality - 0.1);
    dataUrl = canvas.toDataURL('image/webp', quality);
    if (quality === minQuality) break;
  }

  const mimeMatch = dataUrl.match(/^data:([^;]+);base64,/i);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/webp';
  const base64Data = dataUrl.replace(/^data:[^;]+;base64,/i, '');
  const sizeBytes = Math.round((base64Data.length * 3) / 4);

  return { dataUrl, base64Data, mimeType, sizeBytes };
}

/**
 * Mengompres berkas gambar apa pun (JPG/PNG/WebP) menjadi data URL WebP 296x420 (< ~90 KB).
 * @param {File} file
 * @returns {Promise<{ dataUrl: string, base64Data: string, mimeType: string, sizeBytes: number }>}
 */
export async function compressCoverToWebp(file) {
  return compressImageToWebp(file, {
    coverCrop: true,
    width: COVER_WIDTH,
    height: COVER_HEIGHT,
    maxDataUrlLen: 140000,
    minQuality: 0.45
  });
}

/**
 * Mengompres foto kegiatan Sudut Pustakawan menjadi WebP dengan rasio asli terjaga (maks. 1280px).
 * @param {File} file
 * @returns {Promise<{ dataUrl: string, base64Data: string, mimeType: string, sizeBytes: number }>}
 */
export async function compressActivityPhotoToWebp(file) {
  return compressImageToWebp(file, {
    coverCrop: false,
    maxDimension: ACTIVITY_MAX_DIMENSION,
    maxDataUrlLen: 460000,
    minQuality: 0.5
  });
}

async function uploadImageAssetToGDrive(
  file,
  { uploadKind, subFolder, compressFn, thumbSize, offlineMsg, staleMsg, errorMsg }
) {
  const compressed = await compressFn(file);
  const ext = compressed.mimeType === 'image/png' ? '.png' : '.webp';
  const uploadName = file.name.replace(/\.[^.]+$/, '') + ext;

  const buildEmbeddedFallback = (warning) => ({
    success: true,
    source: 'embedded-webp',
    url: compressed.dataUrl,
    fileId: '',
    folderName: subFolder,
    sizeBytes: compressed.sizeBytes,
    warning
  });

  const canUpload =
    isGDriveUploadConfigured() &&
    /^image\/(webp|png)$/i.test(compressed.mimeType) &&
    (typeof navigator === 'undefined' || navigator.onLine !== false);

  if (!canUpload) {
    return buildEmbeddedFallback(offlineMsg);
  }

  try {
    const response = await fetchWithTimeout(
      APP_CONFIG.GDRIVE_UPLOAD_URL,
      {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          uploadKind,
          subFolder,
          fileName: uploadName,
          mimeType: compressed.mimeType,
          base64Data: compressed.base64Data
        })
      },
      0
    );

    const data = await response.json().catch(() => null);
    if (response.ok && data && data.success && (data.thumbnailUrl || data.fileId)) {
      const actualFolder = String(data.folderName || subFolder);
      const url =
        data.thumbnailUrl ||
        `https://drive.google.com/thumbnail?id=${encodeURIComponent(data.fileId)}&sz=${thumbSize}`;
      const folderMismatchWarn =
        actualFolder !== subFolder
          ? `UploadDrive.gs masih versi lama (foto masuk ke ${actualFolder}/); deploy ulang skrip untuk subfolder ${subFolder}/.`
          : '';
      return {
        success: true,
        source: 'gdrive',
        url,
        fileId: String(data.fileId || ''),
        folderName: actualFolder,
        sizeBytes: Number(data.sizeBytes || compressed.sizeBytes),
        warning: folderMismatchWarn
      };
    }

    return buildEmbeddedFallback(staleMsg);
  } catch {
    return buildEmbeddedFallback(errorMsg);
  }
}

/**
 * Mengompres sampul buku ke WebP dan mengunggah ke Google Drive subfolder covers/.
 * @param {File} file
 */
export async function uploadCoverImageToGDrive(file) {
  const res = await uploadImageAssetToGDrive(file, {
    uploadKind: 'cover',
    subFolder: 'covers',
    compressFn: compressCoverToWebp,
    thumbSize: 'w800',
    offlineMsg: 'Sampul dikompres ke WebP dan disematkan langsung (mode luring/tanpa Drive).',
    staleMsg: 'Endpoint UploadDrive.gs belum diperbarui untuk sampul; WebP terkompresi disematkan langsung.',
    errorMsg: 'Gagal menghubungi Drive; gambar sampul terkompresi disematkan langsung.'
  });
  return { ...res, coverUrl: res.url };
}

/**
 * Mengompres foto kegiatan ke WebP dan mengunggah ke Google Drive subfolder kegiatan/.
 * @param {File} file
 */
export async function uploadActivityPhotoToGDrive(file) {
  return uploadImageAssetToGDrive(file, {
    uploadKind: 'activity-photo',
    subFolder: 'kegiatan',
    compressFn: compressActivityPhotoToWebp,
    thumbSize: 'w1200',
    offlineMsg: 'Foto dikompres ke WebP dan disematkan langsung (mode luring/tanpa Drive).',
    staleMsg: 'Endpoint UploadDrive.gs gagal merespons; foto WebP disematkan langsung.',
    errorMsg: 'Gagal menghubungi Drive; foto kegiatan terkompresi disematkan langsung.'
  });
}

/**
 * Mengunggah sampul WebP dan/atau PDF buku kurator ke Google Drive dengan laporan progres persentase.
 * @param {{
 *   pendingCoverFile?: File | null,
 *   pendingPdfFile?: File | null,
 *   selectedCoverUrl?: string,
 *   selectedDriveId?: string,
 *   selectedPreviewUrl?: string,
 *   onProgress?: (pct: number, label: string) => void,
 *   onWarning?: (msg: string) => void
 * }} opts
 */
export async function uploadBookPendingAssets({
  pendingCoverFile = null,
  pendingPdfFile = null,
  selectedCoverUrl = '',
  selectedDriveId = '',
  selectedPreviewUrl = '',
  onProgress = () => { },
  onWarning = () => { }
} = {}) {
  let coverUrl = selectedCoverUrl;
  let driveId = selectedDriveId;
  let previewUrl = selectedPreviewUrl;
  let pct = 5;

  if (pendingCoverFile || pendingPdfFile) {
    onProgress(5, 'Menyiapkan berkas...');
  }

  if (pendingCoverFile) {
    onProgress(12, 'Mengunggah sampul ke Drive...');
    const uploadedCover = await uploadCoverImageToGDrive(pendingCoverFile);
    coverUrl = uploadedCover.coverUrl;
    pct = 24;
    onProgress(pct, 'Sampul siap disimpan.');
    if (uploadedCover.warning) onWarning(uploadedCover.warning);
  }

  if (pendingPdfFile) {
    const sizeMbNum = Math.max(0.2, pendingPdfFile.size / (1024 * 1024));
    const sizeMb = sizeMbNum.toFixed(2);
    const basePct = Math.max(pct, 16);
    const span = 93 - basePct;
    const expectedMs = Math.max(9000, sizeMbNum * 7500);
    const startedAt = Date.now();
    pct = basePct;
    onProgress(pct, `Mengunggah PDF (${sizeMb} MB)...`);

    const tickerId = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const nextPct = Math.min(93, basePct + Math.round(span * (1 - Math.exp(-(elapsed / expectedMs) * 1.45))));
      if (nextPct > pct) {
        pct = nextPct;
      }
      const label = pct >= 76
        ? `Menyimpan PDF (${sizeMb} MB) ke Drive...`
        : `Mengunggah PDF (${sizeMb} MB)...`;
      onProgress(pct, label);
    }, 500);

    try {
      const uploadedPdf = await uploadPdfToGDrive(pendingPdfFile, {
        subFolder: 'novel-pdf',
        maxBytes: APP_CONFIG.MAX_CATALOG_PDF_SIZE_BYTES
      });
      if (uploadedPdf.simulated) {
        throw new Error(uploadedPdf.warning || 'Unggah PDF membutuhkan koneksi internet dan layanan Drive aktif.');
      }
      driveId = uploadedPdf.fileId;
      previewUrl = uploadedPdf.previewUrl;
      onProgress(95, 'PDF tersimpan di Drive, menyimpan data buku...');
    } finally {
      window.clearInterval(tickerId);
    }
  } else {
    onProgress(90, 'Menyimpan perubahan novel...');
  }

  return { coverUrl, driveId, previewUrl };
}
