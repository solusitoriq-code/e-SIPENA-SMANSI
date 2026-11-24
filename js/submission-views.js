/**
 * Modul Tampilan Kirim Karya & Cek Status Tanpa Login (Fitur 4) — e-SIPENA SMAN 1 Sidayu
 * Merender formulir kirim karya 2-mode (Unggah PDF maks. 3 MB atau Tulis Naskah Langsung)
 * dan menghubungkan panel lacak status SPN-XXXXXX tanpa login.
 */

import { APP_CONFIG } from './config.js';
import { playSfx } from './audio.js';
import {
  SUBMISSION_CATEGORIES,
  SUBMISSION_ROLES,
  submitWork,
  uploadPdfToGDrive,
  validatePdfFile
} from './data-service.js';
import {
  copyTextSafe,
  renderReceiptCard,
  renderRecentCodeChips,
  renderTrackResult,
  runTrackingLookup
} from './tracking-panel.js';
import { bindLiteraryEditor, renderLiteraryEditorHtml } from './literary-editor.js';
import { createIcon, escapeHtml, showToast } from './ui-utils.js';

let snapshotGetter = () => ({ madingWorks: [] });
let selectedPdfFile = null;
let submissionMode = 'pdf';

function formatFileSize(bytes) {
  const num = Number(bytes || 0);
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(2)} MB`;
}

function updateCharCounter(inputEl, counterEl, maxLen) {
  if (!(counterEl instanceof HTMLElement)) return;
  const len = inputEl && 'value' in inputEl ? String(inputEl.value || '').length : 0;
  counterEl.textContent = `${len}/${maxLen}`;
}

function setSubmissionMode(container, mode) {
  submissionMode = mode === 'text' ? 'text' : 'pdf';
  const isPdf = submissionMode === 'pdf';

  for (const btn of container.querySelectorAll('[data-submit-mode]')) {
    const active = btn.getAttribute('data-submit-mode') === submissionMode;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  }

  const pdfPanel = container.querySelector('#sub-pdf-panel');
  const textPanel = container.querySelector('#sub-text-panel');
  if (pdfPanel instanceof HTMLElement) pdfPanel.hidden = !isPdf;
  if (textPanel instanceof HTMLElement) textPanel.hidden = isPdf;

  const summaryLabel = container.querySelector('#sub-summary-label');
  const summaryHint = container.querySelector('#sub-summary-hint');
  const summaryInput = container.querySelector('#sub-summary');
  const bodyInput = container.querySelector('#sub-body-text');
  if (summaryLabel) summaryLabel.textContent = isPdf ? 'Ringkasan / Sinopsis Karya *' : 'Ringkasan Karya (Opsional)';
  if (summaryHint) {
    summaryHint.textContent = isPdf
      ? 'Wajib diisi 1-2 kalimat untuk tampilan kartu Mading Digital.'
      : 'Opsional — otomatis dirangkum dari awal teks naskah bila dikosongkan.';
  }
  if (summaryInput instanceof HTMLTextAreaElement) summaryInput.required = isPdf;
  if (bodyInput instanceof HTMLTextAreaElement) bodyInput.required = !isPdf;
}

function updateSelectedFileUi(container, file, errorMsg = '') {
  const statusEl = container.querySelector('#sub-file-status');
  const clearBtn = container.querySelector('#btn-sub-clear-file');
  if (!(statusEl instanceof HTMLElement)) return;

  if (errorMsg) {
    statusEl.className = 'file-status-text is-error';
    statusEl.textContent = errorMsg;
    if (clearBtn instanceof HTMLElement) clearBtn.hidden = true;
    return;
  }
  if (!file) {
    statusEl.className = 'file-status-text';
    statusEl.textContent = 'Wajib format .pdf maksimal 3 MB (cocok untuk novel, cerpen, maupun naskah berdesain).';
    if (clearBtn instanceof HTMLElement) clearBtn.hidden = true;
    return;
  }
  statusEl.className = 'file-status-text is-ok';
  statusEl.textContent = `Siap unggah: ${file.name} (${formatFileSize(file.size)})`;
  if (clearBtn instanceof HTMLElement) clearBtn.hidden = false;
}

function bindSubmissionEvents(container) {
  const form = container.querySelector('#submission-form');
  const fileInput = container.querySelector('#sub-pdf-file');
  const clearFileBtn = container.querySelector('#btn-sub-clear-file');
  const submitBtn = container.querySelector('#btn-sub-submit');
  const trackForm = container.querySelector('#track-status-form');
  const summaryEl = container.querySelector('#sub-summary');
  const summaryCountEl = container.querySelector('#sub-summary-count');
  const bodyEl = container.querySelector('#sub-body-text');
  const bodyCountEl = container.querySelector('#sub-body-count');
  const consentEl = container.querySelector('#sub-anti-plagiat');

  const syncSubmitEnabled = (isSubmitting = false) => {
    if (!(submitBtn instanceof HTMLButtonElement)) return;
    const agreed = consentEl instanceof HTMLInputElement && consentEl.checked;
    submitBtn.disabled = isSubmitting || !agreed;
  };
  consentEl?.addEventListener('change', () => syncSubmitEnabled(false));
  syncSubmitEnabled(false);

  summaryEl?.addEventListener('input', () => updateCharCounter(summaryEl, summaryCountEl, 500));
  const bodyEditor = bindLiteraryEditor({
    panelEl: container.querySelector('#sub-text-panel'),
    textareaEl: bodyEl,
    countEl: bodyCountEl,
    maxLength: 15000,
    onFormatClick: () => playSfx('click')
  });

  fileInput?.addEventListener('change', async () => {
    const file = fileInput instanceof HTMLInputElement ? fileInput.files?.[0] || null : null;
    if (!file) {
      selectedPdfFile = null;
      updateSelectedFileUi(container, null);
      return;
    }
    try {
      await validatePdfFile(file);
      selectedPdfFile = file;
      updateSelectedFileUi(container, file);
      playSfx('pop');
    } catch (err) {
      selectedPdfFile = null;
      if (fileInput instanceof HTMLInputElement) fileInput.value = '';
      updateSelectedFileUi(container, null, err?.message || 'Berkas PDF tidak valid.');
      playSfx('error');
      showToast(err?.message || 'Berkas PDF tidak valid.', 'error');
    }
  });

  clearFileBtn?.addEventListener('click', () => {
    selectedPdfFile = null;
    if (fileInput instanceof HTMLInputElement) fileInput.value = '';
    updateSelectedFileUi(container, null);
    playSfx('click');
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!(form instanceof HTMLFormElement) || !(submitBtn instanceof HTMLButtonElement)) return;

    const getVal = (id) => {
      const el = form.querySelector(`#${id}`);
      return el && 'value' in el ? String(el.value || '').trim() : '';
    };
    const agreed = Boolean(form.querySelector('#sub-anti-plagiat')?.checked);

    const payload = {
      title: getVal('sub-title'),
      author_name: getVal('sub-author-name'),
      author_role: getVal('sub-author-role'),
      author_class_unit: getVal('sub-class-unit'),
      category: getVal('sub-category'),
      culture_theme: '',
      contact_wa: getVal('sub-contact-wa'),
      summary: getVal('sub-summary'),
      body_text: submissionMode === 'text' ? getVal('sub-body-text') : '',
      anti_plagiarism_agreed: agreed
    };

    const fail = (msg) => { playSfx('error'); showToast(msg, 'error'); };
    if (!payload.author_class_unit) return fail('Kelas atau unit tugas wajib diisi.');
    if (!payload.author_name) return fail('Nama lengkap penulis wajib diisi.');
    if (!payload.title) return fail('Judul karya wajib diisi.');
    if (submissionMode === 'pdf') {
      if (!payload.summary) return fail('Isi ringkasan karya (1-2 kalimat) untuk kartu Mading.');
      if (!selectedPdfFile) return fail('Pilih berkas PDF maksimal 3 MB terlebih dahulu.');
    } else if (!payload.body_text) {
      return fail('Ketik isi teks naskah terlebih dahulu.');
    }
    if (!agreed) return fail('Centang pernyataan anti-plagiat sebelum mengirim karya.');

    submitBtn.disabled = true;
    const defaultLabel = submitBtn.innerHTML;

    try {
      if (submissionMode === 'pdf' && selectedPdfFile) {
        submitBtn.textContent = 'Mengunggah PDF ke Drive...';
        const uploadRes = await uploadPdfToGDrive(selectedPdfFile);
        payload.gdrive_file_id = uploadRes.fileId;
        payload.gdrive_view_url = uploadRes.viewUrl;
        payload.gdrive_preview_url = uploadRes.previewUrl;
        payload.file_name = uploadRes.fileName;
        payload.file_size_bytes = uploadRes.sizeBytes;
        if (uploadRes.warning) showToast(uploadRes.warning, 'info', 4200);
      }

      submitBtn.textContent = 'Menyimpan Naskah...';
      const result = await submitWork(payload);
      renderReceiptCard(container, result);
      renderRecentCodeChips(container);
      await runTrackingLookup(container, result.trackingCode, snapshotGetter()?.madingWorks || []);

      form.reset();
      selectedPdfFile = null;
      setSubmissionMode(container, 'pdf');
      updateSelectedFileUi(container, null);
      updateCharCounter(summaryEl, summaryCountEl, 500);
      bodyEditor.syncCount();

      playSfx('success');
      showToast(`Naskah terkirim dengan Kode Lacak ${result.trackingCode}.`, 'success');
    } catch (err) {
      playSfx('error');
      showToast(err?.message || 'Gagal mengirim karya.', 'error');
    } finally {
      submitBtn.innerHTML = defaultLabel;
      syncSubmitEnabled(false);
    }
  });

  trackForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    runTrackingLookup(container, undefined, snapshotGetter()?.madingWorks || []);
  });

  container.addEventListener('click', async (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;

    const modeBtn = target.closest('[data-submit-mode]');
    if (modeBtn instanceof HTMLElement) {
      playSfx('click');
      setSubmissionMode(container, modeBtn.dataset.submitMode || 'pdf');
      return;
    }

    if (target.closest('#btn-copy-tracking-code')) {
      const code = container.querySelector('#receipt-code-text')?.textContent?.trim() || '';
      if (!code) return;
      const copied = await copyTextSafe(code);
      playSfx(copied ? 'success' : 'error');
      showToast(
        copied ? `Kode ${code} disalin ke papan klip.` : 'Gagal menyalin kode otomatis.',
        copied ? 'success' : 'error'
      );
      return;
    }

    const chip = target.closest('[data-pick-code]');
    if (chip instanceof HTMLElement) {
      playSfx('click');
      runTrackingLookup(container, chip.dataset.pickCode || '', snapshotGetter()?.madingWorks || []);
      return;
    }

    const jumpBtn = target.closest('[data-sub-jump]');
    if (jumpBtn instanceof HTMLElement) {
      const dest = container.querySelector(`#${jumpBtn.dataset.subJump}`);
      dest?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}

/**
 * Merender antarmuka Fitur 4 (Kirim Karya Tanpa Login + Cek Status Kode Lacak) ke #submission-container.
 * @param {HTMLElement | null} container
 * @param {{ getSnapshot?: () => { madingWorks?: any[] } }} [options]
 */
export function renderSubmissionPanel(container, { getSnapshot } = {}) {
  if (!container) return;
  if (typeof getSnapshot === 'function') snapshotGetter = getSnapshot;
  if (container.dataset.session3Mounted === '1') return;

  container.dataset.session3Mounted = '1';
  const maxMb = Math.round(APP_CONFIG.MAX_PDF_SIZE_BYTES / (1024 * 1024));

  container.innerHTML = `
    <div class="sub-mobile-jumps">
      <button type="button" class="secondary-btn" data-sub-jump="sub-form-card">Formulir Kirim</button>
      <button type="button" class="secondary-btn" data-sub-jump="sub-track-card">Cek Kode SPN</button>
    </div>
    <div class="submission-layout">
      <section class="sub-card" id="sub-form-card" aria-labelledby="sub-form-heading">
        <div class="sub-card-head">
          <h3 id="sub-form-heading">Formulir Kirim Karya</h3>
          <span class="panel-badge">PDF Maks. ${maxMb} MB</span>
        </div>
        <form id="submission-form" class="sub-form" novalidate>
          <div class="sub-form-grid">
            <label class="form-field"><span>Peran Penulis *</span><select id="sub-author-role" required>${SUBMISSION_ROLES.map((r) => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join('')}</select></label>
            <label class="form-field"><span>Kelas / Unit Tugas *</span><input id="sub-class-unit" type="text" placeholder="Mis. XI-4 / Mapel / Perpustakaan" required maxlength="80"></label>
            <label class="form-field"><span>Nama Lengkap *</span><input id="sub-author-name" type="text" placeholder="Nama lengkap penulis" required maxlength="100"></label>
            <label class="form-field"><span>No. WhatsApp (Opsional)</span><input id="sub-contact-wa" type="tel" placeholder="08xxxxxxxxxx (untuk kurator)" maxlength="24"></label>
            <label class="form-field form-field-span2"><span>Judul Karya *</span><input id="sub-title" type="text" placeholder="Tulis judul novel, cerpen, atau puisi" required maxlength="140"></label>
            <label class="form-field form-field-span2"><span>Kategori Karya *</span><select id="sub-category" required>${SUBMISSION_CATEGORIES.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}</select></label>
            <label class="form-field form-field-span2">
              <div class="field-head-row">
                <span id="sub-summary-label">Ringkasan / Sinopsis Karya *</span>
                <span id="sub-summary-count" class="char-counter">0/500</span>
              </div>
              <textarea id="sub-summary" rows="2" placeholder="Ringkasan 1-2 kalimat yang tampil di kartu Mading..." maxlength="500" required></textarea>
              <small id="sub-summary-hint" class="field-helper-text">Wajib diisi 1-2 kalimat untuk tampilan kartu Mading Digital.</small>
            </label>
          </div>
          <div class="sub-mode-section">
            <span class="sub-mode-title">Isi Karya *</span>
            <div class="sub-mode-switch" role="tablist" aria-label="Pilih cara kirim isi karya">
              <button type="button" role="tab" id="tab-sub-mode-pdf" class="sub-mode-btn is-active" data-submit-mode="pdf" aria-selected="true">Unggah PDF (Maks. ${maxMb} MB)</button>
              <button type="button" role="tab" id="tab-sub-mode-text" class="sub-mode-btn" data-submit-mode="text" aria-selected="false">Tulis Naskah Langsung</button>
            </div>
          </div>
          <div id="sub-pdf-panel" class="file-drop-box">
            <div class="file-picker-row">
              <label class="secondary-btn file-picker-label" for="sub-pdf-file">Pilih Berkas PDF</label>
              <input id="sub-pdf-file" type="file" accept=".pdf,application/pdf" class="sr-only-input">
              <button type="button" class="secondary-btn" id="btn-sub-clear-file" hidden>Hapus</button>
            </div>
            <p id="sub-file-status" class="file-status-text">Wajib format .pdf maksimal ${maxMb} MB (cocok untuk novel, cerpen, maupun naskah berdesain).</p>
          </div>
          ${renderLiteraryEditorHtml({
            panelId: 'sub-text-panel',
            textareaId: 'sub-body-text',
            countId: 'sub-body-count',
            toolbarLabel: 'Pemformatan teks naskah',
            rows: 5,
            placeholder: 'Ketik puisi, cerpen singkat, atau kutipan karya...',
            maxLength: 15000,
            hidden: true,
            hintText: 'Gunakan Enter untuk baris/bait baru, **tebal**, *miring*, atau > kutipan.'
          })}
          <label class="checkbox-consent">
            <input id="sub-anti-plagiat" type="checkbox" required>
            <span>Saya menyatakan karya ini asli buatan sendiri, bebas plagiat, dan bukan salinan utuh AI.</span>
          </label>
          <div class="sub-submit-row">
            <button type="submit" id="btn-sub-submit" class="primary-btn inline-action-btn" disabled>${createIcon('send')}<span>Kirim Karya Sekarang</span></button>
          </div>
        </form>
      </section>
      <aside class="sub-track-col">
        <div id="sub-receipt-card" class="receipt-card" hidden aria-live="polite"></div>
        <section class="sub-card" id="sub-track-card" aria-labelledby="sub-track-heading">
          <div class="sub-card-head">
            <h3 id="sub-track-heading">Cek Status</h3>
            <span class="panel-badge">Kode SPN</span>
          </div>
          <form id="track-status-form" class="track-search-row">
            <input id="track-code-input" type="text" placeholder="Contoh: SPN-XXXXXX" maxlength="20" aria-label="Kode Lacak SPN">
            <button type="submit" class="primary-btn inline-action-btn">${createIcon('search')}<span>Lacak</span></button>
          </form>
          <div class="track-history-bar"><span>Kode terbaru:</span><div id="track-recent-chips" class="history-chips"></div></div>
          <div id="track-result-box" class="track-result-box" aria-live="polite"></div>
        </section>
      </aside>
    </div>
  `;

  setSubmissionMode(container, 'pdf');
  bindSubmissionEvents(container);
  renderRecentCodeChips(container);
  renderTrackResult(container, null);
}
