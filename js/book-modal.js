/**
 * Modal Detail & Pembaca Buku (Fitur 2) — e-SIPENA SMAN 1 Sidayu
 * Menampilkan animasi 3D membuka sampul buku, cache PDF otomatis ke IndexedDB untuk baca offline,
 * Mode Baca Teks cadangan, audio Bahasa Indonesia, Suka, dan WA.
 */

import { playSfx, stopSpeech } from './audio.js';
import { createBookReaderController } from './book-reader-ui.js';
import { SafeStorage, hasLikedBook, incrementBookLike } from './data-service.js';
import { mountTextSlideReader } from './text-flipbook.js';
import {
  bindSpeechToggleButton,
  buildWhatsAppUrl,
  createIcon,
  escapeHtml,
  extractPlainLiteraryText,
  getRoleBadgeClass,
  openModal,
  renderFormattedLiteraryHtml,
  resolveGDriveLinks,
  showToast
} from './ui-utils.js';

const READER_FONT_KEY = 'esipena_reader_font_px';
const READER_THEME_KEY = 'esipena_reader_theme';
const FALLBACK_COVER = 'assets/images/logo-smansi.webp';
const DIRECT_READ_CATEGORIES = new Set(['cerpen', 'puisi']);

function getReaderPrefs() {
  const rawSize = Number(SafeStorage.getItem(READER_FONT_KEY) || 16);
  const fontSize = Number.isFinite(rawSize) ? Math.min(22, Math.max(14, rawSize)) : 16;
  const theme = SafeStorage.getItem(READER_THEME_KEY) === 'dark' ? 'dark' : 'light';
  return { fontSize, theme };
}

function getTextReaderContent(book) {
  const fullText = String(book.body_text || book.full_text || '').trim();
  const rawContent = fullText || String(book.synopsis || 'Teks bacaan belum tersedia.').trim();
  return { isFullText: Boolean(fullText), rawContent };
}

/**
 * Membuka Modal Detail & Baca Buku untuk satu karya novel atau buku katalog.
 * @param {Record<string, any>} book
 * @param {{ initialMode?: 'detail' | 'read', siteSettings?: Record<string, any>, onLikesUpdated?: () => void }} [options]
 */
