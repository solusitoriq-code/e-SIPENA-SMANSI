/**
 * Sub-Modul Pengelola Katalog & Placeholder (Fitur 5) — e-SIPENA SMAN 1 Sidayu
 * Menangani daftar & pembuatan/penyuntingan Buku/Novel, Topik Budaya Gresik,
 * kontak WA admin, KPI buku 2025, serta dokumen Sudut Pustakawan.
 */

import { APP_CONFIG } from './config.js';
import { playSfx } from './audio.js';
import { adminSaveSetting } from './data-service.js';
import { openBookEditorModal } from './admin-book-modal.js';
import { openCultureEditorModal, openLibrarianDocModal } from './admin-catalog-modals.js';
import { createIcon, escapeHtml, resolveGDriveLinks, showToast } from './ui-utils.js';
import { extractYouTubeId } from './yt-player.js';

export function renderCatalogManager(
  container,
  { snapshot, catalogBooks = null, catalogTopics = null, subSection, onSelectSubSection, onUpdated }
) {
  const books = Array.isArray(catalogBooks) ? catalogBooks : snapshot?.books || [];
  const topics = Array.isArray(catalogTopics) ? catalogTopics : snapshot?.culturePrompts || [];
  const settings = snapshot?.siteSettings || {};
  const contact = settings.contact_admin || {};
  const corner = settings.librarian_corner || {};
  const portalLinks = settings.portal_links || {};
  const kpi = settings.kpi_stats || {};
  const docs = Array.isArray(corner.documents) ? corner.documents : [];

  const section = ['books', 'culture', 'settings'].includes(subSection) ? subSection : 'books';
  const nextBookOrder = books.reduce((m, b) => Math.max(m, Number(b.sort_order || 0)), 0) + 1;
  const nextTopicOrder = topics.reduce((m, t) => Math.max(m, Number(t.sort_order || 0)), 0) + 1;

  let bodyHtml = '';
  if (section === 'books') {
    bodyHtml = `
      <div class="admin-section-bar">
        <p class="admin-section-note">Kelola judul, penulis, gambar sampul, sinopsis, dan PDF Google Drive.</p>
        <button type="button" class="primary-btn" id="btn-admin-add-book">+ Tambah Buku / Novel</button>
      </div>
      <div class="catalog-admin-grid">
        ${books
        .map((book) => {
          const gdrive = resolveGDriveLinks(book);
          const hiddenBadge = book.is_published === false ? '<span class="status-badge status-rejected">Disembunyikan</span>' : '';
          return `
              <article class="admin-item-card">
                <div class="admin-item-top">
                  <span class="panel-badge">#${escapeHtml(book.sort_order ?? '-')}</span>
                  <div class="admin-item-badges">
                    ${hiddenBadge}
                    <span class="status-badge ${gdrive.hasDriveFile ? 'status-approved' : 'status-wait'}">${gdrive.hasDriveFile ? 'PDF Ada' : 'PDF Kosong'}</span>
                  </div>
                </div>
                <div class="admin-book-row">
                  <img class="admin-book-thumb" src="${escapeHtml(book.cover_url || 'assets/images/logo-smansi.webp')}" alt="" width="44" height="62" loading="lazy" onerror="this.onerror=null;this.src='assets/images/logo-smansi.webp'">
                  <div>
                    <h4>${escapeHtml(book.title)}</h4>
                    <p class="admin-item-meta">${escapeHtml(book.author_name)} (${escapeHtml(book.author_role)})</p>
                  </div>
                </div>
                <button type="button" class="secondary-btn inline-action-btn" data-edit-book="${escapeHtml(book.id)}">${createIcon('book')}<span>Sunting Buku &amp; Sampul</span></button>
              </article>
            `;
        })
        .join('')}
      </div>
    `;
  } else if (section === 'culture') {
    bodyHtml = `
      <div class="admin-section-bar">
        <p class="admin-section-note">Tambah atau sunting topik Jejak Budaya Gresik beserta tautan video YouTube dan tugas menulis.</p>
        <button type="button" class="primary-btn" id="btn-admin-add-culture">+ Tambah Topik Budaya</button>
      </div>
      <div class="catalog-admin-grid">
        ${topics
        .map((topic, idx) => {
          const ytId = extractYouTubeId(topic.youtube_id);
          const inactiveBadge = topic.is_active === false ? '<span class="status-badge status-rejected">Nonaktif</span>' : '';
          return `
              <article class="admin-item-card">
                <div class="admin-item-top">
                  <span class="panel-badge">Topik ${idx + 1}</span>
                  <div class="admin-item-badges">
                    ${inactiveBadge}
                    <span class="status-badge ${ytId ? 'status-approved' : 'status-revise'}">${ytId ? `YT: ${escapeHtml(ytId)}` : 'Placeholder'}</span>
                  </div>
                </div>
                <h4>${escapeHtml(topic.title)}</h4>
                <p class="admin-item-meta">${escapeHtml(topic.location_tag || 'Gresik')} &middot; ${escapeHtml(topic.duration_label || '04:00')}</p>
                <button type="button" class="secondary-btn inline-action-btn" data-edit-culture="${escapeHtml(topic.id)}">${createIcon('play')}<span>Sunting Topik &amp; YouTube</span></button>
              </article>
            `;
        })
        .join('')}
      </div>
    `;
  } else {
    bodyHtml = `
      <div class="admin-settings-split">
        <form id="admin-contact-form" class="sub-card">
          <div class="sub-card-head">
            <h3>Kontak WA Admin, KPI &amp; Tautan Portal</h3>
            <span class="panel-badge">site_settings</span>
          </div>
          <div class="admin-form-grid">
            <label class="form-field">
              <span>Nomor WhatsApp Admin (628...)</span>
              <input id="adm-wa-num" type="text" value="${escapeHtml(contact.whatsapp_number || APP_CONFIG.SCHOOL_DEFAULTS.whatsappNumber)}" required>
            </label>
            <label class="form-field">
              <span>Label Nama Admin</span>
              <input id="adm-wa-label" type="text" value="${escapeHtml(contact.whatsapp_label || 'Pustakawan SMAN 1 Sidayu')}" required>
            </label>
            <label class="form-field">
              <span>Surel Perpustakaan</span>
              <input id="adm-wa-email" type="email" value="${escapeHtml(contact.email || '')}">
            </label>
            <label class="form-field">
              <span>URL Publik Portal (QR)</span>
              <input id="adm-portal-url" type="url" value="${escapeHtml(portalLinks.portal_url || '')}" placeholder="https://esipena-smansi.pages.dev">
            </label>
            <label class="form-field">
              <span>Rekam Jejak Buku 2025 (KPI)</span>
              <input id="adm-kpi-2025" type="number" min="0" max="9999" value="${escapeHtml(kpi.books_2025_count ?? 23)}">
            </label>
            <label class="form-field">
              <span>Jam Layanan Pustakawan</span>
              <input id="adm-lib-hours" type="text" value="${escapeHtml(corner.service_hours || 'Senin - Jumat, 07.00 - 15.00 WIB')}">
            </label>
            <label class="form-field form-field-span2">
              <span>Awalan Pesan Otomatis WA</span>
              <input id="adm-wa-prefix" type="text" value="${escapeHtml(contact.order_message_prefix || '')}">
            </label>
          </div>
          <div class="admin-modal-actions">
            <button type="submit" id="btn-save-settings" class="primary-btn">Simpan Pengaturan</button>
          </div>
        </form>

        <section class="sub-card">
          <div class="sub-card-head">
            <h3>Dokumen Sudut Pustakawan (${docs.length})</h3>
            <button type="button" class="primary-btn admin-row-btn" id="btn-admin-add-doc">+ Tambah</button>
          </div>
          <div class="doc-editor-list">
            ${docs.length
        ? docs
          .map(
            (doc, idx) => `
                      <div class="doc-editor-row">
                        <div>
                          <strong>${escapeHtml(doc.title)}</strong>
                          <p>${escapeHtml(doc.category || 'Panduan')} &middot; ${doc.url ? 'Tautan terisi' : 'Belum ada URL'}</p>
                        </div>
                        <button type="button" class="secondary-btn" data-edit-doc-idx="${idx}">Sunting</button>
                      </div>
                    `
          )
          .join('')
        : '<p class="admin-muted-note">Belum ada dokumen panduan. Klik + Tambah untuk membuat baru.</p>'}
          </div>
        </section>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="admin-catalog-pills" role="tablist" aria-label="Kategori katalog pengelola">
      <button type="button" class="filter-chip${section === 'books' ? ' is-active' : ''}" data-cat-sec="books">Katalog Buku (${books.length})</button>
      <button type="button" class="filter-chip${section === 'culture' ? ' is-active' : ''}" data-cat-sec="culture">Budaya Gresik (${topics.length})</button>
      <button type="button" class="filter-chip${section === 'settings' ? ' is-active' : ''}" data-cat-sec="settings">WA Admin &amp; Pustakawan</button>
    </div>
    ${bodyHtml}
  `;

  container.onclick = (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;

    const secBtn = target.closest('[data-cat-sec]');
    if (secBtn instanceof HTMLElement) {
      playSfx('click');
      onSelectSubSection(secBtn.dataset.catSec || 'books');
      return;
    }

    if (target.closest('#btn-admin-add-book')) {
      playSfx('pop');
      openBookEditorModal(null, onUpdated, { nextSortOrder: nextBookOrder });
      return;
    }

    if (target.closest('#btn-admin-add-culture')) {
      playSfx('pop');
      openCultureEditorModal(null, onUpdated, { nextSortOrder: nextTopicOrder });
      return;
    }

    if (target.closest('#btn-admin-add-doc')) {
      playSfx('pop');
      openLibrarianDocModal(corner, -1, onUpdated);
      return;
    }

    const bookBtn = target.closest('[data-edit-book]');
    if (bookBtn instanceof HTMLElement) {
      const book = books.find((b) => String(b.id) === bookBtn.dataset.editBook);
      if (book) {
        playSfx('pop');
        openBookEditorModal(book, onUpdated, { nextSortOrder: nextBookOrder });
      }
      return;
    }

    const culBtn = target.closest('[data-edit-culture]');
    if (culBtn instanceof HTMLElement) {
      const topic = topics.find((t) => String(t.id) === culBtn.dataset.editCulture);
      if (topic) {
        playSfx('pop');
        openCultureEditorModal(topic, onUpdated, { nextSortOrder: nextTopicOrder });
      }
      return;
    }

    const docBtn = target.closest('[data-edit-doc-idx]');
    if (docBtn instanceof HTMLElement) {
      playSfx('pop');
      openLibrarianDocModal(corner, Number(docBtn.dataset.editDocIdx), onUpdated);
    }
  };

  container.querySelector('#admin-contact-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const saveBtn = container.querySelector('#btn-save-settings');
    if (saveBtn instanceof HTMLButtonElement) saveBtn.disabled = true;

    try {
      const nextContact = {
        ...contact,
        whatsapp_number: String(container.querySelector('#adm-wa-num')?.value || '').replace(/\D/g, ''),
        whatsapp_label: String(container.querySelector('#adm-wa-label')?.value || '').trim(),
        email: String(container.querySelector('#adm-wa-email')?.value || '').trim(),
        order_message_prefix: String(container.querySelector('#adm-wa-prefix')?.value || '').trim(),
        is_placeholder: false
      };
      const nextCorner = {
        ...corner,
        service_hours: String(container.querySelector('#adm-lib-hours')?.value || '').trim()
      };
      const nextPortal = {
        ...portalLinks,
        portal_url: String(container.querySelector('#adm-portal-url')?.value || '').trim(),
        is_placeholder: false
      };
      const nextKpi = {
        ...kpi,
        books_2025_count: Number(container.querySelector('#adm-kpi-2025')?.value || 23),
        novels_2026_count: books.filter((b) => b.is_published !== false).length,
        cultural_topics_count: topics.filter((t) => t.is_active !== false).length
      };

      await Promise.all([
        adminSaveSetting('contact_admin', nextContact, { is_placeholder: false }),
        adminSaveSetting('librarian_corner', nextCorner),
        adminSaveSetting('portal_links', nextPortal, { is_placeholder: false }),
        adminSaveSetting('kpi_stats', nextKpi)
      ]);
      if (typeof window.ESIPENA_APP?.refreshData === 'function') {
        await window.ESIPENA_APP.refreshData();
      }
      await onUpdated?.();
      playSfx('success');
      showToast('Kontak WA admin, KPI, dan layanan pustakawan disimpan.', 'success');
    } catch (err) {
      playSfx('error');
      showToast(err?.message || 'Gagal menyimpan pengaturan.', 'error');
    } finally {
      if (saveBtn instanceof HTMLButtonElement) saveBtn.disabled = false;
    }
  });
}
