/**
 * Modal Editor Topik Budaya Gresik & Dokumen Pustakawan (Fitur 5) — e-SIPENA SMAN 1 Sidayu
 * Mendukung tambah, sunting, dan hapus untuk topik Budaya Gresik maupun dokumen Sudut Pustakawan.
 */

import { playSfx } from './audio.js';
import {
  adminCreateCulturePrompt,
  adminDeleteCulturePrompt,
  adminSaveCulturePrompt,
  adminSaveSetting
} from './data-service.js';
import { closeModal, escapeHtml, openModal, showToast } from './ui-utils.js';
import { extractYouTubeId } from './yt-player.js';

async function syncPortalAfterSave(onUpdated) {
  if (typeof window.ESIPENA_APP?.refreshData === 'function') {
    await window.ESIPENA_APP.refreshData();
  }
  await onUpdated?.();
}

/**
 * Membuka modal untuk menambah (topic = null) atau menyunting/menghapus topik Jejak Budaya Gresik.
 * @param {Record<string, any> | null} topic
 * @param {() => Promise<void> | void} onUpdated
 * @param {{ nextSortOrder?: number }} [options]
 */
export function openCultureEditorModal(topic, onUpdated, { nextSortOrder = 6 } = {}) {
  const isNew = !topic;
  const bodyEl = openModal({
    title: isNew ? 'Tambah Topik Budaya Gresik' : `Sunting Budaya Gresik: ${topic.title}`,
    wide: true,
    html: `
      <form id="admin-culture-form" class="admin-modal-form">
        <div class="admin-form-grid">
          <label class="form-field form-field-span2">
            <span>Judul Topik *</span>
            <input id="adm-cul-title" type="text" value="${escapeHtml(topic?.title || '')}" required>
          </label>
          <label class="form-field form-field-span2">
            <span>Subjudul Singkat</span>
            <input id="adm-cul-subtitle" type="text" value="${escapeHtml(topic?.subtitle || '')}">
          </label>
          <label class="form-field">
            <span>Link atau ID Video YouTube</span>
            <input id="adm-cul-yt" type="text" value="${escapeHtml(topic?.youtube_id || '')}" placeholder="Tempel URL YouTube atau ID 11 karakter">
          </label>
          <label class="form-field">
            <span>Tag Lokasi, Durasi &amp; Urutan</span>
            <div class="inline-triple-inputs">
              <input id="adm-cul-loc" type="text" value="${escapeHtml(topic?.location_tag || 'Gresik')}" placeholder="Lokasi">
              <input id="adm-cul-dur" type="text" value="${escapeHtml(topic?.duration_label || '04:00')}" placeholder="04:30">
              <input id="adm-cul-order" type="number" min="1" max="999" value="${escapeHtml(topic?.sort_order ?? nextSortOrder)}" aria-label="Urutan topik">
            </div>
          </label>
          <label class="form-field form-field-span2">
            <span>Ringkasan Artikel Pemantik *</span>
            <textarea id="adm-cul-summary" rows="3" required>${escapeHtml(topic?.article_summary || '')}</textarea>
          </label>
          <label class="form-field form-field-span2">
            <span>Instruksi Tugas Menulis *</span>
            <textarea id="adm-cul-prompt" rows="2" required>${escapeHtml(topic?.writing_prompt || '')}</textarea>
          </label>
        </div>
        <div class="inline-check-pair">
          <label class="checkbox-consent">
            <input id="adm-cul-active" type="checkbox" ${topic?.is_active !== false ? 'checked' : ''}>
            <span>Tampilkan di panel Jejak Budaya Gresik</span>
          </label>
          <label class="checkbox-consent">
            <input id="adm-cul-placeholder" type="checkbox" ${topic?.is_placeholder ? 'checked' : ''}>
            <span>Tandai berstatus placeholder</span>
          </label>
        </div>
        <div class="admin-modal-actions admin-modal-actions-split">
          ${!isNew ? '<button type="button" id="btn-delete-culture" class="danger-btn">Hapus Topik</button>' : '<span></span>'}
          <button type="submit" id="btn-save-culture" class="primary-btn">${isNew ? 'Tambahkan Topik' : 'Simpan Topik Budaya'}</button>
        </div>
      </form>
    `
  });

  if (!bodyEl) return;

  const delBtn = bodyEl.querySelector('#btn-delete-culture');
  let deleteArmed = false;
  delBtn?.addEventListener('click', async () => {
    if (!topic) return;
    if (!deleteArmed) {
      deleteArmed = true;
      delBtn.textContent = 'Konfirmasi Hapus?';
      playSfx('click');
      return;
    }
    if (delBtn instanceof HTMLButtonElement) delBtn.disabled = true;
    try {
      await adminDeleteCulturePrompt(topic.id);
      await syncPortalAfterSave(onUpdated);
      playSfx('success');
      showToast('Topik Budaya Gresik dihapus.', 'success');
      closeModal();
    } catch (err) {
      playSfx('error');
      showToast(err?.message || 'Gagal menghapus topik budaya.', 'error');
      if (delBtn instanceof HTMLButtonElement) delBtn.disabled = false;
    }
  });

  bodyEl.querySelector('#admin-culture-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const saveBtn = bodyEl.querySelector('#btn-save-culture');
    if (saveBtn instanceof HTMLButtonElement) saveBtn.disabled = true;

    try {
      const rawYt = String(bodyEl.querySelector('#adm-cul-yt')?.value || '').trim();
      const parsedYt = extractYouTubeId(rawYt);
      if (rawYt && !parsedYt) throw new Error('Link atau ID video YouTube tidak valid.');

      const stillPlaceholder = parsedYt ? false : Boolean(bodyEl.querySelector('#adm-cul-placeholder')?.checked);
      const payload = {
        title: bodyEl.querySelector('#adm-cul-title')?.value || '',
        subtitle: bodyEl.querySelector('#adm-cul-subtitle')?.value || '',
        youtube_id: parsedYt,
        location_tag: bodyEl.querySelector('#adm-cul-loc')?.value || 'Gresik',
        duration_label: bodyEl.querySelector('#adm-cul-dur')?.value || '04:00',
        sort_order: Number(bodyEl.querySelector('#adm-cul-order')?.value || nextSortOrder),
        article_summary: bodyEl.querySelector('#adm-cul-summary')?.value || '',
        writing_prompt: bodyEl.querySelector('#adm-cul-prompt')?.value || '',
        is_active: Boolean(bodyEl.querySelector('#adm-cul-active')?.checked),
        is_placeholder: stillPlaceholder
      };

      if (isNew) await adminCreateCulturePrompt(payload);
      else await adminSaveCulturePrompt(topic.id, payload);

      await syncPortalAfterSave(onUpdated);
      playSfx('success');
      showToast(isNew ? 'Topik Budaya Gresik baru ditambahkan.' : 'Topik Budaya Gresik diperbarui.', 'success');
      closeModal();
    } catch (err) {
      playSfx('error');
      showToast(err?.message || 'Gagal menyimpan topik budaya.', 'error');
      if (saveBtn instanceof HTMLButtonElement) saveBtn.disabled = false;
    }
  });
}

