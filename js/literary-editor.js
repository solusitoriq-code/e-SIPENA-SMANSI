/**
 * Utilitas Editor & Pemformatan Teks Sastra — e-SIPENA SMAN 1 Sidayu
 * Menyatukan sanitasi HTML aman, ekstraksi teks polos untuk TTS/pencarian,
 * serta toolbar format ringan (Tebal, Miring, Kutipan) yang dipakai ulang antar modul.
 */

const LITERARY_HTML_RE = /<(?:p|br|div|strong|b|em|i|u|blockquote|ul|ol|li|h[1-6]|span|font|script|style|iframe|object|embed|svg)\b[^>]*>/i;
const DROP_HTML_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'IFRAME',
  'OBJECT',
  'EMBED',
  'SVG',
  'MATH',
  'TEMPLATE',
  'NOSCRIPT',
  'FORM',
  'INPUT',
  'TEXTAREA',
  'SELECT',
  'BUTTON'
]);
const SAFE_HTML_TAGS = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'BLOCKQUOTE', 'UL', 'OL', 'LI', 'H3', 'H4']);
const BLOCK_HTML_MAP = { DIV: 'P', H1: 'H3', H2: 'H3', H5: 'H4', H6: 'H4' };
const BLOCK_TEXT_TAGS = new Set(['P', 'DIV', 'BR', 'LI', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6']);

/**
 * Melakukan escape karakter HTML agar aman dirender di template string.
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function parseSafeHtmlDom(raw) {
  if (typeof DOMParser !== 'function' || typeof document === 'undefined') return null;
  const doc = new DOMParser().parseFromString(String(raw || ''), 'text/html');
  for (const el of [...doc.body.querySelectorAll([...DROP_HTML_TAGS].join(',').toLowerCase())]) el.remove();
  return doc.body;
}

/**
 * Mengambil teks polos bersih dari teks biasa, markdown ringan, atau HTML.
 * @param {string} raw
 * @returns {string}
 */
export function extractPlainLiteraryText(raw) {
  const input = String(raw || '').trim();
  if (!input) return '';
  let text = input;
  if (LITERARY_HTML_RE.test(input)) {
    const body = parseSafeHtmlDom(input);
    if (body) {
      const parts = [];
      const walk = (n) => {
        if (n.nodeType === 3) parts.push(n.textContent || '');
        else if (n.nodeType === 1) {
          const blk = BLOCK_TEXT_TAGS.has(n.tagName.toUpperCase());
          if (blk) parts.push(' ');
          for (const c of n.childNodes) walk(c);
          if (blk) parts.push(' ');
        }
      };
      walk(body);
      text = parts.join('');
    } else {
      text = input.replace(/<(script|style|iframe|svg)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ');
    }
  }
  return text.replace(/^>\s?/gm, '').replace(/\*\*([^*\n]+)\*\*/g, '$1').replace(/\*([^*\n]+)\*/g, '$1').replace(/\s+/g, ' ').trim();
}

const formatInlineLiterary = (line) =>
  escapeHtml(line).replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*\n]+)\*/g, '<em>$1</em>');

/**
 * Merender teks karya sastra (plain text, markdown ringan, atau HTML aman tersanitasi).
 * @param {string} raw
 * @param {string} [fallbackText]
 * @returns {string}
 */
