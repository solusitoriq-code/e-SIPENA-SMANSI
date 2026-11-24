/**
 * Modal Penampil Model 3D, AR & Narasi Audio (Pameran 3D Gresik) — e-SIPENA SMAN 1 Sidayu
 * Memuat @google/model-viewer secara on-demand, mendukung orbit 3D, mode AR perangkat,
 * kontrol D-Pad TV Android, dan memutar otomatis audio lokal dari assets/audios.
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
import { createIcon, escapeHtml, openModal, renderFormattedLiteraryHtml, showToast } from './ui-utils.js';

const MODEL_VIEWER_CDN = 'https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js';
const FALLBACK_POSTER = 'assets/images/logo-smansi.webp';
const DEFAULT_AUDIO_BY_MODEL = {
  'assets/3d_models/damar-kurung-3d.glb': 'assets/audios/damar-kurung-audio.mpeg',
  'assets/3d_models/jubung-3d.glb': 'assets/audios/jubung-audio.mpeg',
  'assets/3d_models/pudak-3d.glb': 'assets/audios/pudak-audio.mpeg'
};
let modelViewerLoadPromise = null;

function ensureModelViewerReady() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Lingkungan browser tidak tersedia.'));
  if (window.customElements?.get('model-viewer')) return Promise.resolve();
  if (modelViewerLoadPromise) return modelViewerLoadPromise;

  modelViewerLoadPromise = import(MODEL_VIEWER_CDN)
    .then(() => window.customElements.whenDefined('model-viewer'))
    .catch((err) => {
      modelViewerLoadPromise = null;
      throw err;
    });

  return modelViewerLoadPromise;
}

function getSpeechScript(model) {
  const title = String(model?.title || '').trim();
  const intro = String(model?.introduction || '').trim();
  return intro ? `${title}. ${intro}` : title;
}

function resolveModelAudioPath(model) {
  if (model && model.audio_path !== undefined) {
    return String(model.audio_path || '').trim();
  }
  return DEFAULT_AUDIO_BY_MODEL[String(model?.model_path || '').trim()] || '';
}

function formatAudioClock(sec) {
  const total = Math.max(0, Math.floor(Number(sec || 0)));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Membuka modal Split-View Pameran 3D & AR untuk satu koleksi budaya Gresik.
 * @param {Record<string, any>} model
 * @param {Record<string, any>[]} [allModels]
 */
