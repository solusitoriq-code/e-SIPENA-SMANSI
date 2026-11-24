/**
 * Utilitas Penyimpanan Aman & Klien HTTP Supabase — e-SIPENA SMAN 1 Sidayu
 * Dipakai bersama oleh data-service, submission-service, admin-auth, dan admin-service.
 */

import { APP_CONFIG } from './config.js';

const DEMO_OVERRIDES_KEY = 'esipena_demo_catalog_overrides';
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
    culturePrompts: stored?.culturePrompts && typeof stored.culturePrompts === 'object' ? stored.culturePrompts : {},
    createdCulture: Array.isArray(stored?.createdCulture) ? stored.createdCulture : [],
    deletedCulture: Array.isArray(stored?.deletedCulture) ? stored.deletedCulture : [],
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
  if (bucket === 'culturePrompts') {
    const idx = current.createdCulture.findIndex((c) => c.id === itemId);
    if (idx >= 0) {
      current.createdCulture[idx] = { ...current.createdCulture[idx], ...patch };
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

export function applyDemoOverridesToDataset({
  books = [],
  culturePrompts = [],
  madingWorks = [],
  siteSettings = {},
  includeHidden = false
}) {
  const ov = getDemoOverrides();
  const deletedBookSet = new Set(ov.deletedBooks);
  const deletedCultureSet = new Set(ov.deletedCulture);

  const allBooks = [...books, ...ov.createdBooks]
    .filter((b) => b && !deletedBookSet.has(b.id))
    .map((b) => (ov.books[b.id] ? { ...b, ...ov.books[b.id] } : b))
    .filter((b) => includeHidden || b.is_published !== false);

  const allCulture = [...culturePrompts, ...ov.createdCulture]
    .filter((c) => c && !deletedCultureSet.has(c.id))
    .map((c) => (ov.culturePrompts[c.id] ? { ...c, ...ov.culturePrompts[c.id] } : c))
    .filter((c) => includeHidden || c.is_active !== false);

  const mergedSettings = structuredClone(siteSettings || {});
  for (const [key, val] of Object.entries(ov.siteSettings)) {
    if (val && typeof val === 'object') {
      mergedSettings[key] = { ...(mergedSettings[key] || {}), ...val };
    }
  }
  const mergedMading = madingWorks.map((w) =>
    ov.submissions[w.id] ? { ...w, ...ov.submissions[w.id] } : w
  );
  return {
    books: allBooks,
    culturePrompts: allCulture,
    madingWorks: mergedMading,
    siteSettings: mergedSettings
  };
}
