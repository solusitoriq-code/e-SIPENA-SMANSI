/**
 * Utilitas UI Bersama — Portal Literasi Digital e-SIPENA SMAN 1 Sidayu
 * Menyatukan sanitasi HTML, ikon SVG fungsional, toast, modal terpusat, dan helper tautan Drive/WA.
 */

import { APP_CONFIG } from './config.js';
import { isSpeechSupported, isSpeaking, speak, stopSpeech } from './audio.js';

const ICONS = {
  search:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
  book:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>',
  heart:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>',
  whatsapp:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>',
  qr:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><path d="M14 14h3v3h-3z"></path><path d="M17 17h4v4h-4z"></path><path d="M14 20h1"></path><path d="M20 14h1"></path></svg>',
  play:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>',
  send:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>',
  volume:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>',
  mute:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>',
  external:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>',
  download:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>',
  info:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
  maximize:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>',
  minimize:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>',
  camera:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>'
};

/**
 * Mengembalikan markup SVG fungsional minimalis (16px).
 * @param {string} name
 * @returns {string}
 */
export function createIcon(name) {
  return ICONS[name] || '';
}

/**
 * Melakukan escape karakter HTML agar aman dirender di template string.
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Memformat tanggal ISO menjadi format Indonesia ringkas.
 * @param {string} isoValue
 * @returns {string}
 */
export function formatDateId(isoValue) {
  if (!isoValue) return '-';
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return String(isoValue);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

/**
 * Mengekstrak ID berkas Google Drive dan menyusun tautan /preview dan /view yang valid.
 * @param {{ gdrive_file_id?: string, gdrive_preview_url?: string, gdrive_view_url?: string }} item
 * @returns {{ fileId: string, previewUrl: string, openUrl: string, hasDriveFile: boolean }}
 */
export function resolveGDriveLinks(item = {}) {
  const rawPreview = String(item.gdrive_preview_url || '').trim();
  const rawView = String(item.gdrive_view_url || '').trim();
  let fileId = String(item.gdrive_file_id || '').trim();

  const extractId = (url) => {
    const byPath = url.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
    if (byPath) return byPath[1];
    const byParam = url.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
    return byParam ? byParam[1] : '';
  };

  if (!fileId && rawPreview) fileId = extractId(rawPreview);
  if (!fileId && rawView) fileId = extractId(rawView);

  const previewUrl = fileId
    ? `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`
    : /^https?:\/\//i.test(rawPreview)
      ? rawPreview
      : '';

  const openUrl = fileId
    ? `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`
    : /^https?:\/\//i.test(rawView)
      ? rawView
      : previewUrl;

  const downloadUrl = fileId
    ? `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`
    : /^https?:\/\/.+\.pdf(\?.*)?$/i.test(openUrl)
      ? openUrl
      : '';

  return {
    fileId,
    previewUrl,
    openUrl,
    downloadUrl,
    hasDriveFile: Boolean(previewUrl)
  };
}

/**
 * Menyusun tautan WhatsApp resmi pustakawan/admin dengan pesan terisi otomatis.
 * @param {{ whatsapp_number?: string, order_message_prefix?: string }} contactAdmin
 * @param {string} detailMessage
 * @returns {string}
 */
export function buildWhatsAppUrl(contactAdmin = {}, detailMessage = '') {
  const rawDigits = String(
    contactAdmin.whatsapp_number || APP_CONFIG.SCHOOL_DEFAULTS.whatsappNumber
  ).replace(/\D/g, '');
  const normalizedPhone = rawDigits.startsWith('0')
    ? `62${rawDigits.slice(1)}`
    : rawDigits || APP_CONFIG.SCHOOL_DEFAULTS.whatsappNumber;
  const prefix =
    contactAdmin.order_message_prefix ||
    'Halo Pustakawan e-SIPENA SMAN 1 Sidayu, saya ingin menanyakan:';
  const fullText = detailMessage ? `${prefix} ${detailMessage}` : prefix;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(fullText)}`;
}

/**
 * Menentukan URL publik portal untuk QR Code atau tautan berbagi.
 * @param {Record<string, any>} settings
 * @returns {string}
 */
export function getPortalBaseUrl(settings = {}) {
  const origin = window.location?.origin || '';
  if (origin && !/localhost|127\.0\.0\.1|file:/i.test(origin)) {
    return origin.replace(/\/+$/, '');
  }
  const configured = String(settings?.portal_links?.portal_url || '').trim();
  if (/^https?:\/\//i.test(configured)) {
    return configured.replace(/\/+$/, '');
  }
  return origin ? origin.replace(/\/+$/, '') : 'https://esipena-smansi.pages.dev';
}

/**
 * Menampilkan notifikasi toast singkat pada sudut kanan bawah stage 16:9.
 * @param {string} message
 * @param {'info' | 'success' | 'error'} [type]
 * @param {number} [durationMs]
 */
export function showToast(message, type = 'info', durationMs = 3400) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast-item${type === 'success' ? ' is-success' : type === 'error' ? ' is-error' : ''}`;
  toast.textContent = String(message || '');
  container.appendChild(toast);

  while (container.children.length > 3) {
    container.firstElementChild?.remove();
  }

  window.setTimeout(() => {
    toast.remove();
  }, durationMs);
}

