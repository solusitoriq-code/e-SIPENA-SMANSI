/**
 * Generator QR Code Client-Side Murni — e-SIPENA SMAN 1 Sidayu
 * Implementasi ISO/IEC 18004 (Byte Mode, Version 1-10, EC Level M/L) tanpa pustaka eksternal.
 */

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) GF_EXP[i] = GF_EXP[i - 255];
})();

// [ecPerBlock, g1Count, g1Data, g2Count, g2Data] untuk Level M (V1..V10) & cadangan L10
const EC_BLOCKS_M = {
  1: [10, 1, 16, 0, 0], 2: [16, 1, 28, 0, 0], 3: [26, 1, 44, 0, 0],
  4: [18, 2, 32, 0, 0], 5: [24, 2, 43, 0, 0], 6: [16, 4, 27, 0, 0],
  7: [18, 4, 31, 0, 0], 8: [22, 2, 38, 2, 39], 9: [22, 3, 36, 2, 37],
  10: [26, 4, 43, 1, 44]
};
const EC_BLOCKS_L10 = [18, 2, 68, 2, 69];

const ALIGN_COORDS = {
  1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
  6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50]
};

const FORMAT_INFO_M = [0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0];
const FORMAT_INFO_L = [0x77c4, 0x72f3, 0x7daa, 0x789d, 0x662f, 0x6318, 0x6c41, 0x6976];
const VERSION_INFO_BITS = { 7: 0x07c94, 8: 0x085bc, 9: 0x09a99, 10: 0x0a4d3 };

const gfMul = (a, b) => (a === 0 || b === 0 ? 0 : GF_EXP[GF_LOG[a] + GF_LOG[b]]);

function rsComputeEc(dataBytes, ecLength) {
  let poly = [1];
  for (let i = 0; i < ecLength; i += 1) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j += 1) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], GF_EXP[i]);
    }
    poly = next;
  }
  const msg = new Uint8Array(dataBytes.length + ecLength);
  msg.set(dataBytes, 0);
  for (let i = 0; i < dataBytes.length; i += 1) {
    const coef = msg[i];
    if (!coef) continue;
    for (let j = 0; j < poly.length; j += 1) msg[i + j] ^= gfMul(poly[j], coef);
  }
  return msg.slice(dataBytes.length);
}

function selectSpec(byteLength) {
  for (let version = 1; version <= 10; version += 1) {
    const [ecPerBlock, g1Count, g1Data, g2Count, g2Data] = EC_BLOCKS_M[version];
    const totalData = g1Count * g1Data + g2Count * g2Data;
    const maxBytes = Math.floor((totalData * 8 - 4 - (version <= 9 ? 8 : 16)) / 8);
    if (byteLength <= maxBytes) {
      return { version, ecLevel: 'M', ecPerBlock, g1Count, g1Data, g2Count, g2Data, totalData };
    }
  }
  const [ecPerBlock, g1Count, g1Data, g2Count, g2Data] = EC_BLOCKS_L10;
  if (byteLength <= 271) {
    return {
      version: 10, ecLevel: 'L', ecPerBlock, g1Count, g1Data, g2Count, g2Data,
      totalData: g1Count * g1Data + g2Count * g2Data
    };
  }
  throw new Error('Teks tautan terlalu panjang untuk QR Code (maks. 271 byte).');
}

