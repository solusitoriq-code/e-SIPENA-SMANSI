/**
 * Layanan Data Terpusat — Portal Literasi Digital e-SIPENA SMAN 1 Sidayu
 * Mengakses Supabase PostgREST/RPC melalui fetch() native dengan fallback otomatis
 * ke data/esipena_data.json dan SafeStorage, serta re-export layanan Sesi 3.
 */

import { APP_CONFIG, isSupabaseConfigured } from './config.js';
import {
  SafeStorage,
  applyDemoOverridesToDataset,
  ensureCurationResetEpoch,
  fetchWithTimeout,
  getSupabaseBaseUrl,
  getSupabaseHeaders
} from './service-helpers.js';
import { LOCAL_SUBMISSIONS_KEY, getLocalSubmissions } from './submission-service.js';

export { SafeStorage };
export {
  LOCAL_SUBMISSIONS_KEY,
  SUBMISSION_CATEGORIES,
  SUBMISSION_ROLES,
  SUBMISSION_STATUSES,
  generateTrackingCode,
  getLocalSubmissions,
  getTrackingHistory,
  submitWork,
  trackSubmission,
  uploadPdfToGDrive,
  validatePdfFile
} from './submission-service.js';
export {
  BOOK_ROLES,
  adminCreateBook,
  adminCreateModel3d,
  adminDeleteBook,
  adminDeleteModel3d,
  adminGetSession,
  adminListAllBooks,
  adminListAllModels3d,
  adminListWorks,
  adminSaveBook,
  adminSaveModel3d,
  adminSaveSetting,
  adminSignIn,
  adminSignOut,
  adminUpdateWork
} from './admin-service.js';
export { compressCoverToWebp, uploadCoverImageToGDrive } from './media-upload.js';

const LOCAL_LIKE_DELTAS_KEY = 'esipena_local_like_deltas';
const CACHED_SNAPSHOT_KEY = 'esipena_cached_snapshot';

const portalState = {
  loaded: false,
  source: 'local',
  books: [],
  models3d: [],
  madingWorks: [],
  siteSettings: {}
};

async function fetchSupabaseJson(pathAndQuery) {
  const response = await fetchWithTimeout(
    `${getSupabaseBaseUrl()}${pathAndQuery}`,
    {
      method: 'GET',
      headers: getSupabaseHeaders()
    },
    5500
  );
  if (!response.ok) {
    throw new Error(`Supabase HTTP ${response.status}`);
  }
  return response.json();
}

async function fetchLocalDataset() {
  const response = await fetchWithTimeout(APP_CONFIG.LOCAL_DATA_URL, { cache: 'no-cache' }, 5000);
  if (!response.ok) {
    throw new Error(`Gagal memuat dataset lokal (${response.status})`);
  }
  return response.json();
}

function getLocalLikeDeltas() {
  const stored = SafeStorage.getJson(LOCAL_LIKE_DELTAS_KEY, {});
  return stored && typeof stored === 'object' ? stored : {};
}

function applyLocalLikeDeltas(books) {
  const deltas = getLocalLikeDeltas();
  return books.map((book) => {
    const delta = Number(deltas[book.id] || 0);
    return {
      ...book,
      likes_count: Math.max(0, Number(book.likes_count || 0) + (delta > 0 ? delta : 0))
    };
  });
}

function mergeSiteSettings(localSettings = {}, remoteRows = []) {
  const merged = structuredClone(localSettings || {});
  if (Array.isArray(remoteRows)) {
    for (const row of remoteRows) {
      if (row && typeof row.key === 'string' && row.value && typeof row.value === 'object') {
        merged[row.key] = {
          ...(merged[row.key] || {}),
          ...row.value
        };
      }
    }
  }
  return merged;
}

/**
 * Memuat data utama portal (buku, model 3D Gresik, mading digital, dan pengaturan sekolah)
 * dari Supabase dengan fallback otomatis ke data/esipena_data.json.
 * @param {{ forceRefresh?: boolean }} [options]
 * @returns {Promise<{ source: string, books: any[], models3d: any[], madingWorks: any[], siteSettings: Record<string, any> }>}
 */
