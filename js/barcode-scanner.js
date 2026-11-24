/**
 * Pemindai Barcode ISBN (EAN-13) & QR Code (QRCBN) — e-SIPENA SMAN 1 Sidayu
 * Memuat @zxing/browser secara on-demand untuk memindai via kamera maupun file gambar
 * tanpa bundler, dengan dukungan BarcodeDetector native bila tersedia.
 */

const ZXING_BROWSER_URL = 'https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/+esm';
const ZXING_LIB_URL = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.0/+esm';
const SUPPORTED_NATIVE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'code_128', 'qr_code'];

let zxingBundlePromise = null;

async function loadZXing() {
  if (!zxingBundlePromise) {
    zxingBundlePromise = Promise.all([import(ZXING_BROWSER_URL), import(ZXING_LIB_URL)]).catch((err) => {
      zxingBundlePromise = null;
      throw err;
    });
  }
  return zxingBundlePromise;
}

async function createZxingReader() {
  const [browserMod, libMod] = await loadZXing();
  const hints = new Map();
  if (libMod?.DecodeHintType) {
    hints.set(libMod.DecodeHintType.TRY_HARDER, true);
    if (libMod.BarcodeFormat) {
      hints.set(libMod.DecodeHintType.POSSIBLE_FORMATS, [
        libMod.BarcodeFormat.EAN_13,
        libMod.BarcodeFormat.EAN_8,
        libMod.BarcodeFormat.UPC_A,
        libMod.BarcodeFormat.CODE_128,
        libMod.BarcodeFormat.QR_CODE
      ]);
    }
  }
  return {
    browserMod,
    reader: new browserMod.BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 180 })
  };
}

/**
 * Membersihkan hasil pindaian mentah dan memberi catatan bila berupa 13 digit EAN-13 tanpa strip.
 * @param {string} rawText
 * @returns {{ value: string, isRawEan13: boolean }}
 */
export function normalizeScannedCode(rawText) {
  const value = String(rawText || '').trim();
  const isRawEan13 = /^(978|979)\d{10}$/.test(value);
  return { value, isRawEan13 };
}

async function tryNativeDetect(source) {
  if (typeof window === 'undefined' || typeof window.BarcodeDetector !== 'function') return '';
  try {
    const supported =
      typeof window.BarcodeDetector.getSupportedFormats === 'function'
        ? await window.BarcodeDetector.getSupportedFormats()
        : SUPPORTED_NATIVE_FORMATS;
    const formats = SUPPORTED_NATIVE_FORMATS.filter((f) => supported.includes(f));
    if (!formats.length) return '';
    const detector = new window.BarcodeDetector({ formats });
    const hits = await detector.detect(source);
    return String(hits?.[0]?.rawValue || '').trim();
  } catch {
    return '';
  }
}

function drawPaddedCanvas(img, rotateQuarter = false) {
  const natW = Math.max(1, img.naturalWidth || img.width || 1);
  const natH = Math.max(1, img.naturalHeight || img.height || 1);
  const scale = natW < 520 ? Math.min(3, Math.ceil(520 / natW)) : 1;
  const drawW = Math.min(1800, Math.round(natW * scale));
  const drawH = Math.min(1800, Math.round(natH * scale));
  const pad = 28;

  const canvas = document.createElement('canvas');
  canvas.width = (rotateQuarter ? drawH : drawW) + pad * 2;
  canvas.height = (rotateQuarter ? drawW : drawH) + pad * 2;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (rotateQuarter) {
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  } else {
    ctx.drawImage(img, pad, pad, drawW, drawH);
  }
  return canvas;
}

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Berkas gambar tidak dapat dibuka untuk pemindaian.'));
    };
    img.src = url;
  });
}

/**
 * Memindai barcode ISBN atau QR Code dari berkas gambar yang dipilih pengguna.
 * @param {File} file
 * @returns {Promise<{ value: string, isRawEan13: boolean }>}
 */
export async function scanBarcodeFromImageFile(file) {
  if (!(file instanceof File)) throw new Error('Pilih berkas gambar barcode atau QR terlebih dahulu.');
  const img = await loadImageElement(file);
  const canvasNormal = drawPaddedCanvas(img, false);

  const nativeHit = (await tryNativeDetect(img)) || (await tryNativeDetect(canvasNormal));
  if (nativeHit) return normalizeScannedCode(nativeHit);

  const { reader } = await createZxingReader();
  for (const canvas of [canvasNormal, drawPaddedCanvas(img, true)]) {
    try {
      const res = reader.decodeFromCanvas(canvas);
      const text = res?.getText?.();
      if (text) return normalizeScannedCode(text);
    } catch {
      // Coba orientasi berikutnya bila barcode belum terbaca
    }
  }
  throw new Error('Barcode ISBN atau QR Code tidak terdeteksi pada gambar tersebut.');
}

