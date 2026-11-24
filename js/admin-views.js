/**
 * Modul Tampilan Ruang Kerja Pengelola / Pustakawan (Fitur 5) — e-SIPENA SMAN 1 Sidayu
 * Menangani autentikasi kurator, filter & daftar naskah masuk, serta tab Kelola Antologi.
 */

import { isSupabaseConfigured } from './config.js';
import { playSfx } from './audio.js';
import {
  SUBMISSION_ROLES,
  SUBMISSION_STATUSES,
  adminGetSession,
  adminListAllBooks,
  adminListAllCulturePrompts,
  adminListWorks,
  adminSignIn,
  adminSignOut
} from './data-service.js';
import { getAdminStatusClass, openCurationModal } from './admin-curation-modal.js';
import { renderCatalogManager } from './admin-catalog-views.js';
import { escapeHtml, getRoleBadgeClass, showToast } from './ui-utils.js';

const adminUiState = {
  subTab: 'kurasi',
  catalogSection: 'books',
  statusFilter: 'all',
  roleFilter: 'all',
  search: '',
  works: [],
  allWorks: [],
  loading: false
};

let activeAdminContainer = null;
let snapshotGetter = () => ({ books: [], culturePrompts: [], madingWorks: [], siteSettings: {} });

function renderLoginScreen(container) {
  const supabaseActive = isSupabaseConfigured();
  container.innerHTML = `
    <div class="admin-auth-shell">
      <section class="sub-card admin-auth-card">
        <div class="sub-card-head">
          <h3>Masuk Ruang Kerja Kurator</h3>
        </div>
        <form id="admin-login-form" class="sub-form">
          <label class="form-field">
            <span>Surel Kurator / Pustakawan</span>
            <input id="adm-login-email" type="email" autocomplete="email" placeholder="pustakawan@sman1sidayu.sch.id" ${supabaseActive ? 'required' : ''}>
          </label>
          <label class="form-field">
            <span>Kata Sandi</span>
            <input id="adm-login-password" type="password" autocomplete="current-password" placeholder="Masukkan kata sandi" ${supabaseActive ? 'required' : ''}>
          </label>
          <div class="admin-login-actions">
            <button type="submit" id="btn-adm-login" class="primary-btn">${supabaseActive ? 'Masuk Pengelola' : 'Masuk Mode Demo Lokal'}</button>
          </div>
        </form>
      </section>
    </div>
  `;

  container.querySelector('#admin-login-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const btn = container.querySelector('#btn-adm-login');
    if (btn instanceof HTMLButtonElement) btn.disabled = true;

    try {
      const email = container.querySelector('#adm-login-email')?.value || '';
      const password = container.querySelector('#adm-login-password')?.value || '';
      const res = await adminSignIn(email, password);
      playSfx('success');
      showToast(
        res.mode === 'demo' ? 'Masuk ke Mode Demo Pengelola lokal.' : 'Berhasil masuk ke Ruang Pengelola.',
        'success'
      );
      await renderAdminWorkspace(container);
    } catch (err) {
      playSfx('error');
      showToast(err?.message || 'Gagal masuk ke Ruang Pengelola.', 'error');
      if (btn instanceof HTMLButtonElement) btn.disabled = false;
    }
  });
}

