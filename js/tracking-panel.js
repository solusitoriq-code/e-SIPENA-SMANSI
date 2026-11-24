/**
 * Panel Cek Status & Kartu Kode Lacak SPN — e-SIPENA SMAN 1 Sidayu
 * Modul pendamping submission-views.js untuk pelacakan status kurasi tanpa login.
 */

import { playSfx } from './audio.js';
import { getTrackingHistory, trackSubmission } from './data-service.js';
import {
  createIcon,
  escapeHtml,
  formatDateId,
  getRoleBadgeClass,
  openModal,
  resolveGDriveLinks,
  showToast
} from './ui-utils.js';

export function getStatusBadgeClass(status) {
  const map = {
    'Menunggu Kurasi': 'status-badge status-wait',
    'Perlu Revisi': 'status-badge status-revise',
    'Lolos Mading': 'status-badge status-approved',
    'Masuk Antologi': 'status-badge status-anthology',
    Ditolak: 'status-badge status-rejected'
  };
  return map[status] || 'status-badge status-wait';
}

function getStatusGuidance(status) {
  const map = {
    'Menunggu Kurasi': 'Naskah sudah tercatat dan menunggu peninjauan Tim Pustakawan / Pembina NLC.',
    'Perlu Revisi': 'Periksa catatan pembimbing di bawah dan kirim ulang perbaikan naskah jika diperlukan.',
    'Lolos Mading': 'Selamat, karya Anda telah diterbitkan di tab Mading Digital.',
    'Masuk Antologi': 'Selamat, karya terpilih masuk daftar kurasi antologi sekolah.',
    Ditolak: 'Naskah belum memenuhi kriteria kurasi saat ini. Silakan baca catatan pembimbing.'
  };
  return map[status] || '';
}

export async function copyTextSafe(text) {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Lanjut ke fallback textarea
    }
  }
  const helper = document.createElement('textarea');
  helper.value = text;
  helper.setAttribute('readonly', '');
  helper.style.position = 'fixed';
  helper.style.opacity = '0';
  document.body.appendChild(helper);
  helper.select();
  const ok = document.execCommand('copy');
  helper.remove();
  return ok;
}

export function renderRecentCodeChips(container) {
  const wrap = container.querySelector('#track-recent-chips');
  if (!wrap) return;
  const history = getTrackingHistory();
  const demoOption = { code: 'SPN-DEMO01', title: 'Contoh Mading' };
  const merged = history.some((h) => h.code === demoOption.code) ? history : [...history, demoOption];

  wrap.innerHTML = merged
    .slice(0, 5)
    .map(
      (item) =>
        `<button type="button" class="history-code-chip" data-pick-code="${escapeHtml(item.code)}" title="${escapeHtml(item.title || item.code)}">${escapeHtml(item.code)}</button>`
    )
    .join('');
}

export function renderReceiptCard(container, result) {
  const card = container.querySelector('#sub-receipt-card');
  if (!card) return;
  if (!result) {
    card.hidden = true;
    card.innerHTML = '';
    return;
  }

  const note =
    result.source === 'supabase'
      ? 'Tersimpan di server portal. Simpan kode ini untuk memantau hasil kurasi.'
      : 'Tersimpan di perangkat lokal (mode offline). Simpan kode ini sebagai bukti kirim.';

  card.hidden = false;
  card.innerHTML = `
    <div class="receipt-top">
      <span class="receipt-label">Kode Lacak Naskah Anda</span>
      <span class="panel-badge">${result.source === 'supabase' ? 'Terkirim ke Server' : 'Tersimpan Lokal'}</span>
    </div>
    <div class="receipt-code-row">
      <strong class="receipt-code" id="receipt-code-text">${escapeHtml(result.trackingCode)}</strong>
      <button type="button" class="primary-btn inline-action-btn" id="btn-copy-tracking-code">Salin Kode</button>
    </div>
    <p class="receipt-note">${escapeHtml(note)}</p>
  `;
}

