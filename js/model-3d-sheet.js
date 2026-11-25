/**
 * Pembangun Tampilan & Kontrol Menu Mobile Pameran 3D/AR — e-SIPENA SMAN 1 Sidayu
 * Menangani HTML modal 3D/AR, mode layar penuh HP (iPhone SE portrait/landscape),
 * bottom/side sheet ramah pengguna, gestur swipe tutup menu, dan sinkronisasi slot kontrol.
 */

import { playSfx } from './audio.js';
import { createIcon, escapeHtml, renderFormattedLiteraryHtml, toggleBrowserFullscreen } from './ui-utils.js';

const FALLBACK_POSTER = 'assets/images/logo-smansi.webp';
export const MOBILE_3D_MQ = '(max-width: 599px), (orientation: landscape) and (max-height: 500px)';

function supportsMobileFullscreenBtn() {
  if (typeof document === 'undefined') return false;
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const isIos = /iPad|iPhone|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return Boolean(!isIos && document.fullscreenEnabled && document.documentElement?.requestFullscreen);
}

/**
 * Menyusun markup modal 3D & AR (mendukung Split-View desktop/TV dan Fullscreen Mobile Sheet).
 * @param {{ activeModel: Record<string, any>, currentIdx: number, totalCount: number, isMobileNow: boolean }} params
 * @returns {string}
 */