/**
 * Memulai pemindaian langsung via kamera (webcam / kamera belakang) pada elemen video.
 * @param {HTMLVideoElement} videoEl
 * @param {{ onDetected: (res: { value: string, isRawEan13: boolean }) => void, onError?: (err: Error) => void }} callbacks
 * @returns {Promise<{ stop: () => void }>}
 */
export async function startCameraBarcodeScan(videoEl, { onDetected, onError } = {}) {
  if (!(videoEl instanceof HTMLVideoElement)) throw new Error('Elemen pratinjau kamera tidak tersedia.');
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Peramban atau koneksi ini belum mendukung akses kamera.');
  }

  let stopped = false;
  let activeControls = null;
  let browserModRef = null;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    try { activeControls?.stop?.(); } catch { /* Abaikan */ }
    try { browserModRef?.BrowserCodeReader?.releaseAllStreams?.(); } catch { /* Abaikan */ }
    const stream = videoEl.srcObject;
    if (stream instanceof MediaStream) {
      for (const track of stream.getTracks()) track.stop();
    }
    videoEl.srcObject = null;
  };

  try {
    const { browserMod, reader } = await createZxingReader();
    browserModRef = browserMod;
    if (stopped) return { stop };

    const constraints = {
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
    };

    activeControls = await reader.decodeFromConstraints(constraints, videoEl, (result, _err, controls) => {
      if (stopped) {
        controls?.stop?.();
        return;
      }
      const text = result?.getText?.();
      if (text) {
        stop();
        onDetected?.(normalizeScannedCode(text));
      }
    });

    if (stopped) stop();
    return { stop };
  } catch (err) {
    stop();
    const wrapped = err instanceof Error ? err : new Error('Gagal menyalakan kamera pemindai.');
    onError?.(wrapped);
    throw wrapped;
  }
}

/**
 * Menghubungkan input ISBN/QRCBN dengan tombol Scan Kamera, Scan Gambar, dan scanner USB.
 * @param {{
 *   inputEl: HTMLInputElement | null,
 *   camBtn: HTMLButtonElement | null,
 *   stopCamBtn: HTMLButtonElement | null,
 *   camBoxEl: HTMLElement | null,
 *   videoEl: HTMLVideoElement | null,
 *   imgInputEl: HTMLInputElement | null,
 *   statusEl: HTMLElement | null,
 *   onDetected?: (res: { value: string, isRawEan13: boolean }) => void,
 *   onError?: (msg: string) => void
 * }} opts
 * @returns {{ stopCamera: () => void }}
 */
export function mountBookBarcodeScanner({
  inputEl, camBtn, stopCamBtn, camBoxEl, videoEl, imgInputEl, statusEl, onDetected, onError
}) {
  let cameraHandle = null;

  const setStatus = (msg, kind = '') => {
    if (!statusEl) return;
    statusEl.hidden = !msg;
    statusEl.className = `file-status-text${kind ? ` ${kind}` : ''}`;
    statusEl.textContent = msg;
  };

  const stopCamera = () => {
    cameraHandle?.stop?.();
    cameraHandle = null;
    if (camBoxEl) camBoxEl.hidden = true;
    if (camBtn) camBtn.setAttribute('aria-pressed', 'false');
  };

  const applyHit = (res) => {
    if (inputEl) inputEl.value = res.value;
    const hint = res.isRawEan13 ? " (13 digit EAN-13; tambahkan '-' jika perlu)" : '';
    setStatus(`Terbaca: ${res.value}${hint}`, 'is-ok');
    onDetected?.(res);
  };

  inputEl?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') event.preventDefault();
  });

  camBtn?.addEventListener('click', async () => {
    if (cameraHandle) {
      stopCamera();
      setStatus('');
      return;
    }
    if (!(videoEl instanceof HTMLVideoElement)) return;
    if (camBoxEl) camBoxEl.hidden = false;
    camBtn.setAttribute('aria-pressed', 'true');
    setStatus('Menyiapkan kamera dan pemindai...');
    try {
      cameraHandle = await startCameraBarcodeScan(videoEl, {
        onDetected: (res) => {
          stopCamera();
          applyHit(res);
        }
      });
      if (cameraHandle) setStatus('Kamera aktif. Arahkan ke barcode ISBN atau QR Code.');
    } catch (err) {
      stopCamera();
      const msg = err?.message || 'Kamera tidak dapat diakses.';
      setStatus(msg, 'is-error');
      onError?.(msg);
    }
  });

  stopCamBtn?.addEventListener('click', () => {
    stopCamera();
    setStatus('');
  });

  imgInputEl?.addEventListener('change', async () => {
    const file = imgInputEl.files?.[0];
    if (!file) return;
    stopCamera();
    setStatus('Memindai barcode/QR dari gambar...');
    try {
      const res = await scanBarcodeFromImageFile(file);
      applyHit(res);
    } catch (err) {
      const msg = err?.message || 'Gagal memindai barcode dari gambar.';
      setStatus(msg, 'is-error');
      onError?.(msg);
    } finally {
      imgInputEl.value = '';
    }
  });

  return { stopCamera };
}
