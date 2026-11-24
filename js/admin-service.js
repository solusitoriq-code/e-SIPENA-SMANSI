/**
 * Layanan Kurasi Naskah & Manajemen Katalog — e-SIPENA SMAN 1 Sidayu
 * Menangani CRUD penuh (tambah, sunting, hapus) untuk books, models_3d,
 * submissions, serta site_settings melalui Supabase REST atau mode demo lokal.
 */

import { isSupabaseConfigured } from './config.js';
import { adminGetSession, adminSignIn, adminSignOut, authSupabaseFetch } from './admin-auth.js';
import {
  getDemoOverrides,
  mergeSubmissionRows,
  normalizeGDriveInput,
  saveDemoOverride,
  setDemoOverrides,
  slugifyTitle
} from './service-helpers.js';
import { getLocalSubmissions, removeLocalSubmissionByCode, saveLocalSubmission } from './submission-service.js';
import { extractPlainLiteraryText } from './ui-utils.js';

export { adminGetSession, adminSignIn, adminSignOut };
export const BOOK_ROLES = Object.freeze(['Siswa XI', 'Siswa XII', 'Guru', 'Tendik', 'Kepala Sekolah']);
export const BOOK_CATEGORIES = Object.freeze(['Novel', 'Cerpen', 'Puisi']);
const EDITORIAL_ONLY_CATEGORIES = new Set(['cerpen', 'puisi']);

export function bookRequiresNovelDetails(category = 'Novel') {
  return !EDITORIAL_ONLY_CATEGORIES.has(String(category || '').trim().toLowerCase());
}

export const bookRequiresSynopsis = bookRequiresNovelDetails;