export function renderFormattedLiteraryHtml(raw, fallbackText = '') {
  const input = String(raw || '').replace(/\r\n?/g, '\n').trim();
  if (!input) return fallbackText ? `<p>${escapeHtml(fallbackText)}</p>` : '';

  if (LITERARY_HTML_RE.test(input)) {
    const body = parseSafeHtmlDom(input);
    if (body) {
      const wrap = document.createElement('div');
      const sanitize = (n) => {
        if (n.nodeType === 3) return document.createTextNode(n.textContent || '');
        if (n.nodeType !== 1) return null;
        const tag = n.tagName.toUpperCase();
        if (DROP_HTML_TAGS.has(tag)) return null;
        const target = BLOCK_HTML_MAP[tag] || (SAFE_HTML_TAGS.has(tag) ? tag : '');
        const out = target ? document.createElement(target.toLowerCase()) : document.createDocumentFragment();
        if (target !== 'BR') {
          for (const c of n.childNodes) {
            const clean = sanitize(c);
            if (clean) out.appendChild(clean);
          }
        }
        return out;
      };
      for (const c of body.childNodes) {
        const clean = sanitize(c);
        if (clean) wrap.appendChild(clean);
      }
      if (wrap.innerHTML.trim() && extractPlainLiteraryText(wrap.innerHTML)) {
        return wrap.innerHTML;
      }
    }
  }

  const plain = LITERARY_HTML_RE.test(input)
    ? input.replace(/<(script|style|iframe|svg)[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, '\n')
    : input;
  const blocks = plain.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  if (!blocks.length) return fallbackText ? `<p>${escapeHtml(fallbackText)}</p>` : '';

  return blocks.map((block) => {
    const lines = block.split('\n').map((l) => l.trimEnd()).filter(Boolean);
    if (lines.length && lines.every((l) => /^\s*>/.test(l))) {
      return `<blockquote>${lines.map((l) => formatInlineLiterary(l.replace(/^\s*>\s?/, ''))).join('<br>')}</blockquote>`;
    }
    return `<p>${lines.map(formatInlineLiterary).join('<br>')}</p>`;
  }).join('');
}

/**
 * Menyisipkan penanda format (Tebal, Miring, Kutipan) pada teks terseleksi di textarea.
 * Otomatis memakai tag HTML aman bila isi textarea sudah berformat HTML.
 * @param {HTMLTextAreaElement | null} textarea
 * @param {'bold' | 'italic' | 'quote' | string} kind
 */
export function applyMarkdownShortcut(textarea, kind) {
  if (!(textarea instanceof HTMLTextAreaElement)) return;
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  const selected = textarea.value.slice(start, end);
  const useHtml = LITERARY_HTML_RE.test(textarea.value);
  let insert = '';
  let selStart = 0;
  let selEnd = 0;

  if (useHtml) {
    if (kind === 'bold' || kind === 'italic') {
      const tag = kind === 'bold' ? 'strong' : 'em';
      const sample = selected || (kind === 'bold' ? 'tebal' : 'miring');
      insert = `<${tag}>${sample}</${tag}>`;
      selStart = tag.length + 2;
      selEnd = selStart + sample.length;
    } else {
      const sample = selected || 'Kutipan karya';
      insert = `<blockquote>${sample}</blockquote>`;
      selStart = 12;
      selEnd = 12 + sample.length;
    }
  } else if (kind === 'bold' || kind === 'italic') {
    const marker = kind === 'bold' ? '**' : '*';
    const sample = selected || (kind === 'bold' ? 'tebal' : 'miring');
    insert = `${marker}${sample}${marker}`;
    selStart = marker.length;
    selEnd = marker.length + sample.length;
  } else {
    const lines = (selected || 'Kutipan karya').split('\n').map((l) => (l.startsWith('> ') ? l : `> ${l}`));
    insert = lines.join('\n');
    selStart = 2;
    selEnd = insert.length;
  }

  textarea.setRangeText(insert, start, end, 'select');
  textarea.focus();
  textarea.setSelectionRange(start + selStart, start + selEnd);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Merender markup panel textarea dengan toolbar pemformatan teks sastra bersama.
 * @param {{
 *   panelId?: string,
 *   textareaId: string,
 *   countId: string,
 *   toolbarLabel?: string,
 *   rows?: number,
 *   placeholder?: string,
 *   value?: string,
 *   maxLength?: number,
 *   required?: boolean,
 *   hidden?: boolean,
 *   hintText?: string
 * }} opts
 * @returns {string}
 */
export function renderLiteraryEditorHtml({
  panelId = '',
  textareaId,
  countId,
  toolbarLabel = 'Pemformatan teks',
  rows = 5,
  placeholder = '',
  value = '',
  maxLength = 0,
  required = false,
  hidden = false,
  hintText = 'Gunakan Enter untuk paragraf baru, **tebal**, *miring*, atau > kutipan.'
}) {
  const rawVal = String(value || '');
  const countText = maxLength > 0 ? `${rawVal.length}/${maxLength}` : `${rawVal.length} karakter`;
  return `
    <div${panelId ? ` id="${escapeHtml(panelId)}"` : ''} class="sub-text-panel"${hidden ? ' hidden' : ''}>
      <div class="editor-format-bar">
        <div class="editor-fmt-buttons" role="group" aria-label="${escapeHtml(toolbarLabel)}">
          <button type="button" class="editor-fmt-btn" data-md-fmt="bold"><strong>Tebal</strong></button>
          <button type="button" class="editor-fmt-btn" data-md-fmt="italic"><em>Miring</em></button>
          <button type="button" class="editor-fmt-btn" data-md-fmt="quote">Kutipan</button>
        </div>
        <span id="${escapeHtml(countId)}" class="char-counter">${countText}</span>
      </div>
      <textarea id="${escapeHtml(textareaId)}" rows="${Number(rows) || 5}" placeholder="${escapeHtml(placeholder)}"${maxLength > 0 ? ` maxlength="${Number(maxLength)}"` : ''}${required ? ' required' : ''}>${escapeHtml(rawVal)}</textarea>
      <p class="file-status-text">${escapeHtml(hintText)}</p>
    </div>
  `;
}

/**
 * Menghubungkan tombol toolbar format dan penghitung karakter pada panel editor sastra.
 * @param {{
 *   panelEl: Element | null,
 *   textareaEl: Element | null,
 *   countEl: Element | null,
 *   maxLength?: number,
 *   onFormatClick?: () => void
 * }} opts
 * @returns {{ syncCount: () => void }}
 */
export function bindLiteraryEditor({ panelEl, textareaEl, countEl, maxLength = 0, onFormatClick } = {}) {
  const syncCount = () => {
    if (!(countEl instanceof HTMLElement)) return;
    const len = textareaEl instanceof HTMLTextAreaElement ? textareaEl.value.length : 0;
    countEl.textContent = maxLength > 0 ? `${len}/${maxLength}` : `${len} karakter`;
  };

  textareaEl?.addEventListener('input', syncCount);
  panelEl?.addEventListener('click', (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    const fmtBtn = target?.closest('[data-md-fmt]');
    if (!(fmtBtn instanceof HTMLElement)) return;
    onFormatClick?.();
    applyMarkdownShortcut(textareaEl, fmtBtn.dataset.mdFmt || 'bold');
  });

  syncCount();
  return { syncCount };
}
