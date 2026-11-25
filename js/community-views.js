/**
 * Modul Tampilan Komunitas & Edukasi (Fitur 3) — e-SIPENA SMAN 1 Sidayu
 * Mencakup: Pameran 3D Gresik (AR & Narasi Suara), Mading Digital, dan Sudut Pustakawan.
 */

import { APP_CONFIG } from './config.js';
import { playSfx, stopSpeech } from './audio.js';
import { openLibrarianActivityDetailModal } from './activity-modal.js';
import {
  bindTextReaderControls,
  createBookReaderController,
  getReaderPrefs,
  renderTextReaderToolbarHtml
} from './book-reader-ui.js';
import { normalizeActivityPhotos } from './data-service.js';
import { openModel3dModal } from './model-3d-modal.js';
import {
  bindSpeechToggleButton,
  createIcon,
  escapeHtml,
  extractPlainLiteraryText,
  formatDateId,
  openModal,
  renderFormattedLiteraryHtml,
  renderSwipeCueHtml,
  resolveGDriveLinks
} from './ui-utils.js';

/**
 * Merender galeri Pameran 3D Gresik dengan gambar placeholder awal,
 * narasi suara Web Speech API Bahasa Indonesia, dan modal penampil 3D/AR.
 * @param {HTMLElement | null} container
 * @param {{ models: any[] }} [options]
 */
export function renderModels3dPanel(container, { models = [] } = {}) {
  if (!container) return;
  const countEl = document.getElementById('models3d-count');
  if (countEl) {
    countEl.textContent = models.length ? `${models.length} Koleksi` : 'Koleksi 3D & AR';
  }
  if (!models.length) {
    container.innerHTML = `<article class="empty-stage-note"><h3>Koleksi Pameran 3D Gresik Belum Tersedia</h3><p>Koleksi objek budaya 3D dan teks perkenalan dapat dikelola kurator melalui Ruang Pengelola.</p></article>`;
    return;
  }

  container.innerHTML = `<div class="models3d-grid">${models
    .map((item, idx) => {
      const safeId = escapeHtml(item.id);
      const safeTitle = escapeHtml(item.title);
      const posterSrc = escapeHtml(item.placeholder_url || 'assets/images/logo-smansi.webp');
      return `
        <article class="model3d-card" data-model-id="${safeId}" data-nav-card="true">
          <div class="model3d-card-media" data-action="open-model-3d" data-model-id="${safeId}">
            <img src="${posterSrc}" alt="Pratinjau ${safeTitle}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='assets/images/logo-smansi.webp'">
          </div>
          <div class="model3d-card-body">
            <div class="culture-card-meta">
              <span class="culture-index">Koleksi ${idx + 1} &middot; ${escapeHtml(item.category || 'Budaya Gresik')}</span>
            </div>
            <h3 class="model3d-card-title">${safeTitle}</h3>
            <div class="model3d-card-actions">
              <button type="button" class="primary-btn" data-action="open-model-3d" data-model-id="${safeId}">Lihat 3D &amp; AR</button>
            </div>
          </div>
        </article>
      `;
    })
    .join('')}</div>`;

  container.onclick = (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;

    const openTrigger = target.closest('[data-action="open-model-3d"]');
    if (openTrigger instanceof HTMLElement) {
      const item = models.find((m) => String(m.id) === openTrigger.dataset.modelId);
      if (item) {
        playSfx('pop');
        openModel3dModal(item, models);
      }
    }
  };
}

function buildMadingMetaHtml(work) {
  const roleLabel = work.author_role
    ? `${work.author_role}${work.author_class_unit ? ` (${work.author_class_unit})` : ''}`
    : (work.author_class_unit || '');
  const metaParts = [
    work.category || 'Karya',
    roleLabel,
    formatDateId(work.published_at)
  ].filter(Boolean);

  return `
    <div class="book-editorial-meta mading-editorial-meta">
      <span class="status-tag is-lolos">${escapeHtml(work.status || 'Lolos Mading')}</span>
      <span class="meta-sep" aria-hidden="true">&middot;</span>
      ${metaParts.map((part) => `<span>${escapeHtml(part)}</span>`).join('<span class="meta-sep" aria-hidden="true">&middot;</span>')}
    </div>
    <p class="mading-modal-author">Ditulis oleh <strong>${escapeHtml(work.author_name || '')}</strong>${work.tracking_code ? `<span class="code-chip">${escapeHtml(work.tracking_code)}</span>` : ''}</p>
    ${work.culture_theme ? `<div class="mading-theme-banner">Tema Budaya Gresik: <strong>${escapeHtml(work.culture_theme)}</strong></div>` : ''}`;
}

