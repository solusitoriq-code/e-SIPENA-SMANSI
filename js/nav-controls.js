/**
 * Kontrol Navigasi, Layar Landscape & D-Pad TV Android — e-SIPENA SMAN 1 Sidayu
 * Menangani putar layar 90°/270°, fullscreen, PWA install (+ iOS Safari), drawer, serta keyboard/remote.
 */

import { APP_CONFIG } from './config.js';
import { isMuted, playSfx, stopSpeech, toggleMute } from './audio.js';
import { SafeStorage } from './data-service.js';
import { closeModal, createIcon, isModalOpen, openModal, showToast, syncModalHeaderFsUi, toggleBrowserFullscreen } from './ui-utils.js';

let deferredInstallPrompt = null;

/**
 * Menerapkan arah rotasi paksa landscape (90° atau 270°) pada body & label HUD.
 * @param {'90' | '270' | string} deg
 */
export function applyRotation(deg) {
  const safeDeg = deg === '270' ? '270' : '90';
  document.body.setAttribute('data-rotate', safeDeg);
  SafeStorage.setItem(APP_CONFIG.STORAGE_KEYS.rotate, safeDeg);
  const labelEl = document.getElementById('rotate-label');
  if (labelEl) labelEl.textContent = `${safeDeg}°`;
}

/**
 * Menyelaraskan ikon & label tombol suara pada Top HUD.
 */
export function updateAudioButtonUi() {
  const btn = document.getElementById('btn-audio-toggle');
  if (!btn) return;
  const muted = isMuted();
  btn.setAttribute('aria-pressed', muted ? 'true' : 'false');
  btn.setAttribute('aria-label', muted ? 'Aktifkan suara UI' : 'Bisukan suara UI');
  btn.innerHTML = `${createIcon(muted ? 'mute' : 'volume')}<span>${muted ? 'Bisu' : 'Suara'}</span>`;
}

export function isDrawerOpen() {
  const drawer = document.getElementById('nav-drawer');
  return Boolean(drawer && !drawer.hidden);
}

/**
 * Membuka atau menutup slide-over drawer menu beserta pemulihan fokus keyboard.
 * @param {boolean} open
 */
export function setDrawerOpen(open, { focusStage = false } = {}) {
  const drawer = document.getElementById('nav-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  const toggleBtn = document.getElementById('btn-drawer-toggle');
  if (!drawer || !backdrop || !toggleBtn) return;

  drawer.hidden = !open;
  backdrop.hidden = !open;
  toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');

  if (open) {
    const activeItem = drawer.querySelector('.drawer-item.is-active') || drawer.querySelector('.drawer-item');
    if (activeItem instanceof HTMLElement) activeItem.focus();
  } else if (focusStage) {
    const firstCtrl = document.querySelector('#stage-main .hub-panel.is-active button:not(:disabled), #stage-main .hub-panel.is-active input');
    if (firstCtrl instanceof HTMLElement) firstCtrl.focus();
    else toggleBtn.focus();
  } else {
    toggleBtn.focus();
  }
}

function bindInstallButton() {
  const installBtn = document.getElementById('btn-install-pwa');
  if (!installBtn) return;
  const isStandalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const ua = navigator.userAgent || '';
  const isIosSafari =
    (/iPad|iPhone|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) &&
    /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);

  if (isStandalone) installBtn.hidden = true;
  else if (isIosSafari) installBtn.hidden = false;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    if (!isStandalone) installBtn.hidden = false;
  });
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    installBtn.hidden = true;
    showToast('Aplikasi e-SIPENA berhasil dipasang.', 'success');
  });
  installBtn.addEventListener('click', async () => {
    playSfx('pop');
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice.catch(() => null);
      deferredInstallPrompt = null;
      installBtn.hidden = true;
      return;
    }
    if (isIosSafari && !isStandalone) {
      openModal({
        title: 'Pasang di iOS Safari',
        html: '<div class="librarian-guide-notes"><h3>Tambahkan e-SIPENA ke Layar Utama</h3><ol><li>Ketuk ikon <strong>Bagikan (Share)</strong> pada bilah Safari.</li><li>Pilih <strong>Tambah ke Layar Utama</strong> (<em>Add to Home Screen</em>).</li><li>Ketuk <strong>Tambah</strong> untuk membuka aplikasi layar penuh landscape.</li></ol></div>'
      });
    }
  });
}

