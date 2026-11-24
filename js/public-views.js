/**
 * Modul Tampilan Publik Utama (Fitur 1) — e-SIPENA SMAN 1 Sidayu
 * Menangani KPI Hero, Etalase Rak 12 Novel 2026, pencarian, filter peran, dan paginasi,
 * serta mengekspor kembali modul detail buku dan fitur komunitas publik.
 */

import { playSfx } from './audio.js';
import { BOOK_CATEGORIES, hasLikedBook } from './data-service.js';
import {
  createIcon,
  escapeHtml,
  extractPlainLiteraryText,
  getRoleBadgeClass,
  renderSwipeCueHtml,
  resolveGDriveLinks
} from './ui-utils.js';

export { openBookModal } from './book-modal.js';
export { renderLibrarianPanel, renderMadingPanel, renderModels3dPanel } from './community-views.js';

export function partitionAntologiBooks(books = []) {
  const buckets = Object.fromEntries(BOOK_CATEGORIES.map((cat) => [cat, []]));
  const lookup = new Map(BOOK_CATEGORIES.map((cat) => [cat.toLowerCase(), cat]));
  for (const book of books) {
    const raw = String(book?.category || 'Novel').trim();
    const target = (raw && lookup.get(raw.toLowerCase())) || 'Novel';
    buckets[target].push(book);
  }
  return buckets;
}

/**
 * Memperbarui angka KPI pada Hero Banner dan jumlah buku per tombol filter peran Novel.
 * @param {{ books?: any[], models3d?: any[], siteSettings?: Record<string, any> }} snapshot
 */
export function updateHeroKpis(snapshot = {}) {
  const books = Array.isArray(snapshot.books) ? snapshot.books : [];
  const models3d = Array.isArray(snapshot.models3d) ? snapshot.models3d : [];
  const kpi = snapshot.siteSettings?.kpi_stats || {};
  const buckets = partitionAntologiBooks(books);
  const novelBooks = buckets.Novel;

  const novelsEl = document.getElementById('kpi-novels-2026');
  const books2025El = document.getElementById('kpi-books-2025');
  const models3dEl = document.getElementById('kpi-models-3d');

  if (novelsEl) novelsEl.textContent = String(books.length);
  if (books2025El) books2025El.textContent = String(kpi.books_2025_count ?? 23);
  if (models3dEl) models3dEl.textContent = String(models3d.length);

  const countRole = (role) =>
    novelBooks.filter((b) => String(b.author_role || '').toLowerCase() === role.toLowerCase()).length;

  for (const btn of document.querySelectorAll('#panel-rak [data-role-filter]')) {
    const role = btn.getAttribute('data-role-filter') || 'all';
    const count = countRole(role);
    btn.textContent = role === 'all' ? `Semua (${novelBooks.length})` : `${role} (${count})`;
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

    return [
      book.title,
      book.category,
      book.author_name,
      book.author_role,
      book.author_class,
      book.publication_year,
      book.qrcbn_code,
      extractPlainLiteraryText(book.synopsis || '')
    ]
      .join(' ')
      .toLowerCase()
      .includes(q);
  });
}

