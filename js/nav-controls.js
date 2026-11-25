/**
 * Kontrol Navigasi, Layar Penuh & D-Pad TV Android — e-SIPENA SMAN 1 Sidayu
 * Menangani fullscreen, PWA install (+ iOS Safari), drawer, swipe, serta keyboard/remote.
 */

import { isMuted, playSfx, stopSpeech, toggleMute } from './audio.js';
import { closeModal, createIcon, isModalOpen, openModal, showToast, syncModalHeaderFsUi, toggleBrowserFullscreen } from './ui-utils.js';

let deferredInstallPrompt = null;

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
        html: '<div class="librarian-guide-notes"><h3>Tambahkan e-SIPENA ke Layar Utama</h3><ol><li>Ketuk ikon <strong>Bagikan (Share)</strong> pada bilah Safari.</li><li>Pilih <strong>Tambah ke Layar Utama</strong> (<em>Add to Home Screen</em>).</li><li>Ketuk <strong>Tambah</strong> untuk membuka aplikasi layar penuh.</li></ol></div>'
      });
    }
  });
}

/**
 * Menghubungkan tombol kontrol Top HUD dan drawer menu dengan handler tab utama.
 * @param {{ onSelectTab: (tabId: string) => void }} options
 */
export function bindTopHudAndDrawer({ onSelectTab }) {
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

  window.addEventListener('esipena:audio-mute-changed', updateAudioButtonUi);
  document.getElementById('btn-audio-toggle')?.addEventListener('click', () => {
    const muted = toggleMute();
    updateAudioButtonUi();
    showToast(muted ? 'Efek suara UI dibisukan.' : 'Efek suara UI diaktifkan.');
  });

  bindInstallButton();

  for (const btn of document.querySelectorAll('#hub-nav [data-hub-tab]')) {
    btn.addEventListener('click', () => {
      playSfx('click');
      onSelectTab(btn.getAttribute('data-hub-tab') || 'rak');
    });
  }

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

function isElementFocusable(el) {
  return (
    el instanceof HTMLElement &&
    el.offsetParent !== null &&
    !el.closest('[hidden], [inert]') &&
    window.getComputedStyle(el).visibility !== 'hidden'
  );
}

function moveSpatialFocus(currentEl, direction, scopeEl = null) {
  const roots = scopeEl
    ? [scopeEl]
    : [document.getElementById('top-hud'), document.querySelector('#stage-main .hub-panel.is-active')].filter(Boolean);
  if (!roots.length) return;

  const sel = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]';
  const candidates = roots
    .flatMap((root) => [...root.querySelectorAll(sel)])
    .filter(isElementFocusable);
  if (!candidates.length) return;

  if (scopeEl && currentEl === scopeEl) {
    const first = candidates[0];
    first.focus({ preventScroll: true });
    first.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    return;
  }

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
    if ((direction === 'ArrowRight' && dx <= 4) || (direction === 'ArrowLeft' && dx >= -4)) continue;
    if ((direction === 'ArrowDown' && dy <= 4) || (direction === 'ArrowUp' && dy >= -4)) continue;
    const score = (horiz ? Math.abs(dx) : Math.abs(dy)) + (horiz ? Math.abs(dy) : Math.abs(dx)) * 2.4;
    if (score < bestScore) { bestScore = score; best = el; }
  }
  if (best instanceof HTMLElement) {
    best.focus({ preventScroll: true });
    best.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
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
        ? [...dialog.querySelectorAll('button:not(:disabled), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(isElementFocusable)
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
      const dialog = document.getElementById('app-modal');
      const pdfShell = dialog?.querySelector('.pdf-slide-shell');
      const inPdfReader = Boolean(dialog?.classList.contains('is-reading-mode') && pdfShell && !pdfShell.closest('[hidden]'));
      const inOpenPdfToolbar = Boolean(activeEl instanceof HTMLElement && activeEl.closest('#pdf-slide-toolbar:not([inert])'));
      if (inPdfReader && (event.key === 'PageUp' || event.key === 'PageDown' || (!inOpenPdfToolbar && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')))) {
        return;
      }
      if (isArrow && activeEl instanceof HTMLElement && activeEl.closest('#app-modal')) {
        event.preventDefault();
        moveSpatialFocus(activeEl, event.key, dialog);
      }
      return;
    }

    if (isArrow) {
      if (activeEl instanceof HTMLElement && activeEl.closest('#top-hud, #stage-main')) {
        event.preventDefault();
        moveSpatialFocus(activeEl, event.key);
      } else {
        const fallback = document.querySelector('#stage-main .hub-panel.is-active button:not(:disabled), #top-hud button:not(:disabled)');
        if (isElementFocusable(fallback)) {
          event.preventDefault();
          fallback.focus({ preventScroll: true });
          fallback.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
      }
    } else if (event.key === 'PageDown' || event.key === 'PageUp') {
      event.preventDefault();
      onTurnBookPage(event.key === 'PageDown' ? 1 : -1);
    }
  });
}

/**
 * Mengaktifkan gestur geser (swipe) kiri/kanan pada kontainer paginasi.
 * @param {HTMLElement | null} el
 * @param {{ onNext: () => void, onPrev: () => void, isEnabled?: () => boolean }} options
 */
export function bindHorizontalSwipe(el, { onNext, onPrev, isEnabled = () => true, dragTarget = null }) {
  if (!el) return;
  const dragEl = dragTarget || el;
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
    const dx = endX - startX;
    const dy = endY - startY;
    if (Math.abs(dx) >= minDist && Math.abs(dx) > Math.abs(dy) * 1.15) {
      if (dx < 0) onNext?.();
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
    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      pointerStart.moved = true;
      dragEl.classList.add('is-dragging');
      dragEl.style.transform = `translateX(${Math.max(-42, Math.min(42, dx * 0.35))}px)`;
    }
  });

  const endPointer = (event, canceled) => {
    if (!pointerStart || event.pointerId !== pointerStart.id) return;
    const start = pointerStart;
    pointerStart = null;
    dragEl.classList.remove('is-dragging');
    dragEl.style.transform = '';
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
