import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname);
const PORT = Number(process.env.PORT || 3000);
const DRIVE_ID_RE = /^[a-zA-Z0-9_-]{10,120}$/;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8'
};

const SPA_ROUTES = new Set([
  '/', '/rak', '/budaya', '/mading', '/pustakawan', '/kirim', '/lacak', '/kelola', '/cetak-qr'
]);

function getContentType(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

async function sendFile(res, filePath, statusCode = 200) {
  const data = await fs.readFile(filePath);
  const headers = {
    'Content-Type': getContentType(filePath),
    'X-Content-Type-Options': 'nosniff'
  };
  if (path.basename(filePath) === 'sw.js') {
    headers['Cache-Control'] = 'no-cache, must-revalidate';
  }
  res.writeHead(statusCode, headers);
  res.end(data);
}

async function handleDrivePdfProxy(reqUrl, res) {
  const fileId = String(reqUrl.searchParams.get('id') || '').trim();
  if (!DRIVE_ID_RE.test(fileId)) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'ID file Google Drive tidak valid.' }));
    return;
  }

  try {
    const headers = { 'User-Agent': 'Mozilla/5.0 (compatible; e-SIPENA-SMANSI/1.0)' };
    let driveRes = await fetch(
      `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`,
      { headers, redirect: 'follow' }
    );
    let ct = String(driveRes.headers.get('content-type') || '').toLowerCase();

    if (driveRes.ok && ct.includes('text/html')) {
      const html = await driveRes.text();
      const uuidMatch = html.match(/name=["']uuid["']\s+value=["']([^"']+)["']/i);
      const confirmMatch = html.match(/name=["']confirm["']\s+value=["']([^"']+)["']/i);
      const params = new URLSearchParams({
        id: fileId,
        export: 'download',
        confirm: confirmMatch ? confirmMatch[1] : 't'
      });
      if (uuidMatch?.[1]) params.set('uuid', uuidMatch[1]);
      driveRes = await fetch(`https://drive.usercontent.google.com/download?${params.toString()}`, {
        headers,
        redirect: 'follow'
      });
      ct = String(driveRes.headers.get('content-type') || '').toLowerCase();
    }

    if (!driveRes.ok || ct.includes('text/html') || !driveRes.body) {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'PDF Google Drive tidak dapat diunduh.' }));
      return;
    }

    const outHeaders = {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="esipena-${fileId}.pdf"`,
      'Cache-Control': 'public, max-age=86400',
      'X-Content-Type-Options': 'nosniff'
    };
    const len = driveRes.headers.get('content-length');
    if (len) outHeaders['Content-Length'] = len;
    res.writeHead(200, outHeaders);
    Readable.fromWeb(driveRes.body).pipe(res);
  } catch {
    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Gagal menghubungi Google Drive.' }));
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const reqUrl = new URL(req.url || '/', `http://localhost:${PORT}`);
    let pathname = decodeURIComponent(reqUrl.pathname);

    if (pathname === '/api/pdf') {
      await handleDrivePdfProxy(reqUrl, res);
      return;
    }
    if (SPA_ROUTES.has(pathname)) {
      pathname = '/index.html';
    }

    const normalized = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
    const targetPath = path.resolve(ROOT_DIR, `.${normalized.startsWith(path.sep) ? normalized : path.sep + normalized}`);

    if (!targetPath.startsWith(ROOT_DIR)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Akses ditolak');
      return;
    }

    try {
      const stat = await fs.stat(targetPath);
      if (stat.isDirectory()) {
        await sendFile(res, path.join(targetPath, 'index.html'));
        return;
      }
      await sendFile(res, targetPath);
    } catch {
      if (!path.extname(pathname)) {
        await sendFile(res, path.join(ROOT_DIR, 'index.html'));
        return;
      }
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Berkas tidak ditemukan');
    }
  } catch {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Kesalahan server internal');
  }
});

server.listen(PORT, () => {
  console.log(`Server e-SIPENA SMAN 1 Sidayu berjalan di http://localhost:${PORT}`);
});
