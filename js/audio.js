/**
 * Modul Audio & Pembaca Sinopsis — e-SIPENA SMAN 1 Sidayu
 * Web Audio API murni untuk efek suara UI + Web Speech API (Bahasa Indonesia).
 */

import { SafeStorage } from './data-service.js';

const AUDIO_MUTE_KEY = 'esipena_audio_muted';

let audioCtx = null;
let mutedState = SafeStorage.getItem(AUDIO_MUTE_KEY) === '1';
let activeUtterance = null;
let speakingFlag = false;
let activeAudioEl = null;
let activeAudioToken = 0;

function getAudioContext() {
  if (mutedState || typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) {
    try {
      audioCtx = new Ctx();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone(ctx, freq, startOffset, duration, type = 'sine', peakGain = 0.06) {
  const now = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peakGain, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

/**
 * Memainkan efek suara ringan berbasis Web Audio API (tanpa berkas audio eksternal).
 * @param {'click' | 'pop' | 'success' | 'error'} [kind]
 */
export function playSfx(kind = 'click') {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (kind === 'pop') {
      playTone(ctx, 540, 0, 0.065, 'triangle', 0.055);
      playTone(ctx, 720, 0.04, 0.07, 'sine', 0.04);
      return;
    }
    if (kind === 'success') {
      playTone(ctx, 523.25, 0, 0.09, 'sine', 0.055);
      playTone(ctx, 659.25, 0.075, 0.1, 'sine', 0.055);
      playTone(ctx, 783.99, 0.15, 0.16, 'triangle', 0.05);
      return;
    }
    if (kind === 'error') {
      playTone(ctx, 260, 0, 0.11, 'sawtooth', 0.035);
      playTone(ctx, 200, 0.09, 0.14, 'sawtooth', 0.03);
      return;
    }
    playTone(ctx, 640, 0, 0.045, 'sine', 0.04);
  } catch {
    // Abaikan bila perangkat memblokir Web Audio API
  }
}

/**
 * Memeriksa apakah efek suara UI sedang dibisukan.
 * @returns {boolean}
 */
export function isMuted() {
  return mutedState;
}

/**
 * Mengatur status bisu efek suara dan menyimpannya di SafeStorage.
 * @param {boolean} nextMuted
 * @returns {boolean}
 */
export function setMuted(nextMuted) {
  mutedState = Boolean(nextMuted);
  SafeStorage.setItem(AUDIO_MUTE_KEY, mutedState ? '1' : '0');
  if (mutedState) {
    stopSpeech();
  }
  return mutedState;
}

/**
 * Membalik status bisu / aktif suara UI.
 * @returns {boolean}
 */
export function toggleMute() {
  const next = setMuted(!mutedState);
  if (!next) {
    playSfx('pop');
  }
  return next;
}

/**
 * Memeriksa ketersediaan Web Speech API pada peramban.
 * @returns {boolean}
 */
export function isSpeechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

/**
 * Memeriksa apakah pembacaan sinopsis sedang berlangsung.
 * @returns {boolean}
 */
export function isSpeaking() {
  if (!isSpeechSupported()) return false;
  return speakingFlag || window.speechSynthesis.speaking;
}

/**
 * Memeriksa apakah trek audio narasi lokal sedang diputar.
 * @returns {boolean}
 */
export function isAudioTrackPlaying() {
  return Boolean(activeAudioEl && !activeAudioEl.paused && !activeAudioEl.ended);
}

/**
 * Menghentikan trek audio narasi lokal yang sedang diputar.
 */
export function stopAudioTrack() {
  activeAudioToken += 1;
  const el = activeAudioEl;
  activeAudioEl = null;
  if (!el) return;
  try {
    el.pause();
    el.currentTime = 0;
    el.removeAttribute('src');
    el.load();
  } catch {
    // Abaikan galat penghentian audio
  }
}

/**
 * Memutar berkas audio narasi lokal (mis. assets/audios/*.mpeg).
 * @param {string} src
 * @param {{ onStart?: () => void, onEnd?: () => void, onError?: (err?: unknown) => void, onTimeUpdate?: (currentSec: number, durationSec: number) => void }} [callbacks]
 * @returns {boolean}
 */
export function playAudioTrack(src, callbacks = {}) {
  const cleanSrc = String(src || '').trim();
  if (!cleanSrc || typeof Audio === 'undefined') {
    callbacks.onError?.(new Error('Berkas audio tidak tersedia.'));
    return false;
  }

  if (mutedState) {
    setMuted(false);
  }

  stopSpeech();

  const token = ++activeAudioToken;
  const audio = new Audio(cleanSrc);
  audio.preload = 'auto';
  activeAudioEl = audio;

  const isStale = () => token !== activeAudioToken || activeAudioEl !== audio;

  audio.addEventListener('playing', () => {
    if (!isStale()) callbacks.onStart?.();
  });
  audio.addEventListener('timeupdate', () => {
    if (!isStale()) {
      callbacks.onTimeUpdate?.(Number(audio.currentTime || 0), Number(audio.duration || 0));
    }
  });
  audio.addEventListener('loadedmetadata', () => {
    if (!isStale()) {
      callbacks.onTimeUpdate?.(Number(audio.currentTime || 0), Number(audio.duration || 0));
    }
  });
  audio.addEventListener('ended', () => {
    if (isStale()) return;
    activeAudioEl = null;
    callbacks.onEnd?.();
  });
  audio.addEventListener('error', (err) => {
    if (isStale()) return;
    activeAudioEl = null;
    callbacks.onError?.(err);
  });

  try {
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise.catch((err) => {
        if (isStale()) return;
        activeAudioEl = null;
        callbacks.onError?.(err);
      });
    }
    return true;
  } catch (err) {
    if (!isStale()) {
      activeAudioEl = null;
      callbacks.onError?.(err);
    }
    return false;
  }
}

/**
 * Menghentikan pembacaan suara sinopsis dan audio narasi yang sedang berjalan.
 */
export function stopSpeech() {
  stopAudioTrack();
  speakingFlag = false;
  activeUtterance = null;
  if (isSpeechSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Abaikan galat pembatalan sintesis suara
    }
  }
}

function pickIndonesianVoice() {
  if (!isSpeechSupported()) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  return (
    voices.find((v) => /^id[-_]?id$/i.test(v.lang)) ||
    voices.find((v) => /^id/i.test(v.lang)) ||
    null
  );
}

/**
 * Membacakan teks sinopsis atau kutipan berbahasa Indonesia melalui Web Speech API.
 * @param {string} text
 * @param {{ onStart?: () => void, onEnd?: () => void, onError?: (err?: unknown) => void }} [callbacks]
 * @returns {boolean}
 */
export function speak(text, callbacks = {}) {
  const cleanText = String(text || '').trim();
  if (!cleanText || !isSpeechSupported()) {
    callbacks.onError?.(new Error('Pembaca suara tidak didukung di perangkat ini.'));
    return false;
  }

  if (mutedState) {
    setMuted(false);
  }

  stopSpeech();

  try {
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'id-ID';
    utterance.rate = 0.96;
    utterance.pitch = 1.0;

    const idVoice = pickIndonesianVoice();
    if (idVoice) {
      utterance.voice = idVoice;
    }

    activeUtterance = utterance;
    speakingFlag = true;

    utterance.onstart = () => {
      speakingFlag = true;
      callbacks.onStart?.();
    };
    utterance.onend = () => {
      if (activeUtterance === utterance) {
        speakingFlag = false;
        activeUtterance = null;
      }
      callbacks.onEnd?.();
    };
    utterance.onerror = (event) => {
      if (activeUtterance === utterance) {
        speakingFlag = false;
        activeUtterance = null;
      }
      callbacks.onError?.(event);
    };

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    speakingFlag = false;
    activeUtterance = null;
    callbacks.onError?.(err);
    return false;
  }
}
