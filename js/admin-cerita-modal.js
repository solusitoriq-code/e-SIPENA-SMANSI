/**
 * Sub-Modul & Modal Pengelola Daftar Video Cerita Gresik — e-SIPENA SMAN 1 Sidayu
 * Menangani tampilan daftar video di Ruang Pengelola serta tambah, sunting, dan hapus video.
 */

import { playSfx } from './audio.js';
import {
  adminCreateCeritaVideo,
  adminDeleteCeritaVideo,
  adminSaveCeritaVideo,
  parseCeritaVideoUrl
} from './data-service.js';
import { closeModal, createIcon, escapeHtml, openModal, setModalBusy, showToast } from './ui-utils.js';

async function syncAfterCeritaChange(onUpdated) {
  if (typeof window.ESIPENA_APP?.refreshData === 'function') {
    await window.ESIPENA_APP.refreshData();
  }
  await onUpdated?.();
}

/**
 * Merender daftar video Cerita Gresik di tab Kelola Antologi -> Cerita Gresik.
 * @param {any[]} videos
 * @returns {string}
 */
export function renderCeritaAdminSection(videos = []) {
  const cardsHtml = videos.length
    ? `<div class="catalog-admin-grid">${videos
        .map((video, idx) => {
          const info = parseCeritaVideoUrl(video.video_url);
          const safeId = escapeHtml(video.id);
          const safeTitle = escapeHtml(video.title);
          const safeUrl = escapeHtml(info.url || video.video_url || '');
          const desc = String(video.description || '').trim();
          const statusBadge = video.is_active === false
            ? '<span class="status-badge status-rejected">Disembunyikan</span>'
            : '<span class="status-badge status-approved">Tampil</span>';
          const thumbHtml = info.thumbnailUrl
            ? `<img class="admin-cerita-thumb" src="${escapeHtml(info.thumbnailUrl)}" alt="" width="76" height="48" loading="lazy" onerror="this.style.display='none'">`
            : `<div class="admin-cerita-thumb-icon" aria-hidden="true">${createIcon('play')}</div>`;

          return `
            <article class="admin-item-card">
              <div class="admin-item-top">
                <span class="panel-badge">#${escapeHtml(video.sort_order ?? idx + 1)}</span>
                <div class="admin-item-badges">
                  <span class="panel-badge">${escapeHtml(info.platform)}</span>
                  ${statusBadge}
                </div>
              </div>
              <div class="admin-book-row">
                ${thumbHtml}
                <div class="admin-cerita-info">
                  <h4>${safeTitle}</h4>
                  <p class="admin-item-meta admin-cerita-url-line" title="${safeUrl}">${safeUrl}</p>
                </div>
              </div>
              <p class="admin-model3d-snippet">${desc ? escapeHtml(desc) : 'Tanpa deskripsi.'}</p>
              <button type="button" class="secondary-btn inline-action-btn" data-edit-cerita-id="${safeId}">
                ${createIcon('play')}<span>Sunting Video</span>
              </button>
            </article>
          `;
        })
        .join('')}</div>`
    : `
      <article class="empty-stage-note">
        <h3>Belum Ada Video Cerita Gresik</h3>
        <p>Klik tombol <strong>+ Tambah Video</strong> untuk menambahkan daftar video ke menu Cerita Gresik.</p>
      </article>
    `;

  return `
    <div class="admin-section-bar">
      <p class="admin-section-note">Kelola daftar video Cerita Gresik: judul, deskripsi (opsional), dan link URL video.</p>
      <button type="button" class="primary-btn" id="btn-admin-add-cerita">+ Tambah Video</button>
    </div>
    ${cardsHtml}
  `;
}

/**
 * Membuka modal tambah, sunting, atau hapus satu video Cerita Gresik.
 * @param {Record<string, any> | null} video
 * @param {() => Promise<void> | void} onUpdated
 * @param {{ nextSortOrder?: number }} [options]
 */