export function renderTrackResult(container, outcome) {
  const box = container.querySelector('#track-result-box');
  if (!box) return;
  if (!outcome) {
    box.innerHTML = '<p class="track-empty-hint">Masukkan Kode Lacak <code>SPN-XXXXXX</code> untuk melihat status kurasi dan catatan pembimbing.</p>';
    return;
  }
  if (!outcome.found || !outcome.submission) {
    box.innerHTML = '<div class="track-not-found">Kode lacak tidak ditemukan. Periksa kembali huruf/angka kode SPN Anda.</div>';
    return;
  }

  const sub = outcome.submission;
  const gdrive = resolveGDriveLinks(sub);
  const notes = String(sub.reviewer_notes || '').trim() || 'Belum ada catatan pembimbing.';
  const pdfAction = gdrive.hasDriveFile
    ? `<button type="button" class="secondary-btn inline-action-btn" id="btn-track-preview-pdf">${createIcon('book')}<span>Pratinjau PDF</span></button>`
    : '';

  box.innerHTML = `
    <article class="track-result-card">
      <div class="track-result-head">
        <span class="code-chip">${escapeHtml(sub.tracking_code)}</span>
        <span class="${getStatusBadgeClass(sub.status)}">${escapeHtml(sub.status || 'Menunggu Kurasi')}</span>
      </div>
      <h4 class="track-result-title">${escapeHtml(sub.title)}</h4>
      <div class="track-meta-row">
        <span class="${getRoleBadgeClass(sub.author_role)}">${escapeHtml(sub.author_role)}</span>
        <span>${escapeHtml(sub.author_name)} (${escapeHtml(sub.author_class_unit || '-')})</span>
      </div>
      <p class="track-sub-meta">${escapeHtml(sub.category || 'Karya')} &middot; Diperbarui ${escapeHtml(formatDateId(sub.updated_at || sub.created_at))}</p>
      <p class="track-status-guide">${escapeHtml(getStatusGuidance(sub.status))}</p>
      <div class="reviewer-note-box">
        <strong>Catatan Pembimbing / Kurator:</strong>
        <p>${escapeHtml(notes)}</p>
      </div>
      ${pdfAction ? `<div class="track-result-actions">${pdfAction}</div>` : ''}
    </article>
  `;

  box.querySelector('#btn-track-preview-pdf')?.addEventListener('click', () => {
    playSfx('pop');
    openModal({
      title: `Berkas PDF: ${sub.title}`,
      wide: true,
      html: `
        <div class="reader-toolbar">
          <span>Kode Lacak: <strong>${escapeHtml(sub.tracking_code)}</strong></span>
          <a class="secondary-btn inline-action-btn" href="${escapeHtml(gdrive.openUrl)}" target="_blank" rel="noopener noreferrer">${createIcon('external')}<span>Buka di Drive</span></a>
        </div>
        <iframe class="pdf-preview-iframe" src="${escapeHtml(gdrive.previewUrl)}" title="Pratinjau PDF ${escapeHtml(sub.title)}" loading="lazy" allowfullscreen></iframe>
      `
    });
  });
}

export async function runTrackingLookup(container, rawCode, fallbackWorks = []) {
  const input = container.querySelector('#track-code-input');
  const code = String(rawCode ?? (input instanceof HTMLInputElement ? input.value : '')).trim().toUpperCase();
  if (input instanceof HTMLInputElement && code) input.value = code;
  if (!code) {
    showToast('Masukkan Kode Lacak SPN terlebih dahulu.', 'error');
    return;
  }

  try {
    const outcome = await trackSubmission(code, { fallbackWorks });
    renderTrackResult(container, outcome);
    renderRecentCodeChips(container);
    playSfx(outcome.found ? 'success' : 'error');
    if (!outcome.found) showToast(`Kode ${code} belum ditemukan.`, 'info');
  } catch (err) {
    playSfx('error');
    showToast(err?.message || 'Gagal melacak status naskah.', 'error');
  }
}