function renderSubmissionsList(listWrap) {
  const works = adminUiState.works;
  if (adminUiState.loading) {
    listWrap.innerHTML = '<article class="empty-stage-note"><p>Memuat daftar naskah masuk...</p></article>';
    return;
  }
  if (!works.length) {
    listWrap.innerHTML = '<article class="empty-stage-note"><h3>Tidak Ada Naskah</h3><p>Belum ada naskah yang sesuai dengan filter status atau peran saat ini.</p></article>';
    return;
  }

  listWrap.innerHTML = `
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Kode</th>
            <th>Judul Karya &amp; Penulis</th>
            <th>Peran / Kategori</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${works
      .map(
        (work) => `
                <tr>
                  <td><span class="code-chip">${escapeHtml(work.tracking_code || '-')}</span></td>
                  <td>
                    <strong class="table-title">${escapeHtml(work.title)}</strong>
                    <div class="table-sub">${escapeHtml(work.author_name)} &middot; ${escapeHtml(work.author_class_unit || '-')}</div>
                  </td>
                  <td>
                    <span class="${getRoleBadgeClass(work.author_role)}">${escapeHtml(work.author_role)}</span>
                    <div class="table-sub">${escapeHtml(work.category || '-')}</div>
                  </td>
                  <td><span class="${getAdminStatusClass(work.status)}">${escapeHtml(work.status)}</span></td>
                  <td>
                    <button type="button" class="primary-btn admin-row-btn" data-curate-id="${escapeHtml(work.id)}">Kurasi</button>
                  </td>
                </tr>
              `
      )
      .join('')}
        </tbody>
      </table>
    </div>
  `;

  listWrap.onclick = (event) => {
    const btn = event.target instanceof HTMLElement ? event.target.closest('[data-curate-id]') : null;
    if (!(btn instanceof HTMLElement)) return;
    const work = adminUiState.works.find((w) => String(w.id) === btn.dataset.curateId);
    if (work) {
      playSfx('pop');
      openCurationModal(work, () => loadAndRenderWorks(activeAdminContainer));
    }
  };
}

async function loadAndRenderWorks(container) {
  if (!container) return;
  const listWrap = container.querySelector('#admin-works-list');
  const statsEl = container.querySelector('#admin-curation-stats');
  if (!listWrap) return;

  adminUiState.loading = true;
  renderSubmissionsList(listWrap);

  try {
    const res = await adminListWorks({
      status: adminUiState.statusFilter,
      role: adminUiState.roleFilter,
      search: adminUiState.search,
      fallbackWorks: snapshotGetter()?.madingWorks || []
    });
    adminUiState.works = res.items;
    adminUiState.allWorks = res.allItems;

    if (statsEl) {
      const waitCount = res.allItems.filter((w) => w.status === 'Menunggu Kurasi').length;
      const revCount = res.allItems.filter((w) => w.status === 'Perlu Revisi').length;
      const pubCount = res.allItems.filter((w) => ['Lolos Mading', 'Masuk Antologi'].includes(w.status)).length;
      statsEl.innerHTML = `Menunggu: <strong>${waitCount}</strong> &middot; Revisi: <strong>${revCount}</strong> &middot; Terbit: <strong>${pubCount}</strong>`;
    }
  } catch (err) {
    showToast(err?.message || 'Gagal memuat daftar naskah masuk.', 'error');
    if (!adminGetSession()) {
      renderLoginScreen(container);
      return;
    }
  } finally {
    adminUiState.loading = false;
    if (listWrap.isConnected) renderSubmissionsList(listWrap);
  }
}