/**
 * Membuka modal untuk menambah (docIndex = -1) atau menyunting/menghapus dokumen Sudut Pustakawan.
 * @param {Record<string, any>} cornerSetting
 * @param {number} docIndex
 * @param {() => Promise<void> | void} onUpdated
 */
export function openLibrarianDocModal(cornerSetting, docIndex, onUpdated) {
  const docs = Array.isArray(cornerSetting?.documents) ? cornerSetting.documents : [];
  const isNew = docIndex < 0 || !docs[docIndex];
  const doc = isNew ? { id: `doc-${Date.now().toString(36)}`, title: '', category: 'Panduan Penulis', updated_label: 'Edisi 2026', url: '', summary: '' } : docs[docIndex];

  const bodyEl = openModal({
    title: isNew ? 'Tambah Dokumen Sudut Pustakawan' : `Sunting Dokumen: ${doc.title}`,
    html: `
      <form id="admin-doc-form" class="admin-modal-form">
        <div class="admin-form-grid">
          <label class="form-field form-field-span2">
            <span>Judul Dokumen *</span>
            <input id="adm-doc-title" type="text" value="${escapeHtml(doc.title || '')}" required>
          </label>
          <label class="form-field">
            <span>Kategori *</span>
            <input id="adm-doc-cat" type="text" value="${escapeHtml(doc.category || '')}" required>
          </label>
          <label class="form-field">
            <span>Label Edisi</span>
            <input id="adm-doc-updated" type="text" value="${escapeHtml(doc.updated_label || '')}" placeholder="Edisi 2026">
          </label>
          <label class="form-field form-field-span2">
            <span>Tautan Dokumen Google Drive / PDF</span>
            <input id="adm-doc-url" type="url" value="${escapeHtml(doc.url || '')}" placeholder="https://drive.google.com/file/d/.../view">
          </label>
          <label class="form-field form-field-span2">
            <span>Ringkasan Dokumen *</span>
            <textarea id="adm-doc-summary" rows="3" required>${escapeHtml(doc.summary || '')}</textarea>
          </label>
        </div>
        <div class="admin-modal-actions admin-modal-actions-split">
          ${!isNew ? '<button type="button" id="btn-delete-doc" class="danger-btn">Hapus Dokumen</button>' : '<span></span>'}
          <button type="submit" id="btn-save-doc" class="primary-btn">${isNew ? 'Tambahkan Dokumen' : 'Simpan Dokumen'}</button>
        </div>
      </form>
    `
  });

  if (!bodyEl) return;

  const delBtn = bodyEl.querySelector('#btn-delete-doc');
  let deleteArmed = false;
  delBtn?.addEventListener('click', async () => {
    if (isNew) return;
    if (!deleteArmed) {
      deleteArmed = true;
      delBtn.textContent = 'Konfirmasi Hapus?';
      playSfx('click');
      return;
    }
    if (delBtn instanceof HTMLButtonElement) delBtn.disabled = true;
    try {
      const nextDocs = docs.filter((_, idx) => idx !== docIndex);
      const hasUrl = nextDocs.some((d) => /^https?:\/\//i.test(String(d.url || '')));
      await adminSaveSetting(
        'librarian_corner',
        { ...cornerSetting, documents: nextDocs, is_placeholder: !hasUrl },
        { is_placeholder: !hasUrl }
      );
      await syncPortalAfterSave(onUpdated);
      playSfx('success');
      showToast('Dokumen Sudut Pustakawan dihapus.', 'success');
      closeModal();
    } catch (err) {
      playSfx('error');
      showToast(err?.message || 'Gagal menghapus dokumen.', 'error');
      if (delBtn instanceof HTMLButtonElement) delBtn.disabled = false;
    }
  });

  bodyEl.querySelector('#admin-doc-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const saveBtn = bodyEl.querySelector('#btn-save-doc');
    if (saveBtn instanceof HTMLButtonElement) saveBtn.disabled = true;

    try {
      const editedDoc = {
        ...doc,
        title: String(bodyEl.querySelector('#adm-doc-title')?.value || '').trim(),
        category: String(bodyEl.querySelector('#adm-doc-cat')?.value || '').trim(),
        updated_label: String(bodyEl.querySelector('#adm-doc-updated')?.value || '').trim(),
        url: String(bodyEl.querySelector('#adm-doc-url')?.value || '').trim(),
        summary: String(bodyEl.querySelector('#adm-doc-summary')?.value || '').trim()
      };
      const nextDocs = isNew
        ? [...docs, editedDoc]
        : docs.map((item, idx) => (idx === docIndex ? editedDoc : item));
      const hasUrl = nextDocs.some((d) => /^https?:\/\//i.test(String(d.url || '')));
      await adminSaveSetting(
        'librarian_corner',
        { ...cornerSetting, documents: nextDocs, is_placeholder: !hasUrl },
        { is_placeholder: !hasUrl }
      );
      await syncPortalAfterSave(onUpdated);
      playSfx('success');
      showToast(isNew ? 'Dokumen Sudut Pustakawan ditambahkan.' : 'Dokumen Sudut Pustakawan diperbarui.', 'success');
      closeModal();
    } catch (err) {
      playSfx('error');
      showToast(err?.message || 'Gagal menyimpan dokumen Sudut Pustakawan.', 'error');
      if (saveBtn instanceof HTMLButtonElement) saveBtn.disabled = false;
    }
  });
}