export function openModel3dModal(model, allModels = []) {
  if (!model) return;
  const list = Array.isArray(allModels) && allModels.length ? allModels : [model];
  const currentIdx = Math.max(0, list.findIndex((item) => String(item.id) === String(model.id)));
  const activeModel = list[currentIdx] || model;
  const hasPrev = list.length > 1 && currentIdx > 0;
  const hasNext = list.length > 1 && currentIdx < list.length - 1;
  const posterUrl = escapeHtml(activeModel.placeholder_url || FALLBACK_POSTER);
  const modelSrc = escapeHtml(activeModel.model_path || '');

  stopSpeech();

  const bodyEl = openModal({
    title: activeModel.title || 'Pameran 3D Gresik',
    wide: true,
    fullscreen: true,
    allowFullscreen: true,
    onClose: () => {
      stopSpeech();
    },
    html: `
      <div class="model3d-modal-layout">
        <div class="model3d-stage-col">
          <div class="model3d-viewer-wrap">
            <model-viewer
              id="active-model-viewer"
              src="${modelSrc}"
              poster="${posterUrl}"
              alt="Model 3D ${escapeHtml(activeModel.title || 'Budaya Gresik')}"
              camera-controls
              touch-action="pan-y"
              auto-rotate
              auto-rotate-delay="1200"
              shadow-intensity="1"
              exposure="1.05"
              interaction-prompt="none"
              ar
              ar-modes="webxr scene-viewer quick-look"
              ar-scale="auto"
              loading="eager"
              reveal="auto"
            >
              <button type="button" slot="ar-button" class="primary-btn inline-action-btn model3d-ar-btn">
                ${createIcon('cube')}
                <span>Tampilkan di AR</span>
              </button>
            </model-viewer>
            <div id="model3d-load-overlay" class="model3d-load-overlay" aria-live="polite">
              <div class="model3d-load-card">
                <strong id="model3d-load-label">Menyiapkan objek 3D...</strong>
                <div class="model3d-progress-track">
                  <div id="model3d-progress-fill" class="model3d-progress-fill"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="model3d-controls" role="toolbar" aria-label="Kontrol sudut objek 3D">
            <button type="button" class="secondary-btn inline-action-btn" id="btn-m3d-rot-left" aria-label="Putar objek ke kiri">
              ${createIcon('rotateLeft')}<span>Putar Kiri</span>
            </button>
            <button type="button" class="secondary-btn inline-action-btn" id="btn-m3d-rot-right" aria-label="Putar objek ke kanan">
              ${createIcon('rotateRight')}<span>Putar Kanan</span>
            </button>
            <button type="button" class="secondary-btn inline-action-btn is-active" id="btn-m3d-autorotate" aria-pressed="true">
              ${createIcon('play')}<span>Putar Otomatis</span>
            </button>
            <button type="button" class="secondary-btn inline-action-btn" id="btn-m3d-reset">
              ${createIcon('reset')}<span>Reset Sudut</span>
            </button>
          </div>
          <p class="model3d-hint">Seret objek untuk memutar, cubit atau gulir untuk memperbesar, atau gunakan tombol kontrol.</p>
        </div>

        <aside class="model3d-info-col">
          <div class="model3d-info-badges">
            <span class="panel-badge">${escapeHtml(activeModel.category || 'Budaya Gresik')}</span>
            <span class="status-tag is-lolos">Koleksi 3D &amp; AR</span>
          </div>
          <h3 class="model3d-info-title">${escapeHtml(activeModel.title || '')}</h3>

          <div class="model3d-tts-bar">
            <button type="button" class="primary-btn inline-action-btn" id="btn-model-tts" data-autofocus>
              ${createIcon('volume')}<span>Dengar Perkenalan</span>
            </button>
            <span id="model3d-tts-status" class="model3d-tts-status" hidden>Sedang membacakan perkenalan...</span>
          </div>

          <div class="model3d-intro-scroll">
            <article class="literary-reader-paper model3d-intro-paper">
              ${renderFormattedLiteraryHtml(activeModel.introduction || '', 'Teks perkenalan model belum tersedia.')}
            </article>
          </div>

          ${list.length > 1
      ? `<div class="model3d-nav-footer">
                  <button type="button" class="secondary-btn" id="btn-m3d-prev" ${hasPrev ? '' : 'disabled'}>&lsaquo; Sebelumnya</button>
                  <span class="page-indicator">Koleksi ${currentIdx + 1} / ${list.length}</span>
                  <button type="button" class="secondary-btn" id="btn-m3d-next" ${hasNext ? '' : 'disabled'}>Berikutnya &rsaquo;</button>
                </div>`
      : ''}
        </aside>
      </div>
    `
  });

  if (!bodyEl) return;

  const viewer = bodyEl.querySelector('#active-model-viewer');
  const overlay = bodyEl.querySelector('#model3d-load-overlay');
  const loadLabel = bodyEl.querySelector('#model3d-load-label');
  const progressFill = bodyEl.querySelector('#model3d-progress-fill');

  ensureModelViewerReady().catch(() => {
    if (overlay instanceof HTMLElement && overlay.isConnected) {
      overlay.hidden = false;
      if (loadLabel) loadLabel.textContent = 'Penampil 3D membutuhkan koneksi internet saat pertama kali dimuat.';
      if (progressFill instanceof HTMLElement) progressFill.style.width = '0%';
    }
  });

  if (viewer) {
    viewer.addEventListener('progress', (event) => {
      const ratio = Number(event?.detail?.totalProgress ?? 0);
      const pct = Math.min(100, Math.max(5, Math.round(ratio * 100)));
      if (loadLabel) loadLabel.textContent = `Memuat objek 3D... ${pct}%`;
      if (progressFill instanceof HTMLElement) progressFill.style.width = `${pct}%`;
    });
    viewer.addEventListener('load', () => {
      if (overlay instanceof HTMLElement) overlay.hidden = true;
    });
    viewer.addEventListener('error', () => {
      if (overlay instanceof HTMLElement) overlay.hidden = false;
      if (loadLabel) loadLabel.textContent = 'Gagal memuat berkas 3D lokal. Periksa kembali ketersediaan aset.';
    });
  }

  let azimuthDeg = 0;
  let autoRotate = true;
  const applyOrbitDelta = (deltaDeg) => {
    if (!viewer) return;
    autoRotate = false;
    viewer.removeAttribute('auto-rotate');
    const autoBtn = bodyEl.querySelector('#btn-m3d-autorotate');
    if (autoBtn) {
      autoBtn.classList.remove('is-active');
      autoBtn.setAttribute('aria-pressed', 'false');
    }
    azimuthDeg += deltaDeg;
    viewer.setAttribute('camera-orbit', `${azimuthDeg}deg 75deg auto`);
  };

  bodyEl.querySelector('#btn-m3d-rot-left')?.addEventListener('click', () => { playSfx('click'); applyOrbitDelta(-35); });
  bodyEl.querySelector('#btn-m3d-rot-right')?.addEventListener('click', () => { playSfx('click'); applyOrbitDelta(35); });
  bodyEl.querySelector('#btn-m3d-autorotate')?.addEventListener('click', (event) => {
    const btn = event.currentTarget;
    if (!(btn instanceof HTMLElement) || !viewer) return;
    playSfx('click');
    autoRotate = !autoRotate;
    if (autoRotate) viewer.setAttribute('auto-rotate', '');
    else viewer.removeAttribute('auto-rotate');
    btn.classList.toggle('is-active', autoRotate);
    btn.setAttribute('aria-pressed', autoRotate ? 'true' : 'false');
  });
  bodyEl.querySelector('#btn-m3d-reset')?.addEventListener('click', () => {
    if (!viewer) return;
    playSfx('click');
    azimuthDeg = 0;
    viewer.setAttribute('camera-orbit', '0deg 75deg auto');
    viewer.setAttribute('field-of-view', 'auto');
    if (typeof viewer.resetTurntableRotation === 'function') viewer.resetTurntableRotation();
  });

  const ttsBtn = bodyEl.querySelector('#btn-model-tts');
  const ttsStatus = bodyEl.querySelector('#model3d-tts-status');
  const audioSrc = resolveModelAudioPath(activeModel);

  const setAudioUi = (playing, timeLabel = '') => {
    if (ttsBtn) {
      ttsBtn.innerHTML = `${createIcon(playing ? 'mute' : 'volume')}<span>${playing ? 'Hentikan Audio' : 'Putar Audio'}</span>`;
    }
    if (ttsStatus instanceof HTMLElement) {
      ttsStatus.hidden = !playing;
      ttsStatus.textContent = timeLabel ? `Memutar audio (${timeLabel})` : 'Sedang memutar audio perkenalan...';
    }
  };

  const startIntroAudio = ({ notifyOnError = false } = {}) => {
    if (audioSrc) {
      setAudioUi(true);
      const started = playAudioTrack(audioSrc, {
        onStart: () => { if (ttsBtn?.isConnected) setAudioUi(true); },
        onTimeUpdate: (cur, dur) => {
          if (!ttsBtn?.isConnected || !isAudioTrackPlaying()) return;
          const label = Number.isFinite(dur) && dur > 0 ? `${formatAudioClock(cur)} / ${formatAudioClock(dur)}` : formatAudioClock(cur);
          setAudioUi(true, label);
        },
        onEnd: () => { if (ttsBtn?.isConnected) setAudioUi(false); },
        onError: () => {
          if (ttsBtn?.isConnected) setAudioUi(false);
          if (notifyOnError) showToast('Gagal memutar berkas audio model 3D.', 'error');
        }
      });
      if (!started && ttsBtn?.isConnected) setAudioUi(false);
      return;
    }

    if (!isSpeechSupported()) {
      if (notifyOnError) showToast('Audio perkenalan tidak tersedia di perangkat ini.', 'error');
      return;
    }
    const script = getSpeechScript(activeModel);
    if (!script) return;
    setAudioUi(true);
    const started = speak(script, {
      onStart: () => { if (ttsBtn?.isConnected) setAudioUi(true); },
      onEnd: () => { if (ttsBtn?.isConnected) setAudioUi(false); },
      onError: () => { if (ttsBtn?.isConnected) setAudioUi(false); }
    });
    if (!started && ttsBtn?.isConnected) setAudioUi(false);
  };

  ttsBtn?.addEventListener('click', () => {
    if (isAudioTrackPlaying() || isSpeaking()) {
      stopSpeech();
      stopAudioTrack();
      setAudioUi(false);
      return;
    }
    startIntroAudio({ notifyOnError: true });
  });

  startIntroAudio({ notifyOnError: false });

  bodyEl.querySelector('#btn-m3d-prev')?.addEventListener('click', () => {
    if (!hasPrev) return;
    playSfx('pop');
    openModel3dModal(list[currentIdx - 1], list);
  });
  bodyEl.querySelector('#btn-m3d-next')?.addEventListener('click', () => {
    if (!hasNext) return;
    playSfx('pop');
    openModel3dModal(list[currentIdx + 1], list);
  });
}
