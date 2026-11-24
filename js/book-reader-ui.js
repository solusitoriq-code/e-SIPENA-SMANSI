/**
 * Kontrol Animasi 3D Buka Buku & Tahap Pembaca PDF Cache Offline — e-SIPENA SMAN 1 Sidayu
 * Menjalankan animasi 3D membuka sampul setiap kali Baca dibuka dan merender PDF cache IndexedDB
 * melalui PDF.js mode slide per halaman (tanpa viewer Google Drive /preview).
 */

import { playSfx } from './audio.js';
import {
  deleteCachedPdf,
  hasCachedPdf,
  isInlinePdfSupported,
  loadPdfForReader
} from './pdf-cache.js';
import { mountPdfSlideViewer } from './pdf-slide-viewer.js';
import { createIcon, escapeHtml, showToast } from './ui-utils.js';

function formatSizeMb(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Membuat pengendali animasi 3D membuka sampul buku serta pemuatan PDF auto-cache offline.
 * @param {{
 *   bodyEl: HTMLElement,
 *   book: Record<string, any>,
 *   gdrive: { fileId: string, previewUrl: string, openUrl: string, hasDriveFile: boolean },
 *   onStageChange?: (viewName: string) => void,
 *   onBlobUrlReady?: (url: string) => void,
 *   animateCover?: boolean
 * }} opts
 */
export function createBookReaderController({
  bodyEl,
  book,
  gdrive,
  onStageChange,
  onBlobUrlReady,
  animateCover = true
}) {
  const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
  const cacheBadge = bodyEl.querySelector('#pdf-cache-badge');
  const clearCacheBtn = bodyEl.querySelector('#btn-clear-pdf-cache');
  const pdfStageBox = bodyEl.querySelector('#pdf-reader-stage-content');
  const offlineBanner = bodyEl.querySelector('#text-offline-banner');

  let openAnimTimer = null;
  let pdfInitialized = false;
  let activeObjectUrl = '';
  let activePdfViewer = null;

  const revokeBlob = () => {
    if (activeObjectUrl) {
      URL.revokeObjectURL(activeObjectUrl);
      activeObjectUrl = '';
    }
  };

  const destroyViewer = () => {
    activePdfViewer?.destroy();
    activePdfViewer = null;
  };

  const playBookOpenAnimation = () => {
    if (!animateCover) return;
    const intro = bodyEl.querySelector('#book-cover-intro');
    if (!(intro instanceof HTMLElement)) return;
    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    if (openAnimTimer) window.clearTimeout(openAnimTimer);
    playSfx('pop');
    intro.hidden = false;
    intro.classList.remove('is-opening');
    void intro.offsetWidth;
    intro.classList.add('is-opening');
    openAnimTimer = window.setTimeout(() => {
      if (intro.isConnected) {
        intro.hidden = true;
        intro.classList.remove('is-opening');
      }
      openAnimTimer = null;
    }, 780);
  };

  const renderCachedBlobFallback = (sizeBytes) => {
    if (!(pdfStageBox instanceof HTMLElement)) return;
    if (isInlinePdfSupported()) {
      pdfStageBox.className = '';
      pdfStageBox.innerHTML = `<iframe class="pdf-preview-iframe" src="${escapeHtml(activeObjectUrl)}" title="Pembaca PDF ${escapeHtml(book.title)}"></iframe>`;
    } else if (!isOffline && gdrive.previewUrl) {
      pdfStageBox.className = '';
      pdfStageBox.innerHTML = `<iframe class="pdf-preview-iframe" src="${escapeHtml(gdrive.previewUrl)}" title="Pembaca PDF ${escapeHtml(book.title)}" loading="lazy" allowfullscreen></iframe>`;
    } else {
      pdfStageBox.className = 'offline-cached-mobile-box';
      pdfStageBox.innerHTML = `
        <p>Berkas PDF tersimpan offline (${escapeHtml(formatSizeMb(sizeBytes))}). Buka lewat aplikasi PDF perangkat atau lanjutkan Mode Baca Teks.</p>
        <div class="book-modal-actions">
          <a class="primary-btn inline-action-btn" href="${escapeHtml(activeObjectUrl)}" target="_blank" rel="noopener noreferrer">${createIcon('external')}<span>Buka PDF Offline</span></a>
          <button type="button" class="secondary-btn inline-action-btn" id="btn-fallback-text-slide">${createIcon('book')}<span>Baca Teks (Slide)</span></button>
        </div>
      `;
      pdfStageBox.querySelector('#btn-fallback-text-slide')?.addEventListener('click', () => onStageChange('text'));
    }
  };

  const initPdfWithAutoCache = async () => {
    if (pdfInitialized || !gdrive.hasDriveFile || !(pdfStageBox instanceof HTMLElement)) return;
    pdfInitialized = true;

    const alreadyCached = await hasCachedPdf(gdrive.fileId);
    if (isOffline && !alreadyCached) {
      if (cacheBadge) cacheBadge.textContent = 'Offline (Belum di-cache)';
      if (offlineBanner instanceof HTMLElement) {
        offlineBanner.hidden = false;
        offlineBanner.textContent =
          'Perangkat sedang offline dan PDF belum tersimpan di cache. Menampilkan Mode Baca Teks.';
      }
      onStageChange?.('text');
      return;
    }

    const res = await loadPdfForReader(gdrive.fileId, {
      onStatus: (msg) => {
        if (cacheBadge) cacheBadge.textContent = msg;
        if (pdfStageBox) pdfStageBox.textContent = msg;
      }
    });

    if ((res.status === 'cached' || res.status === 'downloaded') && res.blob) {
      revokeBlob();
      destroyViewer();
      activeObjectUrl = res.objectUrl;
      onBlobUrlReady?.(activeObjectUrl);
      if (cacheBadge) {
        cacheBadge.classList.add('is-cached-ok');
        cacheBadge.textContent = `Tersimpan Offline (${formatSizeMb(res.sizeBytes)})`;
      }
      if (clearCacheBtn instanceof HTMLElement) clearCacheBtn.hidden = false;

      try {
        pdfStageBox.textContent = 'Menyiapkan halaman buku PDF...';
        activePdfViewer = await mountPdfSlideViewer({
          stageEl: pdfStageBox,
          blob: res.blob,
          bookId: book.id,
          title: book.title
        });
      } catch {
        renderCachedBlobFallback(res.sizeBytes);
      }
      return;
    }

    if (res.status === 'proxy-unavailable' && !isOffline) {
      if (cacheBadge) cacheBadge.textContent = 'Mode Online (Drive)';
      pdfStageBox.className = '';
      pdfStageBox.innerHTML = `<iframe class="pdf-preview-iframe" src="${escapeHtml(gdrive.previewUrl)}" title="Pembaca PDF ${escapeHtml(book.title)}" loading="lazy" allowfullscreen></iframe>`;
      return;
    }

    if (cacheBadge) cacheBadge.textContent = 'Mode Teks Offline';
    onStageChange?.('text');
  };

  clearCacheBtn?.addEventListener('click', async () => {
    destroyViewer();
    await deleteCachedPdf(gdrive.fileId);
    revokeBlob();
    if (clearCacheBtn instanceof HTMLElement) clearCacheBtn.hidden = true;
    if (cacheBadge) {
      cacheBadge.classList.remove('is-cached-ok');
      cacheBadge.textContent = 'Cache dihapus';
    }
    if (pdfStageBox instanceof HTMLElement) {
      if (navigator.onLine !== false && gdrive.previewUrl) {
        pdfStageBox.className = '';
        pdfStageBox.innerHTML = `<iframe class="pdf-preview-iframe" src="${escapeHtml(gdrive.previewUrl)}" title="Pembaca PDF ${escapeHtml(book.title)}" loading="lazy" allowfullscreen></iframe>`;
      } else {
        onStageChange('text');
      }
    }
    playSfx('click');
    showToast('Cache PDF offline dihapus dari perangkat ini.');
  });

  return {
    activateReader: () => {
      playBookOpenAnimation();
      initPdfWithAutoCache();
    },
    destroy: () => {
      if (openAnimTimer) window.clearTimeout(openAnimTimer);
      destroyViewer();
      revokeBlob();
    }
  };
}
