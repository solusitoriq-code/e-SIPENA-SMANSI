import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import * as mupdf from 'mupdf';

const COVERS_DIR = path.resolve('assets/covers');
const IMAGES_DIR = path.resolve('assets/images');
const ICONS_DIR = path.resolve('assets/icons');

await fs.mkdir(COVERS_DIR, { recursive: true });
await fs.mkdir(IMAGES_DIR, { recursive: true });
await fs.mkdir(ICONS_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// 1. Bangun Logo SMAN 1 Sidayu (.webp) & Ikon PWA (.png) dari image1.png
// ---------------------------------------------------------------------------
async function buildLogoAndIcons() {
  const srcLogo = path.resolve('scripts/_tmp/docx_media/image1.png');
  const crestBuf = await sharp(srcLogo)
    .extract({ left: 0, top: 0, width: 322, height: 399 })
    .trim()
    .png()
    .toBuffer();

  // Logo HUD WebP (persegi 256x256 latar transparan rapi)
  await sharp(crestBuf)
    .resize(236, 236, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: 10, bottom: 10, left: 10, right: 10,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .webp({ quality: 90 })
    .toFile(path.join(IMAGES_DIR, 'logo-smansi.webp'));

  // Logo banner penuh WebP (untuk header cetak A4 / halaman info)
  await sharp(srcLogo)
    .resize({ width: 640, withoutEnlargement: true })
    .webp({ quality: 88 })
    .toFile(path.join(IMAGES_DIR, 'logo-smansi-banner.webp'));

  // Ikon PWA 192x192 & 512x512 (latar putih bersih berbingkai rapi)
  for (const size of [192, 512]) {
    const pad = Math.round(size * 0.1);
    const inner = size - pad * 2;
    const resized = await sharp(crestBuf)
      .resize(inner, inner, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .toBuffer();
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
      .composite([{ input: resized, gravity: 'center' }])
      .png({ compressionLevel: 9 })
      .toFile(path.join(ICONS_DIR, `icon-${size}.png`));
  }

  // Ikon PWA Maskable 512x512 (safe zone 20% dengan latar navy sekolah #0f294a)
  const maskInner = Math.round(512 * 0.64);
  const badgeSize = Math.round(512 * 0.72);
  const maskCrest = await sharp(crestBuf)
    .resize(maskInner, maskInner, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .toBuffer();

  const whiteCircleSvg = Buffer.from(
    `<svg width="${badgeSize}" height="${badgeSize}" viewBox="0 0 ${badgeSize} ${badgeSize}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${badgeSize / 2}" cy="${badgeSize / 2}" r="${badgeSize / 2}" fill="#ffffff"/>
    </svg>`
  );

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 15, g: 41, b: 74, alpha: 1 }
    }
  })
    .composite([
      { input: whiteCircleSvg, gravity: 'center' },
      { input: maskCrest, gravity: 'center' }
    ])
    .png({ compressionLevel: 9 })
    .toFile(path.join(ICONS_DIR, 'icon-maskable-512.png'));

  // Apple Touch Icon 180x180 (solid white)
  const appleInner = 148;
  const appleCrest = await sharp(crestBuf)
    .resize(appleInner, appleInner, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .toBuffer();
  await sharp({
    create: {
      width: 180,
      height: 180,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
    .composite([{ input: appleCrest, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(ICONS_DIR, 'apple-touch-icon.png'));

  console.log('Logo & ikon PWA berhasil dibuat.');
}

// ---------------------------------------------------------------------------
// 2. Deteksi Garis Crop Mark & Ekstrak 12 Sampul Novel 2026 ke WebP
// ---------------------------------------------------------------------------
function findDarkMarksInColumnStrip(data, width, height, xStart, xEnd, yStart, yEnd) {
  const ys = [];
  let inMark = false;
  let runStart = 0;
  for (let y = yStart; y < yEnd; y++) {
    let darkCount = 0;
    for (let x = xStart; x <= xEnd; x++) {
      const idx = (y * width + x) * 3;
      if (data[idx] < 130 && data[idx + 1] < 130 && data[idx + 2] < 130) {
        darkCount++;
      }
    }
    const isLine = darkCount >= Math.max(3, Math.floor((xEnd - xStart) * 0.25));
    if (isLine && !inMark) {
      inMark = true;
      runStart = y;
    } else if (!isLine && inMark) {
      inMark = false;
      ys.push(Math.round((runStart + y - 1) / 2));
    }
  }
  return ys;
}

function findDarkMarksInRowStrip(data, width, yStart, yEnd, xStart, xEnd) {
  const xs = [];
  let inMark = false;
  let runStart = 0;
  for (let x = xStart; x < xEnd; x++) {
    let darkCount = 0;
    for (let y = yStart; y <= yEnd; y++) {
      const idx = (y * width + x) * 3;
      if (data[idx] < 130 && data[idx + 1] < 130 && data[idx + 2] < 130) {
        darkCount++;
      }
    }
    const isLine = darkCount >= Math.max(3, Math.floor((yEnd - yStart) * 0.25));
    if (isLine && !inMark) {
      inMark = true;
      runStart = x;
    } else if (!isLine && inMark) {
      inMark = false;
      xs.push(Math.round((runStart + x - 1) / 2));
    }
  }
  return xs;
}

const COVER_JOBS = [
  { pdf: "00. NASKAH FIX CETAK/Cetak cover/Fix_SMAN1Sidayu_AP230_ 10 lembar.pdf", page: 0, side: 'left-bottom', rotate: 270, out: '07-esok-cerita-lagi.webp' },
  { pdf: "00. NASKAH FIX CETAK/Cetak cover/Fix_SMAN1Sidayu_AP230_ 10 lembar.pdf", page: 0, side: 'right-top', rotate: 90, out: '10-etherea.webp' },
  { pdf: "00. NASKAH FIX CETAK/Cetak cover/Fix_SMAN1Sidayu_AP230_ 10 lembar.pdf", page: 1, side: 'left-bottom', rotate: 270, out: '11-perjalanan-angga-menuju-cahaya.webp' },
  { pdf: "00. NASKAH FIX CETAK/Cetak cover/Fix_SMAN1Sidayu_AP230_ 10 lembar.pdf", page: 1, side: 'right-top', rotate: 90, out: '03-fate-and-the-divine.webp' },
  { pdf: "00. NASKAH FIX CETAK/Cetak cover/Fix_SMAN1Sidayu_AP230_ 10 lembar.pdf", page: 2, side: 'left-bottom', rotate: 270, topOverride: 966, heightOverride: 795, out: '08-bukan-lingkaran-dosa.webp' },
  { pdf: "00. NASKAH FIX CETAK/Cetak cover/Fix_SMAN1Sidayu_AP230_ 10 lembar.pdf", page: 2, side: 'right-top', rotate: 90, out: '05-secangkir-matcha.webp' },
  { pdf: "00. NASKAH FIX CETAK/Cetak cover/Fix_SMAN1Sidayu_AP230_ 10 lembar.pdf", page: 3, side: 'left-bottom', rotate: 270, out: '02-angin-mendung-untukmu.webp' },
  { pdf: "00. NASKAH FIX CETAK/Cetak cover/Fix_SMAN1Sidayu_AP230_ 10 lembar.pdf", page: 3, side: 'right-top', rotate: 90, out: '01-dibalik-pantulan-cermin.webp' },
  { pdf: "00. NASKAH FIX CETAK/Cetak cover/QRCBN_SMAN1Sidayu_AP230_ 4 lembar.pdf", page: 0, side: 'right-top', rotate: 90, out: '09-sela-waktu.webp' },
  { pdf: "00. NASKAH FIX CETAK/Cetak cover/QRCBN_SMAN1Sidayu_AP230_ 4 lembar.pdf", page: 1, side: 'right-top', rotate: 90, out: '04-singgah.webp' },
  { pdf: "00. NASKAH FIX CETAK/Cetak cover/QRCBN_SMAN1Sidayu_AP230_ 4 lembar.pdf", page: 2, side: 'right-top', rotate: 90, out: '06-keluarga-yang-sesungguhnya.webp' },
  { pdf: "00. NASKAH FIX CETAK/Cetak cover/Mas'idah_AP230_ 5 lembar.pdf", page: 0, side: 'right-top', rotate: 90, out: '12-diantara-luka-dan-sajadah.webp' }
];

async function buildCovers() {
  const docCache = new Map();
  const pageCache = new Map();

  for (const job of COVER_JOBS) {
    if (!docCache.has(job.pdf)) {
      const buf = await fs.readFile(path.resolve(job.pdf));
      docCache.set(job.pdf, mupdf.Document.openDocument(buf, 'application/pdf'));
    }
    const cacheKey = `${job.pdf}::${job.page}`;
    if (!pageCache.has(cacheKey)) {
      const doc = docCache.get(job.pdf);
      const page = doc.loadPage(job.page);
      const scale = 2.0; // ~2739 x 1871 px crisp render
      const pixmap = page.toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB, false, true);
      const pngBuf = Buffer.from(pixmap.asPNG());
      const meta = await sharp(pngBuf).metadata();
      pageCache.set(cacheKey, { pngBuf, width: meta.width, height: meta.height });
    }

    const { pngBuf, width: W, height: H } = pageCache.get(cacheKey);
    const extractRect = job.side === 'left-bottom'
      ? {
          left: Math.min(W - 100, 138),
          top: Math.min(H - 100, job.topOverride ?? 984),
          width: Math.min(W - 138, 1178),
          height: Math.min(H - (job.topOverride ?? 984), job.heightOverride ?? 777)
        }
      : {
          left: Math.min(W - 100, 1423),
          top: Math.min(H - 100, job.topOverride ?? 110),
          width: Math.min(W - 1423, 1178),
          height: Math.min(H - (job.topOverride ?? 110), job.heightOverride ?? 777)
        };

    const outPath = path.join(COVERS_DIR, job.out);
    const croppedBuf = await sharp(pngBuf).extract(extractRect).png().toBuffer();
    await sharp(croppedBuf)
      .rotate(job.rotate)
      .resize(560, 794, { fit: 'cover', position: 'center' })
      .webp({ quality: 84 })
      .toFile(outPath);

    const stat = await fs.stat(outPath);
    console.log(`Cover ${job.out}: ${(stat.size / 1024).toFixed(1)} KB`);
  }
}

await buildLogoAndIcons();
await buildCovers();
