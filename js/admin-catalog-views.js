/**
 * Sub-Modul Pengelola Katalog & Pameran 3D (Fitur 5) — e-SIPENA SMAN 1 Sidayu
 * Menangani daftar & pembuatan/penyuntingan Buku/Novel, Koleksi Model 3D Gresik,
 * kontak WA admin, KPI buku 2025, serta kegiatan Sudut Pustakawan.
 */

import { APP_CONFIG } from './config.js';
import { playSfx } from './audio.js';
import { BOOK_CATEGORIES, adminSaveSetting, normalizeActivityPhotos } from './data-service.js';
import { openBookEditorModal } from './admin-book-modal.js';
import { openLibrarianActivityModal } from './admin-activity-modal.js';
import { openModel3dEditorModal } from './admin-catalog-modals.js';
import { createIcon, escapeHtml, resolveGDriveLinks, showToast } from './ui-utils.js';

const BOOK_SECTION_META = Object.freeze({
  Novel: 'Koleksi buku novel karya warga sekolah.',
  Cerpen: 'Koleksi buku dan antologi cerita pendek.',
  Puisi: 'Koleksi buku dan antologi puisi.'
});

function groupBooksByCategory(books = []) {
  const buckets = Object.fromEntries(BOOK_CATEGORIES.map((cat) => [cat, []]));
  const lookup = new Map(BOOK_CATEGORIES.map((cat) => [cat.toLowerCase(), cat]));
  const others = [];

  for (const book of books) {
    const raw = String(book?.category || 'Novel').trim();
    const canonical = raw ? lookup.get(raw.toLowerCase()) : 'Novel';
    if (canonical) buckets[canonical].push(book);
    else others.push(book);
  }
  return { buckets, others };
}

function renderBookAdminCard(book, { showCategory = false } = {}) {
  const gdrive = resolveGDriveLinks(book);
  const hiddenBadge = book.is_published === false ? '<span class="status-badge status-rejected">Disembunyikan</span>' : '';
  const catBadge = showCategory && book.category ? `<span class="panel-badge">${escapeHtml(book.category)}</span>` : '';
  const hasAuthor = Boolean(String(book.author_name || '').trim());
  const hasCover = Boolean(String(book.cover_url || '').trim());
  const metaLabel = hasAuthor
    ? `${escapeHtml(book.author_name)}${book.author_role ? ` (${escapeHtml(book.author_role)})` : ''}`
    : `${escapeHtml(book.category || 'Antologi')} &middot; Tahun ${escapeHtml(book.publication_year || 2026)}`;
  const thumbHtml = hasCover
    ? `<img class="admin-book-thumb" src="${escapeHtml(book.cover_url)}" alt="" width="44" height="62" loading="lazy" onerror="this.onerror=null;this.src='assets/images/logo-smansi.webp'">`
    : `<div class="admin-book-no-cover" aria-hidden="true">${createIcon('book')}</div>`;
  return `
    <article class="admin-item-card">
      <div class="admin-item-top">
        <span class="panel-badge">#${escapeHtml(book.sort_order ?? '-')}</span>
        <div class="admin-item-badges">
          ${catBadge}
          ${hiddenBadge}
          <span class="status-badge ${gdrive.hasDriveFile ? 'status-approved' : 'status-wait'}">${gdrive.hasDriveFile ? 'PDF Ada' : 'PDF Kosong'}</span>
        </div>
      </div>
      <div class="admin-book-row">
        ${thumbHtml}
        <div>
          <h4>${escapeHtml(book.title)}</h4>
          <p class="admin-item-meta">${metaLabel}</p>
        </div>
      </div>
      <button type="button" class="secondary-btn inline-action-btn" data-edit-book="${escapeHtml(book.id)}">${createIcon('book')}<span>${hasCover ? 'Sunting Buku &amp; Sampul' : 'Sunting Karya'}</span></button>
    </article>
  `;
}