export function openCeritaVideoEditorModal(video, onUpdated, { nextSortOrder = 1 } = {}) {
  const isNew = !video;
  const bodyEl = openModal({
    title: isNew ? 'Tambah Video Cerita Gresik' : `Sunting Video: ${video.title}`,
    wide: true,
    html: `
      <form id="admin-cerita-form" class="admin-modal-form">
        <div class="admin-form-grid">
          <label class="form-field form-field-span2">
            <span>Judul Video *</span>
            <input id="adm-cerita-title" type="text" value="${escapeHtml(video?.title || '')}" required maxlength="160" placeholder="Mis. Kisah Damar Kurung dan Maestro Masmundari" data-autofocus>
          </label>
          <div class="form-field form-field-span2">
            <div class="admin-tts-field-head">
              <label for="adm-cerita-url"><span>Link URL Video *</span></label>
              <button type="button" class="secondary-btn inline-action-btn" id="btn-adm-cerita-test">
                ${createIcon('external')}<span>Uji Tautan</span>
              </button>
            </div>
            <input id="adm-cerita-url" type="text" inputmode="url" value="${escapeHtml(video?.video_url || '')}" required placeholder="https://www.youtube.com/watch?v=... atau tautan video lain">
            <div class="admin-field-foot">
              <small id="adm-cerita-url-hint">Mendukung YouTube, Google Drive, Vimeo, MP4, maupun tautan video web lainnya.</small>
            </div>
          </div>
          <label class="form-field form-field-span2">
            <span>Deskripsi (Opsional)</span>
            <textarea id="adm-cerita-desc" rows="4" maxlength="1000" placeholder="Tulis ringkasan atau keterangan video jika diperlukan...">${escapeHtml(video?.description || '')}</textarea>
          </label>
          <label class="form-field">
            <span>Urutan Tampil</span>
            <input id="adm-cerita-order" type="number" min="1" max="999" value="${escapeHtml(video?.sort_order || nextSortOrder)}">
          </label>
          <div class="form-field form-field-checkbox">
            <label class="checkbox-consent">
              <input id="adm-cerita-active" type="checkbox" ${video?.is_active !== false ? 'checked' : ''}>
              <span>Tampilkan di menu Cerita Gresik</span>
            </label>
          </div>
        </div>

        <div class="admin-modal-actions admin-modal-actions-split">
          ${!isNew ? '<button type="button" id="btn-delete-cerita" class="danger-btn">Hapus Video</button>' : '<span></span>'}
          <button type="submit" id="btn-save-cerita" class="primary-btn">${isNew ? 'Tambahkan Video' : 'Simpan Perubahan'}</button>
        </div>
      </form>
    `
  });

  if (!bodyEl) return;

  const q = (sel) => bodyEl.querySelector(sel);
  const titleInput = q('#adm-cerita-title');
  const urlInput = q('#adm-cerita-url');
  const descInput = q('#adm-cerita-desc');
  const orderInput = q('#adm-cerita-order');
  const activeCheck = q('#adm-cerita-active');
  const hintEl = q('#adm-cerita-url-hint');
  const testBtn = q('#btn-adm-cerita-test');
  const saveBtn = q('#btn-save-cerita');
  const delBtn = q('#btn-delete-cerita');
  const defaultSaveText = saveBtn?.textContent || 'Simpan Perubahan';
  let busy = false;
  let deleteArmed = false;

  const updateUrlHint = () => {
    const raw = String(urlInput?.value || '').trim();
    if (!hintEl) return;
    if (!raw) {
      hintEl.textContent = 'Mendukung YouTube, Google Drive, Vimeo, MP4, maupun tautan video web lainnya.';
      hintEl.classList.remove('is-error');
      return;
    }
    const parsed = parseCeritaVideoUrl(raw);
    if (!parsed.valid) {
      hintEl.textContent = 'Format URL belum valid. Gunakan tautan diawali https:// atau http://.';
      hintEl.classList.add('is-error');
      return;
    }
    hintEl.classList.remove('is-error');
    hintEl.textContent = parsed.mode === 'external'
      ? `Terdeteksi: ${parsed.platform} (dibuka di tab baru dari pemutar).`
      : `Terdeteksi: ${parsed.platform} (siap diputar langsung di aplikasi).`;
  };

  updateUrlHint();
  urlInput?.addEventListener('input', updateUrlHint);

  testBtn?.addEventListener('click', () => {
    const parsed = parseCeritaVideoUrl(urlInput?.value || '');
    if (!parsed.valid) {
      playSfx('error');
      return showToast('Masukkan link URL video yang valid terlebih dahulu.', 'error');
    }
    playSfx('click');
    window.open(parsed.url, '_blank', 'noopener,noreferrer');
  });

  const setBusy = (next) => {
    busy = next;
    setModalBusy(next);
    if (saveBtn instanceof HTMLButtonElement) {
      saveBtn.disabled = next;
      saveBtn.textContent = next ? 'Menyimpan...' : defaultSaveText;
    }
    if (delBtn instanceof HTMLButtonElement) delBtn.disabled = next;
  };

  delBtn?.addEventListener('click', async () => {
    if (isNew || busy) return;
    if (!deleteArmed) {
      deleteArmed = true;
      delBtn.textContent = 'Konfirmasi Hapus?';
      playSfx('click');
      return;
    }
    setBusy(true);
    try {
      await adminDeleteCeritaVideo(video.id);
      await syncAfterCeritaChange(onUpdated);
      setBusy(false);
      playSfx('success');
      showToast('Video Cerita Gresik dihapus.', 'success');
      closeModal(true);
    } catch (err) {
      setBusy(false);
      playSfx('error');
      showToast(err?.message || 'Gagal menghapus video Cerita Gresik.', 'error');
    }
  });

  q('#admin-cerita-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;

    const title = String(titleInput?.value || '').trim();
    const rawUrl = String(urlInput?.value || '').trim();
    const parsed = parseCeritaVideoUrl(rawUrl);
    const description = String(descInput?.value || '').trim();
    const sortOrder = Number(orderInput?.value || nextSortOrder) || 1;
    const isActive = Boolean(activeCheck?.checked);

    if (!title) {
      playSfx('error');
      return showToast('Judul video wajib diisi.', 'error');
    }
    if (!parsed.valid) {
      playSfx('error');
      return showToast('Link URL video harus berupa tautan http:// atau https:// yang valid.', 'error');
    }

    setBusy(true);
    try {
      const payload = {
        title,
        description,
        video_url: parsed.url,
        sort_order: sortOrder,
        is_active: isActive
      };
      if (isNew) await adminCreateCeritaVideo(payload);
      else await adminSaveCeritaVideo(video.id, payload);

      await syncAfterCeritaChange(onUpdated);
      setBusy(false);
      playSfx('success');
      showToast(isNew ? 'Video Cerita Gresik ditambahkan.' : 'Video Cerita Gresik diperbarui.', 'success');
      closeModal(true);
    } catch (err) {
      setBusy(false);
      playSfx('error');
      showToast(err?.message || 'Gagal menyimpan video Cerita Gresik.', 'error');
    }
  });
}
