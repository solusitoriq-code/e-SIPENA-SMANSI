/**
 * Pemutar Video YouTube & Placeholder Budaya Gresik — e-SIPENA SMAN 1 Sidayu
 * Mendukung embed YouTube (mode privasi), modal pemutar terfokus, serta kartu placeholder rapi.
 */

import { playSfx } from './audio.js';
import { createIcon, escapeHtml, openModal } from './ui-utils.js';

/**
 * Mengekstrak ID video YouTube (11 karakter) dari ID langsung maupun berbagai format URL YouTube.
 * @param {string} rawInput
 * @returns {string}
 */
export function extractYouTubeId(rawInput) {
  const input = String(rawInput || '').trim();
  if (!input) return '';
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;

  try {
    const url = new URL(input);
    const host = url.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0] || '';
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : '';
    }
    if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      const vParam = url.searchParams.get('v') || '';
      if (/^[a-zA-Z0-9_-]{11}$/.test(vParam)) return vParam;
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length >= 2 && ['embed', 'shorts', 'live'].includes(parts[0])) {
        return /^[a-zA-Z0-9_-]{11}$/.test(parts[1]) ? parts[1] : '';
      }
    }
  } catch {
    // Abaikan URL yang tidak valid
  }
  return '';
}

/**
 * Menyusun URL embed YouTube mode privasi (youtube-nocookie).
 * @param {string} videoId
 * @param {{ autoplay?: boolean }} [options]
 * @returns {string}
 */
export function getYouTubeEmbedUrl(videoId, { autoplay = true } = {}) {
  const cleanId = extractYouTubeId(videoId);
  if (!cleanId) return '';
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(cleanId)}?rel=0&modestbranding=1&autoplay=${autoplay ? 1 : 0}`;
}

/**
 * Menyusun URL YouTube langsung untuk dibuka pada tab baru.
 * @param {string} videoId
 * @returns {string}
 */
export function getYouTubeWatchUrl(videoId) {
  const cleanId = extractYouTubeId(videoId);
  return cleanId ? `https://www.youtube.com/watch?v=${encodeURIComponent(cleanId)}` : '';
}

/**
 * Menghasilkan markup pratinjau kartu video 16:9 atau kartu placeholder rapi bila youtube_id kosong.
 * @param {Record<string, any>} topic
 * @returns {string}
 */
