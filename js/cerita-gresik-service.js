/**
 * Layanan CRUD & Parser URL Video Cerita Gresik — e-SIPENA SMAN 1 Sidayu
 * Mengelola daftar video (Judul, Deskripsi opsional, Link URL) pada tabel
 * public.cerita_gresik_videos dengan cadangan otomatis ke site_settings & mode demo lokal.
 */

import { isSupabaseConfigured } from './config.js';
import { adminGetSession, authSupabaseFetch } from './admin-auth.js';
import { getDemoOverrides, saveDemoOverride, setDemoOverrides } from './service-helpers.js';

const SETTING_KEY = 'cerita_gresik_videos';

function generateLocalId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `cg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Menormalkan dan memvalidasi URL video (hanya http/https).
 * @param {string} rawUrl
 * @returns {string}
 */
export function normalizeCeritaVideoUrl(rawUrl = '') {
  let clean = String(rawUrl || '').trim();
  if (!clean) return '';
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(clean) && /^[a-z0-9.-]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(clean)) {
    clean = `https://${clean}`;
  }
  try {
    const parsed = new URL(clean);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.href;
  } catch {
    return '';
  }
}

/**
 * Mengurai tautan video untuk menentukan sumber, URL embed, thumbnail, dan mode pemutaran.
 * @param {string} rawUrl
 */
export function parseCeritaVideoUrl(rawUrl = '') {
  const urlStr = normalizeCeritaVideoUrl(rawUrl);
  if (!urlStr) {
    return { valid: false, url: '', platform: 'Tautan', mode: 'external', embedUrl: '', thumbnailUrl: '' };
  }

  let parsed;
  try {
    parsed = new URL(urlStr);
  } catch {
    return { valid: false, url: '', platform: 'Tautan', mode: 'external', embedUrl: '', thumbnailUrl: '' };
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const parts = parsed.pathname.split('/').filter(Boolean);

  // YouTube (watch, youtu.be, shorts, embed, live)
  if (host === 'youtu.be' || host.endsWith('youtube.com') || host === 'youtube-nocookie.com') {
    let videoId = '';
    if (host === 'youtu.be') {
      videoId = parts[0] || '';
    } else if (parsed.searchParams.get('v')) {
      videoId = parsed.searchParams.get('v') || '';
    } else if (['shorts', 'embed', 'live', 'v'].includes(parts[0])) {
      videoId = parts[1] || '';
    }
    if (/^[a-zA-Z0-9_-]{6,20}$/.test(videoId)) {
      const safeId = encodeURIComponent(videoId);
      return {
        valid: true,
        url: urlStr,
        platform: 'YouTube',
        mode: 'iframe',
        embedUrl: `https://www.youtube-nocookie.com/embed/${safeId}?rel=0&modestbranding=1&autoplay=1`,
        thumbnailUrl: `https://i.ytimg.com/vi/${safeId}/hqdefault.jpg`
      };
    }
  }

  // Google Drive video
  if (host === 'drive.google.com' || host === 'docs.google.com') {
    const byPath = parsed.pathname.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
    const fileId = (byPath && byPath[1]) || parsed.searchParams.get('id') || '';
    if (fileId) {
      const safeId = encodeURIComponent(fileId);
      return {
        valid: true,
        url: urlStr,
        platform: 'Google Drive',
        mode: 'iframe',
        embedUrl: `https://drive.google.com/file/d/${safeId}/preview`,
        thumbnailUrl: ''
      };
    }
  }

  // Vimeo
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const match = parsed.pathname.match(/\/(?:video\/)?(\d{5,15})/);
    if (match?.[1]) {
      return {
        valid: true,
        url: urlStr,
        platform: 'Vimeo',
        mode: 'iframe',
        embedUrl: `https://player.vimeo.com/video/${encodeURIComponent(match[1])}?autoplay=1`,
        thumbnailUrl: ''
      };
    }
  }

  // Berkas video langsung (.mp4, .webm, .ogg, .m4v, .mov)
  if (/\.(mp4|webm|ogg|m4v|mov)$/i.test(parsed.pathname)) {
    return {
      valid: true,
      url: urlStr,
      platform: 'Video MP4',
      mode: 'video',
      embedUrl: urlStr,
      thumbnailUrl: ''
    };
  }

  let platform = host;
  if (host.includes('tiktok.com')) platform = 'TikTok';
  else if (host.includes('instagram.com')) platform = 'Instagram';
  else if (host.includes('facebook.com') || host.includes('fb.watch')) platform = 'Facebook';

  return {
    valid: true,
    url: urlStr,
    platform,
    mode: 'external',
    embedUrl: '',
    thumbnailUrl: ''
  };
}

