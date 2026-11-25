/**
 * Modal Penampil Model 3D, AR & Narasi Audio (Pameran 3D Gresik) — e-SIPENA SMAN 1 Sidayu
 * Memuat @google/model-viewer secara on-demand, mendukung orbit 3D 360°, mode AR perangkat,
 * tampilan penuh adaptif HP (termasuk iPhone SE) dengan menu tersembunyi ramah pengguna,
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
import { MOBILE_3D_MQ, bindModel3dResponsiveUi, buildModel3dModalHtml } from './model-3d-sheet.js';
import { createIcon, openModal, showToast } from './ui-utils.js';

const MODEL_VIEWER_CDN = 'https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js';
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
 * Membuka modal Pameran 3D & AR untuk satu koleksi budaya Gresik.
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
  const mql = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(MOBILE_3D_MQ) : null;
  const isMobileNow = Boolean(mql?.matches);

  stopSpeech();

  let cleanupResponsive = null;
  const bodyEl = openModal({
    title: activeModel.title || 'Pameran 3D Gresik',
    wide: true,
    fullscreen: true,
    allowFullscreen: true,
    onClose: () => {
      stopSpeech();
      document.getElementById('app-modal')?.classList.remove('is-model3d-modal');
      cleanupResponsive?.();
      cleanupResponsive = null;
    },
    html: buildModel3dModalHtml({
      activeModel,
      currentIdx,
      totalCount: list.length,
      isMobileNow
    })
  });

  if (!bodyEl) return;

  document.getElementById('app-modal')?.classList.add('is-model3d-modal');
  cleanupResponsive = bindModel3dResponsiveUi(bodyEl, mql);

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
    const orbit = typeof viewer.getCameraOrbit === 'function' ? viewer.getCameraOrbit() : null;
    const curThetaDeg = orbit && Number.isFinite(orbit.theta) ? (orbit.theta * 180) / Math.PI : azimuthDeg;
    const curPhiDeg = orbit && Number.isFinite(orbit.phi) ? (orbit.phi * 180) / Math.PI : 75;
    azimuthDeg = curThetaDeg + deltaDeg;
    viewer.setAttribute('camera-orbit', `${azimuthDeg.toFixed(1)}deg ${curPhiDeg.toFixed(1)}deg auto`);
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
  const quickAudioBtn = bodyEl.querySelector('#btn-m3d-quick-audio');
  const ttsStatus = bodyEl.querySelector('#model3d-tts-status');
  const audioSrc = resolveModelAudioPath(activeModel);

  const setAudioUi = (playing, timeLabel = '') => {
    if (ttsBtn) {
      ttsBtn.innerHTML = `${createIcon(playing ? 'mute' : 'volume')}<span>${playing ? 'Hentikan Audio' : 'Putar Audio'}</span>`;
    }
    if (quickAudioBtn) {
      quickAudioBtn.innerHTML = createIcon(playing ? 'volume' : 'mute');
      quickAudioBtn.classList.toggle('is-playing', playing);
      quickAudioBtn.setAttribute('aria-pressed', playing ? 'true' : 'false');
      quickAudioBtn.setAttribute('aria-label', playing ? 'Hentikan audio perkenalan' : 'Putar audio perkenalan');
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

  const toggleIntroAudio = () => {
    if (isAudioTrackPlaying() || isSpeaking()) {
      stopSpeech();
      stopAudioTrack();
      setAudioUi(false);
      return;
    }
    startIntroAudio({ notifyOnError: true });
  };

  ttsBtn?.addEventListener('click', toggleIntroAudio);
  quickAudioBtn?.addEventListener('click', () => { playSfx('click'); toggleIntroAudio(); });

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
