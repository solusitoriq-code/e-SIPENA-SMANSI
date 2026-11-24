/**
 * Modal Tambah, Sunting & Hapus Kegiatan Sudut Pustakawan — e-SIPENA SMAN 1 Sidayu
 * Mendukung judul, deskripsi singkat (opsional), dan unggahan multi-foto WebP ke Google Drive (kegiatan/).
 */

import { playSfx } from './audio.js';
import {
  adminCreateActivity,
  adminDeleteActivity,
  adminSaveActivity,
  normalizeActivityPhotos,
  uploadActivityPhotoToGDrive
} from './data-service.js';
import { closeModal, createIcon, escapeHtml, openModal, setModalBusy, showToast } from './ui-utils.js';

const FALLBACK_PHOTO = 'assets/images/logo-smansi.webp';
const MAX_INPUT_BYTES = 10 * 1024 * 1024;

function isValidImageFile(file) {
  if (!file || typeof file.name !== 'string') return false;
  const okType = /^image\/(webp|png|jpeg|jpg)$/i.test(String(file.type || ''));
  const okExt = /\.(webp|png|jpe?g)$/i.test(file.name);
  return (okType || okExt) && file.size > 0 && file.size <= MAX_INPUT_BYTES;
}

async function syncAfterActivityChange(onUpdated) {
  if (typeof window.ESIPENA_APP?.refreshData === 'function') {
    await window.ESIPENA_APP.refreshData();
  }
  await onUpdated?.();
}

/**
 * Membuka modal untuk menambah (activity = null) atau menyunting/menghapus kegiatan Sudut Pustakawan.
 * @param {Record<string, any> | null} activity
 * @param {() => Promise<void> | void} onUpdated
 * @param {{ nextSortOrder?: number }} [options]
 */