export async function loadPortalData({ forceRefresh = false } = {}) {
  ensureCurationResetEpoch(CACHED_SNAPSHOT_KEY, LOCAL_SUBMISSIONS_KEY);

  if (portalState.loaded && !forceRefresh) {
    return getPortalSnapshot();
  }

  let localData = {
    books: [],
    models_3d: [],
    public_mading_works: [],
    site_settings: {}
  };

  try {
    localData = await fetchLocalDataset();
  } catch {
    // Lanjutkan dengan struktur kosong bila file JSON lokal gagal dibaca
  }

  let source = 'local';
  const cachedRemote = SafeStorage.getJson(CACHED_SNAPSHOT_KEY, null);
  const useCachedRemote = cachedRemote && typeof cachedRemote === 'object';

  let books =
    useCachedRemote && Array.isArray(cachedRemote.books) && cachedRemote.books.length > 0
      ? cachedRemote.books
      : Array.isArray(localData.books)
        ? localData.books
        : [];
  let models3d =
    useCachedRemote && Array.isArray(cachedRemote.models3d) && cachedRemote.models3d.length > 0
      ? cachedRemote.models3d
      : Array.isArray(localData.models_3d)
        ? localData.models_3d
        : [];
  let madingWorks =
    useCachedRemote && Array.isArray(cachedRemote.madingWorks)
      ? cachedRemote.madingWorks
      : Array.isArray(localData.public_mading_works)
        ? localData.public_mading_works
        : [];
  let siteSettings =
    useCachedRemote && cachedRemote.siteSettings && typeof cachedRemote.siteSettings === 'object'
      ? cachedRemote.siteSettings
      : localData.site_settings && typeof localData.site_settings === 'object'
        ? localData.site_settings
        : {};

  const canTrySupabase =
    isSupabaseConfigured() && (typeof navigator === 'undefined' || navigator.onLine !== false);

  if (canTrySupabase) {
    const [booksRes, modelsRes, madingRes, settingsRes] = await Promise.allSettled([
      fetchSupabaseJson('/rest/v1/books?select=*&is_published=eq.true&order=sort_order.asc,title.asc'),
      fetchSupabaseJson('/rest/v1/models_3d?select=*&is_active=eq.true&order=sort_order.asc'),
      fetchSupabaseJson('/rest/v1/public_mading_works?select=*&order=published_at.desc'),
      fetchSupabaseJson('/rest/v1/site_settings?select=key,value,description,is_placeholder&is_public=eq.true')
    ]);

    const hasRemoteBooks =
      booksRes.status === 'fulfilled' && Array.isArray(booksRes.value) && booksRes.value.length > 0;

    if (hasRemoteBooks) {
      books = booksRes.value;
      source = 'supabase';
    }
    if (modelsRes.status === 'fulfilled' && Array.isArray(modelsRes.value) && modelsRes.value.length > 0) {
      models3d = modelsRes.value;
      source = 'supabase';
    }
    if (madingRes.status === 'fulfilled' && Array.isArray(madingRes.value)) {
      madingWorks = madingRes.value;
      source = 'supabase';
    }
    if (settingsRes.status === 'fulfilled' && Array.isArray(settingsRes.value) && settingsRes.value.length > 0) {
      siteSettings = mergeSiteSettings(localData.site_settings || {}, settingsRes.value);
      source = 'supabase';
    }

    if (source === 'supabase') {
      SafeStorage.setJson(CACHED_SNAPSHOT_KEY, {
        books,
        models3d,
        madingWorks,
        siteSettings
      });
    }
  }

  if (source === 'local') {
    const demoPatched = applyDemoOverridesToDataset({
      books: applyLocalLikeDeltas(books),
      models3d,
      madingWorks,
      localSubmissions: getLocalSubmissions(),
      siteSettings
    });
    books = demoPatched.books;
    models3d = demoPatched.models3d;
    madingWorks = demoPatched.madingWorks;
    siteSettings = demoPatched.siteSettings;
  }

  portalState.loaded = true;
  portalState.source = source;
  portalState.books = [...books].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  portalState.models3d = [...models3d].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  portalState.madingWorks = [...madingWorks];
  portalState.siteSettings = siteSettings;

  return getPortalSnapshot();
}

/**
 * Mengembalikan salinan snapshot state data portal saat ini.
 * @returns {{ source: string, books: any[], models3d: any[], madingWorks: any[], siteSettings: Record<string, any> }}
 */
export function getPortalSnapshot() {
  return {
    source: portalState.source,
    books: portalState.books,
    models3d: portalState.models3d,
    madingWorks: portalState.madingWorks,
    siteSettings: portalState.siteSettings
  };
}

/**
 * Mengembalikan daftar ID buku yang sudah disukai dari penyimpanan lokal peramban.
 * @returns {string[]}
 */
export function getLikedBookIds() {
  const list = SafeStorage.getJson(APP_CONFIG.STORAGE_KEYS.likes, []);
  return Array.isArray(list) ? list : [];
}

/**
 * Memeriksa apakah pengunjung pada peramban ini sudah menyukai buku tertentu.
 * @param {string} bookId
 * @returns {boolean}
 */
export function hasLikedBook(bookId) {
  return getLikedBookIds().includes(String(bookId || ''));
}

/**
 * Menambah apresiasi Suka untuk buku melalui RPC Supabase increment_book_like
 * dengan fallback lokal aman ke SafeStorage saat offline.
 * @param {string} bookId
 * @returns {Promise<{ likesCount: number, alreadyLiked: boolean, source: string }>}
 */
export async function incrementBookLike(bookId) {
  const id = String(bookId || '');
  const targetBook = portalState.books.find((item) => item.id === id);
  if (!targetBook) {
    throw new Error('Data buku tidak ditemukan.');
  }

  const likedIds = getLikedBookIds();
  if (likedIds.includes(id)) {
    return {
      likesCount: Number(targetBook.likes_count || 0),
      alreadyLiked: true,
      source: portalState.source
    };
  }

  let nextLikes = Number(targetBook.likes_count || 0) + 1;
  let usedSource = 'local';

  if (portalState.source === 'supabase' && isSupabaseConfigured() && navigator.onLine !== false) {
    try {
      const response = await fetchWithTimeout(
        `${getSupabaseBaseUrl()}/rest/v1/rpc/increment_book_like`,
        {
          method: 'POST',
          headers: getSupabaseHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ p_book_id: id })
        },
        5500
      );
      if (response.ok) {
        const rpcCount = await response.json();
        if (typeof rpcCount === 'number' && Number.isFinite(rpcCount)) {
          nextLikes = rpcCount;
          usedSource = 'supabase';
        }
      }
    } catch {
      // Jatuh ke mode lokal bila jaringan terputus saat klik Suka
    }
  }

  if (usedSource === 'local') {
    const deltas = getLocalLikeDeltas();
    deltas[id] = Number(deltas[id] || 0) + 1;
    SafeStorage.setJson(LOCAL_LIKE_DELTAS_KEY, deltas);
  }

  targetBook.likes_count = nextLikes;
  SafeStorage.setJson(APP_CONFIG.STORAGE_KEYS.likes, [...likedIds, id]);

  return {
    likesCount: nextLikes,
    alreadyLiked: false,
    source: usedSource
  };
}