function renderBookCategorySection(category, items, { note, allowAdd = true, showCategory = false } = {}) {
  const slug = category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `
    <section class="catalog-type-section" id="catalog-sec-${escapeHtml(slug)}">
      <div class="catalog-type-head">
        <div class="catalog-type-title-wrap">
          <div class="catalog-type-title-row">
            <h3>${escapeHtml(category)}</h3>
            <span class="panel-badge">${items.length} Buku</span>
          </div>
          <p class="admin-section-note">${escapeHtml(note)}</p>
        </div>
        ${allowAdd ? `<button type="button" class="primary-btn admin-row-btn" data-add-book-cat="${escapeHtml(category)}">+ Tambah ${escapeHtml(category)}</button>` : ''}
      </div>
      ${items.length
      ? `<div class="catalog-admin-grid">${items.map((book) => renderBookAdminCard(book, { showCategory })).join('')}</div>`
      : `<p class="admin-section-empty">Belum ada buku pada jenis ${escapeHtml(category)}.</p>`
    }
    </section>
  `;
}

function getNextSortOrder(items = []) {
  return items.reduce((max, item) => Math.max(max, Number(item?.sort_order || 0)), 0) + 1;
}

function renderActivitiesManagerCard(activities = [], activitiesError = '') {
  const rowsHtml = activities.length
    ? activities
      .map((act) => {
        const photos = normalizeActivityPhotos(act.photos);
        const thumbUrl = photos[0]?.url || 'assets/images/logo-smansi.webp';
        const desc = String(act.description || '').trim();
        const descNote = desc ? (desc.length > 65 ? `${desc.slice(0, 62)}...` : desc) : 'Tanpa deskripsi singkat';
        const hiddenNote = act.is_active === false ? ' &middot; Disembunyikan' : '';
        return `
            <div class="doc-editor-row">
              <div class="activity-editor-row-info">
                <img class="activity-editor-thumb" src="${escapeHtml(thumbUrl)}" alt="" width="48" height="48" loading="lazy" onerror="this.onerror=null;this.src='assets/images/logo-smansi.webp'">
                <div><strong>${escapeHtml(act.title)}</strong><p>${photos.length} foto &middot; ${escapeHtml(descNote)}${hiddenNote}</p></div>
              </div>
              <button type="button" class="secondary-btn" data-edit-activity-id="${escapeHtml(act.id)}">Sunting</button>
            </div>
          `;
      })
      .join('')
    : '<p class="admin-muted-note">Belum ada kegiatan Sudut Pustakawan. Klik + Tambah untuk membuat baru.</p>';

  return `
    <section class="sub-card">
      <div class="sub-card-head">
        <h3>Kegiatan Sudut Pustakawan (${activities.length})</h3>
        <button type="button" class="primary-btn admin-row-btn" id="btn-admin-add-activity">+ Tambah</button>
      </div>
      ${activitiesError ? `<p class="file-status-text is-error">${escapeHtml(activitiesError)}</p>` : ''}
      <div class="doc-editor-list">${rowsHtml}</div>
    </section>
  `;
}

