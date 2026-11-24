/**
 * Modal Tambah, Sunting & Hapus Buku / Novel (Fitur 5) — e-SIPENA SMAN 1 Sidayu
 * Menunda unggahan sampul & PDF ke Google Drive hingga Simpan ditekan, mengunci penutupan modal
 * selama proses berlangsung, dan menampilkan persentase progres tanpa path internal di formulir.
 */

import { APP_CONFIG } from './config.js';
import { playSfx } from './audio.js';
import {
  BOOK_CATEGORIES, BOOK_ROLES, adminCreateBook, adminDeleteBook,
  adminSaveBook, bookRequiresNovelDetails, compressCoverToWebp, validatePdfFile
} from './data-service.js';
import { mountBookBarcodeScanner } from './barcode-scanner.js';
import { bindLiteraryEditor, extractPlainLiteraryText, renderLiteraryEditorHtml } from './literary-editor.js';
import { uploadBookPendingAssets } from './media-upload.js';
import { closeModal, createIcon, escapeHtml, openModal, resolveGDriveLinks, setModalBusy, showToast } from './ui-utils.js';

const FALLBACK_COVER = 'assets/images/logo-smansi.webp';

function formatFileSizeLabel(bytes) {
  const num = Number(bytes || 0);
  if (num < 1024 * 1024) return `${Math.max(1, Math.round(num / 1024))} KB`;
  return `${(num / (1024 * 1024)).toFixed(2)} MB`;
}

async function syncAfterBookChange(onUpdated) {
  if (typeof window.ESIPENA_APP?.refreshData === 'function') {
    await window.ESIPENA_APP.refreshData();
  }
  await onUpdated?.();
}

/**
 * Membuka modal untuk menambah buku baru (book = null) atau menyunting/menghapus buku yang ada.
 * @param {Record<string, any> | null} book
 * @param {() => Promise<void> | void} onUpdated
 * @param {{ nextSortOrder?: number, defaultCategory?: string, nextOrderByCategory?: Record<string, number> | null }} [options]
 */
