/**
 * Modal Detail & Pembaca Buku (Fitur 2) — e-SIPENA SMAN 1 Sidayu
 * Menampilkan animasi 3D membuka sampul buku, cache PDF otomatis ke IndexedDB untuk baca offline,
 * Mode Baca Teks cadangan, audio Bahasa Indonesia, dan apresiasi Suka.
 */

import { playSfx, stopSpeech } from './audio.js';
import {
  bindTextReaderControls,
  createBookReaderController,
  getReaderPrefs,
  renderTextReaderToolbarHtml
} from './book-reader-ui.js';
import { hasLikedBook, incrementBookLike } from './data-service.js';
import { mountTextSlideReader } from './text-flipbook.js';
import {
  bindSpeechToggleButton,
  createIcon,
  escapeHtml,
  extractPlainLiteraryText,
  openModal,
  renderFormattedLiteraryHtml,
  resolveGDriveLinks,
  showToast
} from './ui-utils.js';

const FALLBACK_COVER = 'assets/images/logo-smansi.webp';
const DIRECT_READ_CATEGORIES = new Set(['cerpen', 'puisi']);

function getTextReaderContent(book) {
  const fullText = String(book.body_text || book.full_text || '').trim();
  const rawContent = fullText || String(book.synopsis || 'Teks bacaan belum tersedia.').trim();
  return { isFullText: Boolean(fullText), rawContent };
}

function buildEditorialMetaHtml(book, hasAuthor) {
  const rawCode = String(book.qrcbn_code || '').trim();
  const compactCode = rawCode.replaceAll('-', '');
  const codePrefix = /^(978|979)\d{10}$/.test(compactCode) || /^\d{9}[\dX]$/i.test(compactCode) ? 'ISBN' : 'ISBN/QRCBN';
  const roleLabel = hasAuthor && book.author_role
    ? (book.author_class ? `${book.author_role} (${book.author_class})` : book.author_role)
    : '';
  const items = [
    book.category || 'Novel',
    roleLabel,
    `Tahun ${book.publication_year || 2026}`,
    rawCode ? `${codePrefix}: ${rawCode}` : ''
  ].filter(Boolean);

  return `<div class="book-editorial-meta">${items
    .map((item) => `<span>${escapeHtml(item)}</span>`)
    .join('<span class="meta-sep" aria-hidden="true">&middot;</span>')}</div>`;
}

/**
 * Membuka Modal Detail & Baca Buku untuk satu karya novel atau buku katalog.
 * @param {Record<string, any>} book
 * @param {{ initialMode?: 'detail' | 'read', onLikesUpdated?: () => void }} [options]
 */
export function openBookModal(book, { initialMode = 'detail', onLikesUpdated } = {}) {
  if (!book) return;

  const gdrive = resolveGDriveLinks(book);
  const hasCover = Boolean(String(book.cover_url || '').trim());
  const hasAuthor = Boolean(String(book.author_name || '').trim());
  const liked = hasLikedBook(book.id);
  const readerPrefs = getReaderPrefs();
  const textContent = getTextReaderContent(book);
  const hasSynopsis = Boolean(extractPlainLiteraryText(book.synopsis || ''));

  const canTryPdf = gdrive.hasDriveFile;
  const isDirectRead = DIRECT_READ_CATEGORIES.has(String(book.category || '').trim().toLowerCase());
  const startSection = isDirectRead || initialMode === 'read' ? 'reader' : 'detail';
  const defaultStage = canTryPdf ? 'drive' : 'text';

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
              ${buildEditorialMetaHtml(book, hasAuthor)}
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
              </div>
            </div>
          </div>
        </section>
      `;

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
              ${renderTextReaderToolbarHtml({
                fontSize: readerPrefs.fontSize,
                theme: readerPrefs.theme,
                showSlideNav: true,
                ttsId: 'btn-reader-tts',
                ttsLabel: 'Dengar Teks'
              })}
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
    onStageChange: setReaderStage
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

  bindTextReaderControls(bodyEl);

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
