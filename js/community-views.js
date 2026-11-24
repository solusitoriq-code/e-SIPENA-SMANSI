/**
 * Modul Tampilan Komunitas & Edukasi (Fitur 3) — e-SIPENA SMAN 1 Sidayu
 * Mencakup: Jejak Budaya Gresik (5 topik), Mading Digital (8 karya awal), dan Sudut Pustakawan.
 */

import { APP_CONFIG } from './config.js';
import { playSfx, stopSpeech } from './audio.js';
import {
  bindSpeechToggleButton,
  buildWhatsAppUrl,
  createIcon,
  escapeHtml,
  formatDateId,
  getRoleBadgeClass,
  openModal,
  renderSwipeCueHtml,
  resolveGDriveLinks
} from './ui-utils.js';
import {
  extractYouTubeId,
  mountInlinePlayer,
  openVideoModal,
  renderVideoPreviewHtml
} from './yt-player.js';

/**
 * Merender 5 topik Jejak Budaya Gresik lengkap dengan pemutar/placeholder YouTube,
 * artikel pemantik, serta tombol tulis karya bertema Budaya Gresik.
 * @param {HTMLElement | null} container
 * @param {{ topics: any[], onSelectTheme?: (themeTitle: string) => void }} [options]
 */
export function renderCulturePanel(container, { topics = [], onSelectTheme } = {}) {
  if (!container) return;
  if (!topics.length) {
    container.innerHTML = `<article class="empty-stage-note"><h3>Topik Jejak Budaya Gresik Belum Tersedia</h3><p>Konten pemantik budaya lokal dapat ditambahkan kurator melalui Ruang Pengelola.</p></article>`;
    return;
  }

  container.innerHTML = `<div class="culture-grid">${topics
    .map((topic, idx) => {
      const safeId = escapeHtml(topic.id);
      return `
        <article class="culture-card" data-topic-id="${safeId}" data-nav-card="true">
          ${renderVideoPreviewHtml(topic)}
          <div class="culture-card-body">
            <div class="culture-card-meta">
              <span class="culture-index">Topik ${idx + 1}</span>
              ${topic.is_placeholder ? '<span class="placeholder-pill">Placeholder</span>' : ''}
            </div>
            <h3 class="culture-card-title">${escapeHtml(topic.title)}</h3>
            <p class="culture-card-subtitle">${escapeHtml(topic.subtitle || '')}</p>
            <p class="culture-card-summary">${escapeHtml(topic.article_summary || '')}</p>
            <div class="culture-prompt-snippet"><strong>Tugas Tulis:</strong> ${escapeHtml(topic.writing_prompt || '')}</div>
            <div class="culture-card-actions">
              <button type="button" class="secondary-btn inline-action-btn" data-action="open-topic" data-topic-id="${safeId}">${createIcon('play')}<span>Tonton &amp; Baca</span></button>
              <button type="button" class="primary-btn inline-action-btn" data-action="write-theme" data-topic-id="${safeId}">${createIcon('send')}<span>Tulis Karya</span></button>
            </div>
          </div>
        </article>
      `;
    })
    .join('')}</div>`;

  container.onclick = (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;

    const inlinePlayBtn = target.closest('[data-action="inline-play"]');
    if (inlinePlayBtn instanceof HTMLElement) {
      const frame = inlinePlayBtn.closest('.yt-frame');
      const ytId = inlinePlayBtn.dataset.ytId || '';
      if (frame instanceof HTMLElement && extractYouTubeId(ytId)) {
        mountInlinePlayer(frame, ytId, inlinePlayBtn.dataset.ytTitle || 'Video Budaya Gresik');
      }
      return;
    }

    const openTopicBtn = target.closest('[data-action="open-topic"]');
    if (openTopicBtn instanceof HTMLElement) {
      const topic = topics.find((t) => String(t.id) === openTopicBtn.dataset.topicId);
      if (topic) {
        playSfx('pop');
        openVideoModal(topic, { onWriteWithTheme: onSelectTheme });
      }
      return;
    }

    const writeBtn = target.closest('[data-action="write-theme"]');
    if (writeBtn instanceof HTMLElement) {
      const topic = topics.find((t) => String(t.id) === writeBtn.dataset.topicId);
      if (topic) {
        playSfx('pop');
        onSelectTheme?.(topic.title || '');
      }
    }
  };
}

