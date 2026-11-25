/**
 * Modul Tampilan Publik Menu Cerita Gresik — e-SIPENA SMAN 1 Sidayu
 * Menampilkan daftar video budaya & kisah Gresik (Judul, Deskripsi opsional, Link URL)
 * beserta modal pemutar video adaptif (YouTube, Google Drive, Vimeo, MP4, & tautan eksternal).
 */

import { playSfx } from './audio.js';
import { parseCeritaVideoUrl } from './data-service.js';
import { createIcon, escapeHtml, openModal } from './ui-utils.js';

/**
 * Membuka modal pemutar video Cerita Gresik dengan navigasi antar video.
 * @param {Record<string, any>} video
 * @param {Record<string, any>[]} [allVideos]
 */
export function openCeritaVideoModal(video, allVideos = []) {
  if (!video) return;
  const list = Array.isArray(allVideos) && allVideos.length ? allVideos : [video];
  const currentIdx = Math.max(0, list.findIndex((item) => String(item.id) === String(video.id)));
  const activeVideo = list[currentIdx] || video;
  const hasPrev = list.length > 1 && currentIdx > 0;
  const hasNext = list.length > 1 && currentIdx < list.length - 1;

  const info = parseCeritaVideoUrl(activeVideo.video_url);
  const safeTitle = escapeHtml(activeVideo.title || 'Cerita Gresik');
  const safeUrl = escapeHtml(info.url || activeVideo.video_url || '#');
  const description = String(activeVideo.description || '').trim();

  let playerHtml = '';
  if (info.mode === 'iframe' && info.embedUrl) {
    playerHtml = `
      <div class="cerita-player-stage">
        <iframe
          src="${escapeHtml(info.embedUrl)}"
          title="${safeTitle}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
          referrerpolicy="strict-origin-when-cross-origin"
        ></iframe>
      </div>
    `;
  } else if (info.mode === 'video' && info.embedUrl) {
    playerHtml = `
      <div class="cerita-player-stage">
        <video controls autoplay playsinline preload="metadata" src="${escapeHtml(info.embedUrl)}"></video>
      </div>
    `;
  } else {
    playerHtml = `
      <div class="cerita-player-external-box">
        <span class="panel-badge">${escapeHtml(info.platform || 'Tautan Video')}</span>
        <h3>Video Tersedia di Tautan Eksternal</h3>
        <p>Tautan video dari <strong>${escapeHtml(info.platform || 'sumber eksternal')}</strong> dibuka langsung melalui tab baru agar tampil penuh.</p>
        <a class="primary-btn inline-action-btn" href="${safeUrl}" target="_blank" rel="noopener noreferrer" data-autofocus>
          ${createIcon('external')}<span>Buka Video Sekarang</span>
        </a>
      </div>
    `;
  }

  const navHtml = list.length > 1
    ? `
      <div class="model3d-nav-footer">
        <button type="button" id="btn-cerita-prev" class="secondary-btn inline-action-btn" ${hasPrev ? '' : 'disabled'}>
          ${createIcon('rotateLeft')}<span>Video Sebelumnya</span>
        </button>
        <button type="button" id="btn-cerita-next" class="secondary-btn inline-action-btn" ${hasNext ? '' : 'disabled'}>
          <span>Video Berikutnya</span>${createIcon('rotateRight')}
        </button>
      </div>
    `
    : '';

  const bodyEl = openModal({
    title: activeVideo.title || 'Cerita Gresik',
    wide: true,
    allowFullscreen: true,
    html: `
      <div class="cerita-modal-wrap">
        ${playerHtml}
        <div class="cerita-modal-meta-row">
          <div class="cerita-modal-badges">
            <span class="panel-badge">${escapeHtml(info.platform || 'Video')}</span>
            <span class="panel-badge">Video ${currentIdx + 1} / ${list.length}</span>
          </div>
          <a class="secondary-btn inline-action-btn" href="${safeUrl}" target="_blank" rel="noopener noreferrer">
            ${createIcon('external')}<span>Buka Tautan Asli</span>
          </a>
        </div>
        ${description ? `<div class="cerita-modal-desc">${escapeHtml(description)}</div>` : ''}
        ${navHtml}
      </div>
    `
  });

  if (!bodyEl) return;
  bodyEl.querySelector('#btn-cerita-prev')?.addEventListener('click', () => {
    if (!hasPrev) return;
    playSfx('pop');
    openCeritaVideoModal(list[currentIdx - 1], list);
  });
  bodyEl.querySelector('#btn-cerita-next')?.addEventListener('click', () => {
    if (!hasNext) return;
    playSfx('pop');
    openCeritaVideoModal(list[currentIdx + 1], list);
  });
}

