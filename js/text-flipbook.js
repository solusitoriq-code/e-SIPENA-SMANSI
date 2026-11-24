/**
 * Pembaca Teks Mode Slide Halaman (Flipbook Ringan) — e-SIPENA SMAN 1 Sidayu
 * Memecah teks cerita menjadi halaman-halaman yang dapat digeser (swipe) atau ditekan tombolnya
 * dengan efek animasi geser/balik halaman tanpa bingkai buku buatan.
 */

import { playSfx } from './audio.js';
import { bindHorizontalSwipe } from './nav-controls.js';
import {
  escapeHtml,
  extractPlainLiteraryText,
  renderFormattedLiteraryHtml,
  renderSwipeCueHtml
} from './ui-utils.js';

function splitLongTextToParagraphBlocks(text, maxCharsPerPage) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const chunks = [];
  let chunk = '';
  for (const w of words) {
    if (chunk.length + w.length + 1 > maxCharsPerPage && chunk) {
      chunks.push({ html: `<p>${escapeHtml(chunk)}</p>`, text: chunk });
      chunk = w;
    } else {
      chunk = chunk ? `${chunk} ${w}` : w;
    }
  }
  if (chunk) chunks.push({ html: `<p>${escapeHtml(chunk)}</p>`, text: chunk });
  return chunks;
}

function extractFormattedBlocks(rawText) {
  const safeHtml = renderFormattedLiteraryHtml(rawText, 'Teks bacaan belum tersedia.');
  if (typeof DOMParser !== 'function') {
    const plain = extractPlainLiteraryText(safeHtml) || 'Teks bacaan belum tersedia.';
    return [{ html: `<p>${escapeHtml(plain)}</p>`, text: plain }];
  }
  const doc = new DOMParser().parseFromString(safeHtml, 'text/html');
  const children = [...doc.body.children];
  if (!children.length) {
    const plain = extractPlainLiteraryText(safeHtml) || 'Teks bacaan belum tersedia.';
    return [{ html: `<p>${escapeHtml(plain)}</p>`, text: plain }];
  }
  return children
    .map((el) => ({
      html: el.outerHTML,
      text: extractPlainLiteraryText(el.textContent || '')
    }))
    .filter((item) => item.text || item.html);
}

function paginateTextBlocks(rawText, maxCharsPerPage = 780) {
  const blocks = extractFormattedBlocks(rawText);
  if (!blocks.length) {
    return [[{ html: '<p>Teks bacaan belum tersedia.</p>', text: 'Teks bacaan belum tersedia.' }]];
  }

  const pages = [];
  let current = [];
  let charCount = 0;

  for (const block of blocks) {
    const len = block.text.length;
    if (len > maxCharsPerPage) {
      if (current.length) {
        pages.push(current);
        current = [];
        charCount = 0;
      }
      for (const chunkBlock of splitLongTextToParagraphBlocks(block.text, maxCharsPerPage)) {
        pages.push([chunkBlock]);
      }
      continue;
    }

    if (charCount + len > maxCharsPerPage && current.length) {
      pages.push(current);
      current = [block];
      charCount = len;
    } else {
      current.push(block);
      charCount += len;
    }
  }

  if (current.length) pages.push(current);
  return pages;
}

/**
 * Memasang pembaca teks berbasis slide halaman dengan dukungan swipe, tombol panah, dan titik halaman.
 * @param {{
 *   paperEl: HTMLElement | null,
 *   prevBtn: HTMLButtonElement | null,
 *   nextBtn: HTMLButtonElement | null,
 *   pageInfoEl: HTMLElement | null,
 *   dotsEl: HTMLElement | null,
 *   title: string,
 *   subtitle: string,
 *   rawText: string
 * }} opts
 */
export function mountTextSlideReader({
  paperEl,
  prevBtn,
  nextBtn,
  pageInfoEl,
  dotsEl,
  title,
  subtitle,
  rawText
}) {
  if (!paperEl) return { getCurrentPageText: () => extractPlainLiteraryText(rawText) };

  const pages = paginateTextBlocks(rawText);
  let page = 1;
  const totalPages = pages.length;

  const renderPage = (dir = 0) => {
    const slice = pages[page - 1] || [];
    const headerHtml =
      page === 1
        ? `<h4>${escapeHtml(title)} &mdash; ${escapeHtml(subtitle)}</h4>`
        : `<p class="slide-page-running-title">${escapeHtml(title)}</p>`;

    paperEl.classList.remove('is-slide-next', 'is-slide-prev');
    void paperEl.offsetWidth;
    if (dir > 0) paperEl.classList.add('is-slide-next');
    else if (dir < 0) paperEl.classList.add('is-slide-prev');

    paperEl.innerHTML = `${headerHtml}${slice.map((b) => b.html).join('')}`;
    paperEl.scrollTop = 0;

    if (pageInfoEl) pageInfoEl.textContent = `Hal ${page} / ${totalPages}`;
    if (prevBtn) prevBtn.disabled = page <= 1;
    if (nextBtn) nextBtn.disabled = page >= totalPages;
    if (dotsEl) {
      dotsEl.hidden = totalPages <= 1;
      dotsEl.innerHTML = totalPages > 1 ? renderSwipeCueHtml(page, totalPages, 'Geser halaman') : '';
    }
  };

  const goTo = (nextPage) => {
    const bounded = Math.min(Math.max(1, nextPage), totalPages);
    if (bounded === page) return;
    const dir = bounded > page ? 1 : -1;
    page = bounded;
    playSfx('click');
    renderPage(dir);
  };

  prevBtn?.addEventListener('click', () => goTo(page - 1));
  nextBtn?.addEventListener('click', () => goTo(page + 1));
  dotsEl?.addEventListener('click', (event) => {
    const btn = event.target instanceof HTMLElement ? event.target.closest('[data-swipe-page]') : null;
    if (btn instanceof HTMLButtonElement && !btn.disabled) {
      goTo(Number(btn.dataset.swipePage || 1));
    }
  });

  bindHorizontalSwipe(paperEl, {
    isEnabled: () => totalPages > 1 && !paperEl.closest('[hidden]'),
    onNext: () => goTo(page + 1),
    onPrev: () => goTo(page - 1)
  });

  renderPage(0);

  return {
    getCurrentPageText: () => (pages[page - 1] || []).map((b) => b.text).join(' ')
  };
}