export function openBookEditorModal(book, onUpdated, { nextSortOrder = 1, defaultCategory = 'Novel', nextOrderByCategory = null } = {}) {
  const isNew = !book;
  const gdrive = resolveGDriveLinks(book || {});
  const fallbackCat = BOOK_CATEGORIES.includes(defaultCategory) ? defaultCategory : 'Novel';
  const currentCat = book?.category || fallbackCat;
  const catOptions = BOOK_CATEGORIES.includes(currentCat) ? BOOK_CATEGORIES : [currentCat, ...BOOK_CATEGORIES];
  const getOrderForCat = (cat) => Number(nextOrderByCategory?.[cat] || nextSortOrder || 1);
  const initialNovelDetails = bookRequiresNovelDetails(currentCat);
  const maxCatalogMb = Math.round(APP_CONFIG.MAX_CATALOG_PDF_SIZE_BYTES / (1024 * 1024));

  let selectedCoverUrl = book?.cover_url || (initialNovelDetails ? FALLBACK_COVER : '');
  let pendingCoverFile = null;
  let selectedDriveId = book?.gdrive_file_id || gdrive.fileId || '';
  let selectedPreviewUrl = book?.gdrive_preview_url || gdrive.previewUrl || '';
  let pendingPdfFile = null;
  const hasInitialPdf = Boolean(selectedPreviewUrl || selectedDriveId);
  let barcodeScanner = null;

  const bodyEl = openModal({
    title: isNew ? `Tambah ${fallbackCat} Baru` : `Sunting Buku: ${book.title}`,
    wide: true,
    onClose: () => barcodeScanner?.stopCamera(),
    html: `
      <form id="admin-book-form" class="admin-modal-form">
        <div class="book-editor-cover-row" data-novel-only="true"${initialNovelDetails ? '' : ' hidden'}>
          <div class="book-cover-preview-box">
            <img id="adm-book-cover-preview" src="${escapeHtml(selectedCoverUrl || FALLBACK_COVER)}" alt="Pratinjau sampul buku" width="74" height="105" onerror="this.onerror=null;this.src='${FALLBACK_COVER}'">
          </div>
          <div class="book-cover-controls">
            <div class="file-picker-row">
              <label class="secondary-btn file-picker-label" for="adm-book-cover-file">Pilih Sampul</label>
              <input id="adm-book-cover-file" type="file" accept="image/webp,image/png,image/jpeg" class="sr-only-input">
            </div>
            <p id="adm-cover-status" class="file-status-text">${book?.cover_url ? 'Sampul buku sudah terpasang. Pilih gambar baru bila ingin mengganti.' : 'Sampul akan dikompres ke WebP dan diunggah saat Simpan ditekan.'}</p>
          </div>
        </div>

        <div class="admin-form-grid">
          <label class="form-field form-field-span2">
            <span>Judul Karya / Buku *</span>
            <input id="adm-book-title" type="text" value="${escapeHtml(book?.title || '')}" required maxlength="140">
          </label>
          <label class="form-field" data-novel-only="true"${initialNovelDetails ? '' : ' hidden'}>
            <span>Nama Penulis *</span>
            <input id="adm-book-author" type="text" value="${escapeHtml(book?.author_name || '')}" ${initialNovelDetails ? 'required' : ''} maxlength="100">
          </label>
          <label class="form-field" data-novel-only="true"${initialNovelDetails ? '' : ' hidden'}>
            <span>Peran Penulis *</span>
            <select id="adm-book-role" ${initialNovelDetails ? 'required' : ''}>
              ${BOOK_ROLES.map((r) => `<option value="${escapeHtml(r)}"${r === (book?.author_role || 'Siswa XI') ? ' selected' : ''}>${escapeHtml(r)}</option>`).join('')}
            </select>
          </label>
          <label class="form-field" data-novel-only="true"${initialNovelDetails ? '' : ' hidden'}>
            <span>Kelas / Mapel / Unit</span>
            <input id="adm-book-class" type="text" value="${escapeHtml(book?.author_class || '')}" placeholder="Mis. XI-7 / Bahasa Indonesia">
          </label>
          <label class="form-field">
            <span>Kategori &amp; Tahun Terbit</span>
            <div class="inline-pair-inputs">
              <select id="adm-book-cat">${catOptions.map((c) => `<option value="${escapeHtml(c)}"${c === currentCat ? ' selected' : ''}>${escapeHtml(c)}</option>`).join('')}</select>
              <input id="adm-book-year" type="number" min="2020" max="2040" value="${escapeHtml(book?.publication_year || 2026)}">
            </div>
          </label>
          <div class="form-field form-field-span2">
            <span>Kode ISBN / QRCBN</span>
            <div class="isbn-input-row">
              <input id="adm-book-qrcbn" type="text" value="${escapeHtml(book?.qrcbn_code || '')}" placeholder="Opsional (mis. 978-623-7588-61-0)">
              <button type="button" class="secondary-btn inline-action-btn" id="btn-adm-scan-cam" aria-pressed="false">${createIcon('camera')}<span>Scan Kamera</span></button>
              <label class="secondary-btn inline-action-btn file-picker-label" for="adm-isbn-img-file">${createIcon('qr')}<span>Scan Gambar</span></label>
              <input id="adm-isbn-img-file" type="file" accept="image/*" class="sr-only-input">
            </div>
            <p id="adm-isbn-scan-status" class="file-status-text" hidden></p>
            <div id="adm-isbn-cam-box" class="barcode-camera-box" hidden>
              <video id="adm-isbn-video" class="barcode-scan-video" playsinline muted autoplay></video>
              <div class="barcode-camera-bar">
                <span>Arahkan kamera ke barcode ISBN atau QR Code buku.</span>
                <button type="button" class="secondary-btn" id="btn-adm-stop-cam">Tutup Kamera</button>
              </div>
            </div>
          </div>
          <label class="form-field">
            <span>Urutan Tampil di Rak</span>
            <input id="adm-book-order" type="number" min="1" max="999" value="${escapeHtml(book?.sort_order ?? getOrderForCat(currentCat))}">
          </label>
          <div class="form-field">
            <span>Visibilitas Katalog</span>
            <label class="checkbox-consent">
              <input id="adm-book-published" type="checkbox" ${book?.is_published !== false ? 'checked' : ''}>
              <span>Tampilkan di Etalase Publik</span>
            </label>
          </div>

          <div class="file-drop-box form-field-span2">
            <div class="file-picker-row">
              <label class="secondary-btn file-picker-label" for="adm-book-pdf-file">Pilih Berkas PDF (Maks. ${maxCatalogMb} MB)</label>
              <input id="adm-book-pdf-file" type="file" accept=".pdf,application/pdf" class="sr-only-input">
              <a class="secondary-btn inline-action-btn" id="btn-adm-open-pdf" href="${escapeHtml(gdrive.openUrl || '#')}" target="_blank" rel="noopener noreferrer"${hasInitialPdf ? '' : ' hidden'}>${createIcon('external')}<span>Buka PDF</span></a>
              <button type="button" class="secondary-btn" id="btn-adm-clear-pdf"${hasInitialPdf ? '' : ' hidden'}>Lepas PDF</button>
            </div>
            <p id="adm-book-pdf-status" class="file-status-text${hasInitialPdf ? ' is-ok' : ''}">${hasInitialPdf ? 'Berkas PDF buku sudah terpasang.' : `Belum ada berkas PDF. Pilih berkas .pdf maks. ${maxCatalogMb} MB (diunggah saat Simpan).`}</p>
          </div>

          <div class="form-field form-field-span2" id="adm-synopsis-field" data-novel-only="true"${initialNovelDetails ? '' : ' hidden'}>
            <label for="adm-book-synopsis"><span>Sinopsis Buku *</span></label>
            ${renderLiteraryEditorHtml({
              panelId: 'adm-synopsis-panel', textareaId: 'adm-book-synopsis', countId: 'adm-synopsis-count',
              toolbarLabel: 'Pemformatan teks sinopsis', rows: 5,
              placeholder: 'Tulis sinopsis buku atau tempel format HTML aman...',
              value: book?.synopsis || '', required: initialNovelDetails,
              hintText: 'Gunakan Enter untuk paragraf baru, **tebal**, *miring*, > kutipan, atau HTML aman.'
            })}
          </div>
        </div>

        <div id="adm-upload-progress" class="upload-progress-wrap" hidden aria-live="polite">
          <div class="upload-progress-meta">
            <span id="adm-progress-label">Memproses unggahan...</span>
            <strong id="adm-progress-pct">0%</strong>
          </div>
          <div class="upload-progress-track">
            <div id="adm-progress-fill" class="upload-progress-fill"></div>
          </div>
        </div>

        <div class="admin-modal-actions admin-modal-actions-split">
          ${!isNew ? '<button type="button" id="btn-delete-book" class="danger-btn">Hapus Buku</button>' : '<span></span>'}
          <button type="submit" id="btn-save-book" class="primary-btn">${isNew ? 'Tambahkan ke Katalog' : 'Simpan Perubahan'}</button>
        </div>
      </form>
    `
  });

  if (!bodyEl) return;

  const q = (sel) => bodyEl.querySelector(sel);
  const formEl = q('#admin-book-form');
  const coverStatus = q('#adm-cover-status');
  const pdfStatus = q('#adm-book-pdf-status');
  const openPdfBtn = q('#btn-adm-open-pdf');
  const clearPdfBtn = q('#btn-adm-clear-pdf');
  const saveBtn = q('#btn-save-book');
  const catSelect = q('#adm-book-cat');
  const orderInput = q('#adm-book-order');
  const authorInput = q('#adm-book-author');
  const roleSelect = q('#adm-book-role');
  const synopsisInput = q('#adm-book-synopsis');
  const defaultSaveText = saveBtn?.textContent || 'Simpan Perubahan';
  let orderManuallyEdited = false;
  orderInput?.addEventListener('input', () => { orderManuallyEdited = true; });

  const setStatusText = (el, cls, text) => {
    if (!el) return;
    el.className = `file-status-text${cls ? ` ${cls}` : ''}`;
    el.textContent = text;
  };
  const syncNovelFields = () => {
    const selectedCat = catSelect?.value || 'Novel';
    const isNovel = bookRequiresNovelDetails(selectedCat);
    if (isNew && !orderManuallyEdited && orderInput instanceof HTMLInputElement) {
      orderInput.value = String(getOrderForCat(selectedCat));
    }
    for (const el of formEl?.querySelectorAll('[data-novel-only]') || []) {
      if (el instanceof HTMLElement) el.hidden = !isNovel;
    }
    for (const reqEl of [authorInput, roleSelect, synopsisInput]) {
      if (reqEl instanceof HTMLInputElement || reqEl instanceof HTMLSelectElement || reqEl instanceof HTMLTextAreaElement) reqEl.required = isNovel;
    }
  };
  catSelect?.addEventListener('change', syncNovelFields);
  syncNovelFields();

  bindLiteraryEditor({
    panelEl: q('#adm-synopsis-panel'), textareaEl: synopsisInput,
    countEl: q('#adm-synopsis-count'), onFormatClick: () => playSfx('click')
  });

  barcodeScanner = mountBookBarcodeScanner({
    inputEl: q('#adm-book-qrcbn'), camBtn: q('#btn-adm-scan-cam'), stopCamBtn: q('#btn-adm-stop-cam'),
    camBoxEl: q('#adm-isbn-cam-box'), videoEl: q('#adm-isbn-video'), imgInputEl: q('#adm-isbn-img-file'),
    statusEl: q('#adm-isbn-scan-status'),
    onDetected: (res) => { playSfx('success'); showToast(`Kode buku terbaca: ${res.value}`, 'success'); },
    onError: (msg) => { playSfx('error'); showToast(msg, 'error'); }
  });

  const syncPdfActions = (hasRemotePdf, hasAnyPdf, statusClass, statusText) => {
    const resolved = resolveGDriveLinks({ gdrive_file_id: selectedDriveId, gdrive_preview_url: selectedPreviewUrl });
    if (openPdfBtn instanceof HTMLAnchorElement) {
      openPdfBtn.hidden = !hasRemotePdf || !resolved.openUrl;
      openPdfBtn.href = resolved.openUrl || '#';
    }
    if (clearPdfBtn instanceof HTMLElement) clearPdfBtn.hidden = !hasAnyPdf;
    setStatusText(pdfStatus, statusClass, statusText);
  };

  const setProgress = (pct, text) => {
    const safePct = Math.min(100, Math.max(0, Math.round(pct)));
    const wrap = q('#adm-upload-progress');
    if (wrap instanceof HTMLElement) wrap.hidden = false;
    if (q('#adm-progress-label')) q('#adm-progress-label').textContent = text;
    if (q('#adm-progress-pct')) q('#adm-progress-pct').textContent = `${safePct}%`;
    if (q('#adm-progress-fill') instanceof HTMLElement) q('#adm-progress-fill').style.width = `${safePct}%`;
    if (saveBtn) saveBtn.textContent = `Menyimpan (${safePct}%)...`;
    if (pendingPdfFile && pdfStatus) pdfStatus.textContent = `${text} (${safePct}%)`;
  };

  const setFormLocked = (locked) => {
    if (locked) barcodeScanner?.stopCamera();
    setModalBusy(locked);
    if (!formEl) return;
    for (const el of formEl.querySelectorAll('input, select, textarea, button')) {
      if ('disabled' in el) el.disabled = locked;
    }
    if (openPdfBtn instanceof HTMLAnchorElement) {
      openPdfBtn.classList.toggle('is-disabled-link', locked);
      openPdfBtn.setAttribute('aria-disabled', locked ? 'true' : 'false');
    }
  };
  const failFilePick = (input, el, msg) => {
    if (input instanceof HTMLInputElement) input.value = '';
    setStatusText(el, 'is-error', msg);
    playSfx('error');
    showToast(msg, 'error');
  };

  const coverFileInput = q('#adm-book-cover-file');
  coverFileInput?.addEventListener('change', async () => {
    const file = coverFileInput instanceof HTMLInputElement ? coverFileInput.files?.[0] : null;
    if (!file) return;
    try {
      const preview = await compressCoverToWebp(file);
      pendingCoverFile = file;
      const coverPreview = q('#adm-book-cover-preview');
      if (coverPreview instanceof HTMLImageElement) coverPreview.src = preview.dataUrl;
      setStatusText(coverStatus, 'is-ok', 'Siap unggah saat Simpan.');
      playSfx('pop');
    } catch (err) {
      pendingCoverFile = null;
      failFilePick(coverFileInput, coverStatus, err?.message || 'Berkas gambar sampul tidak valid.');
    }
  });

  const pdfFileInput = q('#adm-book-pdf-file');
  pdfFileInput?.addEventListener('change', async () => {
    const file = pdfFileInput instanceof HTMLInputElement ? pdfFileInput.files?.[0] : null;
    if (!file) return;
    try {
      await validatePdfFile(file, APP_CONFIG.MAX_CATALOG_PDF_SIZE_BYTES);
      pendingPdfFile = file;
      syncPdfActions(Boolean(selectedPreviewUrl || selectedDriveId), true, 'is-ok', `Siap unggah saat Simpan: ${file.name} (${formatFileSizeLabel(file.size)})`);
      playSfx('pop');
    } catch (err) {
      pendingPdfFile = null;
      const hasRemote = Boolean(selectedPreviewUrl || selectedDriveId);
      syncPdfActions(hasRemote, hasRemote, 'is-error', err?.message || 'Berkas PDF tidak valid.');
      failFilePick(pdfFileInput, pdfStatus, err?.message || 'Berkas PDF tidak valid.');
    }
  });

  clearPdfBtn?.addEventListener('click', () => {
    pendingPdfFile = null;
    selectedDriveId = '';
    selectedPreviewUrl = '';
    if (pdfFileInput instanceof HTMLInputElement) pdfFileInput.value = '';
    syncPdfActions(false, false, '', 'Lampiran PDF dilepas. Simpan perubahan untuk menerapkan.');
    playSfx('click');
  });

  let deleteArmed = false;
  const delBtn = q('#btn-delete-book');
  delBtn?.addEventListener('click', async () => {
    if (!book) return;
    if (!deleteArmed) {
      deleteArmed = true;
      delBtn.textContent = 'Konfirmasi Hapus?';
      playSfx('click');
      return;
    }
    setFormLocked(true);
    try {
      await adminDeleteBook(book.id);
      await syncAfterBookChange(onUpdated);
      setFormLocked(false);
      playSfx('success');
      showToast(`Buku "${book.title}" dihapus dari katalog.`, 'success');
      closeModal(true);
    } catch (err) {
      setFormLocked(false);
      playSfx('error');
      showToast(err?.message || 'Gagal menghapus buku.', 'error');
    }
  });

  formEl?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const selectedCategory = catSelect?.value || 'Novel';
    const needNovelDetails = bookRequiresNovelDetails(selectedCategory);
    const rawSynopsis = synopsisInput?.value || '';
    if (needNovelDetails && !String(authorInput?.value || '').trim()) {
      playSfx('error');
      return showToast('Nama penulis wajib diisi.', 'error');
    }
    if (needNovelDetails && !extractPlainLiteraryText(rawSynopsis)) {
      playSfx('error');
      return showToast('Sinopsis buku wajib diisi.', 'error');
    }
    setFormLocked(true);

    try {
      const assets = await uploadBookPendingAssets({
        pendingCoverFile: needNovelDetails ? pendingCoverFile : null,
        pendingPdfFile,
        selectedCoverUrl: needNovelDetails ? selectedCoverUrl : '',
        selectedDriveId, selectedPreviewUrl, onProgress: setProgress,
        onWarning: (msg) => showToast(msg, 'info', 4000)
      });
      if (needNovelDetails) selectedCoverUrl = assets.coverUrl;
      selectedDriveId = assets.driveId;
      selectedPreviewUrl = assets.previewUrl;
      pendingCoverFile = null;
      if (pendingPdfFile) {
        pendingPdfFile = null;
        syncPdfActions(true, true, 'is-ok', 'Berkas PDF tersimpan di Google Drive.');
      }

      const payload = {
        title: q('#adm-book-title')?.value || '',
        author_name: needNovelDetails ? authorInput?.value || '' : '',
        author_role: needNovelDetails ? roleSelect?.value || 'Siswa XI' : book?.author_role || 'Siswa XI',
        author_class: needNovelDetails ? q('#adm-book-class')?.value || '' : '',
        category: selectedCategory,
        publication_year: Number(q('#adm-book-year')?.value || 2026),
        sort_order: Number(orderInput?.value || getOrderForCat(selectedCategory)),
        cover_url: needNovelDetails ? selectedCoverUrl || FALLBACK_COVER : '',
        gdrive_file_id: selectedDriveId, gdrive_preview_url: selectedPreviewUrl,
        qrcbn_code: q('#adm-book-qrcbn')?.value || '',
        synopsis: needNovelDetails ? rawSynopsis : '',
        is_published: Boolean(q('#adm-book-published')?.checked)
      };

      if (isNew) await adminCreateBook(payload);
      else await adminSaveBook(book.id, payload);

      setProgress(98, 'Memperbarui etalase portal...');
      await syncAfterBookChange(onUpdated);
      setProgress(100, 'Selesai.');
      setFormLocked(false);
      playSfx('success');
      showToast(isNew ? `Buku "${payload.title}" ditambahkan ke katalog.` : `Buku "${payload.title}" diperbarui.`, 'success');
      closeModal(true);
    } catch (err) {
      setFormLocked(false);
      if (q('#adm-upload-progress') instanceof HTMLElement) q('#adm-upload-progress').hidden = true;
      if (saveBtn) saveBtn.textContent = defaultSaveText;
      playSfx('error');
      showToast(err?.message || 'Gagal menyimpan data buku.', 'error');
    }
  });
}
