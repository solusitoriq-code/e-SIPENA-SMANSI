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
export { renderCeritaGresikPanel } from './cerita-gresik-views.js';
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
 * Memperbarui jumlah buku per tombol filter peran Novel.
 * @param {{ books?: any[] }} snapshot
 */
export function updateHeroKpis(snapshot = {}) {
  const books = Array.isArray(snapshot.books) ? snapshot.books : [];
  const buckets = partitionAntologiBooks(books);
  const novelBooks = buckets.Novel;

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

function renderNovelCardHtml(book) {
  const liked = hasLikedBook(book.id);
  const safeId = escapeHtml(book.id);
  const safeTitle = escapeHtml(book.title);
  const safeAuthor = escapeHtml(book.author_name);
  const roleLabel = book.author_class
    ? `${book.author_role} · ${book.author_class}`
    : (book.author_role || '');
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
          ${roleLabel ? `<span class="${getRoleBadgeClass(book.author_role)}">${escapeHtml(roleLabel)}</span>` : ''}
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
}

function renderEditorialCardHtml(book, category) {
  const liked = hasLikedBook(book.id);
  const safeId = escapeHtml(book.id);
  const safeTitle = escapeHtml(book.title);
  const likesCount = Number(book.likes_count || 0);
  const gdrive = resolveGDriveLinks(book);

  return `
    <article class="editorial-book-card" data-book-id="${safeId}" data-nav-card="true">
      <div class="editorial-card-body" data-action="open-read" data-book-id="${safeId}">
        <div class="editorial-card-meta">
          <span class="editorial-year-pill">${escapeHtml(book.publication_year || 2026)}</span>
          ${gdrive.hasDriveFile ? '<span class="editorial-pdf-pill">PDF</span>' : ''}
        </div>
        <h3 class="editorial-card-title" title="${safeTitle}">${safeTitle}</h3>
        <p class="editorial-card-sub">Antologi ${escapeHtml(category)} SMAN 1 Sidayu</p>
      </div>
      <div class="editorial-card-actions">
        <button type="button" class="like-pill-btn${liked ? ' is-liked' : ''}" data-action="quick-like" data-book-id="${safeId}" aria-pressed="${liked ? 'true' : 'false'}" aria-label="Sukai ${escapeHtml(category)} ${safeTitle}, saat ini ${likesCount} suka">
          ${createIcon('heart')}<span class="like-count-value">${likesCount}</span>
        </button>
        <button type="button" class="primary-btn card-btn" data-action="open-read" data-book-id="${safeId}">Baca</button>
      </div>
    </article>
  `;
}

function renderShelfSection(opts) {
  const {
    sectionEl, books = [], category = 'Novel', roleFilter = 'all', searchQuery = '',
    page = 1, pageSize = 4, onOpenBook, onQuickLike, onResetFilter, onSelectPage
  } = opts;

  const isNovel = category === 'Novel';
  const hasSearch = Boolean(String(searchQuery || '').trim());
  const filtered = filterBooksList(books, isNovel ? roleFilter : 'all', searchQuery);
  const hideEmptySection = !isNovel && filtered.length === 0 && !hasSearch;
  if (sectionEl instanceof HTMLElement) sectionEl.hidden = hideEmptySection;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const slice = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const q = (sel) => sectionEl?.querySelector(sel) || null;
  const countEl = q('[data-shelf-count]');
  const toolbarEl = q('[data-shelf-toolbar]');
  const pageSizeBtn = q('[data-shelf-pagesize]');
  const pageInfoEl = q('[data-shelf-page-info]');
  const prevBtn = q('[data-shelf-prev]');
  const nextBtn = q('[data-shelf-next]');
  const shelfPrevBtn = q('[data-shelf-edge-prev]');
  const shelfNextBtn = q('[data-shelf-edge-next]');
  const swipeCueEl = q('[data-shelf-swipe-cue]');
  const gridEl = q('[data-shelf-grid]');

  if (countEl) countEl.textContent = `${filtered.length} Karya`;
  if (hideEmptySection) {
    if (gridEl) gridEl.innerHTML = '';
    if (swipeCueEl instanceof HTMLElement) swipeCueEl.hidden = true;
    return { page: 1, totalPages: 1, totalItems: 0, isHidden: true };
  }

  const showPager = totalPages > 1;
  if (toolbarEl instanceof HTMLElement) toolbarEl.hidden = filtered.length <= 4;
  if (pageSizeBtn) {
    pageSizeBtn.textContent = `${pageSize} / Hal`;
    pageSizeBtn.setAttribute('aria-pressed', pageSize >= 8 ? 'true' : 'false');
  }
  if (pageInfoEl) pageInfoEl.textContent = `Hal ${safePage} / ${totalPages}`;
  if (prevBtn instanceof HTMLButtonElement) prevBtn.disabled = safePage <= 1;
  if (nextBtn instanceof HTMLButtonElement) nextBtn.disabled = safePage >= totalPages;
  if (shelfPrevBtn instanceof HTMLButtonElement) {
    shelfPrevBtn.disabled = safePage <= 1;
    shelfPrevBtn.hidden = !showPager;
  }
  if (shelfNextBtn instanceof HTMLButtonElement) {
    shelfNextBtn.disabled = safePage >= totalPages;
    shelfNextBtn.hidden = !showPager;
  }

  if (swipeCueEl instanceof HTMLElement) {
    if (showPager) {
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
    const hasFilter = hasSearch || (isNovel && roleFilter !== 'all');
    gridEl.innerHTML = isNovel
      ? `<article class="empty-stage-note"><h2>Buku Tidak Ditemukan</h2><p>Tidak ada novel yang cocok dengan pencarian atau filter peran saat ini.</p><div style="margin-top: 10px;"><button type="button" class="primary-btn" data-reset-shelf="1">Tampilkan Semua Novel</button></div></article>`
      : `<article class="editorial-empty-card"><p>${hasFilter ? `Tidak ada karya ${escapeHtml(category)} yang cocok dengan pencarian saat ini.` : `Belum ada koleksi ${escapeHtml(category)} yang dipublikasikan.`}</p>${hasFilter ? '<button type="button" class="secondary-btn" data-reset-shelf="1">Tampilkan Semua</button>' : ''}</article>`;
    gridEl.querySelector('[data-reset-shelf]')?.addEventListener('click', () => {
      playSfx('click');
      onResetFilter?.();
    });
    return { page: safePage, totalPages, totalItems: 0 };
  }

  gridEl.innerHTML = slice
    .map((book) => (isNovel ? renderNovelCardHtml(book) : renderEditorialCardHtml(book, category)))
    .join('');

  bindBookCardActions(gridEl, books, { onOpenBook, onQuickLike });
  return { page: safePage, totalPages, totalItems: filtered.length };
}

function bindJumpBar(jumpBarEl) {
  if (!jumpBarEl || jumpBarEl.dataset.jumpBound === '1') return;
  jumpBarEl.dataset.jumpBound = '1';
  jumpBarEl.addEventListener('click', (event) => {
    const btn = event.target instanceof HTMLElement ? event.target.closest('[data-antologi-jump]') : null;
    if (!(btn instanceof HTMLButtonElement) || btn.disabled) return;
    const secEl = document.getElementById(`sec-antologi-${btn.dataset.antologiJump || 'novel'}`);
    if (!secEl || secEl.hidden) return;
    playSfx('click');
    for (const chip of jumpBarEl.querySelectorAll('[data-antologi-jump]')) {
      chip.classList.toggle('is-active', chip === btn);
    }
    secEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

/**
 * Merender ketiga section Etalase Antologi (Novel, Cerpen, Puisi) dengan paginasi & swipe seragam.
 */
export function renderAntologiSections({
  books = [], roleFilter = 'all', searchQuery = '', shelfState = {},
  jumpBarEl, onSelectPage, onOpenBook, onQuickLike, onResetFilter
}) {
  const buckets = partitionAntologiBooks(books);
  const sections = [['novel', 'Novel'], ['cerpen', 'Cerpen'], ['puisi', 'Puisi']];
  const results = {};

  for (const [key, category] of sections) {
    const state = shelfState[key] || { page: 1, pageSize: 4 };
    results[key] = renderShelfSection({
      sectionEl: document.querySelector(`[data-shelf-section="${key}"]`),
      books: buckets[category],
      category,
      roleFilter,
      searchQuery,
      page: state.page,
      pageSize: state.pageSize,
      onSelectPage: (targetPage) => onSelectPage?.(key, targetPage),
      onOpenBook,
      onQuickLike,
      onResetFilter
    });
  }

  if (jumpBarEl) {
    bindJumpBar(jumpBarEl);
    let activeHidden = false;
    for (const chip of jumpBarEl.querySelectorAll('[data-antologi-jump]')) {
      const key = chip.getAttribute('data-antologi-jump') || '';
      const info = results[key];
      if (key && info !== undefined) {
        chip.textContent = `${key.charAt(0).toUpperCase()}${key.slice(1)} (${info.totalItems})`;
        const isDisabled = Boolean(info.isHidden);
        if (chip instanceof HTMLButtonElement) chip.disabled = isDisabled;
        chip.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');
        if (isDisabled && chip.classList.contains('is-active')) {
          chip.classList.remove('is-active');
          activeHidden = true;
        }
      }
    }
    if (activeHidden) jumpBarEl.querySelector('[data-antologi-jump="novel"]')?.classList.add('is-active');
  }

  const summaryEl = document.getElementById('antologi-empty-summary');
  if (summaryEl) {
    const hiddenNames = sections.filter(([key]) => results[key]?.isHidden).map(([, label]) => label);
    summaryEl.hidden = hiddenNames.length === 0;
    summaryEl.textContent = hiddenNames.length
      ? `Koleksi ${hiddenNames.join(' dan ')} belum memiliki karya terbit.`
      : '';
  }

  return results;
}
