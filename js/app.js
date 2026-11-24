/**
 * Pengendali Utama Aplikasi — Portal Literasi Digital e-SIPENA SMAN 1 Sidayu
 * Mengorkestrasi pemuatan data, pergantian tab, filter katalog, dan deep-link QR buku.
 */

import { APP_CONFIG } from './config.js';
import { playSfx, stopSpeech } from './audio.js';
import { incrementBookLike, loadPortalData } from './data-service.js';
import { bindHorizontalSwipe, bindKeyboardAndModalControls, bindTopHudAndDrawer, updateAudioButtonUi } from './nav-controls.js';
import {
  openBookModal, renderAntologiSections, renderLibrarianPanel,
  renderMadingPanel, renderModels3dPanel, updateHeroKpis
} from './public-views.js';
import { renderSubmissionPanel } from './submission-views.js';
import { renderAdminPanel } from './admin-views.js';
import { closeModal, showToast } from './ui-utils.js';

const VALID_TABS = new Set(['rak', 'pameran-3d', 'mading', 'pustakawan', 'kirim', 'kelola']);

const appState = {
  activeTab: 'rak',
  bookRoleFilter: 'all',
  bookSearch: '',
  bookPage: 1,
  bookPageSize: APP_CONFIG.BOOK_PAGE_SIZE,
  madingRoleFilter: 'all',
  madingPage: 1,
  snapshot: {
    source: 'local',
    books: [],
    models3d: [],
    librarianActivities: [],
    madingWorks: [],
    siteSettings: {}
  }
};

function triggerSwipeAnim(el, dir) {
  if (!el) return;
  el.classList.remove('is-swipe-next', 'is-swipe-prev');
  void el.offsetWidth;
  el.classList.add(dir > 0 ? 'is-swipe-next' : 'is-swipe-prev');
  window.setTimeout(() => el.classList.remove('is-swipe-next', 'is-swipe-prev'), 240);
}

function renderBooksSection() {
  const gridEl = document.getElementById('books-grid');
  const result = renderAntologiSections({
    gridEl,
    cerpenGridEl: document.getElementById('cerpen-grid'),
    puisiGridEl: document.getElementById('puisi-grid'),
    jumpBarEl: document.getElementById('antologi-jump-bar'),
    novelCountEl: document.getElementById('novel-count-badge'),
    cerpenCountEl: document.getElementById('cerpen-count-badge'),
    puisiCountEl: document.getElementById('puisi-count-badge'),
    pageInfoEl: document.getElementById('books-page-info'),
    prevBtn: document.getElementById('btn-books-prev'),
    nextBtn: document.getElementById('btn-books-next'),
    shelfPrevBtn: document.getElementById('btn-shelf-prev'),
    shelfNextBtn: document.getElementById('btn-shelf-next'),
    swipeCueEl: document.getElementById('books-swipe-cue'),
    books: appState.snapshot.books,
    roleFilter: appState.bookRoleFilter,
    searchQuery: appState.bookSearch,
    page: appState.bookPage,
    pageSize: appState.bookPageSize,
    onSelectPage: (targetPage) => {
      const dir = targetPage > appState.bookPage ? 1 : -1;
      appState.bookPage = targetPage;
      renderBooksSection();
      triggerSwipeAnim(gridEl, dir);
    },
    onOpenBook: (book, mode) => {
      openBookModal(book, {
        initialMode: mode,
        siteSettings: appState.snapshot.siteSettings,
        onLikesUpdated: () => renderBooksSection()
      });
    },
    onQuickLike: async (book) => {
      try {
        const res = await incrementBookLike(book.id);
        playSfx(res.alreadyLiked ? 'click' : 'success');
        showToast(
          res.alreadyLiked
            ? 'Anda sudah menyukai karya ini pada perangkat ini.'
            : `Apresiasi untuk "${book.title}" ditambahkan.`,
          res.alreadyLiked ? 'info' : 'success'
        );
        renderBooksSection();
      } catch {
        playSfx('error');
        showToast('Gagal menyimpan apresiasi buku.', 'error');
      }
    },
    onResetFilter: () => {
      appState.bookRoleFilter = 'all';
      appState.bookSearch = '';
      appState.bookPage = 1;
      const input = document.getElementById('book-search-input');
      if (input instanceof HTMLInputElement) input.value = '';
      for (const chip of document.querySelectorAll('#panel-rak [data-role-filter]')) {
        chip.classList.toggle('is-active', chip.getAttribute('data-role-filter') === 'all');
      }
      renderBooksSection();
    }
  });
  appState.bookPage = result.page;
}