/**
 * Menghubungkan tombol kontrol Top HUD dan drawer menu dengan handler tab utama.
 * @param {{ onSelectTab: (tabId: string) => void }} options
 */
export function bindTopHudAndDrawer({ onSelectTab }) {
  document.getElementById('btn-rotate-screen')?.addEventListener('click', () => {
    const next = document.body.getAttribute('data-rotate') === '90' ? '270' : '90';
    applyRotation(next);
    playSfx('click');
    showToast(`Orientasi landscape diputar ke ${next} derajat.`);
  });

  const fsBtn = document.getElementById('btn-fullscreen');
  const syncFsLabel = () => {
    const span = fsBtn?.querySelector('span');
    if (span) span.textContent = document.fullscreenElement ? 'Keluar Penuh' : 'Layar Penuh';
    syncModalHeaderFsUi(isModalOpen());
  };
  const onToggleFs = async () => {
    playSfx('click');
    await toggleBrowserFullscreen();
    syncFsLabel();
  };
  fsBtn?.addEventListener('click', onToggleFs);
  document.getElementById('modal-browser-fs')?.addEventListener('click', onToggleFs);
  document.getElementById('modal-toggle-size')?.addEventListener('click', () => {
    const backdrop = document.getElementById('modal-backdrop');
    const dialog = document.getElementById('app-modal');
    if (!backdrop || !dialog) return;
    playSfx('click');
    const next = !dialog.classList.contains('app-modal-fullscreen');
    backdrop.classList.toggle('is-modal-fullscreen', next);
    dialog.classList.toggle('app-modal-fullscreen', next);
    syncModalHeaderFsUi(true);
  });
  document.addEventListener('fullscreenchange', syncFsLabel);

  document.getElementById('btn-audio-toggle')?.addEventListener('click', () => {
    const muted = toggleMute();
    updateAudioButtonUi();
    showToast(muted ? 'Efek suara UI dibisukan.' : 'Efek suara UI diaktifkan.');
  });

  bindInstallButton();

  document.getElementById('btn-drawer-toggle')?.addEventListener('click', () => {
    playSfx('click');
    setDrawerOpen(!isDrawerOpen());
  });
  document.getElementById('btn-drawer-close')?.addEventListener('click', () => {
    playSfx('click');
    setDrawerOpen(false);
  });
  document.getElementById('drawer-backdrop')?.addEventListener('click', () => setDrawerOpen(false));

  for (const btn of document.querySelectorAll('#drawer-links [data-drawer-tab]')) {
    btn.addEventListener('click', () => {
      playSfx('click');
      onSelectTab(btn.getAttribute('data-drawer-tab') || 'rak');
      setDrawerOpen(false, { focusStage: true });
    });
  }

  const drawerLinks = document.getElementById('drawer-links');
  drawerLinks?.addEventListener('keydown', (event) => {
    const items = [...drawerLinks.querySelectorAll('button:not(:disabled)')].filter((el) => el instanceof HTMLElement && !el.hidden);
    const index = items.indexOf(document.activeElement);
    if (index === -1) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const nextBtn = items[(index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length];
      if (nextBtn instanceof HTMLElement) nextBtn.focus();
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const targetBtn = event.key === 'Home' ? items[0] : items[items.length - 1];
      if (targetBtn instanceof HTMLElement) targetBtn.focus();
    }
  });
}