export function buildModel3dModalHtml({ activeModel, currentIdx, totalCount, isMobileNow }) {
  const hasPrev = totalCount > 1 && currentIdx > 0;
  const hasNext = totalCount > 1 && currentIdx < totalCount - 1;
  const posterUrl = escapeHtml(activeModel.placeholder_url || FALLBACK_POSTER);
  const modelSrc = escapeHtml(activeModel.model_path || '');
  const canMobileFs = supportsMobileFullscreenBtn();

  return `
    <div class="model3d-modal-layout" id="model3d-modal-layout">
      <div class="model3d-stage-col">
        <div class="model3d-viewer-wrap">
          <model-viewer
            id="active-model-viewer"
            src="${modelSrc}"
            poster="${posterUrl}"
            alt="Model 3D ${escapeHtml(activeModel.title || 'Budaya Gresik')}"
            camera-controls
            touch-action="${isMobileNow ? 'none' : 'pan-y'}"
            min-camera-orbit="auto 0deg auto"
            max-camera-orbit="auto 180deg auto"
            auto-rotate
            auto-rotate-delay="1200"
            shadow-intensity="1"
            exposure="1.05"
            interaction-prompt="none"
            ar
            ar-modes="webxr scene-viewer quick-look"
            ar-scale="auto"
            loading="eager"
            reveal="auto"
          >
            <button type="button" slot="ar-button" class="primary-btn inline-action-btn model3d-ar-btn">
              ${createIcon('cube')}
              <span>Tampilkan di AR</span>
            </button>
          </model-viewer>
          <div id="model3d-mobile-tip" class="model3d-mobile-gesture-tip" aria-hidden="true">Geser untuk putar 3D &middot; Cubit untuk zoom</div>
          <div class="model3d-mobile-dock">
            <button type="button" class="model3d-dock-btn model3d-menu-toggle-btn" id="btn-m3d-menu" aria-expanded="false" aria-controls="model3d-info-drawer" aria-label="Buka menu informasi, audio, dan kontrol 3D">
              ${createIcon('menu')}<span>Menu</span>
            </button>
            <button type="button" class="model3d-dock-icon-btn" id="btn-m3d-quick-audio" aria-label="Putar atau hentikan audio perkenalan" aria-pressed="false">
              ${createIcon('volume')}
            </button>
          </div>
          <div id="model3d-load-overlay" class="model3d-load-overlay" aria-live="polite">
            <div class="model3d-load-card">
              <strong id="model3d-load-label">Menyiapkan objek 3D...</strong>
              <div class="model3d-progress-track">
                <div id="model3d-progress-fill" class="model3d-progress-fill"></div>
              </div>
            </div>
          </div>
        </div>

        <div id="model3d-stage-controls-slot">
          <div id="model3d-controls-block" class="model3d-controls-block">
            <div class="model3d-controls" role="toolbar" aria-label="Kontrol sudut objek 3D">
              <button type="button" class="secondary-btn inline-action-btn" id="btn-m3d-rot-left" aria-label="Putar objek ke kiri">
                ${createIcon('rotateLeft')}<span>Putar Kiri</span>
              </button>
              <button type="button" class="secondary-btn inline-action-btn" id="btn-m3d-rot-right" aria-label="Putar objek ke kanan">
                ${createIcon('rotateRight')}<span>Putar Kanan</span>
              </button>
              <button type="button" class="secondary-btn inline-action-btn is-active" id="btn-m3d-autorotate" aria-pressed="true">
                ${createIcon('play')}<span>Putar Otomatis</span>
              </button>
              <button type="button" class="secondary-btn inline-action-btn" id="btn-m3d-reset">
                ${createIcon('reset')}<span>Reset Sudut</span>
              </button>
            </div>
            <p class="model3d-hint">Seret objek untuk memutar 360&deg;, cubit atau gulir untuk memperbesar, atau gunakan tombol kontrol.</p>
          </div>
        </div>
      </div>

      <div id="model3d-sheet-backdrop" class="model3d-sheet-backdrop" hidden></div>
      <aside id="model3d-info-drawer" class="model3d-info-col" aria-label="Menu informasi dan kontrol objek 3D">
        <div class="model3d-sheet-head" id="model3d-sheet-head">
          <span class="model3d-sheet-handle" aria-hidden="true"></span>
          <div class="model3d-sheet-head-row">
            <span class="model3d-sheet-kicker">Menu &amp; Informasi Koleksi</span>
            <button type="button" class="icon-btn model3d-sheet-close-btn" id="btn-m3d-menu-close" aria-label="Tutup menu">
              ${createIcon('close')}
            </button>
          </div>
        </div>

        <div class="model3d-sheet-scroll">
          <div class="model3d-info-badges">
            <span class="panel-badge">${escapeHtml(activeModel.category || 'Budaya Gresik')}</span>
            <span class="status-tag is-lolos">${totalCount > 1 ? `Koleksi ${currentIdx + 1} / ${totalCount}` : 'Koleksi 3D &amp; AR'}</span>
          </div>
          <h3 class="model3d-info-title">${escapeHtml(activeModel.title || '')}</h3>

          <div class="model3d-tts-bar">
            <button type="button" class="primary-btn inline-action-btn" id="btn-model-tts"${isMobileNow ? '' : ' data-autofocus'}>
              ${createIcon('volume')}<span>Dengar Perkenalan</span>
            </button>
            <span id="model3d-tts-status" class="model3d-tts-status" hidden>Sedang membacakan perkenalan...</span>
          </div>

          <div id="model3d-menu-controls-slot"></div>

          <div class="model3d-intro-scroll">
            <article class="literary-reader-paper model3d-intro-paper">
              ${renderFormattedLiteraryHtml(activeModel.introduction || '', 'Teks perkenalan model belum tersedia.')}
            </article>
          </div>

          ${canMobileFs
      ? `<div class="model3d-mobile-fs-row">
                <button type="button" class="secondary-btn inline-action-btn" id="btn-m3d-mobile-fs">
                  ${createIcon(document.fullscreenElement ? 'minimize' : 'maximize')}<span>${document.fullscreenElement ? 'Keluar Layar Penuh' : 'Layar Penuh Browser'}</span>
                </button>
              </div>`
      : ''}
        </div>

        ${totalCount > 1
      ? `<div class="model3d-nav-footer">
                <button type="button" class="secondary-btn" id="btn-m3d-prev" ${hasPrev ? '' : 'disabled'}>&lsaquo; Sebelumnya</button>
                <span class="page-indicator">Koleksi ${currentIdx + 1} / ${totalCount}</span>
                <button type="button" class="secondary-btn" id="btn-m3d-next" ${hasNext ? '' : 'disabled'}>Berikutnya &rsaquo;</button>
              </div>`
      : ''}
      </aside>
    </div>
  `;
}

/**
 * Menghubungkan kontrol menu mobile (bottom/side sheet), rotasi layar, dan cleanup listener.
 * @param {HTMLElement} bodyEl
 * @param {MediaQueryList | null} mql
 * @returns {() => void}
 */
