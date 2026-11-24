/**
 * Modal Editor Model 3D Gresik (Fitur 5) — e-SIPENA SMAN 1 Sidayu
 * Mendukung ganti judul, sunting teks perkenalan + uji audio/suara, serta pilih aset lokal 3D/placeholder.
 */

import {
  isAudioTrackPlaying,
  isSpeechSupported,
  isSpeaking,
  playAudioTrack,
  playSfx,
  speak,
  stopAudioTrack,
  stopSpeech
} from './audio.js';
import {
  adminCreateModel3d,
  adminDeleteModel3d,
  adminSaveModel3d
} from './data-service.js';
import { closeModal, createIcon, escapeHtml, openModal, showToast } from './ui-utils.js';

const LOCAL_3D_MODEL_OPTIONS = [
  { path: 'assets/3d_models/damar-kurung-3d.glb', label: 'damar-kurung-3d.glb (Damar Kurung)' },
  { path: 'assets/3d_models/jubung-3d.glb', label: 'jubung-3d.glb (Jubung Gresik)' },
  { path: 'assets/3d_models/pudak-3d.glb', label: 'pudak-3d.glb (Pudak Gresik)' }
];

const LOCAL_PLACEHOLDER_OPTIONS = [
  { path: 'assets/placeholders/damar_kurung__placeholder.jpeg', label: 'damar_kurung__placeholder.jpeg' },
  { path: 'assets/placeholders/jubung__placeholder.jpeg', label: 'jubung__placeholder.jpeg' },
  { path: 'assets/placeholders/pudak_placeholder.png', label: 'pudak_placeholder.png' }
];

const LOCAL_AUDIO_OPTIONS = [
  { path: 'assets/audios/damar-kurung-audio.mpeg', label: 'damar-kurung-audio.mpeg (Damar Kurung)' },
  { path: 'assets/audios/jubung-audio.mpeg', label: 'jubung-audio.mpeg (Jubung Gresik)' },
  { path: 'assets/audios/pudak-audio.mpeg', label: 'pudak-audio.mpeg (Pudak Gresik)' },
  { path: '', label: 'Tanpa berkas audio (cadangan suara teks)' }
];

async function syncPortalAfterSave(onUpdated) {
  if (typeof window.ESIPENA_APP?.refreshData === 'function') {
    await window.ESIPENA_APP.refreshData();
  }
  await onUpdated?.();
}

function buildOptionsHtml(options, selectedValue) {
  const cleanSelected = String(selectedValue || '').trim();
  const hasMatch = options.some((opt) => opt.path === cleanSelected);
  const fullList = cleanSelected && !hasMatch
    ? [{ path: cleanSelected, label: cleanSelected }, ...options]
    : options;
  return fullList
    .map((opt) => `<option value="${escapeHtml(opt.path)}"${opt.path === cleanSelected ? ' selected' : ''}>${escapeHtml(opt.label)}</option>`)
    .join('');
}

/**
 * Membuka modal untuk menambah atau menyunting Judul & Teks Perkenalan Model 3D Gresik.
 * @param {Record<string, any> | null} model
 * @param {() => Promise<void> | void} onUpdated
 * @param {{ nextSortOrder?: number }} [options]
 */
