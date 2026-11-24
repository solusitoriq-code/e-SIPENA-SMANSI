/**
 * Cloudflare Pages Function — Proxy Stream PDF Google Drive (Same-Origin)
 * Rute: GET /api/pdf?id=<GDRIVE_FILE_ID>
 * Memungkinkan browser menyimpan cache PDF ke IndexedDB untuk dibaca offline.
 */

const FILE_ID_PATTERN = /^[a-zA-Z0-9_-]{10,120}$/;

async function fetchDrivePdfResponse(fileId) {
  const encodedId = encodeURIComponent(fileId);
  const headers = {
    'User-Agent': 'Mozilla/5.0 (compatible; e-SIPENA-SMANSI/1.0)'
  };

  let res = await fetch(
    `https://drive.usercontent.google.com/download?id=${encodedId}&export=download&confirm=t`,
    { headers, redirect: 'follow' }
  );

  let ct = String(res.headers.get('content-type') || '').toLowerCase();
  if (res.ok && !ct.includes('text/html')) {
    return res;
  }

  if (ct.includes('text/html')) {
    const html = await res.text();
    const uuidMatch = html.match(/name=["']uuid["']\s+value=["']([^"']+)["']/i);
    const confirmMatch = html.match(/name=["']confirm["']\s+value=["']([^"']+)["']/i);
    const params = new URLSearchParams({
      id: fileId,
      export: 'download',
      confirm: confirmMatch ? confirmMatch[1] : 't'
    });
    if (uuidMatch?.[1]) params.set('uuid', uuidMatch[1]);

    res = await fetch(`https://drive.usercontent.google.com/download?${params.toString()}`, {
      headers,
      redirect: 'follow'
    });
    ct = String(res.headers.get('content-type') || '').toLowerCase();
    if (res.ok && !ct.includes('text/html')) {
      return res;
    }
  }

  return null;
}

export async function onRequestGet({ request }) {
  try {
    const url = new URL(request.url);
    const fileId = String(url.searchParams.get('id') || '').trim();
    if (!FILE_ID_PATTERN.test(fileId)) {
      return new Response(JSON.stringify({ error: 'ID file Google Drive tidak valid.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    const driveRes = await fetchDrivePdfResponse(fileId);
    if (!driveRes) {
      return new Response(
        JSON.stringify({ error: 'PDF tidak dapat diakses. Pastikan izin file Drive diatur Anyone with the link.' }),
        { status: 502, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    const outHeaders = new Headers({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="esipena-${fileId}.pdf"`,
      'Cache-Control': 'public, max-age=86400',
      'X-Content-Type-Options': 'nosniff'
    });
    const len = driveRes.headers.get('content-length');
    if (len) outHeaders.set('Content-Length', len);

    return new Response(driveRes.body, { status: 200, headers: outHeaders });
  } catch {
    return new Response(JSON.stringify({ error: 'Gagal meneruskan PDF dari Google Drive.' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}