export function openLibrarianActivityModal(activity, onUpdated, { nextSortOrder = 1 } = {}) {
  const isNew = !activity;
  const initialPhotos = normalizeActivityPhotos(activity?.photos || []);
  const photoItems = initialPhotos.map((p) => ({
    kind: 'existing',
    url: p.url,
    file_id: p.file_id || '',
    name: p.name || 'Foto tersimpan'
  }));
  const createdObjectUrls = new Set();

  const cleanupObjectUrls = () => {
    for (const url of createdObjectUrls) {
      URL.revokeObjectURL(url);
    }
    createdObjectUrls.clear();
  };

  const bodyEl = openModal({
    title: isNew ? 'Tambah Kegiatan Sudut Pustakawan' : `Sunting Kegiatan: ${activity.title}`,
    wide: true,
    onClose: cleanupObjectUrls,
    html: `
      <form id="admin-activity-form" class="admin-modal-form">
        <div class="admin-form-grid">
          <label class="form-field form-field-span2">
            <span>Judul Kegiatan *</span>
            <input id="adm-act-title" type="text" value="${escapeHtml(activity?.title || '')}" required maxlength="140" placeholder="Mis. Bedah Buku Antologi Siswa 2026">
          </label>
          <label class="form-field form-field-span2">
            <span>Deskripsi Singkat (Opsional)</span>
            <textarea id="adm-act-desc" rows="3" maxlength="600" placeholder="Tulis keterangan singkat kegiatan jika diperlukan...">${escapeHtml(activity?.description || '')}</textarea>
          </label>
          <label class="form-field">
            <span>Urutan Tampil</span>
            <input id="adm-act-order" type="number" min="1" max="999" value="${escapeHtml(activity?.sort_order || nextSortOrder)}">
          </label>
          <div class="form-field form-field-checkbox">
            <label class="checkbox-consent">
              <input id="adm-act-active" type="checkbox" ${activity?.is_active !== false ? 'checked' : ''}>
              <span>Tampilkan di Sudut Pustakawan</span>
            </label>
          </div>

          <div class="file-drop-box form-field-span2">
            <div class="file-picker-row">
              <label class="secondary-btn file-picker-label inline-action-btn" for="adm-act-files">${createIcon('camera')}<span>Pilih / Tambah Foto</span></label>
              <input id="adm-act-files" type="file" accept="image/webp,image/png,image/jpeg" multiple class="sr-only-input">
              <span id="adm-act-photo-count" class="panel-badge">${photoItems.length} Foto</span>
            </div>
            <p class="file-status-text">Pilih satu atau beberapa foto sekaligus.</p>
            <div id="adm-act-photo-grid" class="activity-photo-editor-grid"></div>
          </div>
        </div>

        <div id="adm-act-progress" class="upload-progress-wrap" hidden aria-live="polite">
          <div class="upload-progress-meta">
            <span id="adm-act-progress-label">Memproses foto kegiatan...</span>
            <strong id="adm-act-progress-pct">0%</strong>
          </div>
          <div class="upload-progress-track">
            <div id="adm-act-progress-fill" class="upload-progress-fill"></div>
          </div>
        </div>

        <div class="admin-modal-actions admin-modal-actions-split">
          ${!isNew ? '<button type="button" id="btn-delete-act" class="danger-btn">Hapus Kegiatan</button>' : '<span></span>'}
          <button type="submit" id="btn-save-act" class="primary-btn">${isNew ? 'Tambahkan Kegiatan' : 'Simpan Kegiatan'}</button>
        </div>
      </form>
    `
  });

  if (!bodyEl) return;

  const q = (sel) => bodyEl.querySelector(sel);
  const fileInput = q('#adm-act-files');
  const gridEl = q('#adm-act-photo-grid');
  const countBadge = q('#adm-act-photo-count');
  const saveBtn = q('#btn-save-act');
  const delBtn = q('#btn-delete-act');
  const defaultSaveText = saveBtn?.textContent || 'Simpan Kegiatan';
  let formLocked = false;
  let deleteArmed = false;

  const setProgress = (pct, label) => {
    const wrap = q('#adm-act-progress');
    const lbl = q('#adm-act-progress-label');
    const pctEl = q('#adm-act-progress-pct');
    const fill = q('#adm-act-progress-fill');
    const clamped = Math.max(0, Math.min(100, Math.round(pct)));
    if (wrap instanceof HTMLElement) wrap.hidden = false;
    if (lbl && label) lbl.textContent = label;
    if (pctEl) pctEl.textContent = `${clamped}%`;
    if (fill instanceof HTMLElement) fill.style.width = `${clamped}%`;
  };

  const setFormLocked = (locked) => {
    formLocked = locked;
    setModalBusy(locked);
    if (saveBtn instanceof HTMLButtonElement) {
      saveBtn.disabled = locked;
      saveBtn.textContent = locked ? 'Mengunggah & Menyimpan...' : defaultSaveText;
    }
    if (delBtn instanceof HTMLButtonElement) delBtn.disabled = locked;
    if (fileInput instanceof HTMLInputElement) fileInput.disabled = locked;
  };

  const renderPhotoGrid = () => {
    if (countBadge) countBadge.textContent = `${photoItems.length} Foto`;
    if (!(gridEl instanceof HTMLElement)) return;
    if (!photoItems.length) {
      gridEl.innerHTML = '<p class="admin-muted-note">Belum ada foto dipilih. Pilih minimal 1 foto (disarankan lebih dari satu untuk galeri).</p>';
      return;
    }

    gridEl.innerHTML = photoItems
      .map((item, idx) => {
        const src = item.kind === 'pending' ? item.previewUrl : item.url;
        const statusLabel = item.kind === 'pending' ? 'Siap unggah' : 'Tersimpan';
        return `
          <div class="activity-photo-tile">
            <div class="activity-photo-thumb-wrap">
              <img src="${escapeHtml(src)}" alt="Foto kegiatan ${idx + 1}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_PHOTO}'">
              <span class="activity-photo-index">#${idx + 1}</span>
            </div>
            <div class="activity-photo-tile-meta">
              <span>${statusLabel}</span>
              <div class="activity-photo-tile-btns">
                <button type="button" class="secondary-btn activity-mini-btn" data-act-move="-1" data-idx="${idx}" aria-label="Geser foto ${idx + 1} ke kiri"${idx === 0 ? ' disabled' : ''}>&larr;</button>
                <button type="button" class="secondary-btn activity-mini-btn" data-act-move="1" data-idx="${idx}" aria-label="Geser foto ${idx + 1} ke kanan"${idx === photoItems.length - 1 ? ' disabled' : ''}>&rarr;</button>
                <button type="button" class="danger-btn activity-mini-btn" data-act-remove="${idx}" aria-label="Hapus foto ${idx + 1}">Hapus</button>
              </div>
            </div>
          </div>
        `;
      })
      .join('');
  };

  renderPhotoGrid();

  fileInput?.addEventListener('change', () => {
    const files = [...(fileInput.files || [])];
    if (!files.length) return;
    let skipped = 0;
    for (const file of files) {
      if (!isValidImageFile(file)) {
        skipped += 1;
        continue;
      }
      const previewUrl = URL.createObjectURL(file);
      createdObjectUrls.add(previewUrl);
      photoItems.push({ kind: 'pending', file, previewUrl, name: file.name });
    }
    fileInput.value = '';
    renderPhotoGrid();
    if (skipped > 0) {
      playSfx('error');
      showToast(`${skipped} berkas dilewati (wajib JPG/PNG/WebP maks. 10 MB).`, 'error');
    } else {
      playSfx('click');
    }
  });

  gridEl?.addEventListener('click', (event) => {
    if (formLocked) return;
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;

    const removeBtn = target.closest('[data-act-remove]');
    if (removeBtn instanceof HTMLElement) {
      const idx = Number(removeBtn.dataset.actRemove);
      const removed = photoItems.splice(idx, 1)[0];
      if (removed?.kind === 'pending' && removed.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
        createdObjectUrls.delete(removed.previewUrl);
      }
      playSfx('click');
      renderPhotoGrid();
      return;
    }

    const moveBtn = target.closest('[data-act-move]');
    if (moveBtn instanceof HTMLElement) {
      const idx = Number(moveBtn.dataset.idx);
      const delta = Number(moveBtn.dataset.actMove);
      const nextIdx = idx + delta;
      if (nextIdx >= 0 && nextIdx < photoItems.length) {
        const [moved] = photoItems.splice(idx, 1);
        photoItems.splice(nextIdx, 0, moved);
        playSfx('click');
        renderPhotoGrid();
      }
    }
  });

  delBtn?.addEventListener('click', async () => {
    if (isNew || formLocked) return;
    if (!deleteArmed) {
      deleteArmed = true;
      delBtn.textContent = 'Konfirmasi Hapus?';
      playSfx('click');
      return;
    }
    setFormLocked(true);
    try {
      await adminDeleteActivity(activity.id);
      await syncAfterActivityChange(onUpdated);
      setFormLocked(false);
      playSfx('success');
      showToast('Kegiatan Sudut Pustakawan dihapus.', 'success');
      closeModal(true);
    } catch (err) {
      setFormLocked(false);
      playSfx('error');
      showToast(err?.message || 'Gagal menghapus kegiatan.', 'error');
    }
  });

  q('#admin-activity-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (formLocked) return;

    const title = String(q('#adm-act-title')?.value || '').trim();
    const description = String(q('#adm-act-desc')?.value || '').trim();
    const sortOrder = Number(q('#adm-act-order')?.value || nextSortOrder) || 1;
    const isActive = Boolean(q('#adm-act-active')?.checked);

    if (!title) {
      playSfx('error');
      return showToast('Judul kegiatan wajib diisi.', 'error');
    }
    if (!photoItems.length) {
      playSfx('error');
      return showToast('Unggah minimal 1 foto kegiatan.', 'error');
    }

    setFormLocked(true);
    const pendingTotal = photoItems.filter((p) => p.kind === 'pending').length;
    let uploadedCount = 0;
    let folderWarnShown = false;

    try {
      const finalPhotos = [];
      for (let i = 0; i < photoItems.length; i += 1) {
        const item = photoItems[i];
        if (item.kind === 'existing') {
          finalPhotos.push({ url: item.url, file_id: item.file_id || '', name: item.name || '' });
          continue;
        }
        uploadedCount += 1;
        const pct = Math.round((uploadedCount / Math.max(1, pendingTotal)) * 82);
        setProgress(pct, `Mengunggah foto ${uploadedCount} dari ${pendingTotal} ke Drive (kegiatan/)...`);
        const res = await uploadActivityPhotoToGDrive(item.file);
        if (res.warning && !folderWarnShown) {
          folderWarnShown = true;
          showToast(res.warning, 'info', 4500);
        }
        const uploadedEntry = { url: res.url, file_id: res.fileId || '', name: item.name || '' };
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
          createdObjectUrls.delete(item.previewUrl);
        }
        photoItems[i] = { kind: 'existing', ...uploadedEntry };
        finalPhotos.push(uploadedEntry);
      }

      setProgress(92, 'Menyimpan data kegiatan...');
      const payload = { title, description, photos: finalPhotos, sort_order: sortOrder, is_active: isActive };
      if (isNew) await adminCreateActivity(payload);
      else await adminSaveActivity(activity.id, payload);

      setProgress(98, 'Memperbarui tampilan Sudut Pustakawan...');
      await syncAfterActivityChange(onUpdated);
      setProgress(100, 'Selesai.');
      setFormLocked(false);
      playSfx('success');
      showToast(isNew ? 'Kegiatan Sudut Pustakawan ditambahkan.' : 'Kegiatan Sudut Pustakawan diperbarui.', 'success');
      closeModal(true);
    } catch (err) {
      setFormLocked(false);
      renderPhotoGrid();
      const wrap = q('#adm-act-progress');
      if (wrap instanceof HTMLElement) wrap.hidden = true;
      playSfx('error');
      showToast(err?.message || 'Gagal menyimpan kegiatan Sudut Pustakawan.', 'error');
    }
  });
}
