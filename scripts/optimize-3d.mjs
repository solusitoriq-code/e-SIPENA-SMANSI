import fs from 'node:fs/promises';
import path from 'node:path';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { NodeIO } from '@gltf-transform/core';
import { KHRDracoMeshCompression, KHRMeshQuantization, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import draco3d from 'draco3dgltf';

const browserPixelsUrl = pathToFileURL(path.resolve('node_modules/ndarray-pixels/dist/ndarray-pixels-browser.js')).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'ndarray-pixels') {
      return { shortCircuit: true, url: browserPixelsUrl };
    }
    return nextResolve(specifier, context);
  }
});

const { dedup, draco, prune, simplify, weld } = await import('@gltf-transform/functions');

const SRC_DIR = path.resolve('assets/3d_models');
const OUT_DIR = process.argv[2] ? path.resolve(process.argv[2]) : SRC_DIR;
const TARGET_TRIS = 110000;

async function optimizeTextureBuffer(rawBytes, mimeType, name = '') {
  const lowerName = String(name || '').toLowerCase();
  const isNormal = lowerName.includes('normal');
  const isOrm = lowerName.includes('orm') || lowerName.includes('rough') || lowerName.includes('metal');
  const maxDim = isOrm ? 1024 : isNormal ? 1536 : 2048;

  const img = sharp(rawBytes);
  const meta = await img.metadata();
  const width = meta.width || maxDim;
  const height = meta.height || maxDim;
  const resized = width > maxDim || height > maxDim
    ? img.resize({ width: maxDim, height: maxDim, fit: 'inside', withoutEnlargement: true })
    : img;

  if (isNormal) {
    const out = await resized.png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
    return { buffer: new Uint8Array(out), mimeType: 'image/png', maxDim };
  }

  const out = await resized.jpeg({ quality: isOrm ? 82 : 86, mozjpeg: true }).toBuffer();
  return { buffer: new Uint8Array(out), mimeType: 'image/jpeg', maxDim };
}

async function main() {
  await MeshoptDecoder.ready;
  await MeshoptEncoder.ready;
  await MeshoptSimplifier.ready;
  await fs.mkdir(OUT_DIR, { recursive: true });

  const io = new NodeIO()
    .registerExtensions([KHRDracoMeshCompression, KHRMeshQuantization, EXTMeshoptCompression])
    .registerDependencies({
      'meshopt.decoder': MeshoptDecoder,
      'meshopt.encoder': MeshoptEncoder,
      'draco3d.decoder': await draco3d.createDecoderModule(),
      'draco3d.encoder': await draco3d.createEncoderModule()
    });

  const entries = (await fs.readdir(SRC_DIR)).filter((f) => f.toLowerCase().endsWith('.glb'));
  for (const file of entries) {
    const srcPath = path.join(SRC_DIR, file);
    const outPath = path.join(OUT_DIR, file);
    const beforeStat = await fs.stat(srcPath);
    const doc = await io.read(srcPath);

    let totalTris = 0;
    for (const mesh of doc.getRoot().listMeshes()) {
      for (const prim of mesh.listPrimitives()) {
        const idx = prim.getIndices();
        totalTris += idx ? idx.getCount() / 3 : 0;
      }
    }

    const ratio = totalTris > TARGET_TRIS ? Math.max(0.03, TARGET_TRIS / totalTris) : 1;

    await doc.transform(
      dedup(),
      weld({ tolerance: 0.0001 }),
      simplify({
        simplifier: MeshoptSimplifier,
        ratio,
        error: 0.002,
        lockBorder: false
      }),
      prune()
    );

    for (const tex of doc.getRoot().listTextures()) {
      const imgData = tex.getImage();
      if (!imgData) continue;
      const opt = await optimizeTextureBuffer(imgData, tex.getMimeType(), tex.getName());
      tex.setImage(opt.buffer);
      tex.setMimeType(opt.mimeType);
    }

    // Remove legacy meshopt/quantization extensions when writing Draco GLB
    for (const ext of doc.getRoot().listExtensionsUsed()) {
      if (ext.extensionName === 'EXT_meshopt_compression' || ext.extensionName === 'KHR_mesh_quantization') {
        ext.dispose();
      }
    }

    await doc.transform(
      draco({
        method: 'edgebreaker',
        encodeSpeed: 4,
        decodeSpeed: 6,
        quantizePosition: 14,
        quantizeNormal: 10,
        quantizeTexcoord: 12
      })
    );

    await io.write(outPath, doc);
    const afterStat = await fs.stat(outPath);

    let afterTris = 0;
    for (const mesh of doc.getRoot().listMeshes()) {
      for (const prim of mesh.listPrimitives()) {
        const idx = prim.getIndices();
        afterTris += idx ? idx.getCount() / 3 : 0;
      }
    }

    const pct = ((1 - afterStat.size / beforeStat.size) * 100).toFixed(1);
    console.log(
      `${file}: ${(beforeStat.size / 1048576).toFixed(2)} MB (${Math.round(totalTris)} tris) -> ${(afterStat.size / 1048576).toFixed(2)} MB (${Math.round(afterTris)} tris) [-${pct}%]`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