export {
  closeModal,
  isModalOpen,
  openModal,
  setModalBusy,
  syncModalHeaderFsUi,
  toggleBrowserFullscreen
} from './modal-helper.js';

/**
 * Mengembalikan kelas CSS badge peran penulis yang seragam.
 * @param {string} role
 * @returns {string}
 */
export function getRoleBadgeClass(role) {
  const normalized = String(role || '').toLowerCase();
  if (normalized.includes('guru')) return 'role-badge role-guru';
  if (normalized.includes('tendik')) return 'role-badge role-tendik';
  if (normalized.includes('xii')) return 'role-badge role-xii';
  if (normalized.includes('xi')) return 'role-badge role-xi';
  return 'role-badge role-x';
}

/**
 * Menghubungkan tombol baca suara (Web Speech API) dengan status otomatis aktif/henti.
 * @param {Element | null} btn
 * @param {() => string} getText
 * @param {string} [idleLabel]
 * @param {string} [activeLabel]
 */
export function bindSpeechToggleButton(
  btn,
  getText,
  idleLabel = 'Dengar Sinopsis',
  activeLabel = 'Hentikan Audio'
) {
  if (!(btn instanceof HTMLElement)) return;
  const setLabel = (speaking) => {
    btn.innerHTML = `${createIcon(speaking ? 'mute' : 'volume')}<span>${speaking ? activeLabel : idleLabel}</span>`;
  };
  btn.addEventListener('click', () => {
    if (!isSpeechSupported()) {
      showToast('Peramban ini belum mendukung pembacaan suara otomatis.', 'error');
      return;
    }
    if (isSpeaking()) {
      stopSpeech();
      setLabel(false);
      return;
    }
    setLabel(true);
    speak(getText(), {
      onEnd: () => {
        if (btn.isConnected) setLabel(false);
      },
      onError: () => {
        if (btn.isConnected) setLabel(false);
      }
    });
  });
}

/**
 * Menghasilkan markup indikator geser (swipe) dan titik halaman (page dots).
 * @param {number} currentPage
 * @param {number} totalPages
 * @param {string} [hintText]
 * @returns {string}
 */
export function renderSwipeCueHtml(currentPage, totalPages, hintText = 'Geser kiri / kanan') {
  if (totalPages <= 1) return '';
  const dots = Array.from({ length: totalPages }, (_, idx) => {
    const p = idx + 1;
    const active = p === currentPage;
    return `<button type="button" class="swipe-dot-btn${active ? ' is-active' : ''}" data-swipe-page="${p}" aria-label="Halaman ${p} dari ${totalPages}" aria-current="${active ? 'page' : 'false'}"><span class="swipe-dot-pill"></span></button>`;
  }).join('');

  return `<div class="swipe-dots" role="navigation" aria-label="Penanda halaman">${dots}</div>
   `;

  // <button type="button" class="swipe-cue-arrow-btn" data-swipe-page="${currentPage - 1}" ${currentPage <= 1 ? 'disabled' : ''} aria-label="Halaman sebelumnya">&lsaquo;</button>

  //  <span class="swipe-cue-text">${escapeHtml(hintText)} (${currentPage}/${totalPages})</span>
  // <button type="button" class="swipe-cue-arrow-btn" data-swipe-page="${currentPage + 1}" ${currentPage >= totalPages ? 'disabled' : ''} aria-label="Halaman berikutnya">&rsaquo;</button>

}