export function renderVideoPreviewHtml(topic) {
  const videoId = extractYouTubeId(topic?.youtube_id);
  const locationTag = escapeHtml(topic?.location_tag || 'Gresik');
  const duration = escapeHtml(topic?.duration_label || '04:00');
  const safeTitle = escapeHtml(topic?.title || 'Dokumentasi Budaya Gresik');

  if (videoId) {
    const thumbUrl = `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
    return `
      <div class="yt-frame yt-has-video" data-yt-id="${escapeHtml(videoId)}">
        <img class="yt-thumb" src="${thumbUrl}" alt="Pratinjau video ${safeTitle}" loading="lazy" decoding="async">
        <div class="yt-frame-overlay">
          <span class="yt-loc-tag">${locationTag}</span>
          <span class="yt-duration-tag">${duration}</span>
        </div>
        <button class="yt-inline-play-btn" type="button" data-action="inline-play" data-yt-id="${escapeHtml(videoId)}" data-yt-title="${safeTitle}" aria-label="Putar video ${safeTitle}">
          ${createIcon('play')}
          <span>Putar Video</span>
        </button>
      </div>
    `;
  }

  return `
    <div class="yt-frame yt-placeholder" aria-label="Slot video placeholder ${safeTitle}">
      <div class="yt-frame-overlay">
        <span class="yt-loc-tag">${locationTag}</span>
        <span class="yt-duration-tag">${duration}</span>
      </div>
      <div class="yt-placeholder-body">
        <span class="yt-placeholder-badge">Slot Video YouTube (Placeholder)</span>
        <p class="yt-placeholder-caption">Tautan video dokumentasi dapat diisi kurator melalui Ruang Pengelola.</p>
      </div>
    </div>
  `;
}

/**
 * Memasang pemutar IFrame YouTube langsung di dalam elemen kontainer kartu (mode inline).
 * @param {HTMLElement} frameEl
 * @param {string} youtubeId
 * @param {string} title
 */
export function mountInlinePlayer(frameEl, youtubeId, title = 'Pemutar Video Budaya Gresik') {
  const embedUrl = getYouTubeEmbedUrl(youtubeId, { autoplay: true });
  if (!frameEl || !embedUrl) return;
  playSfx('pop');
  frameEl.innerHTML = `
    <iframe
      class="yt-iframe"
      src="${escapeHtml(embedUrl)}"
      title="${escapeHtml(title)}"
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen>
    </iframe>
  `;
}

/**
 * Membuka modal lengkap topik Jejak Budaya Gresik dengan pemutar video, ringkasan, dan tugas menulis.
 * @param {Record<string, any>} topic
 * @param {{ onWriteWithTheme?: (topicTitle: string) => void }} [options]
 */
export function openVideoModal(topic, { onWriteWithTheme } = {}) {
  if (!topic) return;
  const videoId = extractYouTubeId(topic.youtube_id);
  const embedUrl = getYouTubeEmbedUrl(videoId, { autoplay: true });
  const watchUrl = getYouTubeWatchUrl(videoId);

  const playerSection = videoId
    ? `
      <div class="yt-modal-stage">
        <iframe
          class="yt-iframe"
          src="${escapeHtml(embedUrl)}"
          title="${escapeHtml(topic.title)}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen>
        </iframe>
      </div>
      <div class="yt-modal-links">
        <a class="secondary-btn inline-action-btn" href="${escapeHtml(watchUrl)}" target="_blank" rel="noopener noreferrer">
          ${createIcon('external')}
          <span>Buka di YouTube</span>
        </a>
      </div>
    `
    : `
      <div class="yt-modal-placeholder">
        <div class="yt-placeholder-badge">Video Belum Ditautkan (Placeholder)</div>
        <p>ID YouTube untuk topik <strong>${escapeHtml(topic.title)}</strong> belum diisi. Gunakan artikel pemantik dan panduan tugas menulis di bawah ini sebagai sumber inspirasi karya, atau isi ID YouTube melalui Ruang Pengelola.</p>
      </div>
    `;

  const bodyEl = openModal({
    title: topic.title || 'Jejak Budaya Gresik',
    wide: true,
    html: `
      <div class="culture-modal-wrap">
        ${playerSection}
        <div class="culture-modal-meta">
          <span class="panel-badge">${escapeHtml(topic.location_tag || 'Gresik')}</span>
          <span class="panel-badge">Durasi ${escapeHtml(topic.duration_label || '04:00')}</span>
        </div>
        <p class="culture-modal-subtitle">${escapeHtml(topic.subtitle || '')}</p>
        <div class="culture-article-box">
          <h3>Ringkasan Pemantik Literasi</h3>
          <p>${escapeHtml(topic.article_summary || '')}</p>
        </div>
        <div class="culture-prompt-box">
          <h3>Tantangan Menulis Warga Sekolah</h3>
          <p>${escapeHtml(topic.writing_prompt || '')}</p>
        </div>
        <div class="culture-modal-actions">
          <button type="button" class="primary-btn inline-action-btn" id="btn-modal-write-culture">
            ${createIcon('send')}
            <span>Tulis Karya Bertema Budaya Gresik</span>
          </button>
        </div>
      </div>
    `
  });

  if (!bodyEl) return;
  const writeBtn = bodyEl.querySelector('#btn-modal-write-culture');
  writeBtn?.addEventListener('click', () => {
    playSfx('pop');
    onWriteWithTheme?.(topic.title || '');
  });
}
