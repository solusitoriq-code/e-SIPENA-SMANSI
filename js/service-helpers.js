/**
 * Utilitas Penyimpanan Aman & Klien HTTP Supabase — e-SIPENA SMAN 1 Sidayu
 * Dipakai bersama oleh data-service, submission-service, admin-auth, dan admin-service.
 */

import { APP_CONFIG } from './config.js';

const DEMO_OVERRIDES_KEY = 'esipena_demo_catalog_overrides';
const CURATION_RESET_EPOCH_KEY = 'esipena_curation_reset_epoch';
const CURATION_RESET_EPOCH_VAL = '2026-11-24-reset1';
const memoryStorage = new Map();

export const SafeStorage = {
  getItem(key) {
    try {
      const val = window.localStorage.getItem(key);
      return val !== null ? val : memoryStorage.get(key) ?? null;
    } catch {
      return memoryStorage.get(key) ?? null;
    }
  },
  setItem(key, value) {
    const str = String(value);
    memoryStorage.set(key, str);
    try {
      window.localStorage.setItem(key, str);
      return true;
    } catch {
      return false;
    }
  },
  removeItem(key) {
    memoryStorage.delete(key);
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Abaikan galat penghapusan
    }
  },
  getJson(key, fallback = null) {
    const raw = this.getItem(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  setJson(key, value) {
    try {
      return this.setItem(key, JSON.stringify(value));
    } catch {
      return false;
    }
  }
};

export function getSupabaseBaseUrl() {
  return String(APP_CONFIG.SUPABASE_URL || '').trim().replace(/\/+$/, '');
}

export function getSupabaseHeaders(extra = {}, bearerToken = '') {
  const token = bearerToken || APP_CONFIG.SUPABASE_ANON_KEY;
  return {
    apikey: APP_CONFIG.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    ...extra
  };
}

export async function fetchWithTimeout(url, options = {}, timeoutMs = 5500) {
  if (!timeoutMs || timeoutMs <= 0 || !Number.isFinite(timeoutMs)) {
    return fetch(url, options);
  }
  const controller = new AbortController();
  const timerId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timerId);
  }
}

export async function postTextJson(url, payload, { timeoutMs = 0 } = {}) {
  const res = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    },
    timeoutMs
  );
  return {
    ok: res.ok,
    status: res.status,
    data: await res.json().catch(() => null)
  };
}

export function normalizeGDriveInput(rawFileId = '', rawUrl = '') {
  const cleanUrl = String(rawUrl || '').trim();
  let fileId = String(rawFileId || '').trim();

  const extractId = (url) => {
    const byPath = url.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
    if (byPath) return byPath[1];
    const byParam = url.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
    return byParam ? byParam[1] : '';
  };

  if (!fileId && cleanUrl) fileId = extractId(cleanUrl);
  else if (fileId.includes('drive.google.com')) fileId = extractId(fileId) || fileId;

  const previewUrl = fileId
    ? `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`
    : /^https?:\/\//i.test(cleanUrl)
      ? cleanUrl
      : '';
  const viewUrl = fileId
    ? `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`
    : previewUrl;

  return { fileId, previewUrl, viewUrl };
}