/**
 * Membuka modal baca lengkap untuk satu karya Mading Digital.
 * Karya berlampiran PDF dibuka penuh kanvas dengan pembaca PDF.js + cache offline;
 * karya teks langsung tampil dalam modal baca sastra dengan kontrol huruf dan tema.
 * @param {Record<string, any>} work
 */
export function openMadingWorkModal(work) {
  if (!work) return;
  const gdrive = resolveGDriveLinks(work);
  const readerPrefs = getReaderPrefs();
  const bodyHtml = renderFormattedLiteraryHtml(work.body_text || work.summary || '', 'Ringkasan karya belum tersedia.');
  const metaHtml = buildMadingMetaHtml(work);
  const paperClass = `literary-reader-paper${readerPrefs.theme === 'dark' ? ' is-dark' : ''}`;
  const paperStyle = `font-size: ${readerPrefs.fontSize}px;`;
  const bindTts = (bodyEl, label) => bindSpeechToggleButton(
    bodyEl?.querySelector('#btn-mading-tts'),
    () => `${work.title}, karya ${work.author_name}. ${extractPlainLiteraryText(work.body_text || work.summary || '')}`,
    label,
    'Hentikan Suara'
  );

  if (!gdrive.hasDriveFile) {
    const toolbarHtml = renderTextReaderToolbarHtml({
      fontSize: readerPrefs.fontSize,
      theme: readerPrefs.theme,
      ttsId: 'btn-mading-tts',
      ttsLabel: 'Dengar Karya'
    });
    const bodyEl = openModal({
      title: work.title || 'Karya Mading Digital',
      wide: true,
      allowFullscreen: true,
      onClose: () => stopSpeech(),
      html: `<div class="mading-modal-wrap">${metaHtml}${toolbarHtml}<article class="${paperClass}" style="${paperStyle}">${bodyHtml}</article></div>`
    });
    bindTextReaderControls(bodyEl);
    bindTts(bodyEl, 'Dengar Karya');
    return;
  }

  let readerController = null;
  const detailToolbarHtml = renderTextReaderToolbarHtml({
    fontSize: readerPrefs.fontSize,
    theme: readerPrefs.theme,
    ttsId: 'btn-mading-tts',
    ttsLabel: 'Dengar Ringkasan',
    extraActionsHtml: `<button type="button" class="primary-btn inline-action-btn" id="btn-mading-switch-pdf">${createIcon('book')}<span>Baca Naskah (PDF)</span></button><a class="secondary-btn inline-action-btn" href="${escapeHtml(gdrive.openUrl)}" target="_blank" rel="noopener noreferrer">${createIcon('external')}<span>Buka di Drive</span></a>`
  });
  const fallbackToolbarHtml = renderTextReaderToolbarHtml({
    fontSize: readerPrefs.fontSize,
    theme: readerPrefs.theme,
    ttsId: ''
  });
  const bodyEl = openModal({
    title: work.title || 'Karya Mading Digital',
    wide: true,
    fullscreen: true,
    headerTabsHtml: `<button type="button" class="modal-hdr-tab" role="tab" aria-selected="false" data-modal-pane="detail">Info &amp; Ringkasan</button><button type="button" class="modal-hdr-tab is-active" role="tab" aria-selected="true" data-modal-pane="reader" data-autofocus>Baca Naskah</button>`,
    onClose: () => { stopSpeech(); readerController?.destroy(); },
    html: `<div class="book-modal-shell">
      <section class="book-modal-pane" data-pane="detail" hidden><div class="mading-modal-wrap">${metaHtml}${detailToolbarHtml}<article class="${paperClass}" style="${paperStyle}">${bodyHtml}</article></div></section>
      <section class="book-modal-pane is-active" data-pane="reader"><div class="reader-stage-shell"><div class="reader-stage-view" data-reader-stage="drive"><div id="pdf-reader-stage-content" class="pdf-loading-note">Menyiapkan PDF naskah Mading...</div></div><div class="reader-stage-view" data-reader-stage="text" hidden><div id="text-offline-banner" class="offline-reader-notice" hidden></div>${fallbackToolbarHtml}<article class="${paperClass}" style="${paperStyle}">${bodyHtml}</article></div></div></section>
    </div>`
  });
  if (!bodyEl) return;

  bindTextReaderControls(bodyEl);
  const dialogEl = document.getElementById('app-modal');
  dialogEl?.classList.add('is-reading-mode');
  readerController = createBookReaderController({
    bodyEl,
    book: work,
    gdrive,
    animateCover: false,
    onStageChange: (viewName) => {
      for (const s of bodyEl.querySelectorAll('[data-reader-stage]')) s.toggleAttribute('hidden', s.getAttribute('data-reader-stage') !== viewName);
      if (viewName === 'drive') window.requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    }
  });

  const setActivePane = (paneName) => {
    const scopeEl = dialogEl || bodyEl;
    for (const btn of scopeEl.querySelectorAll('[data-modal-pane]')) {
      const active = btn.getAttribute('data-modal-pane') === paneName;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    }
    for (const pane of bodyEl.querySelectorAll('[data-pane]')) {
      const match = pane.getAttribute('data-pane') === paneName;
      pane.toggleAttribute('hidden', !match);
      pane.classList.toggle('is-active', match);
    }
    dialogEl?.classList.toggle('is-reading-mode', paneName === 'reader');
    if (paneName === 'reader') {
      readerController.activateReader();
      window.requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    }
  };

  for (const btn of (dialogEl || bodyEl).querySelectorAll('[data-modal-pane]')) {
    btn.addEventListener('click', () => { playSfx('click'); setActivePane(btn.getAttribute('data-modal-pane') || 'detail'); });
  }
  bodyEl.querySelector('#btn-mading-switch-pdf')?.addEventListener('click', () => { playSfx('pop'); setActivePane('reader'); });
  bindTts(bodyEl, 'Dengar Ringkasan');
  readerController.activateReader();
}