function moveSpatialFocus(currentEl, direction, scopeEl = null) {
  const roots = scopeEl
    ? [scopeEl]
    : [document.getElementById('top-hud'), document.querySelector('#stage-main .hub-panel.is-active')].filter(Boolean);
  if (!roots.length) return;

  const sel = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]';
  const candidates = roots
    .flatMap((root) => [...root.querySelectorAll(sel)])
    .filter((el) => el instanceof HTMLElement && el.offsetParent !== null && !el.closest('[hidden]'));
  const curRect = currentEl.getBoundingClientRect();
  const cx = curRect.left + curRect.width / 2;
  const cy = curRect.top + curRect.height / 2;
  const horiz = direction === 'ArrowLeft' || direction === 'ArrowRight';

  let best = null;
  let bestScore = Infinity;
  for (const el of candidates) {
    if (el === currentEl) continue;
    const r = el.getBoundingClientRect();
    const dx = r.left + r.width / 2 - cx;
    const dy = r.top + r.height / 2 - cy;
    if ((direction === 'ArrowRight' && dx <= 8) || (direction === 'ArrowLeft' && dx >= -8)) continue;
    if ((direction === 'ArrowDown' && dy <= 8) || (direction === 'ArrowUp' && dy >= -8)) continue;
    const score = (horiz ? Math.abs(dx) : Math.abs(dy)) + (horiz ? Math.abs(dy) : Math.abs(dx)) * 2.4;
    if (score < bestScore) { bestScore = score; best = el; }
  }
  if (best instanceof HTMLElement) best.focus();
}

/**
 * Mengaktifkan navigasi penuh Keyboard & D-Pad Remote TV Android + fokus trap modal.
 * @param {{ onTurnBookPage: (delta: number) => void }} options
 */
export function bindKeyboardAndModalControls({ onTurnBookPage }) {
  document.getElementById('modal-close')?.addEventListener('click', () => { playSfx('click'); closeModal(); });
  document.getElementById('modal-backdrop')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) closeModal();
  });

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented) return;
    if (event.key === 'Escape') {
      if (isModalOpen()) { event.preventDefault(); stopSpeech(); closeModal(); }
      else if (isDrawerOpen()) { event.preventDefault(); setDrawerOpen(false); }
      return;
    }

    const activeEl = document.activeElement;
    if (isModalOpen() && event.key === 'Tab') {
      const dialog = document.getElementById('app-modal');
      const focusables = dialog
        ? [...dialog.querySelectorAll('button:not(:disabled), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((el) => el instanceof HTMLElement && !el.closest('[hidden]'))
        : [];
      if (focusables.length > 0) {
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && activeEl === first && last instanceof HTMLElement) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && activeEl === last && first instanceof HTMLElement) { event.preventDefault(); first.focus(); }
      }
      return;
    }

    const isTyping = activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement || activeEl instanceof HTMLSelectElement;
    if (isTyping || isDrawerOpen()) return;

    const isArrow = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key);
    if (isModalOpen()) {
      if (isArrow && activeEl instanceof HTMLElement && activeEl.closest('#app-modal')) {
        const inPdf = activeEl.closest('#pdf-reader-stage-content');
        if (inPdf && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) return;
        event.preventDefault();
        moveSpatialFocus(activeEl, event.key, document.getElementById('app-modal'));
      }
      return;
    }

    if (isArrow && activeEl instanceof HTMLElement && activeEl.closest('#top-hud, #stage-main')) {
      event.preventDefault();
      moveSpatialFocus(activeEl, event.key);
    } else if (event.key === 'PageDown' || event.key === 'PageUp') {
      event.preventDefault();
      onTurnBookPage(event.key === 'PageDown' ? 1 : -1);
    }
  });
}

function getUiSwipeDelta(startX, startY, endX, endY) {
  const dx = endX - startX;
  const dy = endY - startY;
  const isPortraitRotated =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(orientation: portrait) and (max-width: 1024px)').matches;
  if (!isPortraitRotated) return { uiDeltaX: dx, uiDeltaY: dy };
  const rot = document.body.getAttribute('data-rotate') === '270' ? '270' : '90';
  return rot === '270' ? { uiDeltaX: -dy, uiDeltaY: dx } : { uiDeltaX: dy, uiDeltaY: -dx };
}