function openSubmissionTracking({ withSfx = true } = {}) {
  if (withSfx) playSfx('pop');
  switchTab('kirim');
  window.requestAnimationFrame(() => {
    const trackCard = document.getElementById('sub-track-card');
    const trackInput = document.getElementById('track-code-input');
    trackCard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (trackInput instanceof HTMLElement) trackInput.focus();
  });
}

function renderMadingSection() {
  renderMadingPanel(document.getElementById('mading-grid'), {
    works: appState.snapshot.madingWorks,
    roleFilter: appState.madingRoleFilter,
    page: appState.madingPage,
    pageSize: APP_CONFIG.MADING_PAGE_SIZE,
    onPageChange: (nextPage) => {
      appState.madingPage = nextPage;
      renderMadingSection();
    },
    onRequestSubmit: () => {
      playSfx('pop');
      switchTab('kirim', { focusPanel: true });
    },
    onRequestTrack: () => openSubmissionTracking()
  });
}

function renderAllPublicPanels() {
  updateHeroKpis(appState.snapshot);
  renderBooksSection();
  renderModels3dPanel(document.getElementById('models3d-container'), {
    models: appState.snapshot.models3d
  });
  renderMadingSection();
  renderLibrarianPanel(document.getElementById('librarian-container'), {
    siteSettings: appState.snapshot.siteSettings,
    activities: appState.snapshot.librarianActivities
  });
  renderSubmissionPanel(document.getElementById('submission-container'), {
    getSnapshot: () => appState.snapshot
  });
  renderAdminPanel(document.getElementById('admin-container'), {
    getSnapshot: () => appState.snapshot
  });
}

