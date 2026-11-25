/**
 * Pengelola Modal Terpusat & Layar Penuh — e-SIPENA SMAN 1 Sidayu
 * Menangani pembukaan/penutupan modal terpusat, kunci penutupan saat sibuk, dan kontrol layar penuh.
 */

import { createIcon, showToast } from './ui-utils.js';

let activeModalOnClose = null;
let lastFocusedBeforeModal = null;
let modalCloseLocked = false;

/**
 * Menyelaraskan ikon, label, dan status aria tombol ukuran & layar penuh di header modal.
 * @param {boolean} [triggerResize=false]
 */
export function syncModalHeaderFsUi(triggerResize = false) {
  const dialog = document.getElementById('app-modal');
  const sizeBtn = document.getElementById('modal-toggle-size');
  const fsBtn = document.getElementById('modal-browser-fs');
  const isFullCanvas = Boolean(dialog?.classList.contains('app-modal-fullscreen'));
  const isBrowserFs = Boolean(document.fullscreenElement);

  if (sizeBtn) {
    sizeBtn.setAttribute('aria-pressed', isFullCanvas ? 'true' : 'false');
    sizeBtn.setAttribute('aria-label', isFullCanvas ? 'Perkecil jendela modal' : 'Perbesar penuh kanvas');
    sizeBtn.innerHTML = `${createIcon(isFullCanvas ? 'minimize' : 'maximize')}<span>${isFullCanvas ? 'Perkecil' : 'Kanvas Penuh'}</span>`;
  }
  if (fsBtn) {
    fsBtn.setAttribute('aria-pressed', isBrowserFs ? 'true' : 'false');
    fsBtn.setAttribute('aria-label', isBrowserFs ? 'Keluar layar penuh browser' : 'Aktifkan layar penuh browser');
    fsBtn.innerHTML = `${createIcon(isBrowserFs ? 'minimize' : 'maximize')}<span>${isBrowserFs ? 'Keluar Penuh' : 'Layar Penuh'}</span>`;
  }
  if (triggerResize) window.requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
}

/**
 * Mengaktifkan atau keluar dari mode layar penuh browser tanpa memaksa rotasi orientasi.
 */
export async function toggleBrowserFullscreen() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch {
    showToast('Mode layar penuh tidak tersedia di peramban ini.', 'info');
  }
}

export function setModalBusy(busy = true) {
  modalCloseLocked = Boolean(busy);
  const closeBtn = document.getElementById('modal-close');
  const dialog = document.getElementById('app-modal');
  if (closeBtn instanceof HTMLButtonElement) closeBtn.disabled = modalCloseLocked;
  if (dialog) dialog.setAttribute('aria-busy', modalCloseLocked ? 'true' : 'false');
}

export function isModalOpen() {
  const backdrop = document.getElementById('modal-backdrop');
  return Boolean(backdrop && !backdrop.hidden);
}

/**
 * Membuka modal terpusat dengan fokus keyboard dan pembersihan handler saat ditutup.
 * @param {{ title: string, html: string, headerTabsHtml?: string, wide?: boolean, fullscreen?: boolean, allowFullscreen?: boolean, onClose?: (() => void) | null }} options
 * @returns {HTMLElement | null}
 */
export function openModal({ title, html, headerTabsHtml = '', wide = false, fullscreen = false, allowFullscreen = false, onClose = null }) {
  const backdrop = document.getElementById('modal-backdrop');
  const dialog = document.getElementById('app-modal');
  const titleEl = document.getElementById('modal-title');
  const tabsEl = document.getElementById('modal-header-tabs');
  const bodyEl = document.getElementById('modal-body');
  if (!backdrop || !dialog || !titleEl || !bodyEl) return null;

  setModalBusy(false);

  if (typeof activeModalOnClose === 'function') {
    try {
      activeModalOnClose();
    } catch {
      // Abaikan galat pembersihan modal sebelumnya
    }
  }

  lastFocusedBeforeModal =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  activeModalOnClose = typeof onClose === 'function' ? onClose : null;

  const isFs = Boolean(fullscreen);
  const showFsHeader = isFs || Boolean(allowFullscreen);
  dialog.classList.remove('is-reading-mode', 'is-model3d-modal');
  dialog.classList.toggle('app-modal-wide', Boolean(wide));
  dialog.classList.toggle('app-modal-fullscreen', isFs);
  backdrop.classList.toggle('is-modal-fullscreen', isFs);

  if (tabsEl) {
    tabsEl.innerHTML = headerTabsHtml || '';
    tabsEl.hidden = !headerTabsHtml;
  }

  const sizeBtn = document.getElementById('modal-toggle-size');
  const fsBtn = document.getElementById('modal-browser-fs');
  if (sizeBtn) sizeBtn.hidden = !showFsHeader;
  if (fsBtn) fsBtn.hidden = !showFsHeader;
  syncModalHeaderFsUi(false);

  titleEl.textContent = String(title || 'Detail Informasi');
  bodyEl.innerHTML = html || '';
  bodyEl.scrollTop = 0;

  backdrop.hidden = false;
  window.requestAnimationFrame(() => {
    const selector = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';
    const firstFocusable =
      dialog.querySelector('[data-autofocus]:not(:disabled)') ||
      [...bodyEl.querySelectorAll(selector)].find((el) => el instanceof HTMLElement && !el.closest('[hidden]')) ||
      [...dialog.querySelectorAll(selector)].find((el) => el instanceof HTMLElement && !el.closest('[hidden]'));
    if (firstFocusable instanceof HTMLElement) {
      firstFocusable.focus();
    } else {
      dialog.focus();
    }
  });

  return bodyEl;
}

/**
 * Menutup modal terpusat, menjalankan callback pembersihan, dan memulihkan fokus.
 * @param {boolean} [force=false]
 */
export function closeModal(force = false) {
  const backdrop = document.getElementById('modal-backdrop');
  const dialog = document.getElementById('app-modal');
  const tabsEl = document.getElementById('modal-header-tabs');
  const bodyEl = document.getElementById('modal-body');
  if (!backdrop || backdrop.hidden) return;
  if (modalCloseLocked && !force) return;
  setModalBusy(false);

  if (typeof activeModalOnClose === 'function') {
    try {
      activeModalOnClose();
    } catch {
      // Abaikan galat pembersihan
    }
  }
  activeModalOnClose = null;

  backdrop.hidden = true;
  backdrop.classList.remove('is-modal-fullscreen');
  if (dialog) dialog.classList.remove('app-modal-wide', 'app-modal-fullscreen', 'is-reading-mode', 'is-model3d-modal');
  if (tabsEl) { tabsEl.hidden = true; tabsEl.innerHTML = ''; }
  const sizeBtn = document.getElementById('modal-toggle-size');
  const fsBtn = document.getElementById('modal-browser-fs');
  if (sizeBtn) sizeBtn.hidden = true;
  if (fsBtn) fsBtn.hidden = true;
  if (bodyEl) bodyEl.innerHTML = '';

  if (lastFocusedBeforeModal && lastFocusedBeforeModal.isConnected) {
    lastFocusedBeforeModal.focus();
  }
  lastFocusedBeforeModal = null;
}