function encodeDataCodewords(bytes, spec) {
  const bits = [];
  const pushBits = (val, len) => {
    for (let i = len - 1; i >= 0; i -= 1) bits.push((val >> i) & 1);
  };
  pushBits(0b0100, 4);
  pushBits(bytes.length, spec.version <= 9 ? 8 : 16);
  for (const b of bytes) pushBits(b, 8);

  const totalDataBits = spec.totalData * 8;
  pushBits(0, Math.min(4, totalDataBits - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);

  const out = new Uint8Array(spec.totalData);
  let byteIdx = 0;
  for (let i = 0; i < bits.length; i += 8) {
    let v = 0;
    for (let j = 0; j < 8; j += 1) v = (v << 1) | bits[i + j];
    out[byteIdx++] = v;
  }
  for (let pad = 0; byteIdx < spec.totalData; pad ^= 1) out[byteIdx++] = pad ? 0x11 : 0xec;

  const dataBlocks = [];
  const ecBlocks = [];
  let offset = 0;
  const splitGroup = (count, size) => {
    for (let i = 0; i < count; i += 1) {
      const slice = out.slice(offset, offset + size);
      dataBlocks.push(slice);
      ecBlocks.push(rsComputeEc(slice, spec.ecPerBlock));
      offset += size;
    }
  };
  splitGroup(spec.g1Count, spec.g1Data);
  splitGroup(spec.g2Count, spec.g2Data);

  const interleaved = [];
  const maxDataLen = Math.max(spec.g1Data, spec.g2Data);
  for (let i = 0; i < maxDataLen; i += 1) {
    for (const block of dataBlocks) if (i < block.length) interleaved.push(block[i]);
  }
  for (let i = 0; i < spec.ecPerBlock; i += 1) {
    for (const ec of ecBlocks) interleaved.push(ec[i]);
  }
  return interleaved;
}

function setupBaseMatrix(version) {
  const size = 17 + 4 * version;
  const modules = Array.from({ length: size }, () => new Int8Array(size).fill(-1));
  const isFunc = Array.from({ length: size }, () => new Uint8Array(size));

  const setFunc = (r, c, val) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      modules[r][c] = val ? 1 : 0;
      isFunc[r][c] = 1;
    }
  };

  const drawFinder = (top, left) => {
    for (let dy = -1; dy <= 7; dy += 1) {
      for (let dx = -1; dx <= 7; dx += 1) {
        const inOuter = dy >= 0 && dy <= 6 && dx >= 0 && dx <= 6;
        const onEdge = dy === 0 || dy === 6 || dx === 0 || dx === 6;
        const inCore = dy >= 2 && dy <= 4 && dx >= 2 && dx <= 4;
        setFunc(top + dy, left + dx, inOuter && (onEdge || inCore));
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  for (let i = 8; i < size - 8; i += 1) {
    if (!isFunc[6][i]) setFunc(6, i, i % 2 === 0);
    if (!isFunc[i][6]) setFunc(i, 6, i % 2 === 0);
  }

  for (const rC of ALIGN_COORDS[version] || []) {
    for (const cC of ALIGN_COORDS[version] || []) {
      if (isFunc[rC][cC]) continue;
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          setFunc(rC + dy, cC + dx, Math.abs(dy) === 2 || Math.abs(dx) === 2 || (!dy && !dx));
        }
      }
    }
  }

  setFunc(4 * version + 9, 8, true);
  for (let i = 0; i < 9; i += 1) {
    if (!isFunc[8][i]) setFunc(8, i, false);
    if (!isFunc[i][8]) setFunc(i, 8, false);
  }
  for (let i = 0; i < 8; i += 1) {
    if (!isFunc[8][size - 1 - i]) setFunc(8, size - 1 - i, false);
    if (!isFunc[size - 1 - i][8]) setFunc(size - 1 - i, 8, false);
  }

  if (version >= 7) {
    const vBits = VERSION_INFO_BITS[version];
    for (let i = 0; i < 18; i += 1) {
      const bit = Boolean((vBits >> i) & 1);
      const a = Math.floor(i / 3);
      const b = size - 11 + (i % 3);
      setFunc(a, b, bit);
      setFunc(b, a, bit);
    }
  }
  return { size, modules, isFunc };
}

function placeDataBits({ size, modules, isFunc }, codewords) {
  const totalBits = codewords.length * 8;
  let bitIndex = 0;
  let upward = true;
  for (let rightCol = size - 1; rightCol >= 1; rightCol -= 2) {
    if (rightCol === 6) rightCol -= 1;
    for (let step = 0; step < size; step += 1) {
      const r = upward ? size - 1 - step : step;
      for (let dx = 0; dx < 2; dx += 1) {
        const c = rightCol - dx;
        if (isFunc[r][c]) continue;
        let bit = 0;
        if (bitIndex < totalBits) {
          bit = (codewords[bitIndex >> 3] >> (7 - (bitIndex & 7))) & 1;
          bitIndex += 1;
        }
        modules[r][c] = bit;
      }
    }
    upward = !upward;
  }
}