export function slugifyTitle(title = '') {
  const base = String(title || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${base || 'karya'}-${rand}`;
}

export function getDemoOverrides() {
  const stored = SafeStorage.getJson(DEMO_OVERRIDES_KEY, null);
  return {
    books: stored?.books && typeof stored.books === 'object' ? stored.books : {},
    createdBooks: Array.isArray(stored?.createdBooks) ? stored.createdBooks : [],
    deletedBooks: Array.isArray(stored?.deletedBooks) ? stored.deletedBooks : [],
    models3d: stored?.models3d && typeof stored.models3d === 'object' ? stored.models3d : {},
    createdModels3d: Array.isArray(stored?.createdModels3d) ? stored.createdModels3d : [],
    deletedModels3d: Array.isArray(stored?.deletedModels3d) ? stored.deletedModels3d : [],
    siteSettings: stored?.siteSettings && typeof stored.siteSettings === 'object' ? stored.siteSettings : {},
    submissions: stored?.submissions && typeof stored.submissions === 'object' ? stored.submissions : {}
  };
}

export function setDemoOverrides(next) {
  SafeStorage.setJson(DEMO_OVERRIDES_KEY, next);
  return next;
}

export function saveDemoOverride(bucket, itemId, patch) {
  const current = getDemoOverrides();
  if (bucket === 'books') {
    const idx = current.createdBooks.findIndex((b) => b.id === itemId);
    if (idx >= 0) {
      current.createdBooks[idx] = { ...current.createdBooks[idx], ...patch };
      return setDemoOverrides(current);
    }
  }
  if (bucket === 'models3d') {
    const idx = current.createdModels3d.findIndex((m) => m.id === itemId);
    if (idx >= 0) {
      current.createdModels3d[idx] = { ...current.createdModels3d[idx], ...patch };
      return setDemoOverrides(current);
    }
  }
  const targetBucket = current[bucket] || {};
  current[bucket] = {
    ...targetBucket,
    [itemId]: { ...(targetBucket[itemId] || {}), ...patch }
  };
  return setDemoOverrides(current);
}

export function mergeSubmissionRows(rows = [], overrides = {}) {
  const map = new Map();
  for (const raw of rows) {
    if (!raw || (!raw.id && !raw.tracking_code)) continue;
    const code = String(raw.tracking_code || '').trim().toUpperCase();
    const key = code || String(raw.id);
    const ovById = raw.id && overrides[raw.id] ? overrides[raw.id] : null;
    const ovByCode = code && overrides[code] ? overrides[code] : null;
    const item = { ...raw, ...(ovById || {}), ...(ovByCode || {}) };
    const prev = map.get(key);
    if (!prev) {
      map.set(key, item);
      continue;
    }
    const prevLocal = String(prev.id || '').startsWith('local-');
    const nextLocal = String(item.id || '').startsWith('local-');
    const prevTs = Date.parse(prev.updated_at || prev.published_at || prev.created_at || 0) || 0;
    const nextTs = Date.parse(item.updated_at || item.published_at || item.created_at || 0) || 0;
    const useNextBase = (prevLocal && !nextLocal) || (prevLocal === nextLocal && nextTs >= prevTs);
    const base = useNextBase ? item : prev;
    const newer = nextTs > prevTs ? item : prev;
    map.set(key, {
      ...base,
      status: newer.status ?? base.status,
      reviewer_notes: newer.reviewer_notes ?? base.reviewer_notes,
      published_at: newer.published_at ?? base.published_at,
      updated_at: newer.updated_at ?? base.updated_at
    });
  }
  return [...map.values()];
}

export function applyDemoOverridesToDataset({
  books = [],
  models3d = [],
  madingWorks = [],
  localSubmissions = [],
  siteSettings = {},
  includeHidden = false
}) {
  const ov = getDemoOverrides();
  const deletedBookSet = new Set(ov.deletedBooks);
  const deletedModelsSet = new Set(ov.deletedModels3d);

  const allBooks = [...books, ...ov.createdBooks]
    .filter((b) => b && !deletedBookSet.has(b.id))
    .map((b) => (ov.books[b.id] ? { ...b, ...ov.books[b.id] } : b))
    .filter((b) => includeHidden || b.is_published !== false);

  const allModels3d = [...models3d, ...ov.createdModels3d]
    .filter((m) => m && !deletedModelsSet.has(m.id))
    .map((m) => (ov.models3d[m.id] ? { ...m, ...ov.models3d[m.id] } : m))
    .filter((m) => includeHidden || m.is_active !== false);

  const mergedSettings = structuredClone(siteSettings || {});
  for (const [key, val] of Object.entries(ov.siteSettings)) {
    if (val && typeof val === 'object') {
      mergedSettings[key] = { ...(mergedSettings[key] || {}), ...val };
    }
  }
  const mergedMading = mergeSubmissionRows([...madingWorks, ...localSubmissions], ov.submissions)
    .filter((w) => w.status === 'Lolos Mading');
  return {
    books: allBooks,
    models3d: allModels3d,
    madingWorks: mergedMading,
    siteSettings: mergedSettings
  };
}

export function ensureCurationResetEpoch(cachedSnapshotKey, localSubmissionsKey) {
  if (SafeStorage.getItem(CURATION_RESET_EPOCH_KEY) === CURATION_RESET_EPOCH_VAL) return;
  if (localSubmissionsKey) SafeStorage.removeItem(localSubmissionsKey);
  SafeStorage.removeItem(APP_CONFIG.STORAGE_KEYS.trackingHistory);
  const ov = SafeStorage.getJson(DEMO_OVERRIDES_KEY, null);
  if (ov && typeof ov === 'object' && ov.submissions) {
    SafeStorage.setJson(DEMO_OVERRIDES_KEY, { ...ov, submissions: {} });
  }
  if (cachedSnapshotKey) {
    const snap = SafeStorage.getJson(cachedSnapshotKey, null);
    if (snap && typeof snap === 'object' && Array.isArray(snap.madingWorks)) {
      SafeStorage.setJson(cachedSnapshotKey, { ...snap, madingWorks: [] });
    }
  }
  SafeStorage.setItem(CURATION_RESET_EPOCH_KEY, CURATION_RESET_EPOCH_VAL);
}
