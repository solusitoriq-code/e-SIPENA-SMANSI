/**
 * Pembaca Teks Mode Slide Halaman (Flipbook Ringan) — e-SIPENA SMAN 1 Sidayu
 * Memecah teks cerita menjadi halaman-halaman yang dapat digeser (swipe) atau ditekan tombolnya
 * dengan efek animasi geser/balik halaman tanpa bingkai buku buatan.
 */

import { playSfx } from './audio.js';
import { bindHorizontalSwipe } from './nav-controls.js';
import { escapeHtml, renderSwipeCueHtml } from './ui-utils.js';

function paginateTextBlocks(rawText, maxCharsPerPage = 780) {
  const paragraphs = String(rawText || '')
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (!paragraphs.length) return [['Teks bacaan belum tersedia.']];

  const pages = [];
  let current = [];
  let charCount = 0;

  for (const para of paragraphs) {
    if (para.length > maxCharsPerPage) {
      if (current.length) {
        pages.push(current);
        current = [];
        charCount = 0;
      }
      const words = para.split(/\s+/);
      let chunk = '';
      for (const w of words) {
        if (chunk.length + w.length + 1 > maxCharsPerPage && chunk) {
          pages.push([chunk]);
          chunk = w;
        } else {
          chunk = chunk ? `${chunk} ${w}` : w;
        }
      }
      if (chunk) pages.push([chunk]);
      continue;
    }

    if (charCount + para.length > maxCharsPerPage && current.length) {
      pages.push(current);
      current = [para];
      charCount = para.length;
    } else {
      current.push(para);
      charCount += para.length;
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
  if (!paperEl) return { getCurrentPageText: () => rawText };

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

    paperEl.innerHTML = `${headerHtml}${slice.map((p) => `<p>${escapeHtml(p)}</p>`).join('')}`;
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
    getCurrentPageText: () => (pages[page - 1] || []).join(' ')
  };
}
