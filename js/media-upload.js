/**
 * Utilitas Kompresi & Unggah Sampul Buku WebP — e-SIPENA SMAN 1 Sidayu
 * Mengubah gambar (JPG/PNG/WebP) menjadi WebP rasio sampul 296x420 terkompresi di browser,
 * mengunggah ke Google Drive (jika UploadDrive.gs mendukung gambar), atau memakai Data URL WebP ringan.
 */

import { APP_CONFIG, isGDriveUploadConfigured } from './config.js';
import { fetchWithTimeout } from './service-helpers.js';
import { uploadPdfToGDrive } from './submission-service.js';

const COVER_WIDTH = 296;
const COVER_HEIGHT = 420;
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

/**
 * Mengompres berkas gambar apa pun (JPG/PNG/WebP) menjadi data URL WebP 296x420 (< ~90 KB).
 * @param {File} file
 * @returns {Promise<{ dataUrl: string, base64Data: string, mimeType: string, sizeBytes: number }>}
 */
export async function compressCoverToWebp(file) {
  if (!file || typeof file.name !== 'string') {
    throw new Error('Pilih berkas gambar terlebih dahulu.');
  }
  if (!/^image\/(webp|png|jpeg|jpg)$/i.test(String(file.type || '')) && !/\.(webp|png|jpe?g)$/i.test(file.name)) {
    throw new Error('Format sampul harus gambar WebP, PNG, atau JPG/JPEG.');
  }
  if (file.size > MAX_INPUT_IMAGE_BYTES) {
    throw new Error('Ukuran gambar awal maksimal 10 MB.');
  }

  const img = await loadImageElement(file);
  const canvas = document.createElement('canvas');
  canvas.width = COVER_WIDTH;
  canvas.height = COVER_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Peramban tidak mendukung kompresi kanvas.');
  }

  ctx.fillStyle = '#0f294a';
  ctx.fillRect(0, 0, COVER_WIDTH, COVER_HEIGHT);

  const srcRatio = img.naturalWidth / Math.max(1, img.naturalHeight);
  const dstRatio = COVER_WIDTH / COVER_HEIGHT;
  let drawW = COVER_WIDTH;
  let drawH = COVER_HEIGHT;
  let offsetX = 0;
  let offsetY = 0;
  if (srcRatio > dstRatio) {
    drawW = COVER_HEIGHT * srcRatio;
    offsetX = (COVER_WIDTH - drawW) / 2;
  } else {
    drawH = COVER_WIDTH / srcRatio;
    offsetY = (COVER_HEIGHT - drawH) / 2;
  }
  ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

  let quality = 0.82;
  let dataUrl = canvas.toDataURL('image/webp', quality);
  while (dataUrl.length > 140000 && quality > 0.45) {
    quality -= 0.12;
    dataUrl = canvas.toDataURL('image/webp', quality);
  }

  const mimeMatch = dataUrl.match(/^data:([^;]+);base64,/i);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/webp';
  const base64Data = dataUrl.replace(/^data:[^;]+;base64,/i, '');
  const sizeBytes = Math.round((base64Data.length * 3) / 4);

  return { dataUrl, base64Data, mimeType, sizeBytes };
}

/**
 * Mengompres gambar ke WebP dan mengunggah ke Google Drive via UploadDrive.gs bila mendukung,
 * dengan fallback aman ke Data URL WebP terkompresi bila offline atau Apps Script belum diperbarui.
 * @param {File} file
 */
export async function uploadCoverImageToGDrive(file) {
  const compressed = await compressCoverToWebp(file);
  const ext = compressed.mimeType === 'image/png' ? '.png' : '.webp';
  const uploadName = file.name.replace(/\.[^.]+$/, '') + ext;

  const buildEmbeddedFallback = (warning) => ({
    success: true,
    source: 'embedded-webp',
    coverUrl: compressed.dataUrl,
    fileId: '',
    folderName: 'covers',
    sizeBytes: compressed.sizeBytes,
    warning
  });

  const canUpload =
    isGDriveUploadConfigured() &&
    /^image\/(webp|png)$/i.test(compressed.mimeType) &&
    (typeof navigator === 'undefined' || navigator.onLine !== false);

  if (!canUpload) {
    return buildEmbeddedFallback('Sampul dikompres ke WebP dan disematkan langsung (mode luring/tanpa Drive).');
  }

  try {
    const response = await fetchWithTimeout(
      APP_CONFIG.GDRIVE_UPLOAD_URL,
      {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          uploadKind: 'cover',
          subFolder: 'covers',
          fileName: uploadName,
          mimeType: compressed.mimeType,
          base64Data: compressed.base64Data
        })
      },
      0
    );

    const data = await response.json().catch(() => null);
    if (response.ok && data && data.success && (data.thumbnailUrl || data.fileId)) {
      const coverUrl =
        data.thumbnailUrl || `https://drive.google.com/thumbnail?id=${encodeURIComponent(data.fileId)}&sz=w800`;
      return {
        success: true,
        source: 'gdrive',
        coverUrl,
        fileId: String(data.fileId || ''),
        folderName: String(data.folderName || 'covers'),
        sizeBytes: Number(data.sizeBytes || compressed.sizeBytes),
        warning: ''
      };
    }

    return buildEmbeddedFallback(
      'Endpoint UploadDrive.gs belum diperbarui untuk sampul; WebP terkompresi disematkan langsung.'
    );
  } catch {
    return buildEmbeddedFallback('Gagal menghubungi Drive; gambar sampul terkompresi disematkan langsung.');
  }
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