async function renderAdminWorkspace(container) {
  const session = adminGetSession();
  if (!session) {
    renderLoginScreen(container);
    return;
  }

  const isKurasi = adminUiState.subTab !== 'katalog';
  // <span class="status-pill is-online">${session.mode === 'demo' ? 'Mode Demo Lokal' : 'Supabase Auth'}</span>
  container.innerHTML = `
    <div class="admin-workspace">
      <div class="admin-topbar">
        <div class="admin-session-info">
          <strong class="admin-user-email">${escapeHtml(session.user?.email || 'Kurator')}</strong>
        </div>
        <div class="admin-subtabs" role="tablist" aria-label="Menu Ruang Pengelola">
          <button type="button" class="filter-chip${isKurasi ? ' is-active' : ''}" data-admin-subtab="kurasi">Kurasi Naskah</button>
          <button type="button" class="filter-chip${!isKurasi ? ' is-active' : ''}" data-admin-subtab="katalog">Kelola Antologi</button>
        </div>
        <div class="admin-top-actions">
          <button type="button" id="btn-admin-refresh" class="secondary-btn">Muat Ulang</button>
          <button type="button" id="btn-admin-logout" class="secondary-btn">Keluar</button>
        </div>
      </div>

      <div id="admin-kurasi-pane"${isKurasi ? '' : ' hidden'}>
        <div class="admin-filter-bar">
          <select id="adm-filter-status" aria-label="Filter status naskah">
            <option value="all">Semua Status</option>
            ${SUBMISSION_STATUSES.map((s) => `<option value="${escapeHtml(s)}"${adminUiState.statusFilter === s ? ' selected' : ''}>${escapeHtml(s)}</option>`).join('')}
          </select>
          <select id="adm-filter-role" aria-label="Filter peran penulis">
            <option value="all">Semua Peran</option>
            ${SUBMISSION_ROLES.map((r) => `<option value="${escapeHtml(r)}"${adminUiState.roleFilter === r ? ' selected' : ''}>${escapeHtml(r)}</option>`).join('')}
          </select>
          <input id="adm-filter-search" type="search" value="${escapeHtml(adminUiState.search)}" placeholder="Cari kode, judul, penulis...">
          <span id="admin-curation-stats" class="admin-stats-note"></span>
        </div>
        <div id="admin-works-list"></div>
      </div>

      <div id="admin-katalog-pane"${!isKurasi ? '' : ' hidden'}></div>
    </div>
  `;

  for (const tabBtn of container.querySelectorAll('[data-admin-subtab]')) {
    tabBtn.addEventListener('click', () => {
      playSfx('click');
      adminUiState.subTab = tabBtn.getAttribute('data-admin-subtab') || 'kurasi';
      renderAdminWorkspace(container);
    });
  }

  container.querySelector('#btn-admin-refresh')?.addEventListener('click', async () => {
    playSfx('click');
    if (typeof window.ESIPENA_APP?.refreshData === 'function') {
      await window.ESIPENA_APP.refreshData();
    }
    await renderAdminWorkspace(container);
    showToast('Data ruang pengelola disegarkan.');
  });

  container.querySelector('#btn-admin-logout')?.addEventListener('click', async () => {
    playSfx('click');
    await adminSignOut();
    showToast('Anda telah keluar dari Ruang Pengelola.');
    renderLoginScreen(container);
  });

  if (isKurasi) {
    container.querySelector('#adm-filter-status')?.addEventListener('change', (e) => {
      adminUiState.statusFilter = e.target.value;
      loadAndRenderWorks(container);
    });
    container.querySelector('#adm-filter-role')?.addEventListener('change', (e) => {
      adminUiState.roleFilter = e.target.value;
      loadAndRenderWorks(container);
    });
    container.querySelector('#adm-filter-search')?.addEventListener('input', (e) => {
      adminUiState.search = e.target.value;
      loadAndRenderWorks(container);
    });
    await loadAndRenderWorks(container);
  } else {
    const katalogPane = container.querySelector('#admin-katalog-pane');
    if (katalogPane instanceof HTMLElement) {
      const snap = snapshotGetter();
      let catalogBooks = snap?.books || [];
      let catalogTopics = snap?.culturePrompts || [];
      try {
        [catalogBooks, catalogTopics] = await Promise.all([
          adminListAllBooks(catalogBooks),
          adminListAllCulturePrompts(catalogTopics)
        ]);
      } catch {
        // Gunakan snapshot saat ini bila pembacaan daftar lengkap terhambat
      }
      renderCatalogManager(katalogPane, {
        snapshot: snap,
        catalogBooks,
        catalogTopics,
        subSection: adminUiState.catalogSection,
        onSelectSubSection: (sec) => {
          adminUiState.catalogSection = sec;
          renderAdminWorkspace(container);
        },
        onUpdated: () => renderAdminWorkspace(container)
      });
    }
  }
}

/**
 * Merender antarmuka Fitur 5 (Ruang Kerja Pengelola & Kurasi) ke #admin-container.
 * @param {HTMLElement | null} container
 * @param {{ getSnapshot?: () => any }} [options]
 */
export function renderAdminPanel(container, { getSnapshot } = {}) {
  if (!container) return;
  if (typeof getSnapshot === 'function') snapshotGetter = getSnapshot;
  activeAdminContainer = container;

  if (container.dataset.session3Mounted === '1') {
    return;
  }

  container.dataset.session3Mounted = '1';
  renderAdminWorkspace(container);
}