const MASK_FNS = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0
];

function writeFormatInfo(matrix, size, ecLevel, maskId) {
  const bits = ecLevel === 'L' ? FORMAT_INFO_L[maskId] : FORMAT_INFO_M[maskId];
  for (let i = 0; i < 15; i += 1) {
    const bit = (bits >> i) & 1;
    if (i < 8) matrix[8][size - 1 - i] = bit;
    else if (i === 8) matrix[8][7] = bit;
    else matrix[8][14 - i] = bit;

    if (i < 6) matrix[i][8] = bit;
    else if (i < 8) matrix[i + 1][8] = bit;
    else matrix[size - 15 + i][8] = bit;
  }
}

function computePenalty(matrix, size) {
  let penalty = 0;
  let darkCount = 0;
  for (let r = 0; r < size; r += 1) {
    let rowColor = matrix[r][0], rowLen = 0, colColor = matrix[0][r], colLen = 0;
    for (let c = 0; c < size; c += 1) {
      if (matrix[r][c] === 1) darkCount += 1;
      if (matrix[r][c] === rowColor) rowLen += 1;
      else { if (rowLen >= 5) penalty += 3 + (rowLen - 5); rowColor = matrix[r][c]; rowLen = 1; }
      if (matrix[c][r] === colColor) colLen += 1;
      else { if (colLen >= 5) penalty += 3 + (colLen - 5); colColor = matrix[c][r]; colLen = 1; }
    }
    if (rowLen >= 5) penalty += 3 + (rowLen - 5);
    if (colLen >= 5) penalty += 3 + (colLen - 5);
  }
  for (let r = 0; r < size - 1; r += 1) {
    for (let c = 0; c < size - 1; c += 1) {
      const v = matrix[r][c];
      if (v === matrix[r][c + 1] && v === matrix[r + 1][c] && v === matrix[r + 1][c + 1]) penalty += 3;
    }
  }
  const hasFinderLike = (get, i) =>
    get(i) === 1 && get(i + 1) === 0 && get(i + 2) === 1 && get(i + 3) === 1 &&
    get(i + 4) === 1 && get(i + 5) === 0 && get(i + 6) === 1 &&
    ((i >= 4 && get(i - 1) + get(i - 2) + get(i - 3) + get(i - 4) === 0) ||
      (i + 10 < size && get(i + 7) + get(i + 8) + get(i + 9) + get(i + 10) === 0));
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c <= size - 7; c += 1) {
      if (hasFinderLike((i) => matrix[r][i], c)) penalty += 40;
      if (hasFinderLike((i) => matrix[i][r], c)) penalty += 40;
    }
  }
  return penalty + Math.floor(Math.abs((darkCount * 100) / (size * size) - 50) / 5) * 10;
}

/**
 * Menghasilkan matriks modul biner QR Code dari teks atau URL secara client-side.
 * @param {string} text
 * @returns {{ version: number, size: number, ecLevel: string, maskId: number, modules: boolean[][] }}
 */
export function generateQrMatrix(text) {
  const bytes = new TextEncoder().encode(String(text || 'https://esipena-smansi.pages.dev'));
  const spec = selectSpec(bytes.length);
  const base = setupBaseMatrix(spec.version);
  placeDataBits(base, encodeDataCodewords(bytes, spec));

  let bestMask = 0;
  let bestScore = Infinity;
  let bestMatrix = null;

  for (let maskId = 0; maskId < 8; maskId += 1) {
    const fn = MASK_FNS[maskId];
    const candidate = base.modules.map((row, r) =>
      row.map((val, c) => (base.isFunc[r][c] ? val : val ^ (fn(r, c) ? 1 : 0)))
    );
    writeFormatInfo(candidate, base.size, spec.ecLevel, maskId);
    const score = computePenalty(candidate, base.size);
    if (score < bestScore) {
      bestScore = score;
      bestMask = maskId;
      bestMatrix = candidate;
    }
  }

  return {
    version: spec.version,
    size: base.size,
    ecLevel: spec.ecLevel,
    maskId: bestMask,
    modules: bestMatrix.map((row) => row.map((v) => v === 1))
  };
}

