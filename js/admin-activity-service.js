/**
 * Layanan CRUD Kegiatan Sudut Pustakawan — e-SIPENA SMAN 1 Sidayu
 * Menangani daftar, tambah, sunting, dan hapus kegiatan multi-foto pada tabel
 * public.librarian_activities di Supabase serta fallback mode demo lokal.
 */

import { isSupabaseConfigured } from './config.js';
import { adminGetSession, authSupabaseFetch } from './admin-auth.js';
import { getDemoOverrides, saveDemoOverride, setDemoOverrides } from './service-helpers.js';

export function normalizeActivityPhotos(rawPhotos = []) {
  if (!Array.isArray(rawPhotos)) return [];
  const normalized = [];
  for (const item of rawPhotos) {
    if (typeof item === 'string') {
      const url = item.trim();
      if (url) normalized.push({ url, file_id: '', name: '' });
      continue;
    }
    if (item && typeof item === 'object') {
      const url = String(item.url || '').trim();
      if (!url) continue;
      normalized.push({
        url,
        file_id: String(item.file_id || item.fileId || '').trim(),
        name: String(item.name || '').trim()
      });
    }
  }
  return normalized;
}

export function normalizeActivityRecord(row = {}) {
  return {
    ...row,
    id: String(row.id || ''),
    title: String(row.title || '').trim(),
    description: String(row.description || '').trim(),
    photos: normalizeActivityPhotos(row.photos),
    sort_order: Number(row.sort_order ?? 0) || 0,
    is_active: row.is_active !== false
  };
}

function isMissingActivitiesTableError(err) {
  const msg = String(err?.message || '');
  return /librarian_activities/i.test(msg) && /(404|PGRST205|does not exist|schema cache|not found)/i.test(msg);
}

function wrapActivityDbError(err) {
  if (isMissingActivitiesTableError(err)) {
    const wrapped = new Error(
      'Tabel librarian_activities belum tersedia di Supabase. Jalankan supabase/migration_librarian_activities.sql di SQL Editor Supabase.'
    );
    wrapped.code = 'MIGRATION_REQUIRED';
    return wrapped;
  }
  return err;
}

export async function adminListAllActivities(fallbackActivities = []) {
  const session = adminGetSession();
  if (!session) throw new Error('Sesi kurator belum aktif.');

  if (session.mode === 'supabase' && isSupabaseConfigured()) {
    try {
      const rows =
        (await authSupabaseFetch(
          '/rest/v1/librarian_activities?select=*&order=sort_order.asc,created_at.desc'
        )) || [];
      return rows.map(normalizeActivityRecord);
    } catch (err) {
      throw wrapActivityDbError(err);
    }
  }

  const ov = getDemoOverrides();
  const deleted = new Set(ov.deletedActivities);
  return [...fallbackActivities, ...ov.createdActivities]
    .filter((a) => a && !deleted.has(a.id))
    .map((a) => normalizeActivityRecord(ov.librarianActivities[a.id] ? { ...a, ...ov.librarianActivities[a.id] } : a))
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
}

export async function adminCreateActivity(input = {}) {
  const session = adminGetSession();
  if (!session) throw new Error('Sesi kurator belum aktif.');

  const title = String(input.title || '').trim();
  const description = String(input.description || '').trim();
  const photos = normalizeActivityPhotos(input.photos);
  if (!title) throw new Error('Judul kegiatan wajib diisi.');
  if (!photos.length) throw new Error('Unggah minimal 1 foto kegiatan.');

  const record = {
    title,
    description,
    photos,
    sort_order: Number(input.sort_order || 1) || 1,
    is_active: input.is_active !== false
  };

  if (session.mode === 'supabase' && isSupabaseConfigured()) {
    try {
      const rows = await authSupabaseFetch('/rest/v1/librarian_activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify(record)
      });
      return normalizeActivityRecord(Array.isArray(rows) ? rows[0] || record : record);
    } catch (err) {
      throw wrapActivityDbError(err);
    }
  }

  const demoItem = normalizeActivityRecord({
    id: `demo-act-${Date.now().toString(36)}`,
    created_at: new Date().toISOString(),
    ...record
  });
  const ov = getDemoOverrides();
  ov.createdActivities.push(demoItem);
  setDemoOverrides(ov);
  return demoItem;
}

export async function adminSaveActivity(activityId, updates = {}) {
  const session = adminGetSession();
  if (!session) throw new Error('Sesi kurator belum aktif.');

  const payload = {};
  if (updates.title !== undefined) {
    payload.title = String(updates.title || '').trim();
    if (!payload.title) throw new Error('Judul kegiatan wajib diisi.');
  }
  if (updates.description !== undefined) {
    payload.description = String(updates.description || '').trim();
  }
  if (updates.photos !== undefined) {
    payload.photos = normalizeActivityPhotos(updates.photos);
    if (!payload.photos.length) throw new Error('Unggah minimal 1 foto kegiatan.');
  }
  if (updates.sort_order !== undefined) {
    payload.sort_order = Number(updates.sort_order || 0) || 0;
  }
  if (updates.is_active !== undefined) {
    payload.is_active = Boolean(updates.is_active);
  }

  if (session.mode === 'supabase' && isSupabaseConfigured()) {
    try {
      const rows = await authSupabaseFetch(
        `/rest/v1/librarian_activities?id=eq.${encodeURIComponent(activityId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
          body: JSON.stringify(payload)
        }
      );
      return normalizeActivityRecord(Array.isArray(rows) ? rows[0] || { id: activityId, ...payload } : { id: activityId, ...payload });
    } catch (err) {
      throw wrapActivityDbError(err);
    }
  }

  saveDemoOverride('librarianActivities', activityId, payload);
  return normalizeActivityRecord({ id: activityId, ...payload });
}

export async function adminDeleteActivity(activityId) {
  const session = adminGetSession();
  if (!session) throw new Error('Sesi kurator belum aktif.');

  if (session.mode === 'supabase' && isSupabaseConfigured()) {
    try {
      await authSupabaseFetch(`/rest/v1/librarian_activities?id=eq.${encodeURIComponent(activityId)}`, {
        method: 'DELETE'
      });
      return { deleted: true, id: activityId };
    } catch (err) {
      throw wrapActivityDbError(err);
    }
  }

  const ov = getDemoOverrides();
  ov.createdActivities = ov.createdActivities.filter((a) => a.id !== activityId);
  if (!ov.deletedActivities.includes(activityId)) ov.deletedActivities.push(activityId);
  setDemoOverrides(ov);
  return { deleted: true, id: activityId };
}
