/**
 * Pembaca PDF Flipbook Mode Slide, 2 Halaman & Layar Penuh (PDF.js) — e-SIPENA SMAN 1 Sidayu
 * Merender Blob PDF cache IndexedDB ke kanvas 1 atau 2 halaman dengan animasi 3D flipbook,
 * toolbar kontrol mengambang dengan animasi auto-hide, panah tepi, swipe, zoom, dan Fokus Baca.
 */

import { playSfx } from './audio.js';
import { SafeStorage } from './data-service.js';
import { bindHorizontalSwipe } from './nav-controls.js';
import { escapeHtml } from './ui-utils.js';

const PDFJS_BASE = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/build';
const PDFJS_LIB_URL = `${PDFJS_BASE}/pdf.min.mjs`;
const PDFJS_WORKER_URL = `${PDFJS_BASE}/pdf.worker.min.mjs`;

let pdfJsPromise = null;
let cachedWorkerUrl = '';

async function ensurePdfJsLoaded() {
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

function isWideReaderScreen() {
  return typeof window !== 'undefined' && window.innerWidth >= 820 && window.innerHeight >= 520;
}

/**
 * Memasang pembaca PDF flipbook (1/2 halaman, Layar Penuh, animasi 3D balik halaman) dari Blob.
 * @param {{ stageEl: HTMLElement, blob: Blob, bookId: string, title?: string }} opts
 * @returns {Promise<{ destroy: () => void, numPages: number }>}
 */
export async function mountPdfSlideViewer({ stageEl, blob, bookId, title = 'Novel' }) {
  const pdfjsLib = await ensurePdfJsLoaded();
  const dataBytes = new Uint8Array(await blob.arrayBuffer());
  const pdfDoc = await pdfjsLib.getDocument({ data: dataBytes, verbosity: 0 }).promise;

  const totalPages = Number(pdfDoc.numPages || 1);
  const pageStorageKey = `esipena_pdf_page_${String(bookId || 'book')}`;
  const savedPage = Number(SafeStorage.getItem(pageStorageKey) || 1);
  let currentPage = Number.isFinite(savedPage) && savedPage >= 1 && savedPage <= totalPages ? savedPage : 1;
  let twoPageMode = totalPages > 1 && isWideReaderScreen();
  let zoomFactor = 1.0;
  let isExpanded = false;
  let renderGen = 0;
  let activeRenderTask = null;
  let flipTimer = null;
  let hudTimer = null;
  let pointerInsideToolbar = false;
  let destroyed = false;

  stageEl.className = 'pdf-slide-shell';
  stageEl.innerHTML = `
    <div class="pdf-slide-viewport" id="pdf-slide-viewport" tabindex="0" aria-label="Pembaca flipbook PDF ${escapeHtml(title)}">
      <div class="pdf-flip-spread" id="pdf-flip-spread">
        <canvas class="pdf-slide-canvas pdf-page-left" id="pdf-canvas-left"></canvas>
        <div class="pdf-spread-spine" id="pdf-spread-spine" hidden></div>
        <canvas class="pdf-slide-canvas pdf-page-right" id="pdf-canvas-right" hidden></canvas>
        <div class="pdf-flip-leaf" id="pdf-flip-leaf" hidden aria-hidden="true">
          <canvas class="pdf-flip-leaf-canvas" id="pdf-flip-leaf-canvas"></canvas>
        </div>
      </div>
    </div>
    <button type="button" class="pdf-edge-btn pdf-edge-prev" id="pdf-edge-prev" aria-label="Halaman PDF sebelumnya">&lsaquo;</button>
    <button type="button" class="pdf-edge-btn pdf-edge-next" id="pdf-edge-next" aria-label="Halaman PDF berikutnya">&rsaquo;</button>
    <button type="button" class="pdf-toolbar-peek" id="pdf-toolbar-peek" aria-label="Tampilkan kontrol baca PDF">Hal ${currentPage} / ${totalPages}</button>
    <div class="pdf-slide-toolbar" id="pdf-slide-toolbar" role="toolbar" aria-label="Kontrol pembaca buku PDF">
      <div class="pdf-slide-nav-group">
        <button type="button" class="page-btn" id="pdf-btn-prev" aria-label="Halaman PDF sebelumnya">&lsaquo; Hal</button>
        <label class="pdf-page-jump-label">
          <span>Hal</span>
          <input type="number" id="pdf-page-input" class="pdf-page-jump-input" min="1" max="${totalPages}" value="${currentPage}" aria-label="Nomor halaman PDF">
          <span id="pdf-page-total-label">/ ${totalPages}</span>
        </label>
        <button type="button" class="page-btn" id="pdf-btn-next" aria-label="Halaman PDF berikutnya">Hal &rsaquo;</button>
      </div>
      <div class="pdf-slide-zoom-group">
        <button type="button" class="page-btn" id="pdf-btn-layout" aria-pressed="${twoPageMode ? 'true' : 'false'}" ${totalPages <= 1 ? 'disabled' : ''}>${twoPageMode ? '2 Hal' : '1 Hal'}</button>
        <button type="button" class="page-btn" id="pdf-zoom-out" aria-label="Perkecil halaman">-</button>
        <span class="page-indicator" id="pdf-zoom-label">100%</span>
        <button type="button" class="page-btn" id="pdf-zoom-in" aria-label="Perbesar halaman">+</button>
        <button type="button" class="secondary-btn" id="pdf-btn-fullscreen" aria-pressed="false" aria-label="Mode fokus penuh pembaca PDF">Fokus Baca</button>
      </div>
    </div>
  `;

  const toolbarEl = stageEl.querySelector('#pdf-slide-toolbar');
  const peekBtn = stageEl.querySelector('#pdf-toolbar-peek');
  const edgePrevBtn = stageEl.querySelector('#pdf-edge-prev');
  const edgeNextBtn = stageEl.querySelector('#pdf-edge-next');
  const prevBtn = stageEl.querySelector('#pdf-btn-prev');
  const nextBtn = stageEl.querySelector('#pdf-btn-next');
  const pageInput = stageEl.querySelector('#pdf-page-input');
  const totalLabel = stageEl.querySelector('#pdf-page-total-label');
  const layoutBtn = stageEl.querySelector('#pdf-btn-layout');
  const zoomOutBtn = stageEl.querySelector('#pdf-zoom-out');
  const zoomInBtn = stageEl.querySelector('#pdf-zoom-in');
  const zoomLabel = stageEl.querySelector('#pdf-zoom-label');
  const fsBtn = stageEl.querySelector('#pdf-btn-fullscreen');
  const viewportEl = stageEl.querySelector('#pdf-slide-viewport');
  const spreadEl = stageEl.querySelector('#pdf-flip-spread');
  const leftCanvas = stageEl.querySelector('#pdf-canvas-left');
  const rightCanvas = stageEl.querySelector('#pdf-canvas-right');
  const spineEl = stageEl.querySelector('#pdf-spread-spine');
  const flipLeaf = stageEl.querySelector('#pdf-flip-leaf');
  const flipLeafCanvas = stageEl.querySelector('#pdf-flip-leaf-canvas');

  const scheduleHudHide = (delayMs = 2800) => {
    if (hudTimer) window.clearTimeout(hudTimer);
    hudTimer = window.setTimeout(() => {
      if (destroyed || pointerInsideToolbar) return;
      if (toolbarEl instanceof HTMLElement && toolbarEl.contains(document.activeElement)) return;
      stageEl.classList.add('is-hud-hidden');
    }, delayMs);
  };

  const revealHud = (autoHide = true) => {
    stageEl.classList.remove('is-hud-hidden');
    if (autoHide) scheduleHudHide();
    else if (hudTimer) { window.clearTimeout(hudTimer); hudTimer = null; }
  };

  const getSpreadPair = () => {
    if (!twoPageMode || totalPages <= 1) return { left: currentPage, right: null };
    const left = currentPage % 2 === 0 ? currentPage - 1 : currentPage;
    const right = left + 1 <= totalPages ? left + 1 : null;
    return { left, right };
  };

  const syncControls = () => {
    const { left, right } = getSpreadPair();
    const atStart = left <= 1;
    const atEnd = (right || left) >= totalPages;
    if (prevBtn instanceof HTMLButtonElement) prevBtn.disabled = atStart;
    if (nextBtn instanceof HTMLButtonElement) nextBtn.disabled = atEnd;
    if (edgePrevBtn instanceof HTMLButtonElement) edgePrevBtn.disabled = atStart;
    if (edgeNextBtn instanceof HTMLButtonElement) edgeNextBtn.disabled = atEnd;
    if (pageInput instanceof HTMLInputElement) pageInput.value = String(left);
    if (totalLabel) totalLabel.textContent = right ? `- ${right} / ${totalPages}` : `/ ${totalPages}`;
    if (peekBtn) peekBtn.textContent = right ? `Hal ${left}-${right} / ${totalPages}` : `Hal ${left} / ${totalPages}`;
    if (layoutBtn) {
      layoutBtn.textContent = twoPageMode ? '2 Hal' : '1 Hal';
      layoutBtn.setAttribute('aria-pressed', twoPageMode ? 'true' : 'false');
    }
    if (zoomLabel) zoomLabel.textContent = `${Math.round(zoomFactor * 100)}%`;
    if (viewportEl) viewportEl.classList.toggle('is-zoomed', zoomFactor > 1.05);
    if (zoomOutBtn instanceof HTMLButtonElement) zoomOutBtn.disabled = zoomFactor <= 0.7;
    if (zoomInBtn instanceof HTMLButtonElement) zoomInBtn.disabled = zoomFactor >= 2.0;
    if (fsBtn) {
      fsBtn.textContent = isExpanded ? 'Keluar Fokus' : 'Fokus Baca';
      fsBtn.setAttribute('aria-pressed', isExpanded ? 'true' : 'false');
    }
    if (spreadEl) spreadEl.classList.toggle('is-two-page', twoPageMode && Boolean(right));
    if (spineEl instanceof HTMLElement) spineEl.hidden = !(twoPageMode && Boolean(right));
    return twoPageMode ? 2 : 1;
  };

  const triggerFlipbookEffect = (dir) => {
    if (!dir || !(flipLeaf instanceof HTMLElement) || !(flipLeafCanvas instanceof HTMLCanvasElement)) return;
    const reduceMotion = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    const source = dir > 0 && twoPageMode && rightCanvas instanceof HTMLCanvasElement && !rightCanvas.hidden ? rightCanvas : leftCanvas;
    if (!(source instanceof HTMLCanvasElement) || source.width < 2 || source.height < 2) return;

    flipLeafCanvas.width = source.width;
    flipLeafCanvas.height = source.height;
    flipLeafCanvas.style.width = source.style.width || `${source.clientWidth}px`;
    flipLeafCanvas.style.height = source.style.height || `${source.clientHeight}px`;
    const fCtx = flipLeafCanvas.getContext('2d');
    if (fCtx) fCtx.drawImage(source, 0, 0);

    if (flipTimer) window.clearTimeout(flipTimer);
    flipLeaf.className = 'pdf-flip-leaf';
    flipLeaf.classList.toggle('is-single-mode', !twoPageMode);
    flipLeaf.classList.add(dir > 0 ? 'is-flip-next' : 'is-flip-prev');
    flipLeaf.hidden = false;
    void flipLeaf.offsetWidth;
    flipLeaf.classList.add('is-animating');

    flipTimer = window.setTimeout(() => {
      if (flipLeaf.isConnected) {
        flipLeaf.hidden = true;
        flipLeaf.className = 'pdf-flip-leaf';
      }
      flipTimer = null;
    }, 480);
  };

  const renderSingleCanvas = async (pageNum, canvasEl, slotW, availH, myGen) => {
    if (destroyed || myGen !== renderGen || !(canvasEl instanceof HTMLCanvasElement)) return;
    const pdfPage = await pdfDoc.getPage(pageNum);
    if (destroyed || myGen !== renderGen) return;

    const baseVp = pdfPage.getViewport({ scale: 1 });
    const fitScale = Math.min(slotW / Math.max(1, baseVp.width), availH / Math.max(1, baseVp.height));
    const cssScale = Math.max(0.2, fitScale * zoomFactor);
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const renderVp = pdfPage.getViewport({ scale: cssScale * dpr });
    canvasEl.width = Math.max(1, Math.floor(renderVp.width));
    canvasEl.height = Math.max(1, Math.floor(renderVp.height));
    canvasEl.style.width = `${Math.floor(baseVp.width * cssScale)}px`;
    canvasEl.style.height = `${Math.floor(baseVp.height * cssScale)}px`;

    const ctx = canvasEl.getContext('2d', { alpha: false });
    if (!ctx) return;

    activeRenderTask = pdfPage.render({ canvasContext: ctx, viewport: renderVp });
    await activeRenderTask.promise;
    activeRenderTask = null;
  };

  const renderSpread = async (dir = 0) => {
    if (destroyed || !(viewportEl instanceof HTMLElement)) return;
    const myGen = ++renderGen;
    const { left, right } = getSpreadPair();
    currentPage = left;
    syncControls();

    if (dir !== 0) triggerFlipbookEffect(dir);

    if (activeRenderTask) {
      try { activeRenderTask.cancel(); } catch { /* Abaikan pembatalan */ }
      activeRenderTask = null;
    }

    const availW = Math.max(220, (viewportEl.clientWidth || 720) - 14);
    const availH = Math.max(200, (viewportEl.clientHeight || 420) - 8);
    const slotW = twoPageMode && right ? Math.floor((availW - 14) / 2) : availW;

    try {
      if (leftCanvas instanceof HTMLCanvasElement) {
        leftCanvas.hidden = false;
        await renderSingleCanvas(left, leftCanvas, slotW, availH, myGen);
      }
      if (rightCanvas instanceof HTMLCanvasElement) {
        if (twoPageMode && right) {
          rightCanvas.hidden = false;
          await renderSingleCanvas(right, rightCanvas, slotW, availH, myGen);
        } else {
          rightCanvas.hidden = true;
        }
      }
      if (!destroyed && myGen === renderGen) {
        viewportEl.scrollTop = 0;
        SafeStorage.setItem(pageStorageKey, left);
      }
    } catch (err) {
      if (err?.name !== 'RenderingCancelledException' && !destroyed) {
        // Biarkan kanvas sebelumnya tetap tampil bila dibatalkan oleh pergantian halaman cepat
      }
    }
  };

  const stepPage = (delta) => {
    const unit = twoPageMode ? 2 : 1;
    const target = Math.min(Math.max(1, currentPage + delta * unit), totalPages);
    const nextLeft = twoPageMode && target % 2 === 0 ? target - 1 : target;
    if (nextLeft === currentPage) return;
    const dir = nextLeft > currentPage ? 1 : -1;
    currentPage = nextLeft;
    playSfx('pop');
    renderSpread(dir);
  };

  const jumpToPage = (rawNum) => {
    const num = Math.min(Math.max(1, Math.round(Number(rawNum) || 1)), totalPages);
    const nextLeft = twoPageMode && num % 2 === 0 ? num - 1 : num;
    if (nextLeft === currentPage) { syncControls(); return; }
    const dir = nextLeft > currentPage ? 1 : -1;
    currentPage = nextLeft;
    playSfx('pop');
    renderSpread(dir);
  };

  const setFullscreenState = (enter) => {
    isExpanded = Boolean(enter);
    stageEl.classList.toggle('is-fullscreen-reader', isExpanded);
    syncControls();
    revealHud(true);
    window.requestAnimationFrame(() => renderSpread(0));
  };

  const onEscapeKey = (event) => {
    if (event.key === 'Escape' && isExpanded) {
      event.preventDefault();
      event.stopImmediatePropagation();
      setFullscreenState(false);
    }
  };

  const onResize = () => {
    if (!destroyed && !stageEl.closest('[hidden]') && viewportEl instanceof HTMLElement && viewportEl.clientWidth > 40) {
      renderSpread(0);
    }
  };

  const onHudClick = (el, fn) => el?.addEventListener('click', () => { fn(); revealHud(true); });
  onHudClick(prevBtn, () => stepPage(-1));
  onHudClick(nextBtn, () => stepPage(1));
  edgePrevBtn?.addEventListener('click', () => stepPage(-1));
  edgeNextBtn?.addEventListener('click', () => stepPage(1));
  pageInput?.addEventListener('change', () => { if (pageInput instanceof HTMLInputElement) jumpToPage(pageInput.value); revealHud(true); });
  onHudClick(layoutBtn, () => { twoPageMode = !twoPageMode; playSfx('click'); renderSpread(0); });
  onHudClick(zoomOutBtn, () => { zoomFactor = Math.max(0.7, Math.round((zoomFactor - 0.2) * 10) / 10); playSfx('click'); renderSpread(0); });
  onHudClick(zoomInBtn, () => { zoomFactor = Math.min(2.0, Math.round((zoomFactor + 0.2) * 10) / 10); playSfx('click'); renderSpread(0); });
  fsBtn?.addEventListener('click', () => { playSfx('click'); setFullscreenState(!isExpanded); });
  peekBtn?.addEventListener('click', () => { playSfx('click'); revealHud(true); });

  toolbarEl?.addEventListener('mouseenter', () => { pointerInsideToolbar = true; revealHud(false); });
  toolbarEl?.addEventListener('mouseleave', () => { pointerInsideToolbar = false; scheduleHudHide(1800); });
  toolbarEl?.addEventListener('focusin', () => revealHud(false));
  toolbarEl?.addEventListener('focusout', () => scheduleHudHide(1800));
  viewportEl?.addEventListener('mousemove', (event) => {
    if (stageEl.classList.contains('is-hud-hidden') && viewportEl.getBoundingClientRect().bottom - event.clientY <= 84) revealHud(true);
  });
  viewportEl?.addEventListener('click', (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (target?.closest('button, input, label')) return;
    if (stageEl.classList.contains('is-hud-hidden')) revealHud(true);
    else stageEl.classList.add('is-hud-hidden');
  });

  bindHorizontalSwipe(viewportEl, {
    dragTarget: spreadEl,
    isEnabled: () => !destroyed && zoomFactor <= 1.05 && !stageEl.closest('[hidden]'),
    onNext: () => stepPage(1),
    onPrev: () => stepPage(-1)
  });

  stageEl.addEventListener('keydown', (event) => {
    if (document.activeElement === pageInput) return;
    if (event.key === 'ArrowRight' || event.key === 'PageDown') { event.preventDefault(); stepPage(1); }
    else if (event.key === 'ArrowLeft' || event.key === 'PageUp') { event.preventDefault(); stepPage(-1); }
  });

  document.addEventListener('keydown', onEscapeKey, true);
  window.addEventListener('resize', onResize);

  await renderSpread(0);
  scheduleHudHide(2800);

  return {
    numPages: totalPages,
    destroy: () => {
      destroyed = true;
      if (flipTimer) window.clearTimeout(flipTimer);
      if (hudTimer) window.clearTimeout(hudTimer);
      if (activeRenderTask) { try { activeRenderTask.cancel(); } catch { /* Abaikan */ } }
      document.removeEventListener('keydown', onEscapeKey, true);
      window.removeEventListener('resize', onResize);
      pdfDoc.destroy().catch(() => {});
    }
  };
}
