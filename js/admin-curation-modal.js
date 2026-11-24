/**
 * Modal Kurasi Naskah Masuk (Fitur 5) — e-SIPENA SMAN 1 Sidayu
 * Menampilkan teks & pratinjau PDF Drive, formulir catatan revisi, serta tombol terbitkan ke Mading.
 */

import { playSfx } from './audio.js';
import { SUBMISSION_STATUSES, adminUpdateWork } from './data-service.js';
import {
  buildWhatsAppUrl,
  closeModal,
  createIcon,
  escapeHtml,
  extractPlainLiteraryText,
  formatDateId,
  getRoleBadgeClass,
  openModal,
  renderFormattedLiteraryHtml,
  resolveGDriveLinks,
  showToast
} from './ui-utils.js';

export function getAdminStatusClass(status) {
  const map = {
    'Menunggu Kurasi': 'status-badge status-wait',
    'Perlu Revisi': 'status-badge status-revise',
    'Lolos Mading': 'status-badge status-approved',
    Ditolak: 'status-badge status-rejected'
  };
  return map[status] || 'status-badge status-wait';
}

export function openCurationModal(work, onCurated) {
  const gdrive = resolveGDriveLinks(work);
  const waClean = String(work.contact_wa || '').replace(/\D/g, '');
  const waWriterUrl = waClean
    ? buildWhatsAppUrl(
        {
          whatsapp_number: waClean,
          order_message_prefix: 'Halo dari Kurator e-SIPENA SMAN 1 Sidayu terkait karya Anda:'
        },
        `"${work.title}" (${work.tracking_code}).`
      )
    : '';

  const pdfBlock = gdrive.hasDriveFile
    ? `
      <div class="admin-pdf-box">
        <div class="reader-toolbar">
          <span>Berkas PDF Google Drive (${escapeHtml(work.file_name || 'Lampiran')})</span>
          <a class="secondary-btn inline-action-btn" href="${escapeHtml(gdrive.openUrl)}" target="_blank" rel="noopener noreferrer">${createIcon('external')}<span>Buka PDF Drive</span></a>
        </div>
        <iframe class="pdf-preview-iframe" src="${escapeHtml(gdrive.previewUrl)}" title="Pratinjau Naskah ${escapeHtml(work.title)}" loading="lazy" allowfullscreen></iframe>
      </div>
    `
    : '<p class="admin-muted-note">Naskah ini tidak melampirkan URL PDF Google Drive (dikirim via teks/lokal).</p>';

  const bodyTextHtml = work.body_text
    ? `<article class="literary-reader-paper">${renderFormattedLiteraryHtml(work.body_text)}</article>`
    : '';

  const bodyEl = openModal({
    title: `Kurasi Naskah: ${work.tracking_code || ''}`,
    wide: true,
    html: `
      <div class="curation-modal-wrap">
        <div class="mading-modal-badges">
          <span class="code-chip">${escapeHtml(work.tracking_code)}</span>
          <span class="${getAdminStatusClass(work.status)}">${escapeHtml(work.status)}</span>
          <span class="${getRoleBadgeClass(work.author_role)}">${escapeHtml(work.author_role)}</span>
          <span class="panel-badge">${escapeHtml(work.category)}</span>
          <span class="panel-badge">${escapeHtml(formatDateId(work.created_at || work.published_at))}</span>
        </div>
        <h3 class="curation-work-title">${escapeHtml(work.title)}</h3>
        <p class="curation-work-author">Penulis: <strong>${escapeHtml(work.author_name)}</strong> (${escapeHtml(work.author_class_unit || '-')})${waWriterUrl ? ` &middot; <a href="${escapeHtml(waWriterUrl)}" target="_blank" rel="noopener noreferrer">Hubungi WA Penulis</a>` : ''}</p>
        ${work.culture_theme ? `<div class="mading-theme-banner">Tema Budaya Gresik: <strong>${escapeHtml(work.culture_theme)}</strong></div>` : ''}
        ${work.summary ? `<div class="culture-article-box"><h3>Ringkasan</h3><p>${escapeHtml(extractPlainLiteraryText(work.summary))}</p></div>` : ''}
        ${bodyTextHtml}
        ${pdfBlock}

        <form id="curation-decision-form" class="curation-form">
          <div class="admin-form-grid">
            <label class="form-field">
              <span>Status Kurasi</span>
              <select id="cur-status">
                ${SUBMISSION_STATUSES.map((s) => `<option value="${escapeHtml(s)}"${s === work.status ? ' selected' : ''}>${escapeHtml(s)}</option>`).join('')}
              </select>
            </label>
            <label class="form-field form-field-span2">
              <span>Catatan Pembimbing / Revisi (tampil di Cek Status)</span>
              <textarea id="cur-notes" rows="3" placeholder="Tuliskan masukan penyuntingan atau alasan keputusan kurasi...">${escapeHtml(work.reviewer_notes || '')}</textarea>
            </label>
          </div>
          <div class="admin-modal-actions">
            <button type="submit" id="btn-cur-save" class="secondary-btn">Simpan Keputusan</button>
            <button type="button" id="btn-cur-publish" class="primary-btn inline-action-btn">${createIcon('send')}<span>Terbitkan ke Mading</span></button>
          </div>
        </form>
      </div>
    `
  });

  let isSaving = false;
  const submitDecision = async (forcedStatus = null) => {
    if (isSaving) return;
    isSaving = true;
    const saveBtn = bodyEl?.querySelector('#btn-cur-save');
    const pubBtn = bodyEl?.querySelector('#btn-cur-publish');
    if (saveBtn instanceof HTMLButtonElement) saveBtn.disabled = true;
    if (pubBtn instanceof HTMLButtonElement) pubBtn.disabled = true;

    try {
      const nextStatus = forcedStatus || bodyEl?.querySelector('#cur-status')?.value || work.status;
      const notes = String(bodyEl?.querySelector('#cur-notes')?.value || '').trim();
      await adminUpdateWork(work.id, {
        status: nextStatus,
        reviewer_notes: notes,
        tracking_code: work.tracking_code
      });
      if (typeof window.ESIPENA_APP?.refreshData === 'function') {
        await window.ESIPENA_APP.refreshData();
      }
      playSfx('success');
      showToast(
        nextStatus === 'Lolos Mading'
          ? `"${work.title}" diterbitkan ke Mading Digital.`
          : `Status "${work.title}" diperbarui menjadi ${nextStatus}.`,
        'success'
      );
      closeModal();
      await onCurated?.();
    } catch (err) {
      isSaving = false;
      playSfx('error');
      showToast(err?.message || 'Gagal menyimpan keputusan kurasi.', 'error');
      if (saveBtn instanceof HTMLButtonElement) saveBtn.disabled = false;
      if (pubBtn instanceof HTMLButtonElement) pubBtn.disabled = false;
    }
  };

  bodyEl?.querySelector('#curation-decision-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    submitDecision(null);
  });
  bodyEl?.querySelector('#btn-cur-publish')?.addEventListener('click', () => {
    submitDecision('Lolos Mading');
  });
}