/**
 * Mengaktifkan gestur geser (swipe) kiri/kanan pada kontainer paginasi,
 * termasuk penyesuaian otomatis sumbu saat HP/Tablet portrait dipaksa rotasi 90°/270°.
 * @param {HTMLElement | null} el
 * @param {{ onNext: () => void, onPrev: () => void, isEnabled?: () => boolean }} options
 */
export function bindHorizontalSwipe(el, { onNext, onPrev, isEnabled = () => true }) {
  if (!el) return;
  let touchStart = null;
  let pointerStart = null;
  let suppressClickUntil = 0;
  let lastWheelAt = 0;

  el.addEventListener('dragstart', (event) => event.preventDefault());
  el.addEventListener('click', (event) => {
    if (Date.now() < suppressClickUntil) { event.preventDefault(); event.stopPropagation(); }
  }, true);

  const evaluateSwipe = (startX, startY, endX, endY, elapsed, minDist = 42) => {
    if (elapsed > 850) return false;
    const { uiDeltaX, uiDeltaY } = getUiSwipeDelta(startX, startY, endX, endY);
    if (Math.abs(uiDeltaX) >= minDist && Math.abs(uiDeltaX) > Math.abs(uiDeltaY) * 1.15) {
      if (uiDeltaX < 0) onNext?.();
      else onPrev?.();
      return true;
    }
    return false;
  };

  el.addEventListener('touchstart', (event) => {
    if (!isEnabled() || event.touches.length !== 1) { touchStart = null; return; }
    const t = event.touches[0];
    touchStart = { x: t.clientX, y: t.clientY, at: Date.now() };
  }, { passive: true });

  el.addEventListener('touchend', (event) => {
    if (!touchStart || event.changedTouches.length === 0) return;
    const t = event.changedTouches[0];
    const start = touchStart;
    touchStart = null;
    evaluateSwipe(start.x, start.y, t.clientX, t.clientY, Date.now() - start.at, 42);
  }, { passive: true });

  el.addEventListener('touchcancel', () => { touchStart = null; });

  el.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch' || !isEnabled() || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (target?.closest('button, a, input, select, textarea')) return;
    pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY, at: Date.now(), moved: false };
  });

  el.addEventListener('pointermove', (event) => {
    if (!pointerStart || event.pointerId !== pointerStart.id) return;
    const { uiDeltaX, uiDeltaY } = getUiSwipeDelta(pointerStart.x, pointerStart.y, event.clientX, event.clientY);
    if (Math.abs(uiDeltaX) > 10 && Math.abs(uiDeltaX) > Math.abs(uiDeltaY)) {
      pointerStart.moved = true;
      el.classList.add('is-dragging');
      el.style.transform = `translateX(${Math.max(-42, Math.min(42, uiDeltaX * 0.35))}px)`;
    }
  });

  const endPointer = (event, canceled) => {
    if (!pointerStart || event.pointerId !== pointerStart.id) return;
    const start = pointerStart;
    pointerStart = null;
    el.classList.remove('is-dragging');
    el.style.transform = '';
    if (canceled) return;
    const swiped = evaluateSwipe(start.x, start.y, event.clientX, event.clientY, Date.now() - start.at, 40);
    if (swiped || start.moved) suppressClickUntil = Date.now() + 140;
  };

  el.addEventListener('pointerup', (event) => endPointer(event, false));
  el.addEventListener('pointercancel', (event) => endPointer(event, true));

  el.addEventListener('wheel', (event) => {
    if (!isEnabled()) return;
    const now = Date.now();
    if (now - lastWheelAt < 460) return;
    const horiz = Math.abs(event.deltaX) >= 18 && Math.abs(event.deltaX) > Math.abs(event.deltaY) * 1.25
      ? event.deltaX
      : event.shiftKey && Math.abs(event.deltaY) >= 18 ? event.deltaY : 0;
    if (!horiz) return;
    lastWheelAt = now;
    if (horiz > 0) onNext?.();
    else onPrev?.();
  }, { passive: true });
}