export function normalizeCeritaVideoRecord(row = {}) {
  return {
    ...row,
    id: String(row.id || ''),
    title: String(row.title || '').trim(),
    description: String(row.description || '').trim(),
    video_url: String(row.video_url || row.url || '').trim(),
    sort_order: Number(row.sort_order ?? 0) || 0,
    is_active: row.is_active !== false
  };
}

function sortVideos(list = []) {
  return [...list].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
}

function isMissingCeritaTableError(err) {
  const msg = String(err?.message || '');
  return /(cerita_gresik_videos|PGRST205|schema cache|does not exist|HTTP 404|not found)/i.test(msg);
}

async function readSettingsFallbackItems() {
  const rows = await authSupabaseFetch(`/rest/v1/site_settings?select=value&key=eq.${SETTING_KEY}`);
  const items = Array.isArray(rows) && rows[0]?.value?.items;
  return Array.isArray(items) ? items.map(normalizeCeritaVideoRecord) : [];
}

async function writeSettingsFallbackItems(items) {
  const record = {
    key: SETTING_KEY,
    value: { items: sortVideos(items) },
    description: 'Daftar video Cerita Gresik (cadangan sebelum migrasi tabel cerita_gresik_videos)',
    is_public: true,
    is_placeholder: false
  };
  await authSupabaseFetch('/rest/v1/site_settings?on_conflict=key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(record)
  });
  return record.value.items;
}

export async function adminListAllCeritaVideos(fallbackVideos = []) {
  const session = adminGetSession();
  if (!session) throw new Error('Sesi kurator belum aktif.');

  if (session.mode === 'supabase' && isSupabaseConfigured()) {
    try {
      const rows =
        (await authSupabaseFetch('/rest/v1/cerita_gresik_videos?select=*&order=sort_order.asc,created_at.desc')) || [];
      return rows.map(normalizeCeritaVideoRecord);
    } catch (err) {
      if (isMissingCeritaTableError(err)) {
        return sortVideos(await readSettingsFallbackItems());
      }
      throw err;
    }
  }

  const ov = getDemoOverrides();
  const deleted = new Set(ov.deletedCeritaVideos);
  return sortVideos(
    [...fallbackVideos, ...ov.createdCeritaVideos]
      .filter((v) => v && !deleted.has(v.id))
      .map((v) =>
        normalizeCeritaVideoRecord(ov.ceritaGresikVideos[v.id] ? { ...v, ...ov.ceritaGresikVideos[v.id] } : v)
      )
  );
}