/**
 * Menghasilkan markup SVG tajam untuk QR Code yang siap ditempel ke DOM atau lembar cetak A4.
 * @param {string} text
 * @param {{ size?: number, quietZone?: number, darkColor?: string, lightColor?: string, ariaLabel?: string }} [options]
 * @returns {string}
 */
export function renderQrSvg(text, options = {}) {
  const { size = 180, quietZone = 3, darkColor = '#0f294a', lightColor = '#ffffff', ariaLabel = 'Kode QR' } = options;
  const qr = generateQrMatrix(text);
  const total = qr.size + quietZone * 2;
  const rects = [];
  for (let r = 0; r < qr.size; r += 1) {
    for (let c = 0; c < qr.size; c += 1) {
      if (qr.modules[r][c]) rects.push(`<rect x="${c + quietZone}" y="${r + quietZone}" width="1" height="1"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${size}" height="${size}" role="img" aria-label="${ariaLabel.replace(/"/g, '&quot;')}" shape-rendering="crispEdges"><rect width="${total}" height="${total}" fill="${lightColor}"/><g fill="${darkColor}">${rects.join('')}</g></svg>`;
}

/**
 * Menggambar QR Code resolusi tinggi pada elemen canvas (mendukung label cetak opsional).
 * @param {HTMLCanvasElement} canvas
 * @param {string} text
 * @param {{ pixelSize?: number, quietZone?: number, darkColor?: string, lightColor?: string, title?: string, subtitle?: string }} [options]
 */
export function renderQrToCanvas(canvas, text, options = {}) {
  const { pixelSize = 520, quietZone = 4, darkColor = '#0f294a', lightColor = '#ffffff', title = '', subtitle = '' } = options;
  const qr = generateQrMatrix(text);
  const totalModules = qr.size + quietZone * 2;
  const scale = Math.max(4, Math.floor(pixelSize / totalModules));
  const qrWidth = totalModules * scale;
  canvas.width = qrWidth;
  canvas.height = qrWidth + (title ? 76 : 0);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = lightColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = darkColor;
  for (let r = 0; r < qr.size; r += 1) {
    for (let c = 0; c < qr.size; c += 1) {
      if (qr.modules[r][c]) ctx.fillRect((c + quietZone) * scale, (r + quietZone) * scale, scale, scale);
    }
  }
  if (!title) return;
  ctx.fillStyle = '#0f294a';
  ctx.textAlign = 'center';
  ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(title.slice(0, 42), qrWidth / 2, qrWidth + 24);
  if (subtitle) {
    ctx.fillStyle = '#475569';
    ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(subtitle.slice(0, 54), qrWidth / 2, qrWidth + 48);
  }
}

/**
 * Mengunduh QR Code dalam format PNG langsung dari browser tanpa server.
 * @param {string} text
 * @param {string} [filename]
 * @param {{ title?: string, subtitle?: string, pixelSize?: number }} [options]
 */
export function downloadQrPng(text, filename = 'esipena-qr.png', options = {}) {
  const canvas = document.createElement('canvas');
  renderQrToCanvas(canvas, text, {
    pixelSize: options.pixelSize || 560,
    title: options.title || '',
    subtitle: options.subtitle || 'e-SIPENA SMAN 1 Sidayu'
  });
  const safeName = String(filename || 'esipena-qr.png').replace(/[^a-z0-9._-]/gi, '-');
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = safeName.endsWith('.png') ? safeName : `${safeName}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