function bindMobileKeyboardScrollGuard() {
  const handleFocusIn = (event) => {
    const target = event.target;
    if (
      !(
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      )
    ) {
      return;
    }
    const isCompactScreen = window.innerHeight <= 680 || window.innerWidth <= 1024;
    if (!isCompactScreen) return;
    window.setTimeout(() => {
      if (document.activeElement === target) {
        target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }, 180);
  };

  document.getElementById('stage-main')?.addEventListener('focusin', handleFocusIn);
  document.getElementById('app-modal')?.addEventListener('focusin', handleFocusIn);
}

/**
 * Mengaktifkan salah satu tab/panel Hub utama dan menyinkronkan Drawer.
 * @param {string} tabId
 * @param {{ focusPanel?: boolean }} [options]
 */
export function switchTab(tabId, { focusPanel = false } = {}) {
  const nextTab = VALID_TABS.has(tabId) ? tabId : 'rak';
  if (appState.activeTab !== nextTab) {
    stopSpeech();
  }
  appState.activeTab = nextTab;

  for (const drawerBtn of document.querySelectorAll('#drawer-links [data-drawer-tab]')) {
    const active = drawerBtn.getAttribute('data-drawer-tab') === nextTab;
    drawerBtn.classList.toggle('is-active', active);
    if (active) drawerBtn.setAttribute('aria-current', 'page');
    else drawerBtn.removeAttribute('aria-current');
  }
  for (const panel of document.querySelectorAll('#stage-main .hub-panel')) {
    const active = panel.getAttribute('data-panel') === nextTab;
    panel.classList.toggle('is-active', active);
    panel.toggleAttribute('hidden', !active);
  }

  if (focusPanel) {
    const firstCtrl = document.querySelector('#stage-main .hub-panel.is-active button:not(:disabled), #stage-main .hub-panel.is-active input, #stage-main .hub-panel.is-active select');
    if (firstCtrl instanceof HTMLElement) firstCtrl.focus();
  }

  window.dispatchEvent(new CustomEvent('esipena:tab-changed', { detail: { tab: nextTab } }));
}

function bindBookAndMadingFilters() {
  for (const chip of document.querySelectorAll('#panel-rak [data-role-filter]')) {
    chip.addEventListener('click', () => {
      playSfx('click');
      appState.bookRoleFilter = chip.getAttribute('data-role-filter') || 'all';
      appState.bookPage = 1;
      for (const c of document.querySelectorAll('#panel-rak [data-role-filter]')) {
        c.classList.toggle('is-active', c === chip);
      }
      renderBooksSection();
    });
  }

  document.getElementById('book-search-input')?.addEventListener('input', (event) => {
    appState.bookSearch = event.target instanceof HTMLInputElement ? event.target.value : '';
    appState.bookPage = 1;
    renderBooksSection();
  });

  const stepBookPage = (delta, sfxKind = 'click') => {
    const prevPage = appState.bookPage;
    appState.bookPage = Math.max(1, appState.bookPage + delta);
    renderBooksSection();
    if (appState.bookPage !== prevPage) {
      playSfx(sfxKind);
      triggerSwipeAnim(document.getElementById('books-grid'), delta);
    }
  };

  document.getElementById('btn-books-prev')?.addEventListener('click', () => stepBookPage(-1));
  document.getElementById('btn-books-next')?.addEventListener('click', () => stepBookPage(1));
  document.getElementById('btn-shelf-prev')?.addEventListener('click', () => stepBookPage(-1));
  document.getElementById('btn-shelf-next')?.addEventListener('click', () => stepBookPage(1));

  const booksGridEl = document.getElementById('books-grid');
  bindHorizontalSwipe(booksGridEl, {
    isEnabled: () => appState.activeTab === 'rak',
    onNext: () => stepBookPage(1, 'pop'),
    onPrev: () => stepBookPage(-1, 'pop')
  });

  const madingGridEl = document.getElementById('mading-grid');
  bindHorizontalSwipe(madingGridEl, {
    isEnabled: () => appState.activeTab === 'mading',
    onNext: () => {
      const total = Math.max(
        1,
        Math.ceil(
          appState.snapshot.madingWorks.filter(
            (w) =>
              appState.madingRoleFilter === 'all' ||
              String(w.author_role || '').toLowerCase() === appState.madingRoleFilter.toLowerCase()
          ).length / APP_CONFIG.MADING_PAGE_SIZE
        )
      );
      if (appState.madingPage < total) {
        appState.madingPage += 1;
        playSfx('pop');
        renderMadingSection();
      }
    },
    onPrev: () => {
      if (appState.madingPage > 1) {
        appState.madingPage -= 1;
        playSfx('pop');
        renderMadingSection();
      }
    }
  });

  const pageSizeBtn = document.getElementById('btn-book-pagesize');
  pageSizeBtn?.addEventListener('click', () => {
    playSfx('click');
    appState.bookPageSize = appState.bookPageSize === 4 ? 8 : 4;
    appState.bookPage = 1;
    pageSizeBtn.textContent = `${appState.bookPageSize} / Hal`;
    pageSizeBtn.setAttribute('aria-pressed', appState.bookPageSize === 8 ? 'true' : 'false');
    renderBooksSection();
  });

  for (const chip of document.querySelectorAll('#mading-role-filters [data-mading-role]')) {
    chip.addEventListener('click', () => {
      playSfx('click');
      appState.madingRoleFilter = chip.getAttribute('data-mading-role') || 'all';
      appState.madingPage = 1;
      for (const c of document.querySelectorAll('#mading-role-filters [data-mading-role]')) {
        c.classList.toggle('is-active', c === chip);
      }
      renderMadingSection();
    });
  }

  document.getElementById('btn-mading-track')?.addEventListener('click', () => {
    openSubmissionTracking();
  });

  document.getElementById('btn-mading-submit')?.addEventListener('click', () => {
    playSfx('pop');
    switchTab('kirim', { focusPanel: true });
  });

  document.getElementById('btn-kirim-back-mading')?.addEventListener('click', () => {
    playSfx('click');
    switchTab('mading', { focusPanel: true });
  });
}

function handleInitialDeepLink() {
  const url = new URL(window.location.href);
  const pathTab = url.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  const queryTab = (url.searchParams.get('tab') || '').toLowerCase();
  const bookParam = (url.searchParams.get('book') || '').trim();

  if (VALID_TABS.has(queryTab)) switchTab(queryTab);
  else if (VALID_TABS.has(pathTab)) switchTab(pathTab);
  else if (pathTab === 'lacak') openSubmissionTracking({ withSfx: false });

  if (bookParam) {
    const matched = appState.snapshot.books.find(
      (b) => String(b.slug) === bookParam || String(b.id) === bookParam
    );
    if (matched) {
      switchTab('rak');
      openBookModal(matched, {
        initialMode: 'detail',
        siteSettings: appState.snapshot.siteSettings,
        onLikesUpdated: () => renderBooksSection()
      });
    }
  }
}

async function initApp() {
  updateAudioButtonUi();
  bindTopHudAndDrawer({ onSelectTab: switchTab });
  bindBookAndMadingFilters();
  bindMobileKeyboardScrollGuard();
  bindKeyboardAndModalControls({
    onTurnBookPage: (delta) => {
      if (appState.activeTab !== 'rak') return;
      appState.bookPage = Math.max(1, appState.bookPage + delta);
      renderBooksSection();
    }
  });

  if ('serviceWorker' in navigator && /^https?:$/i.test(window.location.protocol)) {
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(() => { });
  }

  appState.snapshot = await loadPortalData();
  renderAllPublicPanels();
  handleInitialDeepLink();
}

window.ESIPENA_APP = {
  getState: () => appState,
  switchTab,
  refreshData: async () => {
    appState.snapshot = await loadPortalData({ forceRefresh: true });
    renderAllPublicPanels();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  initApp().catch(() => {
    showToast('Terjadi kendala saat memuat portal.', 'error');
  });
});