function bindBookCardActions(containerEl, books, { onOpenBook, onQuickLike }) {
  if (!containerEl) return;
  containerEl.onclick = async (event) => {
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

  bindBookCardActions(gridEl, books, { onOpenBook, onQuickLike });

  return { page: safePage, totalPages, totalItems: filtered.length };
}

function renderEditorialCategoryGrid({
  gridEl,
  countBadgeEl,
  books = [],
  category,
  searchQuery = '',
  onOpenBook,
  onQuickLike,
  onResetFilter
}) {
  const filtered = filterBooksList(books, 'all', searchQuery);
  if (countBadgeEl) countBadgeEl.textContent = `${filtered.length} Karya`;
  if (!gridEl) return { totalItems: filtered.length };

  if (!filtered.length) {
    const hasSearch = Boolean(String(searchQuery || '').trim());
    gridEl.innerHTML = `
      <article class="editorial-empty-card">
        <p>${
          hasSearch
            ? `Tidak ada karya ${escapeHtml(category)} yang cocok dengan pencarian saat ini.`
            : `Belum ada koleksi ${escapeHtml(category)} yang dipublikasikan.`
        }</p>
        ${hasSearch ? `<button type="button" class="secondary-btn" data-reset-editorial="1">Tampilkan Semua</button>` : ''}
      </article>
    `;
    gridEl.querySelector('[data-reset-editorial]')?.addEventListener('click', () => {
      playSfx('click');
      onResetFilter?.();
    });
    return { totalItems: 0 };
  }

  gridEl.innerHTML = filtered
    .map((book) => {
      const liked = hasLikedBook(book.id);
      const safeId = escapeHtml(book.id);
      const safeTitle = escapeHtml(book.title);
      const likesCount = Number(book.likes_count || 0);
      const gdrive = resolveGDriveLinks(book);
      return `
        <article class="editorial-book-card" data-book-id="${safeId}" data-nav-card="true">
          <div class="editorial-card-meta">
            <span class="editorial-cat-pill">${escapeHtml(category)}</span>
            <span class="editorial-year-pill">${escapeHtml(book.publication_year || 2026)}</span>
            ${gdrive.hasDriveFile ? '<span class="editorial-pdf-pill">PDF Siap</span>' : ''}
          </div>
          <h3 class="editorial-card-title" title="${safeTitle}">${safeTitle}</h3>
          <p class="editorial-card-sub">Antologi ${escapeHtml(category)} SMAN 1 Sidayu</p>
          <div class="editorial-card-actions">
            <button type="button" class="like-pill-btn${liked ? ' is-liked' : ''}" data-action="quick-like" data-book-id="${safeId}" aria-pressed="${liked ? 'true' : 'false'}" aria-label="Sukai ${escapeHtml(category)} ${safeTitle}, saat ini ${likesCount} suka">
              ${createIcon('heart')}<span class="like-count-value">${likesCount}</span>
            </button>
            <button type="button" class="secondary-btn card-btn" data-action="open-detail" data-book-id="${safeId}">Detail</button>
            <button type="button" class="primary-btn card-btn" data-action="open-read" data-book-id="${safeId}">Baca</button>
          </div>
        </article>
      `;
    })
    .join('');

  bindBookCardActions(gridEl, books, { onOpenBook, onQuickLike });
  return { totalItems: filtered.length };
}

function bindJumpBar(jumpBarEl) {
  if (!jumpBarEl || jumpBarEl.dataset.jumpBound === '1') return;
  jumpBarEl.dataset.jumpBound = '1';
  jumpBarEl.addEventListener('click', (event) => {
    const btn = event.target instanceof HTMLElement ? event.target.closest('[data-antologi-jump]') : null;
    if (!(btn instanceof HTMLElement)) return;
    const targetSlug = btn.dataset.antologiJump || 'novel';
    const secEl = document.getElementById(`sec-antologi-${targetSlug}`);
    if (!secEl) return;
    playSfx('click');
    for (const chip of jumpBarEl.querySelectorAll('[data-antologi-jump]')) {
      chip.classList.toggle('is-active', chip === btn);
    }
    secEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

/**
 * Merender ketiga section Etalase Antologi: Novel, Cerpen, dan Puisi.
 */
export function renderAntologiSections(opts) {
  const {
    books = [],
    searchQuery = '',
    jumpBarEl,
    novelCountEl,
    cerpenGridEl,
    cerpenCountEl,
    puisiGridEl,
    puisiCountEl
  } = opts;
  const buckets = partitionAntologiBooks(books);

  const novelRes = renderBooksShelf({ ...opts, books: buckets.Novel });
  if (novelCountEl) novelCountEl.textContent = `${novelRes.totalItems} Karya`;

  const cerpenRes = renderEditorialCategoryGrid({
    gridEl: cerpenGridEl,
    countBadgeEl: cerpenCountEl,
    books: buckets.Cerpen,
    category: 'Cerpen',
    searchQuery,
    onOpenBook: opts.onOpenBook,
    onQuickLike: opts.onQuickLike,
    onResetFilter: opts.onResetFilter
  });

  const puisiRes = renderEditorialCategoryGrid({
    gridEl: puisiGridEl,
    countBadgeEl: puisiCountEl,
    books: buckets.Puisi,
    category: 'Puisi',
    searchQuery,
    onOpenBook: opts.onOpenBook,
    onQuickLike: opts.onQuickLike,
    onResetFilter: opts.onResetFilter
  });

  if (jumpBarEl) {
    bindJumpBar(jumpBarEl);
    const counts = {
      novel: novelRes.totalItems,
      cerpen: cerpenRes.totalItems,
      puisi: puisiRes.totalItems
    };
    for (const chip of jumpBarEl.querySelectorAll('[data-antologi-jump]')) {
      const key = chip.getAttribute('data-antologi-jump') || '';
      const label = key ? `${key.charAt(0).toUpperCase()}${key.slice(1)}` : '';
      if (label && counts[key] !== undefined) chip.textContent = `${label} (${counts[key]})`;
    }
  }

  return novelRes;
}