export async function adminListWorks({
  status = 'all',
  role = 'all',
  search = '',
  fallbackWorks = []
} = {}) {
  const session = adminGetSession();
  if (!session) throw new Error('Silakan masuk sebagai kurator terlebih dahulu.');

  let items = [];
  let source = 'demo';

  if (session.mode === 'supabase' && isSupabaseConfigured()) {
    const rawItems = (await authSupabaseFetch('/rest/v1/submissions?select=*&order=created_at.desc')) || [];
    items = mergeSubmissionRows(rawItems).sort(
      (a, b) => new Date(b.created_at || b.published_at || 0) - new Date(a.created_at || a.published_at || 0)
    );
    source = 'supabase';
  } else {
    const ov = getDemoOverrides().submissions;
    const localSubs = getLocalSubmissions();
    items = mergeSubmissionRows([...localSubs, ...fallbackWorks], ov).sort(
      (a, b) => new Date(b.created_at || b.published_at || 0) - new Date(a.created_at || a.published_at || 0)
    );
  }

  const q = String(search || '').trim().toLowerCase();
  const filtered = items.filter((item) => {
    if (status !== 'all' && item.status !== status) return false;
    if (role !== 'all' && item.author_role !== role) return false;
    if (q) {
      const hay = `${item.tracking_code || ''} ${item.title || ''} ${item.author_name || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return { source, items: filtered, allItems: items };
}

export async function adminUpdateWork(workId, updates = {}) {
  const session = adminGetSession();
  if (!session) throw new Error('Sesi kurator belum aktif.');

  const payload = {};
  const allowed = [
    'status', 'reviewer_notes', 'title', 'category', 'culture_theme', 'summary',
    'body_text', 'gdrive_file_id', 'gdrive_view_url', 'gdrive_preview_url', 'published_at'
  ];
  for (const key of allowed) {
    if (updates[key] !== undefined) payload[key] = updates[key];
  }
  if (payload.status === 'Lolos Mading' && !payload.published_at) {
    payload.published_at = new Date().toISOString();
  }
  payload.updated_at = new Date().toISOString();

  if (session.mode === 'supabase' && isSupabaseConfigured()) {
    const rows = await authSupabaseFetch(`/rest/v1/submissions?id=eq.${encodeURIComponent(workId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(payload)
    });
    const updated = Array.isArray(rows) ? rows[0] || payload : payload;
    removeLocalSubmissionByCode(updated?.tracking_code || updates.tracking_code);
    return updated;
  }

  const cleanCode = String(updates.tracking_code || '').trim().toUpperCase();
  const localSubs = getLocalSubmissions();
  const match = localSubs.find(
    (s) => s.id === workId || (cleanCode && String(s.tracking_code || '').trim().toUpperCase() === cleanCode)
  );
  if (match) saveLocalSubmission({ ...match, ...payload });
  saveDemoOverride('submissions', workId, payload);
  if (cleanCode) saveDemoOverride('submissions', cleanCode, payload);
  return { id: workId, ...payload };
}

export async function adminListAllBooks(fallbackBooks = []) {
  const session = adminGetSession();
  if (!session) throw new Error('Sesi kurator belum aktif.');

  if (session.mode === 'supabase' && isSupabaseConfigured()) {
    return (await authSupabaseFetch('/rest/v1/books?select=*&order=sort_order.asc,title.asc')) || [];
  }
  const ov = getDemoOverrides();
  const deleted = new Set(ov.deletedBooks);
  return [...fallbackBooks, ...ov.createdBooks]
    .filter((b) => b && !deleted.has(b.id))
    .map((b) => (ov.books[b.id] ? { ...b, ...ov.books[b.id] } : b))
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
}

export async function adminCreateBook(input = {}) {
  const session = adminGetSession();
  if (!session) throw new Error('Sesi kurator belum aktif.');

  const title = String(input.title || '').trim();
  const category = String(input.category || 'Novel').trim() || 'Novel';
  const needNovelDetails = bookRequiresNovelDetails(category);
  const authorName = needNovelDetails ? String(input.author_name || '').trim() : '';
  const rawRole = String(input.author_role || '').trim();
  const authorRole = needNovelDetails ? rawRole : BOOK_ROLES.includes(rawRole) ? rawRole : 'Siswa XI';
  const rawSynopsis = String(input.synopsis || '').trim();
  const synopsis = needNovelDetails ? rawSynopsis : '';
  if (!title) throw new Error('Judul buku wajib diisi.');
  if (needNovelDetails && !authorName) throw new Error('Nama penulis wajib diisi.');
  if (needNovelDetails && !BOOK_ROLES.includes(authorRole)) throw new Error('Peran penulis buku tidak valid.');
  if (needNovelDetails && (!synopsis || !extractPlainLiteraryText(synopsis))) {
    throw new Error('Sinopsis buku wajib diisi.');
  }

  const gdrive = normalizeGDriveInput(input.gdrive_file_id, input.gdrive_preview_url);
  const record = {
    slug: String(input.slug || '').trim() || slugifyTitle(title),
    title,
    author_name: authorName,
    author_role: authorRole,
    author_class: needNovelDetails ? String(input.author_class || '').trim() : '',
    publication_year: Number(input.publication_year || 2026) || 2026,
    category,
    synopsis,
    cover_url: needNovelDetails ? String(input.cover_url || '').trim() || 'assets/images/logo-smansi.webp' : '',
    gdrive_file_id: gdrive.fileId,
    gdrive_preview_url: gdrive.previewUrl,
    qrcbn_code: String(input.qrcbn_code || '').trim(),
    sort_order: Number(input.sort_order || 99) || 99,
    is_published: input.is_published !== false,
    is_featured: Boolean(input.is_featured),
    is_placeholder: false
  };

  if (session.mode === 'supabase' && isSupabaseConfigured()) {
    const rows = await authSupabaseFetch('/rest/v1/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(record)
    });
    return Array.isArray(rows) ? rows[0] || record : record;
  }

  const demoBook = { id: `demo-book-${Date.now().toString(36)}`, likes_count: 0, ...record };
  const ov = getDemoOverrides();
  ov.createdBooks.push(demoBook);
  setDemoOverrides(ov);
  return demoBook;
}

export async function adminSaveBook(bookId, updates = {}) {
  const session = adminGetSession();
  if (!session) throw new Error('Sesi kurator belum aktif.');

  const gdrive = normalizeGDriveInput(updates.gdrive_file_id, updates.gdrive_preview_url);
  const payload = {};
  const strFields = ['title', 'author_name', 'author_role', 'author_class', 'category', 'synopsis', 'cover_url', 'qrcbn_code'];
  for (const f of strFields) {
    if (updates[f] !== undefined) payload[f] = String(updates[f]).trim();
  }
  const needNovelDetails = bookRequiresNovelDetails(payload.category !== undefined ? payload.category : 'Novel');
  if (!needNovelDetails) {
    payload.author_name = '';
    payload.author_class = '';
    payload.cover_url = '';
    payload.synopsis = '';
    if (!BOOK_ROLES.includes(payload.author_role)) payload.author_role = 'Siswa XI';
  }
  if (needNovelDetails && payload.author_name !== undefined && !payload.author_name) {
    throw new Error('Nama penulis wajib diisi.');
  }
  if (needNovelDetails && payload.synopsis !== undefined && (!payload.synopsis || !extractPlainLiteraryText(payload.synopsis))) {
    throw new Error('Sinopsis buku wajib diisi.');
  }
  if (updates.publication_year !== undefined) payload.publication_year = Number(updates.publication_year || 2026) || 2026;
  if (updates.sort_order !== undefined) payload.sort_order = Number(updates.sort_order || 0) || 0;
  if (updates.is_published !== undefined) payload.is_published = Boolean(updates.is_published);
  if (updates.is_featured !== undefined) payload.is_featured = Boolean(updates.is_featured);
  if (updates.is_placeholder !== undefined) payload.is_placeholder = Boolean(updates.is_placeholder);
  if (updates.gdrive_file_id !== undefined || updates.gdrive_preview_url !== undefined) {
    payload.gdrive_file_id = gdrive.fileId;
    payload.gdrive_preview_url = gdrive.previewUrl;
  }

  if (session.mode === 'supabase' && isSupabaseConfigured()) {
    const rows = await authSupabaseFetch(`/rest/v1/books?id=eq.${encodeURIComponent(bookId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(payload)
    });
    return Array.isArray(rows) ? rows[0] || payload : payload;
  }

  saveDemoOverride('books', bookId, payload);
  return { id: bookId, ...payload };
}

export async function adminDeleteBook(bookId) {
  const session = adminGetSession();
  if (!session) throw new Error('Sesi kurator belum aktif.');

  if (session.mode === 'supabase' && isSupabaseConfigured()) {
    await authSupabaseFetch(`/rest/v1/books?id=eq.${encodeURIComponent(bookId)}`, { method: 'DELETE' });
    return { deleted: true, id: bookId };
  }

  const ov = getDemoOverrides();
  ov.createdBooks = ov.createdBooks.filter((b) => b.id !== bookId);
  if (!ov.deletedBooks.includes(bookId)) ov.deletedBooks.push(bookId);
  setDemoOverrides(ov);
  return { deleted: true, id: bookId };
}

export async function adminListAllModels3d(fallbackModels = []) {
  const session = adminGetSession();
  if (!session) throw new Error('Sesi kurator belum aktif.');

  if (session.mode === 'supabase' && isSupabaseConfigured()) {
    return (await authSupabaseFetch('/rest/v1/models_3d?select=*&order=sort_order.asc')) || [];
  }
  const ov = getDemoOverrides();
  const deleted = new Set(ov.deletedModels3d);
  return [...fallbackModels, ...ov.createdModels3d]
    .filter((m) => m && !deleted.has(m.id))
    .map((m) => (ov.models3d[m.id] ? { ...m, ...ov.models3d[m.id] } : m))
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
}

export async function adminCreateModel3d(input = {}) {
  const session = adminGetSession();
  if (!session) throw new Error('Sesi kurator belum aktif.');

  const title = String(input.title || '').trim();
  const introduction = String(input.introduction || '').trim();
  const modelPath = String(input.model_path || '').trim();
  if (!title || !introduction) {
    throw new Error('Judul model dan teks perkenalan wajib diisi.');
  }
  if (!modelPath) {
    throw new Error('Sumber berkas model 3D di aplikasi wajib dipilih.');
  }

  const record = {
    slug: String(input.slug || '').trim() || slugifyTitle(title),
    title,
    introduction,
    category: String(input.category || 'Budaya Gresik').trim() || 'Budaya Gresik',
    model_path: modelPath,
    placeholder_url: String(input.placeholder_url || '').trim() || 'assets/images/logo-smansi.webp',
    audio_path: String(input.audio_path || '').trim(),
    sort_order: Number(input.sort_order || 99) || 99,
    is_active: input.is_active !== false
  };

  if (session.mode === 'supabase' && isSupabaseConfigured()) {
    const rows = await authSupabaseFetch('/rest/v1/models_3d', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(record)
    });
    return Array.isArray(rows) ? rows[0] || record : record;
  }

  const demoModel = { id: `demo-m3d-${Date.now().toString(36)}`, ...record };
  const ov = getDemoOverrides();
  ov.createdModels3d.push(demoModel);
  setDemoOverrides(ov);
  return demoModel;
}

export async function adminSaveModel3d(modelId, updates = {}) {
  const session = adminGetSession();
  if (!session) throw new Error('Sesi kurator belum aktif.');

  const payload = {};
  const fields = ['title', 'introduction', 'category', 'model_path', 'placeholder_url', 'audio_path', 'sort_order', 'is_active'];
  for (const field of fields) {
    if (updates[field] !== undefined) {
      payload[field] = typeof updates[field] === 'string' ? updates[field].trim() : updates[field];
    }
  }
  if (payload.title !== undefined && !payload.title) throw new Error('Judul model wajib diisi.');
  if (payload.introduction !== undefined && !payload.introduction) throw new Error('Teks perkenalan wajib diisi.');

  if (session.mode === 'supabase' && isSupabaseConfigured()) {
    const rows = await authSupabaseFetch(`/rest/v1/models_3d?id=eq.${encodeURIComponent(modelId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(payload)
    });
    return Array.isArray(rows) ? rows[0] || payload : payload;
  }

  saveDemoOverride('models3d', modelId, payload);
  return { id: modelId, ...payload };
}

export async function adminDeleteModel3d(modelId) {
  const session = adminGetSession();
  if (!session) throw new Error('Sesi kurator belum aktif.');

  if (session.mode === 'supabase' && isSupabaseConfigured()) {
    await authSupabaseFetch(`/rest/v1/models_3d?id=eq.${encodeURIComponent(modelId)}`, { method: 'DELETE' });
    return { deleted: true, id: modelId };
  }

  const ov = getDemoOverrides();
  ov.createdModels3d = ov.createdModels3d.filter((m) => m.id !== modelId);
  if (!ov.deletedModels3d.includes(modelId)) ov.deletedModels3d.push(modelId);
  setDemoOverrides(ov);
  return { deleted: true, id: modelId };
}

export async function adminSaveSetting(key, value, meta = {}) {
  const session = adminGetSession();
  if (!session) throw new Error('Sesi kurator belum aktif.');

  const cleanKey = String(key || '').trim();
  if (!cleanKey) throw new Error('Kunci pengaturan wajib diisi.');

  const record = {
    key: cleanKey,
    value: value && typeof value === 'object' ? value : {},
    is_public: meta.is_public !== undefined ? Boolean(meta.is_public) : true,
    ...(meta.description !== undefined ? { description: String(meta.description) } : {}),
    ...(meta.is_placeholder !== undefined ? { is_placeholder: Boolean(meta.is_placeholder) } : {})
  };

  if (session.mode === 'supabase' && isSupabaseConfigured()) {
    const rows = await authSupabaseFetch('/rest/v1/site_settings?on_conflict=key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(record)
    });
    return Array.isArray(rows) ? rows[0] || record : record;
  }

  saveDemoOverride('siteSettings', cleanKey, record.value);
  return record;
}