/**
 * Membuka modal baca lengkap untuk satu karya Mading Digital.
 * @param {Record<string, any>} work
 */
export function openMadingWorkModal(work) {
  if (!work) return;
  const gdrive = resolveGDriveLinks(work);
  const paragraphs = String(work.body_text || work.summary || '').split(/\n+/).map((p) => p.trim()).filter(Boolean);
  const bodyHtml = paragraphs.length ? paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('') : '<p>Ringkasan karya belum tersedia.</p>';
  const pdfBlock = gdrive.hasDriveFile
    ? `<div class="mading-drive-box"><div class="reader-toolbar"><span>Naskah PDF Google Drive tersedia</span><a class="secondary-btn inline-action-btn" href="${escapeHtml(gdrive.openUrl)}" target="_blank" rel="noopener noreferrer">${createIcon('external')}<span>Buka di Drive</span></a></div><iframe class="pdf-preview-iframe" src="${escapeHtml(gdrive.previewUrl)}" title="Pratinjau PDF ${escapeHtml(work.title)}" loading="lazy" allowfullscreen></iframe></div>`
    : '';

  const bodyEl = openModal({
    title: work.title || 'Karya Mading Digital',
    wide: true,
    onClose: () => stopSpeech(),
    html: `
      <div class="mading-modal-wrap">
        <div class="mading-modal-badges">
          <span class="status-tag ${work.status === 'Masuk Antologi' ? 'is-antologi' : 'is-lolos'}">${escapeHtml(work.status || 'Lolos Mading')}</span>
          <span class="panel-badge">${escapeHtml(work.category || 'Karya')}</span>
          <span class="${getRoleBadgeClass(work.author_role)}">${escapeHtml(work.author_role || 'Warga Sekolah')}</span>
          <span class="panel-badge">${escapeHtml(work.author_class_unit || '-')}</span>
          <span class="panel-badge">${escapeHtml(formatDateId(work.published_at))}</span>
        </div>
        <p class="mading-modal-author">Ditulis oleh <strong>${escapeHtml(work.author_name || '')}</strong>${work.tracking_code ? `<span class="code-chip">${escapeHtml(work.tracking_code)}</span>` : ''}</p>
        ${work.culture_theme ? `<div class="mading-theme-banner">Tema Budaya Gresik: <strong>${escapeHtml(work.culture_theme)}</strong></div>` : ''}
        <div class="mading-modal-controls">
          <button type="button" class="secondary-btn inline-action-btn" id="btn-mading-tts">${createIcon('volume')}<span>Dengar Karya</span></button>
        </div>
        <article class="literary-reader-paper">${bodyHtml}</article>
        ${pdfBlock}
      </div>
    `
  });

  bindSpeechToggleButton(
    bodyEl?.querySelector('#btn-mading-tts'),
    () => `${work.title}, karya ${work.author_name}. ${work.body_text || work.summary || ''}`,
    'Dengar Karya',
    'Hentikan Suara'
  );
}

/**
 * Merender Mading Digital dengan filter peran, paginasi ringkas, dan modal baca karya.
 * @param {HTMLElement | null} container
 * @param {{ works: any[], roleFilter: string, page: number, pageSize?: number, onPageChange?: (nextPage: number) => void }} [options]
 */