/**
 * Merender panel publik Cerita Gresik berisi daftar video terkurasi.
 * @param {HTMLElement | null} container
 * @param {{ videos?: any[] }} [options]
 */
export function renderCeritaGresikPanel(container, { videos = [] } = {}) {
  if (!container) return;

  const badge = document.getElementById('cerita-gresik-count');
  if (badge) {
    badge.textContent = videos.length ? `${videos.length} Video` : 'Daftar Video';
  }

  if (!videos.length) {
    container.innerHTML = `
      <article class="empty-stage-note">
        <h3>Belum Ada Video Cerita Gresik</h3>
        <p>Daftar video kisah, tradisi, dan kearifan lokal Gresik akan tampil di sini setelah ditambahkan di Ruang Pengelola.</p>
      </article>
    `;
    container.onclick = null;
    return;
  }

  container.innerHTML = `<div class="cerita-videos-grid">${videos
    .map((video, idx) => {
      const info = parseCeritaVideoUrl(video.video_url);
      const safeId = escapeHtml(video.id);
      const safeTitle = escapeHtml(video.title);
      const safeUrl = escapeHtml(info.url || video.video_url || '#');
      const desc = String(video.description || '').trim();
      const thumbHtml = info.thumbnailUrl
        ? `<img src="${escapeHtml(info.thumbnailUrl)}" alt="Cuplikan ${safeTitle}" loading="lazy" decoding="async" onerror="this.remove()">`
        : '';

      return `
        <article class="cerita-video-card" data-cerita-id="${safeId}" data-nav-card="true">
          <div class="cerita-video-media" data-action="open-cerita-video" data-cerita-id="${safeId}">
            ${thumbHtml}
            <div class="cerita-video-poster-fallback" aria-hidden="true">
              <span class="cerita-video-play-ring">${createIcon('play')}</span>
            </div>
          </div>
          <div class="cerita-video-body">
            <div class="culture-card-meta">
              <span class="culture-index">Video ${idx + 1} &middot; ${escapeHtml(info.platform)}</span>
            </div>
            <h3 class="cerita-video-title">${safeTitle}</h3>
            ${desc ? `<p class="cerita-video-desc">${escapeHtml(desc)}</p>` : ''}
            <div class="cerita-video-actions">
              <button type="button" class="primary-btn" data-action="open-cerita-video" data-cerita-id="${safeId}">Tonton Video</button>
              <a class="secondary-btn inline-action-btn" href="${safeUrl}" target="_blank" rel="noopener noreferrer" aria-label="Buka tautan ${safeTitle} di tab baru">Buka Tautan</a>
            </div>
          </div>
        </article>
      `;
    })
    .join('')}</div>`;

  container.onclick = (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;
    if (target.closest('a[href]')) return;

    const trigger = target.closest('[data-action="open-cerita-video"]');
    if (trigger instanceof HTMLElement) {
      const item = videos.find((v) => String(v.id) === trigger.dataset.ceritaId);
      if (item) {
        playSfx('pop');
        openCeritaVideoModal(item, videos);
      }
    }
  };
}
