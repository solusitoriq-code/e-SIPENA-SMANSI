/**
 * Modul Tampilan Publik Utama (Fitur 1) — e-SIPENA SMAN 1 Sidayu
 * Menangani KPI Hero, Etalase Rak 12 Novel 2026, pencarian, filter peran, dan paginasi,
 * serta mengekspor kembali modul detail buku dan fitur komunitas publik.
 */

import { playSfx } from './audio.js';
import { hasLikedBook } from './data-service.js';
import { createIcon, escapeHtml, getRoleBadgeClass, renderSwipeCueHtml } from './ui-utils.js';

export { openBookModal } from './book-modal.js';
export { renderLibrarianPanel, renderMadingPanel, renderModels3dPanel } from './community-views.js';

/**
 * Memperbarui angka KPI pada Hero Banner dan jumlah buku per tombol filter peran.
 * @param {{ books?: any[], models3d?: any[], siteSettings?: Record<string, any> }} snapshot
 */
export function updateHeroKpis(snapshot = {}) {
  const books = Array.isArray(snapshot.books) ? snapshot.books : [];
  const models3d = Array.isArray(snapshot.models3d) ? snapshot.models3d : [];
  const kpi = snapshot.siteSettings?.kpi_stats || {};

  const novelsEl = document.getElementById('kpi-novels-2026');
  const books2025El = document.getElementById('kpi-books-2025');
  const models3dEl = document.getElementById('kpi-models-3d');

  if (novelsEl) novelsEl.textContent = String(books.length);
  if (books2025El) books2025El.textContent = String(kpi.books_2025_count ?? 23);
  if (models3dEl) models3dEl.textContent = String(models3d.length);

  const countRole = (role) =>
    books.filter((b) => String(b.author_role || '').toLowerCase() === role.toLowerCase()).length;

  for (const btn of document.querySelectorAll('#panel-rak [data-role-filter]')) {
    const role = btn.getAttribute('data-role-filter') || 'all';
    const count = countRole(role);
    btn.textContent = role === 'all' ? `Semua (${books.length})` : `${role} (${count})`;
    if (role === 'Tendik' || role === 'Kepala Sekolah') {
      btn.toggleAttribute('hidden', count === 0);
    }
  }
}

/**
 * Menyaring daftar buku berdasarkan peran penulis dan kata kunci pencarian.
 * @param {any[]} books
 * @param {string} [roleFilter]
 * @param {string} [searchQuery]
 * @returns {any[]}
 */
export function filterBooksList(books, roleFilter = 'all', searchQuery = '') {
  const q = String(searchQuery || '').trim().toLowerCase();
  return books.filter((book) => {
    const roleMatches =
      roleFilter === 'all' ||
      String(book.author_role || '').toLowerCase() === String(roleFilter).toLowerCase();
    if (!roleMatches) return false;
    if (!q) return true;

    return [book.title, book.author_name, book.author_role, book.author_class, book.synopsis]
      .join(' ')
      .toLowerCase()
      .includes(q);
  });
}

/**
 * Merender grid 4 kolom etalase buku berpaginasi di #books-grid.
 * @param {{
 *   gridEl: HTMLElement | null,
 *   pageInfoEl: HTMLElement | null,
 *   prevBtn: HTMLButtonElement | null,
 *   nextBtn: HTMLButtonElement | null,
 *   books: any[],
 *   roleFilter: string,
 *   searchQuery: string,
 *   page: number,
 *   pageSize: number,
 *   onOpenBook: (book: any, mode: 'detail' | 'read') => void,
 *   onQuickLike: (book: any) => Promise<void>,
 *   onResetFilter: () => void
 * }} opts
 * @returns {{ page: number, totalPages: number, totalItems: number }}
 */