export function renderMadingPanel(
  container,
  { works = [], roleFilter = 'all', page = 1, pageSize = APP_CONFIG.MADING_PAGE_SIZE, onPageChange } = {}
) {
  if (!container) return;
  const filtered = roleFilter === 'all'
    ? works
    : works.filter((w) => String(w.author_role || '').toLowerCase() === roleFilter.toLowerCase());

  if (!filtered.length) {
    container.innerHTML = `<article class="empty-stage-note"><h3>Belum Ada Karya pada Kategori Ini</h3><p>Pilih filter peran lain atau kirimkan karya terbaru Anda melalui tab Kirim &amp; Lacak.</p></article>`;
    return;
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pageItems = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const paginationHtml = totalPages > 1
    ? `<div class="mading-pagination"><button type="button" class="page-btn" data-mading-page="${safePage - 1}" ${safePage <= 1 ? 'disabled' : ''}>Sebelumnya</button><span class="page-indicator">Hal ${safePage} / ${totalPages} (${filtered.length} karya)</span><button type="button" class="page-btn" data-mading-page="${safePage + 1}" ${safePage >= totalPages ? 'disabled' : ''}>Berikutnya</button></div><div class="swipe-cue-bar mading-swipe-cue">${renderSwipeCueHtml(safePage, totalPages, 'Geser mading kiri / kanan')}</div>`
    : '';

  container.innerHTML = `<div class="mading-cards-grid">${pageItems
    .map((work) => `
      <article class="mading-card" data-work-id="${escapeHtml(work.id)}" data-nav-card="true">
        <div class="mading-card-top">
          <span class="status-tag ${work.status === 'Masuk Antologi' ? 'is-antologi' : 'is-lolos'}">${escapeHtml(work.status || 'Lolos Mading')}</span>
          <span class="mading-category">${escapeHtml(work.category || 'Karya')}</span>
        </div>
        <h3 class="mading-card-title">${escapeHtml(work.title)}</h3>
        <p class="mading-card-author"><strong>${escapeHtml(work.author_name)}</strong><span>${escapeHtml(work.author_role)} &middot; ${escapeHtml(work.author_class_unit || '-')}</span></p>
        ${work.culture_theme ? `<p class="mading-card-theme">Tema: ${escapeHtml(work.culture_theme)}</p>` : ''}
        <p class="mading-card-summary">${escapeHtml(work.summary || '')}</p>
        <div class="mading-card-footer">
          <span class="mading-date">${escapeHtml(formatDateId(work.published_at))}</span>
          <button type="button" class="primary-btn inline-action-btn" data-action="read-mading" data-work-id="${escapeHtml(work.id)}">${createIcon('book')}<span>Baca Karya</span></button>
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

function openLibrarianDocModal(doc, contactAdmin) {
  const hasExternalUrl = /^https?:\/\//i.test(String(doc?.url || '').trim());
  const waUrl = buildWhatsAppUrl(contactAdmin, `saya ingin menanyakan panduan "${doc?.title || 'Sudut Pustakawan'}".`);

  openModal({
    title: doc?.title || 'Dokumen Panduan Literasi',
    html: `
      <div class="librarian-modal-wrap">
        <div class="mading-modal-badges">
          <span class="panel-badge">${escapeHtml(doc?.category || 'Panduan')}</span>
          <span class="panel-badge">${escapeHtml(doc?.updated_label || 'Edisi 2026')}</span>
        </div>
        <p class="librarian-modal-summary">${escapeHtml(doc?.summary || '')}</p>
        <div class="librarian-guide-notes">
          <h3>Ketentuan Praktis Warga SMAN 1 Sidayu</h3>
          <ul>
            <li>Naskah dikirim melalui tab <strong>Kirim &amp; Lacak</strong> dalam format <strong>PDF maksimal 3 MB</strong> tanpa perlu login.</li>
            <li>Karya harus orisinal warga sekolah (Siswa X-XII, Guru, maupun Tendik) dan bebas dari salin-tempel tanpa sumber.</li>
            <li>Setiap naskah mendapat Kode Lacak <code>SPN-XXXXXX</code> untuk memantau hasil kurasi Pustakawan dan Tim NLC.</li>
          </ul>
        </div>
        <div class="librarian-modal-actions">
          ${hasExternalUrl ? `<a class="primary-btn inline-action-btn" href="${escapeHtml(doc.url)}" target="_blank" rel="noopener noreferrer">${createIcon('external')}<span>Buka Dokumen</span></a>` : ''}
          <a class="secondary-btn inline-action-btn" href="${escapeHtml(waUrl)}" target="_blank" rel="noopener noreferrer">${createIcon('whatsapp')}<span>Tanya Pustakawan via WA</span></a>
        </div>
      </div>
    `
  });
}

/**
 * Merender panel Sudut Pustakawan berisi dokumen panduan literasi, alur kurasi,
 * etika anti-plagiat, arsip 23 buku 2025, serta kontak resmi admin perpustakaan.
 * @param {HTMLElement | null} container
 * @param {{ siteSettings?: Record<string, any> }} [options]
 */
export function renderLibrarianPanel(container, { siteSettings = {} } = {}) {
  if (!container) return;
  const school = siteSettings.school_profile || {};
  const kpi = siteSettings.kpi_stats || {};
  const contact = siteSettings.contact_admin || {};
  const corner = siteSettings.librarian_corner || {};
  const docs = Array.isArray(corner.documents) ? corner.documents : [];
  const waUrl = buildWhatsAppUrl(contact, 'saya ingin berkonsultasi mengenai layanan perpustakaan dan pengiriman karya literasi.');

  container.innerHTML = `
    <div class="librarian-layout">
      <div class="librarian-docs-grid">
        ${docs
          .map((doc) => `
            <article class="librarian-doc-card" data-doc-id="${escapeHtml(doc.id)}" data-nav-card="true">
              <div class="librarian-doc-top">
                <span class="panel-badge">${escapeHtml(doc.category || 'Panduan')}</span>
                <span class="doc-updated">${escapeHtml(doc.updated_label || '')}</span>
              </div>
              <h3 class="librarian-doc-title">${escapeHtml(doc.title)}</h3>
              <p class="librarian-doc-summary">${escapeHtml(doc.summary || '')}</p>
              <div class="librarian-doc-actions">
                <button type="button" class="secondary-btn inline-action-btn" data-action="open-doc" data-doc-id="${escapeHtml(doc.id)}">${createIcon('book')}<span>Baca Panduan</span></button>
              </div>
            </article>
          `)
          .join('')}
      </div>
      <aside class="librarian-sidebar">
        <section class="librarian-info-card">
          <h3>${escapeHtml(school.library_name || APP_CONFIG.SCHOOL_DEFAULTS.libraryName)}</h3>
          <p class="librarian-community">${escapeHtml(school.community_name || APP_CONFIG.SCHOOL_DEFAULTS.communityName)}</p>
          <dl class="librarian-dl">
            <div><dt>Jam Layanan</dt><dd>${escapeHtml(corner.service_hours || 'Senin - Jumat, 07.00 - 15.00 WIB')}</dd></div>
            <div><dt>Alamat</dt><dd>${escapeHtml(school.address || 'Jl. Kanjeng Pangeran No. 1, Sidayu, Gresik')}</dd></div>
            <div><dt>Surel Resmi</dt><dd>${escapeHtml(contact.email || 'perpustakaan@sman1sidayu.sch.id')}</dd></div>
            <div><dt>Rekam Jejak 2025</dt><dd><strong>${escapeHtml(kpi.books_2025_count ?? 23)} Buku Karya 2025</strong> menjadi fondasi lahirnya <strong>${escapeHtml(kpi.novels_2026_count ?? 12)} Novel 2026</strong>.</dd></div>
          </dl>
          <a class="primary-btn inline-action-btn librarian-wa-btn" href="${escapeHtml(waUrl)}" target="_blank" rel="noopener noreferrer">${createIcon('whatsapp')}<span>Hubungi ${escapeHtml(contact.whatsapp_label || 'Pustakawan')}</span></a>
        </section>
      </aside>
    </div>
  `;

  container.onclick = (event) => {
    const btn = event.target instanceof HTMLElement ? event.target.closest('[data-action="open-doc"]') : null;
    if (!(btn instanceof HTMLElement)) return;
    const doc = docs.find((d) => String(d.id) === btn.dataset.docId);
    if (doc) {
      playSfx('pop');
      openLibrarianDocModal(doc, contact);
    }
  };
}
