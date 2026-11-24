/**
 * Autentikasi Kurator & Klien REST Terautentikasi — e-SIPENA SMAN 1 Sidayu
 * Menangani Supabase Auth (signInWithPassword, refresh_token, logout) dan mode demo lokal.
 */

import { APP_CONFIG, isSupabaseConfigured } from './config.js';
import {
  SafeStorage,
  fetchWithTimeout,
  getSupabaseBaseUrl,
  getSupabaseHeaders
} from './service-helpers.js';

function saveSession(session) {
  SafeStorage.setJson(APP_CONFIG.STORAGE_KEYS.auth, session);
  return session;
}

/**
 * Mengambil sesi login kurator aktif dari SafeStorage jika belum kedaluwarsa.
 * @returns {{ mode: 'supabase' | 'demo', access_token: string, refresh_token?: string, expires_at: number, user: { id?: string, email: string } } | null}
 */
export function adminGetSession() {
  const session = SafeStorage.getJson(APP_CONFIG.STORAGE_KEYS.auth, null);
  if (!session || typeof session !== 'object') return null;
  if (session.mode === 'supabase' && !isSupabaseConfigured()) {
    SafeStorage.removeItem(APP_CONFIG.STORAGE_KEYS.auth);
    return null;
  }
  const expiresAt = Number(session.expires_at || 0);
  if (!expiresAt || Date.now() > expiresAt) {
    if (session.mode === 'supabase' && session.refresh_token) {
      return session;
    }
    SafeStorage.removeItem(APP_CONFIG.STORAGE_KEYS.auth);
    return null;
  }
  return session;
}

async function refreshSupabaseSession(session) {
  if (!session?.refresh_token || !isSupabaseConfigured()) {
    SafeStorage.removeItem(APP_CONFIG.STORAGE_KEYS.auth);
    throw new Error('Sesi kurator telah berakhir. Silakan masuk kembali.');
  }
  const response = await fetchWithTimeout(
    `${getSupabaseBaseUrl()}/auth/v1/token?grant_type=refresh_token`,
    {
      method: 'POST',
      headers: {
        apikey: APP_CONFIG.SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refresh_token: session.refresh_token })
    },
    6000
  );
  if (!response.ok) {
    SafeStorage.removeItem(APP_CONFIG.STORAGE_KEYS.auth);
    throw new Error('Sesi kurator kedaluwarsa. Silakan masuk kembali.');
  }
  const data = await response.json();
  return saveSession({
    mode: 'supabase',
    access_token: data.access_token,
    refresh_token: data.refresh_token || session.refresh_token,
    expires_at: Date.now() + Math.max(300, Number(data.expires_in || 3600) - 45) * 1000,
    user: data.user || session.user || { email: '' }
  });
}

async function ensureActiveSupabaseSession() {
  let session = adminGetSession();
  if (!session || session.mode !== 'supabase') {
    throw new Error('Silakan masuk sebagai kurator terlebih dahulu.');
  }
  if (Date.now() >= Number(session.expires_at || 0) - 15000) {
    session = await refreshSupabaseSession(session);
  }
  return session;
}

export async function authSupabaseFetch(pathAndQuery, options = {}) {
  let session = await ensureActiveSupabaseSession();
  const execute = (token) =>
    fetchWithTimeout(
      `${getSupabaseBaseUrl()}${pathAndQuery}`,
      {
        ...options,
        headers: getSupabaseHeaders(options.headers || {}, token)
      },
      8000
    );

  let response = await execute(session.access_token);
  if (response.status === 401 && session.refresh_token) {
    session = await refreshSupabaseSession(session);
    response = await execute(session.access_token);
  }
  if (response.status === 401) {
    SafeStorage.removeItem(APP_CONFIG.STORAGE_KEYS.auth);
    throw new Error('Sesi login tidak valid atau telah kedaluwarsa.');
  }
  if (!response.ok) {
    let detail = '';
    try {
      const errData = await response.json();
      detail = errData?.message || errData?.details || errData?.error_description || '';
    } catch {
      detail = '';
    }
    throw new Error(detail || `Operasi Supabase gagal (HTTP ${response.status}).`);
  }
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Masuk ke Ruang Pengelola melalui Supabase Auth (signInWithPassword).
 * Jika Supabase belum dikonfigurasi, mengaktifkan sesi mode demo lokal.
 * @param {string} email
 * @param {string} password
 */
export async function adminSignIn(email, password) {
  const cleanEmail = String(email || '').trim();
  const cleanPassword = String(password || '');

  if (!isSupabaseConfigured()) {
    const demoSession = saveSession({
      mode: 'demo',
      access_token: '',
      expires_at: Date.now() + 8 * 3600 * 1000,
      user: { email: cleanEmail || 'kurator-demo@sman1sidayu.sch.id' }
    });
    return { session: demoSession, mode: 'demo' };
  }

  if (!cleanEmail || !cleanPassword) {
    throw new Error('Surel dan kata sandi kurator wajib diisi.');
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('Perangkat sedang luring. Autentikasi Supabase membutuhkan koneksi internet.');
  }

  const response = await fetchWithTimeout(
    `${getSupabaseBaseUrl()}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        apikey: APP_CONFIG.SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: cleanEmail, password: cleanPassword })
    },
    7500
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.access_token) {
    const rawMsg = String(data?.error_description || data?.msg || '').toLowerCase();
    const message = rawMsg.includes('invalid')
      ? 'Surel atau kata sandi kurator tidak cocok.'
      : data?.error_description || data?.msg || 'Gagal masuk ke Supabase Auth.';
    throw new Error(message);
  }

  const session = saveSession({
    mode: 'supabase',
    access_token: data.access_token,
    refresh_token: data.refresh_token || '',
    expires_at: Date.now() + Math.max(300, Number(data.expires_in || 3600) - 45) * 1000,
    user: data.user || { email: cleanEmail }
  });
  return { session, mode: 'supabase' };
}

/**
 * Keluar dari Ruang Pengelola dan menghapus sesi aktif.
 */
export async function adminSignOut() {
  const session = SafeStorage.getJson(APP_CONFIG.STORAGE_KEYS.auth, null);
  SafeStorage.removeItem(APP_CONFIG.STORAGE_KEYS.auth);
  if (
    session?.mode === 'supabase' &&
    session.access_token &&
    isSupabaseConfigured() &&
    (typeof navigator === 'undefined' || navigator.onLine !== false)
  ) {
    try {
      await fetchWithTimeout(
        `${getSupabaseBaseUrl()}/auth/v1/logout`,
        {
          method: 'POST',
          headers: getSupabaseHeaders({}, session.access_token)
        },
        3500
      );
    } catch {
      // Abaikan galat jaringan saat logout
    }
  }
}
