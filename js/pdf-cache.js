/**
 * Cache PDF Offline (IndexedDB) — Portal Literasi Digital e-SIPENA SMAN 1 Sidayu
 * Mengunduh PDF melalui proxy same-origin /api/pdf?id=<FILE_ID> saat pertama kali dibuka,
 * lalu menyimpannya di IndexedDB agar pembukaan berikutnya instan dan bisa dibaca offline.
 */

const DB_NAME = 'esipena_pdf_cache';
const DB_VERSION = 1;
const STORE_NAME = 'pdfs';

function openPdfDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB tidak tersedia'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'fileId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Gagal membuka cache PDF'));
  });
}

export async function getCachedPdf(fileId) {
  const cleanId = String(fileId || '').trim();
  if (!cleanId) return null;
  try {
    const db = await openPdfDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(cleanId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return null;
  }
}

export async function hasCachedPdf(fileId) {
  const entry = await getCachedPdf(fileId);
  return Boolean(entry && entry.blob instanceof Blob && entry.blob.size > 0);
}

export async function saveCachedPdf(fileId, blob) {
  const cleanId = String(fileId || '').trim();
  if (!cleanId || !(blob instanceof Blob)) return false;
  try {
    const db = await openPdfDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({
        fileId: cleanId,
        blob,
        sizeBytes: blob.size,
        cachedAt: Date.now()
      });
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        resolve(false);
      };
    });
  } catch {
    return false;
  }
}

export async function deleteCachedPdf(fileId) {
  const cleanId = String(fileId || '').trim();
  if (!cleanId) return false;
  try {
    const db = await openPdfDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(cleanId);
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        resolve(false);
      };
    });
  } catch {
    return false;
  }
}

/**
 * Mengambil PDF dari IndexedDB bila sudah tersimpan; jika belum dan online, mengunduh lewat
 * proxy same-origin /api/pdf lalu otomatis menyimpannya ke IndexedDB untuk akses offline.
 * @param {string} fileId
 * @param {{ onStatus?: (msg: string) => void }} [options]
 * @returns {Promise<{ status: 'cached' | 'downloaded' | 'offline-miss' | 'proxy-unavailable', blob: Blob | null, objectUrl: string, sizeBytes: number }>}
 */
export async function loadPdfForReader(fileId, { onStatus } = {}) {
  const cleanId = String(fileId || '').trim();
  if (!cleanId) {
    return { status: 'proxy-unavailable', blob: null, objectUrl: '', sizeBytes: 0 };
  }

  const cached = await getCachedPdf(cleanId);
  if (cached?.blob instanceof Blob && cached.blob.size > 0) {
    return {
      status: 'cached',
      blob: cached.blob,
      objectUrl: URL.createObjectURL(cached.blob),
      sizeBytes: cached.blob.size
    };
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { status: 'offline-miss', blob: null, objectUrl: '', sizeBytes: 0 };
  }

  try {
    onStatus?.('Menyimpan PDF otomatis untuk baca offline...');
    const res = await fetch(`/api/pdf?id=${encodeURIComponent(cleanId)}`, {
      cache: 'no-store'
    });
    if (!res.ok) {
      return { status: 'proxy-unavailable', blob: null, objectUrl: '', sizeBytes: 0 };
    }
    const blob = await res.blob();
    if (!blob || blob.size < 10) {
      return { status: 'proxy-unavailable', blob: null, objectUrl: '', sizeBytes: 0 };
    }
    const headerText = await blob.slice(0, 5).text();
    if (headerText !== '%PDF-') {
      return { status: 'proxy-unavailable', blob: null, objectUrl: '', sizeBytes: 0 };
    }

    await saveCachedPdf(cleanId, blob);
    return {
      status: 'downloaded',
      blob,
      objectUrl: URL.createObjectURL(blob),
      sizeBytes: blob.size
    };
  } catch {
    return { status: 'proxy-unavailable', blob: null, objectUrl: '', sizeBytes: 0 };
  }
}

export function isInlinePdfSupported() {
  if (typeof navigator === 'undefined') return true;
  if (typeof navigator.pdfViewerEnabled === 'boolean') {
    return navigator.pdfViewerEnabled;
  }
  const ua = String(navigator.userAgent || '');
  return !/Android|iPhone|iPad|iPod|Mobile/i.test(ua);
}

const PDFJS_BASE = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/build';
const PDFJS_LIB_URL = `${PDFJS_BASE}/pdf.min.mjs`;
const PDFJS_WORKER_URL = `${PDFJS_BASE}/pdf.worker.min.mjs`;

let pdfJsPromise = null;
let cachedWorkerUrl = '';

/**
 * Memuat modul inti PDF.js dan worker Blob sekali per sesi.
 */
export async function ensurePdfJsLoaded() {
  if (!pdfJsPromise) {
    pdfJsPromise = (async () => {
      const pdfjsLib = await import(PDFJS_LIB_URL);
      if (!cachedWorkerUrl) {
        const workerRes = await fetch(PDFJS_WORKER_URL);
        if (!workerRes.ok) throw new Error('Gagal memuat worker PDF.js');
        const workerBlob = new Blob([await workerRes.arrayBuffer()], { type: 'application/javascript' });
        cachedWorkerUrl = URL.createObjectURL(workerBlob);
      }
      pdfjsLib.GlobalWorkerOptions.workerSrc = cachedWorkerUrl;
      return pdfjsLib;
    })().catch((err) => {
      pdfJsPromise = null;
      throw err;
    });
  }
  return pdfJsPromise;
}
