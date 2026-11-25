/**
 * Pembaca PDF Flipbook Mode Slide, 2 Halaman & Layar Penuh (PDF.js) — e-SIPENA SMAN 1 Sidayu
 * Merender Blob PDF cache IndexedDB ke kanvas 1 atau 2 halaman dengan animasi 3D flipbook,
 * toolbar kontrol mengambang dengan animasi auto-hide, popover tampilan mobile, panah tepi, swipe, dan Fokus Baca.
 */

import { playSfx } from './audio.js';
import { SafeStorage } from './data-service.js';
import { bindHorizontalSwipe } from './nav-controls.js';
import { ensurePdfJsLoaded } from './pdf-cache.js';
import { escapeHtml } from './ui-utils.js';

function isWideReaderViewport(viewportEl) {
  const w = viewportEl?.clientWidth || window.innerWidth;
  const h = viewportEl?.clientHeight || window.innerHeight;
  return w >= 780 && h >= 440 && w > h;
}

function setBtnToggle(el, label, pressed) {
  if (!el) return;
  el.textContent = label;
  el.setAttribute('aria-pressed', pressed ? 'true' : 'false');
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
  let twoPageMode = false;
  let userLockedLayout = false;
  let fitWidthMode = false;
  let zoomFactor = 1.0;
  let isExpanded = false;
  let viewMenuOpen = false;
  let renderGen = 0;
  let activeRenderTask = null;
  let flipTimer = null;
  let hudTimer = null;
  let resizeTimer = null;
  let lastVpW = 0;
  let lastVpH = 0;
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
        <button type="button" class="page-btn pdf-compact-nav-btn" id="pdf-btn-prev" aria-label="Halaman PDF sebelumnya">&lsaquo;<span class="pdf-btn-text"> Hal</span></button>
        <label class="pdf-page-jump-label">
          <span class="pdf-btn-text">Hal</span>
          <input type="number" id="pdf-page-input" class="pdf-page-jump-input" min="1" max="${totalPages}" value="${currentPage}" aria-label="Nomor halaman PDF">
          <span id="pdf-page-total-label">/ ${totalPages}</span>
        </label>
        <button type="button" class="page-btn pdf-compact-nav-btn" id="pdf-btn-next" aria-label="Halaman PDF berikutnya"><span class="pdf-btn-text">Hal </span>&rsaquo;</button>
      </div>
      <div class="pdf-slide-zoom-group">
        <button type="button" class="page-btn" id="pdf-btn-layout" aria-pressed="false" ${totalPages <= 1 ? 'disabled' : ''}>1 Hal</button>
        <button type="button" class="page-btn pdf-view-toggle-btn" id="pdf-btn-view-menu" aria-expanded="false" aria-controls="pdf-view-popover" aria-label="Opsi tampilan dan perbesaran">Tampilan</button>
        <div class="pdf-view-popover" id="pdf-view-popover" role="group" aria-label="Opsi tampilan dan perbesaran">
          <button type="button" class="page-btn" id="pdf-btn-fit" aria-pressed="false" aria-label="Beralih mode pas layar atau pas lebar">Pas Lebar</button>
          <button type="button" class="page-btn" id="pdf-zoom-out" aria-label="Perkecil halaman">-</button>
          <span class="page-indicator" id="pdf-zoom-label">100%</span>
          <button type="button" class="page-btn" id="pdf-zoom-in" aria-label="Perbesar halaman">+</button>
        </div>
        <button type="button" class="secondary-btn" id="pdf-btn-fullscreen" aria-pressed="false" aria-label="Mode fokus penuh pembaca PDF">Fokus<span class="pdf-btn-text"> Baca</span></button>
      </div>
    </div>
  `;

  const q = (id) => stageEl.querySelector(`#${id}`);
  const [toolbarEl, peekBtn, edgePrevBtn, edgeNextBtn, prevBtn, nextBtn, pageInput, totalLabel] =
    ['pdf-slide-toolbar', 'pdf-toolbar-peek', 'pdf-edge-prev', 'pdf-edge-next', 'pdf-btn-prev', 'pdf-btn-next', 'pdf-page-input', 'pdf-page-total-label'].map(q);
  const [layoutBtn, viewMenuBtn, fitBtn, zoomOutBtn, zoomInBtn, zoomLabel, fsBtn] =
    ['pdf-btn-layout', 'pdf-btn-view-menu', 'pdf-btn-fit', 'pdf-zoom-out', 'pdf-zoom-in', 'pdf-zoom-label', 'pdf-btn-fullscreen'].map(q);
  const [viewportEl, spreadEl, leftCanvas, rightCanvas, spineEl, flipLeaf, flipLeafCanvas] =
    ['pdf-slide-viewport', 'pdf-flip-spread', 'pdf-canvas-left', 'pdf-canvas-right', 'pdf-spread-spine', 'pdf-flip-leaf', 'pdf-flip-leaf-canvas'].map(q);

  twoPageMode = totalPages > 1 && isWideReaderViewport(viewportEl);

  const setViewMenuOpen = (open) => {
    viewMenuOpen = Boolean(open);
    toolbarEl?.classList.toggle('is-view-open', viewMenuOpen);
    viewMenuBtn?.setAttribute('aria-expanded', viewMenuOpen ? 'true' : 'false');
  };

  const setHudHidden = (hidden) => {
    const isHidden = Boolean(hidden);
    stageEl.classList.toggle('is-hud-hidden', isHidden);
    if (toolbarEl instanceof HTMLElement) toolbarEl.inert = isHidden;
    if (peekBtn instanceof HTMLElement) peekBtn.inert = !isHidden;
    if (isHidden) setViewMenuOpen(false);
  };

  const scheduleHudHide = (delayMs = 2800) => {
    if (hudTimer) window.clearTimeout(hudTimer);
    hudTimer = window.setTimeout(() => {
      if (destroyed || pointerInsideToolbar || viewMenuOpen) return;
      if (toolbarEl instanceof HTMLElement && toolbarEl.contains(document.activeElement)) return;
      setHudHidden(true);
    }, delayMs);
  };

  const revealHud = (autoHide = true) => {
    setHudHidden(false);
    if (autoHide) scheduleHudHide();
    else if (hudTimer) { window.clearTimeout(hudTimer); hudTimer = null; }
  };

  const getSpreadPair = () => {
    if (!twoPageMode || totalPages <= 1) return { left: currentPage, right: null };
    const left = currentPage % 2 === 0 ? currentPage - 1 : currentPage;
    return { left, right: left + 1 <= totalPages ? left + 1 : null };
  };

  const syncControls = () => {
    const { left, right } = getSpreadPair();
    const atStart = left <= 1;
    const atEnd = (right || left) >= totalPages;
    const isZoomed = zoomFactor > 1.05 || fitWidthMode;
    for (const b of [prevBtn, edgePrevBtn]) if (b instanceof HTMLButtonElement) b.disabled = atStart;
    for (const b of [nextBtn, edgeNextBtn]) if (b instanceof HTMLButtonElement) b.disabled = atEnd;
    if (pageInput instanceof HTMLInputElement) pageInput.value = String(left);
    if (totalLabel) totalLabel.textContent = right ? `- ${right} / ${totalPages}` : `/ ${totalPages}`;
    if (peekBtn) peekBtn.textContent = right ? `Hal ${left}-${right} / ${totalPages}` : `Hal ${left} / ${totalPages}`;
    setBtnToggle(layoutBtn, twoPageMode ? '2 Hal' : '1 Hal', twoPageMode);
    setBtnToggle(fitBtn, fitWidthMode ? 'Pas Layar' : 'Pas Lebar', fitWidthMode);
    viewMenuBtn?.classList.toggle('has-view-active', fitWidthMode || Math.abs(zoomFactor - 1) > 0.05);
    if (zoomLabel) zoomLabel.textContent = `${Math.round(zoomFactor * 100)}%`;
    viewportEl?.classList.toggle('is-zoomed', isZoomed);
    stageEl.classList.toggle('is-zoomed-reader', isZoomed);
    if (zoomOutBtn instanceof HTMLButtonElement) zoomOutBtn.disabled = zoomFactor <= 0.7;
    if (zoomInBtn instanceof HTMLButtonElement) zoomInBtn.disabled = zoomFactor >= 2.0;
    if (fsBtn) {
      fsBtn.innerHTML = isExpanded ? 'Keluar<span class="pdf-btn-text"> Fokus</span>' : 'Fokus<span class="pdf-btn-text"> Baca</span>';
      fsBtn.setAttribute('aria-pressed', isExpanded ? 'true' : 'false');
    }
    spreadEl?.classList.toggle('is-two-page', twoPageMode && Boolean(right));
    if (spineEl instanceof HTMLElement) spineEl.hidden = !(twoPageMode && Boolean(right));
  };

  const triggerFlipbookEffect = (dir) => {
    if (!dir || !(flipLeaf instanceof HTMLElement) || !(flipLeafCanvas instanceof HTMLCanvasElement)) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const source = dir > 0 && twoPageMode && rightCanvas instanceof HTMLCanvasElement && !rightCanvas.hidden ? rightCanvas : leftCanvas;
    if (!(source instanceof HTMLCanvasElement) || source.width < 2 || source.height < 2) return;

    flipLeafCanvas.width = source.width;
    flipLeafCanvas.height = source.height;
    flipLeafCanvas.style.width = source.style.width || `${source.clientWidth}px`;
    flipLeafCanvas.style.height = source.style.height || `${source.clientHeight}px`;
    flipLeafCanvas.getContext('2d')?.drawImage(source, 0, 0);

    if (flipTimer) window.clearTimeout(flipTimer);
    flipLeaf.className = `pdf-flip-leaf${twoPageMode ? '' : ' is-single-mode'} ${dir > 0 ? 'is-flip-next' : 'is-flip-prev'}`;
    flipLeaf.hidden = false;
    void flipLeaf.offsetWidth;
    flipLeaf.classList.add('is-animating');
    flipTimer = window.setTimeout(() => {
      if (flipLeaf.isConnected) { flipLeaf.hidden = true; flipLeaf.className = 'pdf-flip-leaf'; }
      flipTimer = null;
    }, 480);
  };

  const renderSingleCanvas = async (pageNum, canvasEl, slotW, availH, myGen) => {
    if (destroyed || myGen !== renderGen) return;
    const pdfPage = await pdfDoc.getPage(pageNum);
    if (destroyed || myGen !== renderGen) return;

    const baseVp = pdfPage.getViewport({ scale: 1 });
    const fitScale = fitWidthMode
      ? slotW / Math.max(1, baseVp.width)
      : Math.min(slotW / Math.max(1, baseVp.width), availH / Math.max(1, baseVp.height));
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
    if (activeRenderTask) { try { activeRenderTask.cancel(); } catch { /* Abaikan */ } activeRenderTask = null; }

    const availW = Math.max(220, (viewportEl.clientWidth || 720) - (fitWidthMode ? 24 : 14));
    const availH = Math.max(200, (viewportEl.clientHeight || 420) - 8);
    lastVpW = viewportEl.clientWidth || 0;
    lastVpH = viewportEl.clientHeight || 0;
    const slotW = twoPageMode && right ? Math.floor((availW - 14) / 2) : availW;

    try {
      for (const [canvas, pageNum, show] of [[leftCanvas, left, true], [rightCanvas, right, twoPageMode && Boolean(right)]]) {
        if (!(canvas instanceof HTMLCanvasElement)) continue;
        canvas.hidden = !show;
        if (show) await renderSingleCanvas(pageNum, canvas, slotW, availH, myGen);
      }
      if (!destroyed && myGen === renderGen) {
        viewportEl.scrollTop = 0;
        SafeStorage.setItem(pageStorageKey, left);
      }
    } catch (err) {
      if (err?.name !== 'RenderingCancelledException' && !destroyed) { /* Pertahankan kanvas terakhir */ }
    }
  };

  const goToPage = (rawTarget) => {
    const clamped = Math.min(Math.max(1, Math.round(Number(rawTarget) || 1)), totalPages);
    const nextLeft = twoPageMode && clamped % 2 === 0 ? clamped - 1 : clamped;
    if (nextLeft === currentPage) { syncControls(); return; }
    const dir = nextLeft > currentPage ? 1 : -1;
    currentPage = nextLeft;
    playSfx('pop');
    renderSpread(dir);
  };

  const stepPage = (delta) => goToPage(currentPage + delta * (twoPageMode ? 2 : 1));

  const setFullscreenState = (enter) => {
    isExpanded = Boolean(enter);
    setViewMenuOpen(false);
    stageEl.classList.toggle('is-fullscreen-reader', isExpanded);
    syncControls();
    revealHud(true);
    window.requestAnimationFrame(() => renderSpread(0));
  };

  const onEscapeKey = (event) => {
    if (event.key !== 'Escape') return;
    if (viewMenuOpen) {
      event.preventDefault();
      event.stopImmediatePropagation();
      setViewMenuOpen(false);
      if (viewMenuBtn instanceof HTMLElement) viewMenuBtn.focus({ preventScroll: true });
    } else if (isExpanded) {
      event.preventDefault();
      event.stopImmediatePropagation();
      setFullscreenState(false);
    }
  };

  const onDocKeyDown = (event) => {
    if (event.defaultPrevented || destroyed || !stageEl.isConnected || stageEl.closest('[hidden]')) return;
    const active = document.activeElement;
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement) return;
    const inOpenToolbar = active instanceof HTMLElement && active.closest('#pdf-slide-toolbar:not([inert])');
    if (event.key === 'PageDown' || (event.key === 'ArrowRight' && !inOpenToolbar)) {
      event.preventDefault();
      stepPage(1);
    } else if (event.key === 'PageUp' || (event.key === 'ArrowLeft' && !inOpenToolbar)) {
      event.preventDefault();
      stepPage(-1);
    }
  };

  const onResize = () => {
    if (resizeTimer) window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (destroyed || stageEl.closest('[hidden]') || !(viewportEl instanceof HTMLElement)) return;
      const curW = viewportEl.clientWidth;
      const curH = viewportEl.clientHeight;
      if (curW <= 40 || (Math.abs(curW - lastVpW) <= 4 && Math.abs(curH - lastVpH) <= 4)) return;
      if (!userLockedLayout && !fitWidthMode) twoPageMode = totalPages > 1 && isWideReaderViewport(viewportEl);
      renderSpread(0);
    }, 90);
  };

  const onHudClick = (el, fn) => el?.addEventListener('click', () => { fn(); revealHud(true); });
  const setZoom = (delta) => {
    zoomFactor = Math.min(2.0, Math.max(0.7, Math.round((zoomFactor + delta) * 10) / 10));
    playSfx('click');
    renderSpread(0);
  };
  const commitPage = () => { if (pageInput instanceof HTMLInputElement) goToPage(pageInput.value); revealHud(true); };

  onHudClick(prevBtn, () => stepPage(-1));
  onHudClick(nextBtn, () => stepPage(1));
  edgePrevBtn?.addEventListener('click', () => stepPage(-1));
  edgeNextBtn?.addEventListener('click', () => stepPage(1));
  pageInput?.addEventListener('change', commitPage);
  pageInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); commitPage(); } });
  onHudClick(layoutBtn, () => {
    userLockedLayout = true;
    twoPageMode = !twoPageMode;
    if (twoPageMode) fitWidthMode = false;
    playSfx('click');
    renderSpread(0);
  });
  onHudClick(viewMenuBtn, () => { playSfx('click'); setViewMenuOpen(!viewMenuOpen); });
  onHudClick(fitBtn, () => {
    fitWidthMode = !fitWidthMode;
    zoomFactor = 1.0;
    if (fitWidthMode) twoPageMode = false;
    else if (!userLockedLayout) twoPageMode = totalPages > 1 && isWideReaderViewport(viewportEl);
    playSfx('click');
    renderSpread(0);
  });
  onHudClick(zoomOutBtn, () => setZoom(-0.2));
  onHudClick(zoomInBtn, () => setZoom(0.2));
  fsBtn?.addEventListener('click', () => { playSfx('click'); setFullscreenState(!isExpanded); });
  peekBtn?.addEventListener('click', () => {
    const wasFocused = document.activeElement === peekBtn;
    playSfx('click');
    revealHud(true);
    if (wasFocused) (nextBtn && !nextBtn.disabled ? nextBtn : prevBtn)?.focus?.({ preventScroll: true });
  });

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
    if (viewMenuOpen) { setViewMenuOpen(false); revealHud(true); return; }
    if (!fitWidthMode && zoomFactor <= 1.05) {
      const rect = viewportEl.getBoundingClientRect();
      const relX = (event.clientX - rect.left) / Math.max(1, rect.width);
      if (relX <= 0.18) { stepPage(-1); return; }
      if (relX >= 0.82) { stepPage(1); return; }
    }
    if (stageEl.classList.contains('is-hud-hidden')) revealHud(true);
    else setHudHidden(true);
  });

  bindHorizontalSwipe(viewportEl, {
    dragTarget: spreadEl,
    isEnabled: () => !destroyed && zoomFactor <= 1.05 && !fitWidthMode && !stageEl.closest('[hidden]'),
    onNext: () => stepPage(1),
    onPrev: () => stepPage(-1)
  });

  document.addEventListener('keydown', onEscapeKey, true);
  document.addEventListener('keydown', onDocKeyDown);
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);

  setHudHidden(false);
  await renderSpread(0);
  scheduleHudHide(2800);

  return {
    numPages: totalPages,
    destroy: () => {
      destroyed = true;
      [flipTimer, hudTimer, resizeTimer].forEach((t) => t && window.clearTimeout(t));
      if (activeRenderTask) { try { activeRenderTask.cancel(); } catch { /* Abaikan */ } }
      document.removeEventListener('keydown', onEscapeKey, true);
      document.removeEventListener('keydown', onDocKeyDown);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      pdfDoc.destroy().catch(() => {});
    }
  };
}