export function bindModel3dResponsiveUi(bodyEl, mql) {
  const cleanups = [];
  const layoutEl = bodyEl.querySelector('#model3d-modal-layout');
  const viewer = bodyEl.querySelector('#active-model-viewer');
  const mobileTip = bodyEl.querySelector('#model3d-mobile-tip');
  const menuBtn = bodyEl.querySelector('#btn-m3d-menu');
  const menuCloseBtn = bodyEl.querySelector('#btn-m3d-menu-close');
  const sheetBackdrop = bodyEl.querySelector('#model3d-sheet-backdrop');
  const infoDrawer = bodyEl.querySelector('#model3d-info-drawer');
  const sheetHead = bodyEl.querySelector('#model3d-sheet-head');
  const controlsBlock = bodyEl.querySelector('#model3d-controls-block');
  const stageSlot = bodyEl.querySelector('#model3d-stage-controls-slot');
  const menuSlot = bodyEl.querySelector('#model3d-menu-controls-slot');

  let menuOpen = false;
  const setMenuOpen = (nextOpen, { restoreFocus = false } = {}) => {
    const mobileActive = Boolean(mql?.matches);
    menuOpen = mobileActive ? Boolean(nextOpen) : false;
    layoutEl?.classList.toggle('is-mobile-menu-open', menuOpen);
    if (sheetBackdrop instanceof HTMLElement) sheetBackdrop.hidden = !menuOpen;
    menuBtn?.setAttribute('aria-expanded', menuOpen ? 'true' : 'false');
    infoDrawer?.setAttribute('aria-hidden', mobileActive && !menuOpen ? 'true' : 'false');
    if (menuOpen && menuCloseBtn instanceof HTMLElement) menuCloseBtn.focus();
    else if (!menuOpen && restoreFocus && menuBtn instanceof HTMLElement) menuBtn.focus();
  };

  const syncLayout = () => {
    const mobileActive = Boolean(mql?.matches);
    if (controlsBlock && stageSlot && menuSlot) {
      const targetSlot = mobileActive ? menuSlot : stageSlot;
      if (controlsBlock.parentElement !== targetSlot) targetSlot.appendChild(controlsBlock);
    }
    viewer?.setAttribute('touch-action', mobileActive ? 'none' : 'pan-y');
    if (!mobileActive) {
      menuOpen = false;
      layoutEl?.classList.remove('is-mobile-menu-open');
      if (sheetBackdrop instanceof HTMLElement) sheetBackdrop.hidden = true;
      menuBtn?.setAttribute('aria-expanded', 'false');
      infoDrawer?.setAttribute('aria-hidden', 'false');
    } else {
      infoDrawer?.setAttribute('aria-hidden', menuOpen ? 'false' : 'true');
    }
  };

  syncLayout();
  if (mql?.matches && menuBtn instanceof HTMLElement) {
    window.requestAnimationFrame(() => { if (menuBtn.isConnected) menuBtn.focus(); });
  }

  if (mql) {
    mql.addEventListener('change', syncLayout);
    cleanups.push(() => mql.removeEventListener('change', syncLayout));
  }

  const onEscapeKey = (event) => {
    if (event.key === 'Escape' && menuOpen) {
      event.preventDefault();
      event.stopPropagation();
      playSfx('click');
      setMenuOpen(false, { restoreFocus: true });
    }
  };
  document.addEventListener('keydown', onEscapeKey, true);
  cleanups.push(() => document.removeEventListener('keydown', onEscapeKey, true));

  menuBtn?.addEventListener('click', () => { playSfx('click'); setMenuOpen(true); });
  menuCloseBtn?.addEventListener('click', () => { playSfx('click'); setMenuOpen(false, { restoreFocus: true }); });
  sheetBackdrop?.addEventListener('click', () => { playSfx('click'); setMenuOpen(false, { restoreFocus: true }); });

  if (sheetHead) {
    let swipeStart = null;
    sheetHead.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) swipeStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: true });
    sheetHead.addEventListener('touchend', (e) => {
      if (!swipeStart || !e.changedTouches.length) return;
      const t = e.changedTouches[0];
      const dy = t.clientY - swipeStart.y;
      const dx = t.clientX - swipeStart.x;
      swipeStart = null;
      const isLandscape = window.matchMedia?.('(orientation: landscape) and (max-height: 500px)').matches;
      if ((!isLandscape && dy >= 44) || (isLandscape && dx >= 44)) {
        playSfx('click');
        setMenuOpen(false, { restoreFocus: true });
      }
    }, { passive: true });
  }

  if (mobileTip instanceof HTMLElement) {
    const hideTip = () => mobileTip.classList.add('is-hidden');
    const tipTimer = window.setTimeout(hideTip, 4500);
    cleanups.push(() => window.clearTimeout(tipTimer));
    viewer?.addEventListener('pointerdown', hideTip, { once: true });
    viewer?.addEventListener('touchstart', hideTip, { once: true, passive: true });
  }

  const mobileFsBtn = bodyEl.querySelector('#btn-m3d-mobile-fs');
  if (mobileFsBtn) {
    const syncFsLabel = () => {
      const isFs = Boolean(document.fullscreenElement);
      mobileFsBtn.innerHTML = `${createIcon(isFs ? 'minimize' : 'maximize')}<span>${isFs ? 'Keluar Layar Penuh' : 'Layar Penuh Browser'}</span>`;
    };
    mobileFsBtn.addEventListener('click', async () => {
      playSfx('click');
      await toggleBrowserFullscreen();
      syncFsLabel();
    });
    document.addEventListener('fullscreenchange', syncFsLabel);
    cleanups.push(() => document.removeEventListener('fullscreenchange', syncFsLabel));
  }

  return () => {
    for (const fn of cleanups) fn();
  };
}