export async function adminCreateCeritaVideo(input = {}) {
  const session = adminGetSession();
  if (!session) throw new Error('Sesi kurator belum aktif.');

  const title = String(input.title || '').trim();
  const description = String(input.description || '').trim();
  const videoUrl = normalizeCeritaVideoUrl(input.video_url);
  if (!title) throw new Error('Judul video wajib diisi.');
  if (!videoUrl) throw new Error('Link URL video harus berupa tautan http:// atau https:// yang valid.');

  const record = {
    title,
    description,
    video_url: videoUrl,
    sort_order: Number(input.sort_order || 1) || 1,
    is_active: input.is_active !== false
  };

  if (session.mode === 'supabase' && isSupabaseConfigured()) {
    try {
      const rows = await authSupabaseFetch('/rest/v1/cerita_gresik_videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify(record)
      });
      return normalizeCeritaVideoRecord(Array.isArray(rows) ? rows[0] || record : record);
    } catch (err) {
      if (isMissingCeritaTableError(err)) {
        const current = await readSettingsFallbackItems();
        const nowIso = new Date().toISOString();
        const nextItem = normalizeCeritaVideoRecord({
          id: generateLocalId(),
          created_at: nowIso,
          updated_at: nowIso,
          ...record
        });
        await writeSettingsFallbackItems([...current, nextItem]);
        return nextItem;
      }
      throw err;
    }
  }

  const demoItem = normalizeCeritaVideoRecord({
    id: `demo-cg-${Date.now().toString(36)}`,
    created_at: new Date().toISOString(),
    ...record
  });
  const ov = getDemoOverrides();
  ov.createdCeritaVideos.push(demoItem);
  setDemoOverrides(ov);
  return demoItem;
}

export async function adminSaveCeritaVideo(videoId, updates = {}) {
  const session = adminGetSession();
  if (!session) throw new Error('Sesi kurator belum aktif.');

  const payload = {};
  if (updates.title !== undefined) {
    payload.title = String(updates.title || '').trim();
    if (!payload.title) throw new Error('Judul video wajib diisi.');
  }
  if (updates.description !== undefined) {
    payload.description = String(updates.description || '').trim();
  }
  if (updates.video_url !== undefined) {
    const cleanUrl = normalizeCeritaVideoUrl(updates.video_url);
    if (!cleanUrl) throw new Error('Link URL video harus berupa tautan http:// atau https:// yang valid.');
    payload.video_url = cleanUrl;
  }
  if (updates.sort_order !== undefined) payload.sort_order = Number(updates.sort_order || 0) || 0;
  if (updates.is_active !== undefined) payload.is_active = Boolean(updates.is_active);

  if (session.mode === 'supabase' && isSupabaseConfigured()) {
    try {
      const rows = await authSupabaseFetch(`/rest/v1/cerita_gresik_videos?id=eq.${encodeURIComponent(videoId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify(payload)
      });
      return normalizeCeritaVideoRecord(Array.isArray(rows) ? rows[0] || { id: videoId, ...payload } : { id: videoId, ...payload });
    } catch (err) {
      if (isMissingCeritaTableError(err)) {
        const current = await readSettingsFallbackItems();
        let saved = { id: videoId, ...payload };
        const nextList = current.map((item) => {
          if (item.id !== String(videoId)) return item;
          saved = normalizeCeritaVideoRecord({ ...item, ...payload, updated_at: new Date().toISOString() });
          return saved;
        });
        await writeSettingsFallbackItems(nextList);
        return saved;
      }
      throw err;
    }
  }

  saveDemoOverride('ceritaGresikVideos', videoId, payload);
  return normalizeCeritaVideoRecord({ id: videoId, ...payload });
}

export async function adminDeleteCeritaVideo(videoId) {
  const session = adminGetSession();
  if (!session) throw new Error('Sesi kurator belum aktif.');

  if (session.mode === 'supabase' && isSupabaseConfigured()) {
    try {
      await authSupabaseFetch(`/rest/v1/cerita_gresik_videos?id=eq.${encodeURIComponent(videoId)}`, {
        method: 'DELETE'
      });
      return { deleted: true, id: videoId };
    } catch (err) {
      if (isMissingCeritaTableError(err)) {
        const current = await readSettingsFallbackItems();
        await writeSettingsFallbackItems(current.filter((item) => item.id !== String(videoId)));
        return { deleted: true, id: videoId };
      }
      throw err;
    }
  }

  const ov = getDemoOverrides();
  ov.createdCeritaVideos = ov.createdCeritaVideos.filter((v) => v.id !== videoId);
  if (!ov.deletedCeritaVideos.includes(videoId)) ov.deletedCeritaVideos.push(videoId);
  setDemoOverrides(ov);
  return { deleted: true, id: videoId };
}