export function openBookModal(book, { initialMode = 'detail', siteSettings = {}, onLikesUpdated } = {}) {
  if (!book) return;

  const gdrive = resolveGDriveLinks(book);
  const contactAdmin = siteSettings.contact_admin || {};
  const hasCover = Boolean(String(book.cover_url || '').trim());
  const hasAuthor = Boolean(String(book.author_name || '').trim());
  const authorNote = hasAuthor
    ? ` karya ${book.author_name} (${book.author_role}${book.author_class ? ` ${book.author_class}` : ''})`
    : ` (${book.category || 'Antologi'} ${book.publication_year || 2026})`;
  const waUrl = buildWhatsAppUrl(contactAdmin, `"${book.title}"${authorNote}.`);
  const liked = hasLikedBook(book.id);
  const readerPrefs = getReaderPrefs();
  const textContent = getTextReaderContent(book);
  const hasSynopsis = Boolean(extractPlainLiteraryText(book.synopsis || ''));

  const canTryPdf = gdrive.hasDriveFile;
  const isDirectRead = DIRECT_READ_CATEGORIES.has(String(book.category || '').trim().toLowerCase());
  const startSection = isDirectRead || initialMode === 'read' ? 'reader' : 'detail';
  const defaultStage = canTryPdf ? 'drive' : 'text';
  const downloadFileName = `${book.slug || 'novel-smansi'}.pdf`;

  let readerController = null;

  const headerTabsHtml = isDirectRead
    ? ''
    : `
      <button type="button" class="modal-hdr-tab${startSection === 'detail' ? ' is-active' : ''}" role="tab" aria-selected="${startSection === 'detail' ? 'true' : 'false'}" data-modal-pane="detail">Detail</button>
      <button type="button" class="modal-hdr-tab${startSection === 'reader' ? ' is-active' : ''}" role="tab" aria-selected="${startSection === 'reader' ? 'true' : 'false'}" data-modal-pane="reader"${startSection === 'reader' ? ' data-autofocus' : ''}>Baca Buku</button>
    `;

  const detailPaneHtml = isDirectRead
    ? ''
    : `
        <section class="book-modal-pane${startSection === 'detail' ? ' is-active' : ''}" data-pane="detail" ${startSection === 'detail' ? '' : 'hidden'}>
          <div class="book-detail-grid${hasCover ? '' : ' is-no-cover'}">
            ${
              hasCover
                ? `<div class="book-detail-cover-col"><div class="book-cover-3d book-cover-modal"><img src="${escapeHtml(book.cover_url)}" alt="Sampul ${escapeHtml(book.title)}" width="296" height="420" onerror="this.onerror=null;this.src='${FALLBACK_COVER}'"></div></div>`
                : ''
            }
            <div class="book-detail-info-col">
              <div class="book-meta-row">
                ${hasAuthor && book.author_role ? `<span class="${getRoleBadgeClass(book.author_role)}">${escapeHtml(book.author_role)}</span>` : ''}
                ${book.category ? `<span class="panel-badge">${escapeHtml(book.category)}</span>` : ''}
                ${hasAuthor && book.author_class ? `<span class="panel-badge">${escapeHtml(book.author_class)}</span>` : ''}
                <span class="panel-badge">Tahun ${escapeHtml(book.publication_year || 2026)}</span>
                ${book.qrcbn_code ? `<span class="panel-badge">${/^(978|979)\d{10}$/.test(String(book.qrcbn_code).replaceAll('-', '').trim()) || /^\d{9}[\dX]$/i.test(String(book.qrcbn_code).replaceAll('-', '').trim()) ? 'ISBN' : 'ISBN/QRCBN'}: ${escapeHtml(book.qrcbn_code)}</span>` : ''}
              </div>
              <h3 class="book-modal-title">${escapeHtml(book.title)}</h3>
              ${hasAuthor ? `<p class="book-modal-author">Penulis: <strong>${escapeHtml(book.author_name)}</strong></p>` : ''}
              ${
                hasSynopsis
                  ? `<div class="book-synopsis-box"><h4>Sinopsis Karya</h4><div class="book-synopsis-content">${renderFormattedLiteraryHtml(book.synopsis, '')}</div></div>`
                  : '<p class="book-editorial-note">Koleksi antologi SMA Negeri 1 Sidayu. Klik Baca Buku untuk membuka naskah.</p>'
              }
              <div class="book-modal-actions">
                <button type="button" class="primary-btn inline-action-btn" id="btn-switch-to-reader">${createIcon('book')}<span>${canTryPdf ? 'Baca Buku (PDF)' : 'Baca Buku'}</span></button>
                ${hasSynopsis ? `<button type="button" class="secondary-btn inline-action-btn" id="btn-book-tts">${createIcon('volume')}<span>Dengar Sinopsis</span></button>` : ''}
                <button type="button" class="like-pill-btn modal-like-btn${liked ? ' is-liked' : ''}" id="btn-modal-like" aria-pressed="${liked ? 'true' : 'false'}">${createIcon('heart')}<span id="modal-like-label">${liked ? 'Disukai' : 'Suka'} (${Number(book.likes_count || 0)})</span></button>
                <a class="whatsapp-btn inline-action-btn" id="btn-book-wa-order" href="${escapeHtml(waUrl)}" target="_blank" rel="noopener noreferrer" hidden>${createIcon('whatsapp')}<span>Pesan Cetak via WA</span></a>
              </div>
            </div>
          </div>
        </section>
      `;

  // <a class="secondary-btn inline-action-btn" id="btn-detail-download-pdf" href="${escapeHtml(gdrive.downloadUrl || '#')}" target="_blank" rel="noopener noreferrer" download="${escapeHtml(downloadFileName)}" ${gdrive.downloadUrl ? '' : 'hidden'}>${createIcon('download')}<span>Unduh PDF</span></a>
  const bodyEl = openModal({
    title: book.title || 'Detail Novel',
    wide: true,
    fullscreen: true,
    headerTabsHtml,
    onClose: () => {
      stopSpeech();
      readerController?.destroy();
    },
    html: `
      <div class="book-modal-shell">
        ${detailPaneHtml}

        <section class="book-modal-pane${startSection === 'reader' ? ' is-active' : ''}" data-pane="reader" ${startSection === 'reader' ? '' : 'hidden'}>
          <div class="reader-stage-shell">
            <div class="book-cover-intro-overlay" id="book-cover-intro" hidden aria-hidden="true">
              <div class="book-cover-3d book-open-flip-sheet">
                <img src="${escapeHtml(book.cover_url || FALLBACK_COVER)}" alt="" width="296" height="420" onerror="this.onerror=null;this.src='${FALLBACK_COVER}'">
              </div>
            </div>

            <div class="reader-stage-view" data-reader-stage="drive" ${defaultStage === 'drive' ? '' : 'hidden'}>
              <div id="pdf-reader-stage-content" class="pdf-loading-note">Menyiapkan PDF dan cache offline...</div>
            </div>

            <div class="reader-stage-view" data-reader-stage="text" ${defaultStage === 'text' ? '' : 'hidden'}>
              <div id="text-offline-banner" class="offline-reader-notice" hidden></div>
              <div class="reader-text-controls">
                <div class="reader-font-group" aria-label="Atur ukuran huruf bacaan">
                  <button type="button" class="page-btn" id="btn-reader-font-dec" aria-label="Perkecil huruf">A-</button>
                  <span class="page-indicator" id="reader-font-label">${readerPrefs.fontSize}px</span>
                  <button type="button" class="page-btn" id="btn-reader-font-inc" aria-label="Perbesar huruf">A+</button>
                </div>
                <div class="reader-slide-nav" aria-label="Navigasi halaman bacaan">
                  <button type="button" class="page-btn" id="btn-text-prev" aria-label="Halaman sebelumnya">&lsaquo;</button>
                  <span class="page-indicator" id="text-page-info">Hal 1 / 1</span>
                  <button type="button" class="page-btn" id="btn-text-next" aria-label="Halaman berikutnya">&rsaquo;</button>
                </div>
                <div class="reader-font-group">
                  <button type="button" class="secondary-btn inline-action-btn" id="btn-reader-theme"><span>${readerPrefs.theme === 'dark' ? 'Tema Kertas' : 'Tema Gelap'}</span></button>
                  <button type="button" class="secondary-btn inline-action-btn" id="btn-reader-tts">${createIcon('volume')}<span>Dengar Teks</span></button>
                </div>
              </div>
              <article id="internal-text-paper" class="literary-reader-paper literary-slide-paper${readerPrefs.theme === 'dark' ? ' is-dark' : ''}" style="font-size: ${readerPrefs.fontSize}px;"></article>
              <div id="text-slide-dots" class="swipe-cue-bar mading-swipe-cue" hidden></div>
            </div>
          </div>
        </section>
      </div>
    `
  });

  if (!bodyEl) return;

  const setReaderStage = (viewName) => {
    for (const stage of bodyEl.querySelectorAll('[data-reader-stage]')) {
      stage.toggleAttribute('hidden', stage.getAttribute('data-reader-stage') !== viewName);
    }
    if (viewName === 'drive') {
      window.requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    }
  };

  readerController = createBookReaderController({
    bodyEl,
    book,
    gdrive,
    animateCover: !isDirectRead && hasCover,
    onStageChange: setReaderStage,
    onBlobUrlReady: (url) => {
      const btn = bodyEl.querySelector('#btn-detail-download-pdf');
      if (btn instanceof HTMLAnchorElement && url) {
        btn.href = url;
        btn.hidden = false;
        btn.removeAttribute('target');
      }
    }
  });

  const dialogEl = document.getElementById('app-modal');
  dialogEl?.classList.toggle('is-reading-mode', startSection === 'reader');

  const setActivePane = (paneName) => {
    const scopeEl = dialogEl || bodyEl;
    for (const btn of scopeEl.querySelectorAll('[data-modal-pane]')) {
      const active = btn.getAttribute('data-modal-pane') === paneName;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    }
    for (const pane of bodyEl.querySelectorAll('[data-pane]')) {
      const match = pane.getAttribute('data-pane') === paneName;
      pane.toggleAttribute('hidden', !match);
      pane.classList.toggle('is-active', match);
    }
    dialogEl?.classList.toggle('is-reading-mode', paneName === 'reader');
    if (paneName === 'reader') {
      readerController.activateReader();
      window.requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    }
  };

  for (const btn of (dialogEl || bodyEl).querySelectorAll('[data-modal-pane]')) {
    btn.addEventListener('click', () => { playSfx('click'); setActivePane(btn.getAttribute('data-modal-pane') || 'detail'); });
  }
  bodyEl.querySelector('#btn-switch-to-reader')?.addEventListener('click', () => { playSfx('pop'); setActivePane('reader'); });

  const paperEl = bodyEl.querySelector('#internal-text-paper');
  const slideReader = mountTextSlideReader({
    paperEl,
    prevBtn: bodyEl.querySelector('#btn-text-prev'),
    nextBtn: bodyEl.querySelector('#btn-text-next'),
    pageInfoEl: bodyEl.querySelector('#text-page-info'),
    dotsEl: bodyEl.querySelector('#text-slide-dots'),
    title: book.title || 'Novel',
    subtitle: textContent.isFullText ? 'Teks Lengkap (Offline)' : hasSynopsis ? 'Sinopsis Buku (Offline)' : book.category || 'Karya',
    rawText: textContent.rawContent
  });

  const fontLabel = bodyEl.querySelector('#reader-font-label');
  let currentFontSize = readerPrefs.fontSize;
  const applyFontSize = (nextSize) => {
    currentFontSize = Math.min(22, Math.max(14, nextSize));
    if (paperEl instanceof HTMLElement) paperEl.style.fontSize = `${currentFontSize}px`;
    if (fontLabel) fontLabel.textContent = `${currentFontSize}px`;
    SafeStorage.setItem(READER_FONT_KEY, currentFontSize);
  };
  bodyEl.querySelector('#btn-reader-font-dec')?.addEventListener('click', () => { playSfx('click'); applyFontSize(currentFontSize - 2); });
  bodyEl.querySelector('#btn-reader-font-inc')?.addEventListener('click', () => { playSfx('click'); applyFontSize(currentFontSize + 2); });

  const themeBtn = bodyEl.querySelector('#btn-reader-theme');
  themeBtn?.addEventListener('click', () => {
    playSfx('click');
    const isDark = paperEl?.classList.toggle('is-dark');
    SafeStorage.setItem(READER_THEME_KEY, isDark ? 'dark' : 'light');
    const span = themeBtn.querySelector('span');
    if (span) span.textContent = isDark ? 'Tema Kertas' : 'Tema Gelap';
  });

  bindSpeechToggleButton(
    bodyEl.querySelector('#btn-book-tts'),
    () => `${book.title}${hasAuthor ? `, karya ${book.author_name}` : ''}. ${extractPlainLiteraryText(book.synopsis || '')}`,
    'Dengar Sinopsis',
    'Hentikan Audio'
  );
  bindSpeechToggleButton(bodyEl.querySelector('#btn-reader-tts'), () => `${book.title}. ${slideReader.getCurrentPageText()}`, 'Dengar Teks', 'Hentikan Audio');

  const likeBtn = bodyEl.querySelector('#btn-modal-like');
  const likeLabel = bodyEl.querySelector('#modal-like-label');
  likeBtn?.addEventListener('click', async () => {
    try {
      const result = await incrementBookLike(book.id);
      playSfx(result.alreadyLiked ? 'click' : 'success');
      showToast(result.alreadyLiked ? 'Apresiasi untuk novel ini sudah tercatat di perangkat Anda.' : `Terima kasih! Apresiasi untuk "${book.title}" bertambah.`, result.alreadyLiked ? 'info' : 'success');
      likeBtn.classList.add('is-liked');
      likeBtn.setAttribute('aria-pressed', 'true');
      if (likeLabel) likeLabel.textContent = `Disukai (${result.likesCount})`;
      onLikesUpdated?.();
    } catch {
      playSfx('error');
      showToast('Gagal mencatat apresiasi buku saat ini.', 'error');
    }
  });

  if (startSection === 'reader') readerController.activateReader();
}