export function openModel3dEditorModal(model, onUpdated, { nextSortOrder = 4 } = {}) {
  const isNew = !model;
  const activeModelPath = model?.model_path || LOCAL_3D_MODEL_OPTIONS[0].path;
  const activePosterPath = model?.placeholder_url || LOCAL_PLACEHOLDER_OPTIONS[0].path;
  const activeAudioPath = model?.audio_path !== undefined
    ? String(model.audio_path || '')
    : LOCAL_AUDIO_OPTIONS[0].path;

  const bodyEl = openModal({
    title: isNew ? 'Tambah Koleksi Model 3D Gresik' : `Sunting Model 3D: ${model.title}`,
    wide: true,
    onClose: () => stopSpeech(),
    html: `
      <form id="admin-model3d-form" class="admin-modal-form">
        <div class="admin-form-grid">
          <label class="form-field form-field-span2">
            <span>Judul Model 3D *</span>
            <input id="adm-m3d-title" type="text" value="${escapeHtml(model?.title || '')}" placeholder="Contoh: Damar Kurung Khas Gresik" required>
          </label>
          <label class="form-field">
            <span>Kategori Budaya</span>
            <input id="adm-m3d-cat" type="text" value="${escapeHtml(model?.category || 'Budaya Gresik')}" placeholder="Seni &amp; Tradisi / Kuliner Khas">
          </label>
          <label class="form-field">
            <span>Urutan Tampil</span>
            <input id="adm-m3d-order" type="number" min="1" max="999" value="${escapeHtml(model?.sort_order ?? nextSortOrder)}">
          </label>
          <label class="form-field">
            <span>Berkas 3D Lokal (assets/3d_models)</span>
            <select id="adm-m3d-path">
              ${buildOptionsHtml(LOCAL_3D_MODEL_OPTIONS, activeModelPath)}
            </select>
          </label>
          <label class="form-field">
            <span>Gambar Placeholder (assets/placeholders)</span>
            <select id="adm-m3d-poster">
              ${buildOptionsHtml(LOCAL_PLACEHOLDER_OPTIONS, activePosterPath)}
            </select>
          </label>
          <label class="form-field form-field-span2">
            <span>Berkas Audio Narasi (assets/audios)</span>
            <select id="adm-m3d-audio">
              ${buildOptionsHtml(LOCAL_AUDIO_OPTIONS, activeAudioPath)}
            </select>
          </label>
          <div class="form-field form-field-span2">
            <div class="admin-tts-field-head">
              <label for="adm-m3d-intro"><span>Teks Perkenalan *</span></label>
              <button type="button" class="secondary-btn inline-action-btn" id="btn-adm-m3d-tts">
                ${createIcon('volume')}<span>Uji Audio</span>
              </button>
            </div>
            <textarea id="adm-m3d-intro" rows="5" placeholder="Tuliskan penjelasan model untuk tampil di panel perkenalan..." required>${escapeHtml(model?.introduction || '')}</textarea>
            <div class="admin-field-foot">
              <small>Klik Uji Audio untuk memeriksa berkas audio terpilih (atau suara teks jika berkas kosong).</small>
              <span id="adm-m3d-count" class="char-counter">${String(model?.introduction || '').length} karakter</span>
            </div>
          </div>
        </div>
        <div class="inline-check-pair">
          <label class="checkbox-consent">
            <input id="adm-m3d-active" type="checkbox" ${model?.is_active !== false ? 'checked' : ''}>
            <span>Tampilkan di menu Pameran 3D Gresik</span>
          </label>
        </div>
        <div class="admin-modal-actions admin-modal-actions-split">
          ${!isNew ? '<button type="button" id="btn-delete-model3d" class="danger-btn">Hapus Model</button>' : '<span></span>'}
          <button type="submit" id="btn-save-model3d" class="primary-btn">${isNew ? 'Tambahkan Model 3D' : 'Simpan Perubahan'}</button>
        </div>
      </form>
    `
  });

  if (!bodyEl) return;

  const titleInput = bodyEl.querySelector('#adm-m3d-title');
  const introInput = bodyEl.querySelector('#adm-m3d-intro');
  const audioSelect = bodyEl.querySelector('#adm-m3d-audio');
  const countEl = bodyEl.querySelector('#adm-m3d-count');
  const ttsBtn = bodyEl.querySelector('#btn-adm-m3d-tts');

  introInput?.addEventListener('input', () => {
    if (countEl) countEl.textContent = `${String(introInput.value || '').length} karakter`;
  });

  const setTtsLabel = (active) => {
    if (ttsBtn) {
      ttsBtn.innerHTML = `${createIcon(active ? 'mute' : 'volume')}<span>${active ? 'Hentikan Uji' : 'Uji Audio'}</span>`;
    }
  };

  ttsBtn?.addEventListener('click', () => {
    if (isAudioTrackPlaying() || isSpeaking()) {
      stopSpeech();
      stopAudioTrack();
      setTtsLabel(false);
      return;
    }
    const chosenAudio = String(audioSelect?.value || '').trim();
    if (chosenAudio) {
      setTtsLabel(true);
      const ok = playAudioTrack(chosenAudio, {
        onEnd: () => { if (ttsBtn.isConnected) setTtsLabel(false); },
        onError: () => {
          if (ttsBtn.isConnected) setTtsLabel(false);
          showToast('Gagal memutar berkas audio terpilih.', 'error');
        }
      });
      if (!ok) setTtsLabel(false);
      return;
    }
    if (!isSpeechSupported()) {
      showToast('Peramban ini belum mendukung Web Speech API.', 'error');
      return;
    }
    const titleVal = String(titleInput?.value || '').trim();
    const introVal = String(introInput?.value || '').trim();
    if (!titleVal && !introVal) {
      showToast('Isi judul atau teks perkenalan terlebih dahulu untuk uji suara.', 'info');
      return;
    }
    setTtsLabel(true);
    speak(introVal ? `${titleVal}. ${introVal}` : titleVal, {
      onEnd: () => { if (ttsBtn.isConnected) setTtsLabel(false); },
      onError: () => { if (ttsBtn.isConnected) setTtsLabel(false); }
    });
  });

  const delBtn = bodyEl.querySelector('#btn-delete-model3d');
  let deleteArmed = false;
  delBtn?.addEventListener('click', async () => {
    if (!model) return;
    if (!deleteArmed) {
      deleteArmed = true;
      delBtn.textContent = 'Konfirmasi Hapus?';
      playSfx('click');
      return;
    }
    if (delBtn instanceof HTMLButtonElement) delBtn.disabled = true;
    try {
      stopSpeech();
      await adminDeleteModel3d(model.id);
      await syncPortalAfterSave(onUpdated);
      playSfx('success');
      showToast('Koleksi Model 3D dihapus.', 'success');
      closeModal();
    } catch (err) {
      playSfx('error');
      showToast(err?.message || 'Gagal menghapus model 3D.', 'error');
      if (delBtn instanceof HTMLButtonElement) delBtn.disabled = false;
    }
  });

  bodyEl.querySelector('#admin-model3d-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const saveBtn = bodyEl.querySelector('#btn-save-model3d');
    if (saveBtn instanceof HTMLButtonElement) saveBtn.disabled = true;

    try {
      stopSpeech();
      const payload = {
        title: titleInput?.value || '',
        category: bodyEl.querySelector('#adm-m3d-cat')?.value || 'Budaya Gresik',
        sort_order: Number(bodyEl.querySelector('#adm-m3d-order')?.value || nextSortOrder),
        model_path: bodyEl.querySelector('#adm-m3d-path')?.value || activeModelPath,
        placeholder_url: bodyEl.querySelector('#adm-m3d-poster')?.value || activePosterPath,
        audio_path: String(audioSelect?.value || '').trim(),
        introduction: introInput?.value || '',
        is_active: Boolean(bodyEl.querySelector('#adm-m3d-active')?.checked)
      };

      if (isNew) await adminCreateModel3d(payload);
      else await adminSaveModel3d(model.id, payload);

      await syncPortalAfterSave(onUpdated);
      playSfx('success');
      showToast(isNew ? 'Koleksi Model 3D ditambahkan.' : 'Judul & perkenalan Model 3D diperbarui.', 'success');
      closeModal();
    } catch (err) {
      playSfx('error');
      showToast(err?.message || 'Gagal menyimpan model 3D.', 'error');
      if (saveBtn instanceof HTMLButtonElement) saveBtn.disabled = false;
    }
  });
}
