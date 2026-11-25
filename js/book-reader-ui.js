/**
 * Kontrol Animasi 3D Buka Buku, Preferensi Baca Teks & Pembaca PDF Cache Offline — e-SIPENA SMAN 1 Sidayu
 * Mengelola animasi 3D buka sampul, utilitas kontrol huruf/tema pembaca sastra bersama,
 * serta merender PDF cache IndexedDB melalui PDF.js mode slide per halaman.
 */

import { playSfx } from './audio.js';
import { SafeStorage } from './data-service.js';
import {
  hasCachedPdf,
  isInlinePdfSupported,
  loadPdfForReader
} from './pdf-cache.js';
import { mountPdfSlideViewer } from './pdf-slide-viewer.js';
import { createIcon, escapeHtml } from './ui-utils.js';

const READER_FONT_KEY = 'esipena_reader_font_px';
const READER_THEME_KEY = 'esipena_reader_theme';

export function getReaderPrefs() {
  const rawSize = Number(SafeStorage.getItem(READER_FONT_KEY) || 16);
  const fontSize = Number.isFinite(rawSize) ? Math.min(22, Math.max(14, rawSize)) : 16;
  const theme = SafeStorage.getItem(READER_THEME_KEY) === 'dark' ? 'dark' : 'light';
  return { fontSize, theme };
}

export function renderTextReaderToolbarHtml({
  fontSize = 16,
  theme = 'light',
  showSlideNav = false,
  ttsId = 'btn-reader-tts',
  ttsLabel = 'Dengar Teks',
  extraActionsHtml = ''
} = {}) {
  const slideNavHtml = showSlideNav
    ? `
      <div class="reader-slide-nav" aria-label="Navigasi halaman bacaan">
        <button type="button" class="page-btn" id="btn-text-prev" aria-label="Halaman sebelumnya">&lsaquo;</button>
        <span class="page-indicator" id="text-page-info">Hal 1 / 1</span>
        <button type="button" class="page-btn" id="btn-text-next" aria-label="Halaman berikutnya">&rsaquo;</button>
      </div>`
    : '';
  const ttsHtml = ttsId
    ? `<button type="button" class="secondary-btn inline-action-btn" id="${escapeHtml(ttsId)}">${createIcon('volume')}<span>${escapeHtml(ttsLabel)}</span></button>`
    : '';

  return `
    <div class="reader-text-controls">
      <div class="reader-font-group" aria-label="Atur ukuran huruf bacaan">
        <button type="button" class="page-btn" data-reader-font-dec aria-label="Perkecil huruf">A-</button>
        <span class="page-indicator" data-reader-font-label>${fontSize}px</span>
        <button type="button" class="page-btn" data-reader-font-inc aria-label="Perbesar huruf">A+</button>
      </div>
      ${slideNavHtml}
      <div class="reader-font-group">
        <button type="button" class="secondary-btn inline-action-btn" data-reader-theme-toggle aria-pressed="${theme === 'dark' ? 'true' : 'false'}"><span>${theme === 'dark' ? 'Tema Kertas' : 'Tema Gelap'}</span></button>
        ${ttsHtml}
        ${extraActionsHtml}
      </div>
    </div>
  `;
}

export function bindTextReaderControls(scopeEl, { paperSelector = '.literary-reader-paper' } = {}) {
  if (!(scopeEl instanceof HTMLElement)) return;
  const prefs = getReaderPrefs();
  let currentFontSize = prefs.fontSize;
  let isDark = prefs.theme === 'dark';

  const syncUi = () => {
    for (const paper of scopeEl.querySelectorAll(paperSelector)) {
      if (paper instanceof HTMLElement) {
        paper.style.fontSize = `${currentFontSize}px`;
        paper.classList.toggle('is-dark', isDark);
      }
    }
    for (const lbl of scopeEl.querySelectorAll('[data-reader-font-label]')) {
      lbl.textContent = `${currentFontSize}px`;
    }
    for (const btn of scopeEl.querySelectorAll('[data-reader-theme-toggle]')) {
      btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
      const span = btn.querySelector('span');
      if (span) span.textContent = isDark ? 'Tema Kertas' : 'Tema Gelap';
    }
  };

  syncUi();

  for (const decBtn of scopeEl.querySelectorAll('[data-reader-font-dec]')) {
    decBtn.addEventListener('click', () => {
      playSfx('click');
      currentFontSize = Math.min(22, Math.max(14, currentFontSize - 2));
      SafeStorage.setItem(READER_FONT_KEY, currentFontSize);
      syncUi();
    });
  }
  for (const incBtn of scopeEl.querySelectorAll('[data-reader-font-inc]')) {
    incBtn.addEventListener('click', () => {
      playSfx('click');
      currentFontSize = Math.min(22, Math.max(14, currentFontSize + 2));
      SafeStorage.setItem(READER_FONT_KEY, currentFontSize);
      syncUi();
    });
  }
  for (const themeBtn of scopeEl.querySelectorAll('[data-reader-theme-toggle]')) {
    themeBtn.addEventListener('click', () => {
      playSfx('click');
      isDark = !isDark;
      SafeStorage.setItem(READER_THEME_KEY, isDark ? 'dark' : 'light');
      syncUi();
    });
  }
}

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
 *   animateCover?: boolean
 * }} opts
 */
export function createBookReaderController({
  bodyEl,
  book,
  gdrive,
  onStageChange,
  animateCover = true
}) {
  const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
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
      pdfStageBox.querySelector('#btn-fallback-text-slide')?.addEventListener('click', () => onStageChange?.('text'));
    }
  };

  const initPdfWithAutoCache = async () => {
    if (pdfInitialized || !gdrive.hasDriveFile || !(pdfStageBox instanceof HTMLElement)) return;
    pdfInitialized = true;

    const alreadyCached = await hasCachedPdf(gdrive.fileId);
    if (isOffline && !alreadyCached) {
      if (offlineBanner instanceof HTMLElement) {
        offlineBanner.hidden = false;
        offlineBanner.textContent =
          'Perangkat sedang offline dan PDF belum tersimpan di cache. Menampilkan tampilan cadangan.';
      }
      onStageChange?.('text');
      return;
    }

    const res = await loadPdfForReader(gdrive.fileId, {
      onStatus: (msg) => {
        if (pdfStageBox) pdfStageBox.textContent = msg;
      }
    });

    if ((res.status === 'cached' || res.status === 'downloaded') && res.blob) {
      revokeBlob();
      destroyViewer();
      activeObjectUrl = res.objectUrl;

      try {
        pdfStageBox.textContent = 'Menyiapkan halaman buku PDF...';
        activePdfViewer = await mountPdfSlideViewer({
          stageEl: pdfStageBox,
          blob: res.blob,
          bookId: book.id || book.tracking_code || gdrive.fileId,
          title: book.title
        });
      } catch {
        renderCachedBlobFallback(res.sizeBytes);
      }
      return;
    }

    if (res.status === 'proxy-unavailable' && !isOffline && gdrive.previewUrl) {
      pdfStageBox.className = '';
      pdfStageBox.innerHTML = `<iframe class="pdf-preview-iframe" src="${escapeHtml(gdrive.previewUrl)}" title="Pembaca PDF ${escapeHtml(book.title)}" loading="lazy" allowfullscreen></iframe>`;
      return;
    }

    onStageChange?.('text');
  };

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