export function renderBooksShelf(opts) {
  const {
    gridEl, pageInfoEl, prevBtn, nextBtn, shelfPrevBtn, shelfNextBtn, swipeCueEl,
    books = [], roleFilter = 'all', searchQuery = '', page = 1, pageSize = 4,
    onOpenBook, onQuickLike, onResetFilter, onSelectPage
  } = opts;

  const filtered = filterBooksList(books, roleFilter, searchQuery);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const slice = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  if (pageInfoEl) pageInfoEl.textContent = `Hal ${safePage} / ${totalPages}`;
  if (prevBtn) prevBtn.disabled = safePage <= 1;
  if (nextBtn) nextBtn.disabled = safePage >= totalPages;
  if (shelfPrevBtn) {
    shelfPrevBtn.disabled = safePage <= 1;
    shelfPrevBtn.hidden = totalPages <= 1;
  }
  if (shelfNextBtn) {
    shelfNextBtn.disabled = safePage >= totalPages;
    shelfNextBtn.hidden = totalPages <= 1;
  }

  if (swipeCueEl) {
    if (totalPages > 1) {
      swipeCueEl.hidden = false;
      swipeCueEl.innerHTML = renderSwipeCueHtml(safePage, totalPages, 'Geser atau klik panah');
      swipeCueEl.onclick = (event) => {
        const dot = event.target instanceof HTMLElement ? event.target.closest('[data-swipe-page]') : null;
        if (dot instanceof HTMLButtonElement && !dot.disabled) {
          const targetPage = Number(dot.dataset.swipePage || 1);
          if (targetPage !== safePage) {
            playSfx('click');
            onSelectPage?.(targetPage);
          }
        }
      };
    } else {
      swipeCueEl.hidden = true;
      swipeCueEl.innerHTML = '';
    }
  }

  if (!gridEl) return { page: safePage, totalPages, totalItems: filtered.length };

  gridEl.classList.toggle('is-eight-grid', pageSize >= 8 && slice.length > 4);

  if (!slice.length) {
    gridEl.innerHTML = `
      <article class="empty-stage-note">
        <h2>Buku Tidak Ditemukan</h2>
        <p>Tidak ada novel yang cocok dengan pencarian atau filter peran saat ini.</p>
        <div style="margin-top: 10px;">
          <button type="button" class="primary-btn" id="btn-reset-book-filter">Tampilkan Semua Novel</button>
        </div>
      </article>
    `;
    gridEl.querySelector('#btn-reset-book-filter')?.addEventListener('click', () => {
      playSfx('click');
      onResetFilter?.();
    });
    return { page: safePage, totalPages, totalItems: 0 };
  }

  gridEl.innerHTML = slice
    .map((book) => {
      const liked = hasLikedBook(book.id);
      const safeId = escapeHtml(book.id);
      const safeTitle = escapeHtml(book.title);
      const safeAuthor = escapeHtml(book.author_name);
      const safeClass = escapeHtml(book.author_class || book.publication_year || '');
      const likesCount = Number(book.likes_count || 0);

      return `
        <article class="book-card" data-book-id="${safeId}" data-nav-card="true">
          <div class="book-cover-stage" data-action="open-detail" data-book-id="${safeId}">
            <div class="book-cover-3d">
              <img src="${escapeHtml(book.cover_url || 'assets/images/logo-smansi.webp')}" alt="Sampul novel ${safeTitle}" draggable="false" loading="lazy" decoding="async" width="296" height="420" onerror="this.onerror=null;this.src='assets/images/logo-smansi.webp'">
            </div>
            <span class="book-year-tag">${escapeHtml(book.publication_year || 2026)}</span>
          </div>
          <div class="book-card-body">
            <div class="book-meta-row">
              <span class="${getRoleBadgeClass(book.author_role)}">${escapeHtml(book.author_role)}</span>
              ${safeClass ? `<span class="book-class-tag">${safeClass}</span>` : ''}
            </div>
            <h3 class="book-card-title" title="${safeTitle}">${safeTitle}</h3>
            <p class="book-card-author" title="${safeAuthor}">${safeAuthor}</p>
            <div class="book-card-actions">
              <button type="button" class="like-pill-btn${liked ? ' is-liked' : ''}" data-action="quick-like" data-book-id="${safeId}" aria-pressed="${liked ? 'true' : 'false'}" aria-label="Sukai buku ${safeTitle}, saat ini ${likesCount} suka">
                ${createIcon('heart')}<span class="like-count-value">${likesCount}</span>
              </button>
              <button type="button" class="secondary-btn card-btn" data-action="open-detail" data-book-id="${safeId}">Detail</button>
              <button type="button" class="primary-btn card-btn" data-action="open-read" data-book-id="${safeId}">Baca</button>
            </div>
          </div>
        </article>
      `;
    })
    .join('');

  gridEl.onclick = async (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;

    const likeBtn = target.closest('[data-action="quick-like"]');
    if (likeBtn instanceof HTMLElement) {
      const book = books.find((b) => String(b.id) === likeBtn.dataset.bookId);
      if (book) await onQuickLike?.(book);
      return;
    }

    const readBtn = target.closest('[data-action="open-read"]');
    if (readBtn instanceof HTMLElement) {
      const book = books.find((b) => String(b.id) === readBtn.dataset.bookId);
      if (book) {
        playSfx('pop');
        onOpenBook?.(book, 'read');
      }
      return;
    }

    const detailEl = target.closest('[data-action="open-detail"]');
    if (detailEl instanceof HTMLElement) {
      const book = books.find((b) => String(b.id) === detailEl.dataset.bookId);
      if (book) {
        playSfx('pop');
        onOpenBook?.(book, 'detail');
      }
    }
  };

  return { page: safePage, totalPages, totalItems: filtered.length };
}