/**
 * Merender Mading Digital dengan filter peran, paginasi ringkas, dan modal baca karya.
 * @param {HTMLElement | null} container
 * @param {{ works: any[], roleFilter: string, page: number, pageSize?: number, onPageChange?: (nextPage: number) => void, onRequestSubmit?: () => void, onRequestTrack?: () => void }} [options]
 */
export function renderMadingPanel(
  container,
  { works = [], roleFilter = 'all', page = 1, pageSize = APP_CONFIG.MADING_PAGE_SIZE, onPageChange, onRequestSubmit, onRequestTrack } = {}
) {
  if (!container) return;
  const filtered = roleFilter === 'all'
    ? works
    : works.filter((w) => String(w.author_role || '').toLowerCase() === roleFilter.toLowerCase());

  if (!filtered.length) {
    const emptyTitle = works.length ? 'Belum Ada Karya pada Kategori Ini' : 'Belum Ada Karya di Mading Digital';
    const emptyDesc = works.length
      ? 'Pilih filter peran lain, ajukan naskah terbaru, atau lacak status karya Anda.'
      : 'Karya warga sekolah yang lolos kurasi akan tampil di sini. Gunakan tombol Ajukan Karya untuk mengirim naskah atau Lacak Karya Saya untuk memeriksa status kode SPN.';
    container.innerHTML = `<article class="empty-stage-note"><h3>${emptyTitle}</h3><p>${emptyDesc}</p><div class="empty-stage-actions"><button type="button" class="primary-btn inline-action-btn" data-action="open-submit">${createIcon('send')}<span>Ajukan Karya</span></button><button type="button" class="secondary-btn inline-action-btn" data-action="open-track">${createIcon('search')}<span>Lacak Karya Saya</span></button></div></article>`;
    container.onclick = (event) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest('[data-action="open-submit"]')) onRequestSubmit?.();
      else if (target?.closest('[data-action="open-track"]')) onRequestTrack?.();
    };
    return;
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pageItems = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const paginationHtml = totalPages > 1
    ? `<div class="mading-pagination"><button type="button" class="page-btn" data-mading-page="${safePage - 1}" ${safePage <= 1 ? 'disabled' : ''}>Sebelumnya</button><span class="page-indicator">Hal ${safePage} / ${totalPages} (${filtered.length} karya)</span><button type="button" class="page-btn" data-mading-page="${safePage + 1}" ${safePage >= totalPages ? 'disabled' : ''}>Berikutnya</button></div>`
    : '';

  container.innerHTML = `<div class="mading-cards-grid">${pageItems
    .map((work) => `
      <article class="mading-card" data-work-id="${escapeHtml(work.id)}" data-nav-card="true">
        <div class="mading-card-top">
          <span class="mading-category">${escapeHtml(work.category || 'Karya')}</span>
          <span class="mading-date">${escapeHtml(formatDateId(work.published_at))}</span>
        </div>
        <h3 class="mading-card-title">${escapeHtml(work.title)}</h3>
        <p class="mading-card-author"><strong>${escapeHtml(work.author_name)}</strong><span>${escapeHtml(work.author_role)} &middot; ${escapeHtml(work.author_class_unit || '-')}</span></p>
        ${work.culture_theme ? `<p class="mading-card-theme">Tema: ${escapeHtml(work.culture_theme)}</p>` : ''}
        <p class="mading-card-summary">${escapeHtml(extractPlainLiteraryText(work.summary || ''))}</p>
        <div class="mading-card-footer">
          <button type="button" class="primary-btn" data-action="read-mading" data-work-id="${escapeHtml(work.id)}">Baca Karya</button>
        </div>
      </article>
    `)
    .join('')}</div>${paginationHtml}`;

  container.onclick = (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;

    const readBtn = target.closest('[data-action="read-mading"]');
    if (readBtn instanceof HTMLElement) {
      const work = works.find((item) => String(item.id) === readBtn.dataset.workId);
      if (work) {
        playSfx('pop');
        openMadingWorkModal(work);
      }
      return;
    }

    const pageBtn = target.closest('[data-mading-page], [data-swipe-page]');
    if (pageBtn instanceof HTMLButtonElement && !pageBtn.disabled) {
      playSfx('click');
      onPageChange?.(Number(pageBtn.dataset.madingPage || pageBtn.dataset.swipePage || 1));
    }
  };
}

