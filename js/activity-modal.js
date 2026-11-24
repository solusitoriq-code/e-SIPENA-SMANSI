/**
 * Modal Galeri Kegiatan Sudut Pustakawan — e-SIPENA SMAN 1 Sidayu
 * Menampilkan judul kegiatan, deskripsi singkat (bila ada), serta galeri multi-foto
 * yang ramah sentuh (swipe), keyboard, dan D-Pad remote TV Android.
 */

import { playSfx } from './audio.js';
import { normalizeActivityPhotos } from './data-service.js';
import { bindHorizontalSwipe } from './nav-controls.js';
import { buildWhatsAppUrl, createIcon, escapeHtml, openModal } from './ui-utils.js';

const FALLBACK_PHOTO = 'assets/images/logo-smansi.webp';

/**
 * Membuka modal dokumentasi foto kegiatan Sudut Pustakawan.
 * @param {Record<string, any>} activity
 * @param {Record<string, any>} contactAdmin
 */
export function openLibrarianActivityDetailModal(activity, contactAdmin = {}) {
  const photos = normalizeActivityPhotos(activity?.photos || []);
  const displayPhotos = photos.length ? photos : [{ url: FALLBACK_PHOTO, name: activity?.title || 'Kegiatan' }];
  const hasMultiple = displayPhotos.length > 1;
  const description = String(activity?.description || '').trim();
  const waUrl = buildWhatsAppUrl(
    contactAdmin,
    `saya ingin menanyakan kegiatan "${activity?.title || 'Sudut Pustakawan'}".`
  );

  let currentIdx = 0;

  const bodyEl = openModal({
    title: activity?.title || 'Dokumentasi Kegiatan Perpustakaan',
    wide: true,
    html: `
      <div class="activity-modal-wrap">
        <div id="activity-gallery-stage" class="activity-gallery-stage" tabindex="0" aria-label="Galeri foto kegiatan">
          <img id="activity-main-photo" class="activity-main-photo" src="${escapeHtml(displayPhotos[0].url)}" alt="${escapeHtml(activity?.title || 'Foto kegiatan')}" decoding="async" onerror="this.onerror=null;this.src='${FALLBACK_PHOTO}'">
          <span id="act-photo-counter" class="activity-photo-counter">Foto 1 / ${displayPhotos.length}</span>
        </div>

        ${
          hasMultiple
            ? `
              <div class="activity-gallery-controls">
                <button type="button" id="btn-act-prev" class="secondary-btn inline-action-btn" aria-label="Foto sebelumnya">${createIcon('rotateLeft')}<span>Sebelumnya</span></button>
                <div id="act-photo-thumbs" class="activity-thumb-strip" role="group" aria-label="Pilih foto kegiatan">
                  ${displayPhotos
                    .map(
                      (p, idx) => `
                        <button type="button" class="activity-thumb-btn${idx === 0 ? ' is-active' : ''}" data-act-thumb-idx="${idx}" aria-label="Lihat foto ${idx + 1}">
                          <img src="${escapeHtml(p.url)}" alt="" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${FALLBACK_PHOTO}'">
                        </button>
                      `
                    )
                    .join('')}
                </div>
                <button type="button" id="btn-act-next" class="secondary-btn inline-action-btn" aria-label="Foto berikutnya"><span>Berikutnya</span>${createIcon('rotateRight')}</button>
              </div>
            `
            : ''
        }

        ${description ? `<p class="activity-modal-desc">${escapeHtml(description)}</p>` : ''}

        <div class="librarian-modal-actions">
          <a class="secondary-btn inline-action-btn" href="${escapeHtml(waUrl)}" target="_blank" rel="noopener noreferrer">${createIcon('whatsapp')}<span>Tanya Pustakawan via WA</span></a>
        </div>
      </div>
    `
  });

  if (!bodyEl || !hasMultiple) return;

  const mainImg = bodyEl.querySelector('#activity-main-photo');
  const counterEl = bodyEl.querySelector('#act-photo-counter');
  const stageEl = bodyEl.querySelector('#activity-gallery-stage');
  const thumbBtns = [...bodyEl.querySelectorAll('[data-act-thumb-idx]')];

  const showPhotoAt = (nextIdx, withSfx = true) => {
    const total = displayPhotos.length;
    currentIdx = ((nextIdx % total) + total) % total;
    if (mainImg instanceof HTMLImageElement) {
      mainImg.src = displayPhotos[currentIdx].url || FALLBACK_PHOTO;
    }
    if (counterEl) {
      counterEl.textContent = `Foto ${currentIdx + 1} / ${total}`;
    }
    for (const btn of thumbBtns) {
      const active = Number(btn.getAttribute('data-act-thumb-idx')) === currentIdx;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
    if (withSfx) playSfx('click');
  };

  bodyEl.querySelector('#btn-act-prev')?.addEventListener('click', () => showPhotoAt(currentIdx - 1));
  bodyEl.querySelector('#btn-act-next')?.addEventListener('click', () => showPhotoAt(currentIdx + 1));

  bodyEl.querySelector('#act-photo-thumbs')?.addEventListener('click', (event) => {
    const btn = event.target instanceof HTMLElement ? event.target.closest('[data-act-thumb-idx]') : null;
    if (!(btn instanceof HTMLElement)) return;
    showPhotoAt(Number(btn.dataset.actThumbIdx || 0));
  });

  if (stageEl instanceof HTMLElement) {
    stageEl.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        event.stopPropagation();
        showPhotoAt(currentIdx - 1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        event.stopPropagation();
        showPhotoAt(currentIdx + 1);
      }
    });
    bindHorizontalSwipe(stageEl, {
      onNext: () => showPhotoAt(currentIdx + 1),
      onPrev: () => showPhotoAt(currentIdx - 1)
    });
  }
}
