/**
 * Layanan Kurasi Naskah & Manajemen Katalog — e-SIPENA SMAN 1 Sidayu
 * Menangani CRUD penuh (tambah, sunting, hapus) untuk books, culture_prompts,
 * submissions, serta site_settings melalui Supabase REST atau mode demo lokal.
 */

import { isSupabaseConfigured } from './config.js';
import { adminGetSession, adminSignIn, adminSignOut, authSupabaseFetch } from './admin-auth.js';
import {
  getDemoOverrides,
  normalizeGDriveInput,
  saveDemoOverride,
  setDemoOverrides,
  slugifyTitle
} from './service-helpers.js';
import { getLocalSubmissions, saveLocalSubmission } from './submission-service.js';

export { adminGetSession, adminSignIn, adminSignOut };
export const BOOK_ROLES = Object.freeze(['Siswa XI', 'Siswa XII', 'Guru', 'Tendik', 'Kepala Sekolah']);

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
    items = (await authSupabaseFetch('/rest/v1/submissions?select=*&order=created_at.desc')) || [];
    source = 'supabase';
  } else {
    const ov = getDemoOverrides().submissions;
    const localSubs = getLocalSubmissions();
    const map = new Map();
    for (const row of [...localSubs, ...fallbackWorks]) {
      if (!row?.id) continue;
      map.set(row.id, ov[row.id] ? { ...row, ...ov[row.id] } : row);
    }
    items = [...map.values()].sort(
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
  if (['Lolos Mading', 'Masuk Antologi'].includes(payload.status) && !payload.published_at) {
    payload.published_at = new Date().toISOString();
  }
  payload.updated_at = new Date().toISOString();

  if (session.mode === 'supabase' && isSupabaseConfigured()) {
    const rows = await authSupabaseFetch(`/rest/v1/submissions?id=eq.${encodeURIComponent(workId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(payload)
    });
    return Array.isArray(rows) ? rows[0] || payload : payload;
  }

  const localSubs = getLocalSubmissions();
  const match = localSubs.find((s) => s.id === workId);
  if (match) saveLocalSubmission({ ...match, ...payload });
  saveDemoOverride('submissions', workId, payload);
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
  const authorName = String(input.author_name || '').trim();
  const authorRole = String(input.author_role || '').trim();
  const synopsis = String(input.synopsis || '').trim();
  if (!title) throw new Error('Judul buku wajib diisi.');
  if (!authorName) throw new Error('Nama penulis wajib diisi.');
  if (!BOOK_ROLES.includes(authorRole)) throw new Error('Peran penulis buku tidak valid.');
  if (!synopsis) throw new Error('Sinopsis buku wajib diisi.');

  const gdrive = normalizeGDriveInput(input.gdrive_file_id, input.gdrive_preview_url);
  const record = {
    slug: String(input.slug || '').trim() || slugifyTitle(title),
    title,
    author_name: authorName,
    author_role: authorRole,
    author_class: String(input.author_class || '').trim(),
    publication_year: Number(input.publication_year || 2026) || 2026,
    category: String(input.category || 'Novel').trim() || 'Novel',
    synopsis,
    cover_url: String(input.cover_url || '').trim() || 'assets/images/logo-smansi.webp',
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

export async function adminListAllCulturePrompts(fallbackTopics = []) {
  const session = adminGetSession();
  if (!session) throw new Error('Sesi kurator belum aktif.');

  if (session.mode === 'supabase' && isSupabaseConfigured()) {
    return (await authSupabaseFetch('/rest/v1/culture_prompts?select=*&order=sort_order.asc')) || [];
  }
  const ov = getDemoOverrides();
  const deleted = new Set(ov.deletedCulture);
  return [...fallbackTopics, ...ov.createdCulture]
    .filter((c) => c && !deleted.has(c.id))
    .map((c) => (ov.culturePrompts[c.id] ? { ...c, ...ov.culturePrompts[c.id] } : c))
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
}

export async function adminCreateCulturePrompt(input = {}) {
  const session = adminGetSession();
  if (!session) throw new Error('Sesi kurator belum aktif.');

  const title = String(input.title || '').trim();
  const articleSummary = String(input.article_summary || '').trim();
  const writingPrompt = String(input.writing_prompt || '').trim();
  if (!title || !articleSummary || !writingPrompt) {
    throw new Error('Judul, ringkasan artikel, dan tugas menulis wajib diisi.');
  }

  const yt = String(input.youtube_id || '').trim();
  const record = {
    slug: String(input.slug || '').trim() || slugifyTitle(title),
    title,
    subtitle: String(input.subtitle || '').trim(),
    youtube_id: yt,
    article_summary: articleSummary,
    writing_prompt: writingPrompt,
    location_tag: String(input.location_tag || 'Gresik').trim() || 'Gresik',
    duration_label: String(input.duration_label || '04:00').trim() || '04:00',
    sort_order: Number(input.sort_order || 99) || 99,
    is_active: input.is_active !== false,
    is_placeholder: yt ? false : Boolean(input.is_placeholder)
  };

  if (session.mode === 'supabase' && isSupabaseConfigured()) {
    const rows = await authSupabaseFetch('/rest/v1/culture_prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(record)
    });
    return Array.isArray(rows) ? rows[0] || record : record;
  }

  const demoTopic = { id: `demo-cul-${Date.now().toString(36)}`, ...record };
  const ov = getDemoOverrides();
  ov.createdCulture.push(demoTopic);
  setDemoOverrides(ov);
  return demoTopic;
}

export async function adminSaveCulturePrompt(promptId, updates = {}) {
  const session = adminGetSession();
  if (!session) throw new Error('Sesi kurator belum aktif.');

  const payload = {};
  const fields = [
    'title', 'subtitle', 'youtube_id', 'article_summary', 'writing_prompt',
    'location_tag', 'duration_label', 'sort_order', 'is_active', 'is_placeholder'
  ];
  for (const field of fields) {
    if (updates[field] !== undefined) {
      payload[field] = typeof updates[field] === 'string' ? updates[field].trim() : updates[field];
    }
  }

  if (session.mode === 'supabase' && isSupabaseConfigured()) {
    const rows = await authSupabaseFetch(`/rest/v1/culture_prompts?id=eq.${encodeURIComponent(promptId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(payload)
    });
    return Array.isArray(rows) ? rows[0] || payload : payload;
  }

  saveDemoOverride('culturePrompts', promptId, payload);
  return { id: promptId, ...payload };
}

export async function adminDeleteCulturePrompt(promptId) {
  const session = adminGetSession();
  if (!session) throw new Error('Sesi kurator belum aktif.');

  if (session.mode === 'supabase' && isSupabaseConfigured()) {
    await authSupabaseFetch(`/rest/v1/culture_prompts?id=eq.${encodeURIComponent(promptId)}`, { method: 'DELETE' });
    return { deleted: true, id: promptId };
  }

  const ov = getDemoOverrides();
  ov.createdCulture = ov.createdCulture.filter((c) => c.id !== promptId);
  if (!ov.deletedCulture.includes(promptId)) ov.deletedCulture.push(promptId);
  setDemoOverrides(ov);
  return { deleted: true, id: promptId };
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
