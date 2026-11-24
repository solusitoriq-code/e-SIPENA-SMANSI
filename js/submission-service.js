/**
 * Layanan Kirim Karya & Pelacakan Kode — e-SIPENA SMAN 1 Sidayu
 * Menangani unggah PDF (maks. 3 MB) ke Google Drive via Apps Script, pengiriman ke
 * tabel submissions Supabase (Prefer: return=minimal), dan RPC track_submission dengan fallback lokal.
 */

import { APP_CONFIG, isGDriveUploadConfigured, isSupabaseConfigured } from './config.js';
import {
  SafeStorage,
  fetchWithTimeout,
  getDemoOverrides,
  getSupabaseBaseUrl,
  getSupabaseHeaders,
  mergeSubmissionRows,
  postTextJson
} from './service-helpers.js';
import { extractPlainLiteraryText } from './ui-utils.js';

export const LOCAL_SUBMISSIONS_KEY = 'esipena_local_submissions';
export const SUBMISSION_ROLES = Object.freeze(['Siswa X', 'Siswa XI', 'Siswa XII', 'Guru', 'Tendik']);
export const SUBMISSION_CATEGORIES = Object.freeze([
  'Novel',
  'Cerpen',
  'Puisi'
]);
export const SUBMISSION_STATUSES = Object.freeze([
  'Menunggu Kurasi',
  'Perlu Revisi',
  'Lolos Mading',
  'Ditolak'
]);

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateTrackingCode() {
  const bytes = new Uint8Array(6);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 6; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  let suffix = '';
  for (let i = 0; i < 6; i += 1) {
    suffix += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return `SPN-${suffix}`;
}

export function getLocalSubmissions() {
  const list = SafeStorage.getJson(LOCAL_SUBMISSIONS_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function saveLocalSubmission(entry) {
  const code = String(entry?.tracking_code || '').trim().toUpperCase();
  const list = getLocalSubmissions().filter(
    (item) => item.id !== entry.id && (!code || String(item.tracking_code || '').trim().toUpperCase() !== code)
  );
  const next = [entry, ...list].slice(0, 60);
  SafeStorage.setJson(LOCAL_SUBMISSIONS_KEY, next);
  return next;
}

export function removeLocalSubmissionByCode(code) {
  const cleanCode = String(code || '').trim().toUpperCase();
  if (!cleanCode) return;
  const list = getLocalSubmissions();
  const next = list.filter((item) => String(item?.tracking_code || '').trim().toUpperCase() !== cleanCode);
  if (next.length !== list.length) SafeStorage.setJson(LOCAL_SUBMISSIONS_KEY, next);
}

export function getTrackingHistory() {
  const list = SafeStorage.getJson(APP_CONFIG.STORAGE_KEYS.trackingHistory, []);
  return Array.isArray(list) ? list : [];
}

function recordTrackingHistory(code, title = '') {
  const cleanCode = String(code || '').trim().toUpperCase();
  if (!cleanCode) return;
  const list = getTrackingHistory().filter((item) => item && item.code !== cleanCode);
  const next = [{ code: cleanCode, title: String(title || '').trim(), savedAt: new Date().toISOString() }, ...list].slice(0, 8);
  SafeStorage.setJson(APP_CONFIG.STORAGE_KEYS.trackingHistory, next);
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.replace(/^data:[^;]+;base64,/i, '');
      if (!base64) {
        reject(new Error('Gagal membaca konten berkas PDF.'));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Gagal membaca berkas PDF dari perangkat.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Memvalidasi file PDF wajib ekstensi .pdf, header %PDF-, dan ukuran <= maxBytes.
 * @param {File} file
 * @param {number} [maxBytes]
 */
export async function validatePdfFile(file, maxBytes = APP_CONFIG.MAX_PDF_SIZE_BYTES) {
  if (!file || typeof file.name !== 'string') {
    throw new Error('Pilih berkas PDF terlebih dahulu.');
  }
  const nameLower = file.name.trim().toLowerCase();
  if (!nameLower.endsWith('.pdf')) {
    throw new Error('Berkas wajib berformat .pdf.');
  }
  const mime = String(file.type || '').trim().toLowerCase();
  if (mime && mime !== 'application/pdf') {
    throw new Error('Tipe berkas wajib PDF (application/pdf).');
  }
  if (!file.size || file.size <= 0) {
    throw new Error('Berkas PDF tidak boleh kosong.');
  }
  const limitBytes = Number(maxBytes) > 0 ? Number(maxBytes) : APP_CONFIG.MAX_PDF_SIZE_BYTES;
  if (file.size > limitBytes) {
    const limitMb = Math.round(limitBytes / (1024 * 1024));
    throw new Error(`Ukuran berkas PDF melebihi batas maksimal ${limitMb} MB.`);
  }
  if (typeof file.slice === 'function' && typeof Blob.prototype.arrayBuffer === 'function') {
    const headerBuf = await file.slice(0, 5).arrayBuffer();
    const bytes = new Uint8Array(headerBuf);
    const isPdf =
      bytes.length >= 5 &&
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46 &&
      bytes[4] === 0x2d;
    if (!isPdf) {
      throw new Error('Konten berkas tidak valid. Pastikan file merupakan PDF asli.');
    }
  }
}

/**
 * Mengunggah berkas PDF dalam format Base64 ke Google Drive via Apps Script.
 * Menyimpan langsung ke subfolder naskah-pdf/ (maks. 3 MB) atau novel-pdf/ (maks. 16 MB),
 * dengan fallback simulasi lokal bila perangkat luring atau URL pengunggah belum diisi.
 * @param {File} file
 * @param {{ subFolder?: 'naskah-pdf' | 'novel-pdf', maxBytes?: number }} [options]
 */
export async function uploadPdfToGDrive(file, { subFolder = 'naskah-pdf', maxBytes } = {}) {
  const safeSubFolder = subFolder === 'novel-pdf' ? 'novel-pdf' : 'naskah-pdf';
  const effectiveMaxBytes = Number(
    maxBytes ||
    (safeSubFolder === 'novel-pdf'
      ? APP_CONFIG.MAX_CATALOG_PDF_SIZE_BYTES
      : APP_CONFIG.MAX_PDF_SIZE_BYTES)
  );
  await validatePdfFile(file, effectiveMaxBytes);
  const base64Data = await readFileAsBase64(file);

  const buildLocalFallback = (warning = '') => ({
    success: true,
    source: 'local',
    simulated: true,
    fileId: `local-${Date.now().toString(36)}`,
    viewUrl: '',
    previewUrl: '',
    folderName: safeSubFolder,
    fileName: file.name,
    sizeBytes: Number(file.size || 0),
    warning
  });

  const canUploadOnline =
    isGDriveUploadConfigured() && (typeof navigator === 'undefined' || navigator.onLine !== false);
  if (!canUploadOnline) {
    return buildLocalFallback('Mode simulasi lokal: berkas divalidasi tanpa koneksi Google Drive.');
  }

  try {
    const timeoutMs = 0;
    const response = await postTextJson(
      APP_CONFIG.GDRIVE_UPLOAD_URL,
      {
        uploadKind: 'pdf',
        subFolder: safeSubFolder,
        fileName: file.name,
        mimeType: 'application/pdf',
        base64Data
      },
      { timeoutMs }
    );
    const data = response.data;

    if (data && data.success === false) {
      throw new Error(data.error || 'Google Drive menolak unggahan PDF.');
    }
    if (response.ok && data && data.success) {
      return {
        success: true,
        source: 'gdrive',
        simulated: false,
        fileId: String(data.fileId || ''),
        viewUrl: String(data.viewUrl || ''),
        previewUrl: String(data.previewUrl || ''),
        folderName: String(data.folderName || safeSubFolder),
        fileName: String(data.fileName || file.name),
        sizeBytes: Number(data.sizeBytes || file.size || 0)
      };
    }

    if (!response.ok) {
      throw new Error(`Endpoint Google Drive merespons HTTP ${response.status}.`);
    }
    return buildLocalFallback('Respons unggahan Drive tidak lengkap; metadata disimpan lokal.');
  } catch (err) {
    if (err instanceof TypeError || err?.name === 'AbortError') {
      return buildLocalFallback('Koneksi Google Drive tidak terjangkau; berkas dicatat dalam mode simulasi lokal.');
    }
    throw err;
  }
}

/**
 * Mengirim karya ke tabel submissions Supabase (Prefer: return=minimal)
 * dengan kode lacak SPN-XXXXXX dan cadangan lokal di SafeStorage.
 * @param {Record<string, any>} payload
 */
export async function submitWork(payload = {}) {
  const title = String(payload.title || '').trim();
  const authorName = String(payload.author_name || '').trim();
  const authorRole = String(payload.author_role || '').trim();
  const authorClassUnit = String(payload.author_class_unit || '').trim();
  const category = String(payload.category || '').trim();
  const cultureTheme = String(payload.culture_theme || '').trim();
  const rawSummary = extractPlainLiteraryText(payload.summary || '');
  const bodyText = String(payload.body_text || '').trim();
  const contactWa = String(payload.contact_wa || '').trim();
  const antiPlagiarismAgreed = payload.anti_plagiarism_agreed === true;
  const hasPdf = Boolean(payload.file_name || payload.gdrive_preview_url);

  if (!title) throw new Error('Judul karya wajib diisi.');
  if (!authorName) throw new Error('Nama lengkap penulis wajib diisi.');
  if (!SUBMISSION_ROLES.includes(authorRole)) throw new Error('Peran penulis tidak valid.');
  if (!authorClassUnit) throw new Error('Kelas atau unit tugas wajib diisi.');
  if (!SUBMISSION_CATEGORIES.includes(category)) throw new Error('Kategori karya tidak valid.');
  if (!antiPlagiarismAgreed) throw new Error('Pernyataan anti-plagiat wajib dicentang.');
  if (!hasPdf && !bodyText) {
    throw new Error('Lampirkan berkas PDF atau tulis teks naskah karya.');
  }
  if (hasPdf && !rawSummary) {
    throw new Error('Ringkasan karya wajib diisi untuk tampilan kartu Mading.');
  }
  const plainBody = bodyText ? extractPlainLiteraryText(bodyText) : '';
  const summary =
    rawSummary ||
    (plainBody.length > 220 ? `${plainBody.slice(0, 217).trimEnd()}...` : plainBody);

  const trackingCode = String(payload.tracking_code || generateTrackingCode()).trim().toUpperCase();
  const fileSizeBytes = Math.min(
    APP_CONFIG.MAX_PDF_SIZE_BYTES,
    Math.max(0, Number(payload.file_size_bytes || 0) || 0)
  );
  const nowIso = new Date().toISOString();

  const record = {
    tracking_code: trackingCode,
    title,
    author_name: authorName,
    author_role: authorRole,
    author_class_unit: authorClassUnit,
    category,
    culture_theme: cultureTheme,
    summary,
    body_text: bodyText,
    gdrive_file_id: String(payload.gdrive_file_id || '').trim(),
    gdrive_view_url: String(payload.gdrive_view_url || '').trim(),
    gdrive_preview_url: String(payload.gdrive_preview_url || '').trim(),
    file_name: String(payload.file_name || '').trim(),
    file_size_bytes: fileSizeBytes,
    contact_wa: contactWa,
    anti_plagiarism_agreed: true,
    status: 'Menunggu Kurasi',
    reviewer_notes: '',
    is_placeholder: false
  };

  let source = 'local';
  const canTrySupabase =
    isSupabaseConfigured() && (typeof navigator === 'undefined' || navigator.onLine !== false);

  if (canTrySupabase) {
    try {
      const response = await fetchWithTimeout(
        `${getSupabaseBaseUrl()}/rest/v1/submissions`,
        {
          method: 'POST',
          headers: getSupabaseHeaders({
            'Content-Type': 'application/json',
            Prefer: 'return=minimal'
          }),
          body: JSON.stringify(record)
        },
        8000
      );

      if (response.ok) {
        source = 'supabase';
      } else {
        let errDetail = '';
        try {
          const errJson = await response.json();
          errDetail = errJson?.message || errJson?.details || '';
        } catch {
          errDetail = '';
        }
        throw new Error(errDetail || `Gagal mengirim karya ke server (${response.status}).`);
      }
    } catch (err) {
      if (!(err instanceof TypeError || err?.name === 'AbortError')) {
        throw err;
      }
    }
  }

  const localCopy = {
    id: `local-${trackingCode.toLowerCase()}`,
    ...record,
    created_at: nowIso,
    updated_at: nowIso
  };
  if (source === 'supabase') {
    removeLocalSubmissionByCode(trackingCode);
  } else {
    saveLocalSubmission(localCopy);
  }
  recordTrackingHistory(trackingCode, title);

  return {
    success: true,
    source,
    trackingCode,
    submission: localCopy
  };
}

/**
 * Melacak status kurasi karya melalui RPC Supabase track_submission
 * dengan fallback otomatis ke data lokal dan karya Mading placeholder.
 * @param {string} code
 * @param {{ fallbackWorks?: any[] }} [options]
 */
export async function trackSubmission(code, { fallbackWorks = [] } = {}) {
  const cleanCode = String(code || '').trim().toUpperCase();
  if (!cleanCode) {
    throw new Error('Masukkan Kode Lacak SPN terlebih dahulu.');
  }

  const canTrySupabase =
    isSupabaseConfigured() && (typeof navigator === 'undefined' || navigator.onLine !== false);

  if (canTrySupabase) {
    try {
      const response = await fetchWithTimeout(
        `${getSupabaseBaseUrl()}/rest/v1/rpc/track_submission`,
        {
          method: 'POST',
          headers: getSupabaseHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ p_tracking_code: cleanCode })
        },
        6000
      );
      if (response.ok) {
        const rows = await response.json();
        if (Array.isArray(rows) && rows.length > 0) {
          recordTrackingHistory(cleanCode, rows[0].title);
          return { found: true, source: 'supabase', submission: rows[0] };
        }
      }
    } catch {
      // Jatuh ke pencarian lokal saat jaringan bermasalah
    }
  }

  const ov = getDemoOverrides().submissions;
  const localSubs = getLocalSubmissions();
  const candidates = mergeSubmissionRows([...localSubs, ...fallbackWorks], ov);
  const matched = candidates.find(
    (item) => String(item?.tracking_code || '').trim().toUpperCase() === cleanCode
  );

  if (matched) {
    recordTrackingHistory(cleanCode, matched.title);
    return { found: true, source: 'local', submission: matched };
  }

  return { found: false, source: canTrySupabase ? 'supabase' : 'local', submission: null };
}
