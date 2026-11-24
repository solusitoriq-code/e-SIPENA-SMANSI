/**
 * Konfigurasi Terpusat Portal Literasi Digital e-SIPENA SMAN 1 Sidayu
 *
 * Isi SUPABASE_URL, SUPABASE_ANON_KEY, dan GDRIVE_UPLOAD_URL setelah Anda
 * menyelesaikan penyiapan Supabase dan Google Apps Script (UploadDrive.gs).
 *
 * PENTING:
 * - Hanya gunakan "anon public key" Supabase di file ini (aman dilindungi RLS).
 * - Dilarang keras menaruh "service_role key" atau password admin di frontend.
 */

export const APP_CONFIG = Object.freeze({
  // 1. Koneksi Supabase Free Tier (Project Settings > API)
  SUPABASE_URL: 'https://ywibnbdsacmvmpeccboq.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_SWYns1phbnOrGjBz4nbbTQ_rlDuvH8C',

  // 2. Endpoint Web App Google Apps Script (/exec) dari UploadDrive.gs
  GDRIVE_UPLOAD_URL: 'https://script.google.com/macros/s/AKfycbxgtc5foGLtZle3g1VWngbaUsnFOWsv3faQzhrOst5NP2V0I6yWW9zhXJosloUHUs9TSg/exec',

  // 3. Fallback dataset lokal saat offline atau sebelum Supabase diisi
  LOCAL_DATA_URL: './data/esipena_data.json',

  // 4. Batas unggahan naskah, buku kurator & paginasi kanvas 16:9
  MAX_PDF_SIZE_BYTES: 3 * 1024 * 1024, // 3 MiB (3.145.728 byte) untuk Kirim Karya publik
  MAX_CATALOG_PDF_SIZE_BYTES: 16 * 1024 * 1024, // 16 MiB khusus PDF buku kurator
  BOOK_PAGE_SIZE: 4,
  MADING_PAGE_SIZE: 6,

  // 5. Kunci penyimpanan lokal (SafeStorage)
  STORAGE_KEYS: Object.freeze({
    rotate: 'esipena_rotate_deg',
    likes: 'esipena_liked_books',
    auth: 'esipena_auth_session',
    trackingHistory: 'esipena_tracking_codes'
  }),

  // 6. Identitas baku sekolah (dipakai bila data setting belum dimuat)
  SCHOOL_DEFAULTS: Object.freeze({
    name: 'SMA Negeri 1 Sidayu',
    shortName: 'SMAN 1 Sidayu',
    libraryName: 'Perpustakaan Lentera Ilmu',
    communityName: 'NLC (Naskah Literasi Cendekia)',
    whatsappNumber: '6281234567890'
  })
});

/**
 * Memeriksa apakah URL dan anon key Supabase sudah dikonfigurasi.
 * @returns {boolean}
 */
export function isSupabaseConfigured() {
  const url = String(APP_CONFIG.SUPABASE_URL || '').trim();
  const key = String(APP_CONFIG.SUPABASE_ANON_KEY || '').trim();
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) && key.length > 20;
}

/**
 * Memeriksa apakah URL Web App Google Apps Script sudah dikonfigurasi.
 * @returns {boolean}
 */
export function isGDriveUploadConfigured() {
  const url = String(APP_CONFIG.GDRIVE_UPLOAD_URL || '').trim();
  return /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/i.test(url);
}