export function renderCatalogManager(
  container,
  {
    snapshot,
    catalogBooks = null,
    catalogModels3d = null,
    catalogActivities = null,
    activitiesError = '',
    subSection,
    onSelectSubSection,
    onUpdated
  }
) {
  const books = Array.isArray(catalogBooks) ? catalogBooks : snapshot?.books || [];
  const models3d = Array.isArray(catalogModels3d) ? catalogModels3d : snapshot?.models3d || [];
  const activities = Array.isArray(catalogActivities)
    ? catalogActivities
    : snapshot?.librarianActivities || [];
  const settings = snapshot?.siteSettings || {};
  const contact = settings.contact_admin || {};
  const corner = settings.librarian_corner || {};
  const portalLinks = settings.portal_links || {};
  const kpi = settings.kpi_stats || {};

  const section = ['books', 'models3d', 'settings'].includes(subSection) ? subSection : 'books';
  const groupedBooks = groupBooksByCategory(books);
  const nextOrderByCategory = Object.fromEntries(
    BOOK_CATEGORIES.map((cat) => [cat, getNextSortOrder(groupedBooks.buckets[cat])])
  );
  const nextModelOrder = getNextSortOrder(models3d);
  const nextActivityOrder = getNextSortOrder(activities);

  let bodyHtml = '';
  if (section === 'books') {
    bodyHtml = `
      <div class="admin-section-bar">
        <p class="admin-section-note">Kelola judul, penulis, sampul, sinopsis, dan PDF berdasarkan jenis karya.</p>
        <div class="catalog-jump-pills" aria-label="Lompat ke jenis buku">
          ${BOOK_CATEGORIES.map((cat) => `<button type="button" class="secondary-btn catalog-jump-btn" data-jump-cat="${escapeHtml(cat)}">${escapeHtml(cat)} (${groupedBooks.buckets[cat].length})</button>`).join('')}
        </div>
      </div>
      <div class="catalog-type-stack">
        ${BOOK_CATEGORIES.map((cat) =>
      renderBookCategorySection(cat, groupedBooks.buckets[cat], {
        note: BOOK_SECTION_META[cat] || `Koleksi buku ${cat}.`
      })
    ).join('')}
        ${groupedBooks.others.length
        ? renderBookCategorySection('Kategori Lainnya', groupedBooks.others, {
          note: 'Buku dengan kategori di luar Novel, Cerpen, dan Puisi.',
          allowAdd: false,
          showCategory: true
        })
        : ''
      }
      </div>
    `;
  } else if (section === 'models3d') {
    bodyHtml = `
      <div class="admin-section-bar">
        <p class="admin-section-note">Kelola judul dan teks perkenalan Pameran 3D Gresik (sumber .glb &amp; gambar placeholder disimpan di aplikasi).</p>
        <button type="button" class="primary-btn" id="btn-admin-add-model3d">+ Tambah Model 3D</button>
      </div>
      <div class="catalog-admin-grid">
        ${models3d
        .map((item, idx) => {
          const inactiveBadge = item.is_active === false ? '<span class="status-badge status-rejected">Disembunyikan</span>' : '<span class="status-badge status-approved">Tampil</span>';
          const fileName = String(item.model_path || '').split('/').pop() || 'model.glb';
          return `
              <article class="admin-item-card">
                <div class="admin-item-top">
                  <span class="panel-badge">#${escapeHtml(item.sort_order ?? idx + 1)}</span>
                  <div class="admin-item-badges">
                    ${inactiveBadge}
                  </div>
                </div>
                <div class="admin-book-row">
                  <img class="admin-model3d-thumb" src="${escapeHtml(item.placeholder_url || 'assets/images/logo-smansi.webp')}" alt="" width="56" height="56" loading="lazy" onerror="this.onerror=null;this.src='assets/images/logo-smansi.webp'">
                  <div>
                    <h4>${escapeHtml(item.title)}</h4>
                    <p class="admin-item-meta">${escapeHtml(item.category || 'Budaya Gresik')} &middot; ${escapeHtml(fileName)}</p>
                  </div>
                </div>
                <p class="admin-model3d-snippet">${escapeHtml(item.introduction || '')}</p>
                <button type="button" class="secondary-btn inline-action-btn" data-edit-model3d="${escapeHtml(item.id)}">${createIcon('cube')}<span>Sunting Judul &amp; Perkenalan</span></button>
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
            ${[
        ['adm-wa-num', 'Nomor WhatsApp Admin (628...)', 'text', contact.whatsapp_number || APP_CONFIG.SCHOOL_DEFAULTS.whatsappNumber, 'required'],
        ['adm-wa-label', 'Label Nama Admin', 'text', contact.whatsapp_label || 'Pustakawan SMAN 1 Sidayu', 'required'],
        ['adm-wa-email', 'Surel Perpustakaan', 'email', contact.email || '', ''],
        ['adm-portal-url', 'URL Publik Portal (QR)', 'url', portalLinks.portal_url || '', 'placeholder="https://esipena-smansi.pages.dev"'],
        ['adm-kpi-2025', 'Rekam Jejak Buku 2025 (KPI)', 'number', kpi.books_2025_count ?? 23, 'min="0" max="9999"'],
        ['adm-lib-hours', 'Jam Layanan Pustakawan', 'text', corner.service_hours || 'Senin - Jumat, 07.00 - 15.00 WIB', ''],
        ['adm-wa-prefix', 'Awalan Pesan Otomatis WA', 'text', contact.order_message_prefix || '', '', true]
      ]
        .map(
          ([id, label, type, val, extra, span2]) =>
            `<label class="form-field${span2 ? ' form-field-span2' : ''}"><span>${label}</span><input id="${id}" type="${type}" value="${escapeHtml(val)}" ${extra}></label>`
        )
        .join('')}
          </div>
          <div class="admin-modal-actions">
            <button type="submit" id="btn-save-settings" class="primary-btn">Simpan Pengaturan</button>
          </div>
        </form>

        ${renderActivitiesManagerCard(activities, activitiesError)}
      </div>
    `;
  }

  container.innerHTML = `
    <div class="admin-catalog-pills" role="tablist" aria-label="Kategori katalog pengelola">
      <button type="button" class="filter-chip${section === 'books' ? ' is-active' : ''}" data-cat-sec="books">Katalog Buku (${books.length})</button>
      <button type="button" class="filter-chip${section === 'models3d' ? ' is-active' : ''}" data-cat-sec="models3d">Model 3D (${models3d.length})</button>
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

    const addBookBtn = target.closest('[data-add-book-cat]');
    if (addBookBtn instanceof HTMLElement) {
      const cat = addBookBtn.dataset.addBookCat || 'Novel';
      playSfx('pop');
      openBookEditorModal(null, onUpdated, {
        nextSortOrder: nextOrderByCategory[cat] || 1,
        nextOrderByCategory,
        defaultCategory: cat
      });
      return;
    }

    const jumpBtn = target.closest('[data-jump-cat]');
    if (jumpBtn instanceof HTMLElement) {
      const catSlug = String(jumpBtn.dataset.jumpCat || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const secEl = container.querySelector(`#catalog-sec-${catSlug}`);
      if (secEl instanceof HTMLElement) {
        playSfx('click');
        secEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }

    if (target.closest('#btn-admin-add-model3d')) {
      playSfx('pop');
      openModel3dEditorModal(null, onUpdated, { nextSortOrder: nextModelOrder });
      return;
    }

    if (target.closest('#btn-admin-add-activity')) {
      playSfx('pop');
      openLibrarianActivityModal(null, onUpdated, { nextSortOrder: nextActivityOrder });
      return;
    }

    const bookBtn = target.closest('[data-edit-book]');
    if (bookBtn instanceof HTMLElement) {
      const book = books.find((b) => String(b.id) === bookBtn.dataset.editBook);
      if (book) {
        const bookCat = BOOK_CATEGORIES.find((c) => c.toLowerCase() === String(book.category || 'Novel').trim().toLowerCase()) || 'Novel';
        playSfx('pop');
        openBookEditorModal(book, onUpdated, {
          nextSortOrder: nextOrderByCategory[bookCat] || 1,
          nextOrderByCategory
        });
      }
      return;
    }

    const m3dBtn = target.closest('[data-edit-model3d]');
    if (m3dBtn instanceof HTMLElement) {
      const item = models3d.find((m) => String(m.id) === m3dBtn.dataset.editModel3d);
      if (item) {
        playSfx('pop');
        openModel3dEditorModal(item, onUpdated, { nextSortOrder: nextModelOrder });
      }
      return;
    }

    const actBtn = target.closest('[data-edit-activity-id]');
    if (actBtn instanceof HTMLElement) {
      const act = activities.find((a) => String(a.id) === actBtn.dataset.editActivityId);
      if (act) {
        playSfx('pop');
        openLibrarianActivityModal(act, onUpdated, { nextSortOrder: nextActivityOrder });
      }
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
        cultural_topics_count: models3d.filter((m) => m.is_active !== false).length
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