const FALLBACK_ACTIVITY_PHOTO = 'assets/images/logo-smansi.webp';

/**
 * Merender panel Sudut Pustakawan berisi postingan dokumentasi foto kegiatan perpustakaan.
 * @param {HTMLElement | null} container
 * @param {{ siteSettings?: Record<string, any>, activities?: any[] }} [options]
 */
export function renderLibrarianPanel(container, { siteSettings = {}, activities = [] } = {}) {
  if (!container) return;
  const contact = siteSettings.contact_admin || {};

  const panelBadge = document.querySelector('#panel-pustakawan .panel-header .panel-badge');
  if (panelBadge) {
    panelBadge.textContent = activities.length ? `${activities.length} Kegiatan` : 'Galeri Foto';
  }

  const cardsHtml = activities.length
    ? activities
      .map((act) => {
        const photos = normalizeActivityPhotos(act.photos);
        const coverUrl = photos[0]?.url || FALLBACK_ACTIVITY_PHOTO;
        const extraThumbs = photos.slice(1, 4);
        const desc = String(act.description || '').trim();
        return `
            <article class="librarian-doc-card librarian-activity-card" data-activity-id="${escapeHtml(act.id)}" data-nav-card="true">
              <div class="librarian-activity-media" data-action="open-activity" data-activity-id="${escapeHtml(act.id)}">
                <img src="${escapeHtml(coverUrl)}" alt="${escapeHtml(act.title)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${FALLBACK_ACTIVITY_PHOTO}'">
                <span class="librarian-photo-badge">${Math.max(1, photos.length)} Foto</span>
              </div>
              ${extraThumbs.length
            ? `
                    <div class="librarian-mini-strip" aria-hidden="true">
                      ${extraThumbs
              .map(
                (thumb) =>
                  `<img src="${escapeHtml(thumb.url)}" alt="" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${FALLBACK_ACTIVITY_PHOTO}'">`
              )
              .join('')}
                      ${photos.length > 4 ? `<span class="librarian-mini-more">+${photos.length - 4}</span>` : ''}
                    </div>
                  `
            : ''
          }
              <h3 class="librarian-doc-title">${escapeHtml(act.title)}</h3>
              ${desc ? `<p class="librarian-doc-summary">${escapeHtml(desc)}</p>` : ''}
              <div class="librarian-doc-actions">
                <button type="button" class="secondary-btn" data-action="open-activity" data-activity-id="${escapeHtml(act.id)}">${photos.length > 1 ? `Lihat ${photos.length} Foto` : 'Lihat Foto'}</button>
              </div>
            </article>
          `;
      })
      .join('')
    : `
      <article class="empty-stage-note librarian-empty-card">
        <h3>Belum Ada Kegiatan Terpublikasi</h3>
        <p>Dokumentasi foto kegiatan literasi dan perpustakaan akan ditampilkan di sini setelah ditambahkan oleh pengelola.</p>
      </article>
    `;

  container.innerHTML = `<div class="librarian-docs-grid">${cardsHtml}</div>`;

  container.onclick = (event) => {
    const btn = event.target instanceof HTMLElement ? event.target.closest('[data-action="open-activity"]') : null;
    if (!(btn instanceof HTMLElement)) return;
    const act = activities.find((a) => String(a.id) === btn.dataset.activityId);
    if (act) {
      playSfx('pop');
      openLibrarianActivityDetailModal(act, contact);
    }
  };
}
