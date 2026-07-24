/**
 * CutoutAlphaCache — disk + memory cache for baked segmentation masks.
 *
 * Storage layout (in project folder):
 *   Media/cutout/<layerId>/manifest.json    → { model, frameCount, size }
 *   Media/cutout/<layerId>/alpha.png        → stacked mask sheet (H = frames*sourceH)
 *
 * A single vertically-stacked PNG holds every baked frame's mask. This is
 * a huge simplification vs per-frame files — one fetch, one decode, one
 * GPU upload. Compression is fine for grayscale.
 */
import { StorageManager } from '../../storage/StorageManager';

const CUTOUT_DIR = 'Media/cutout';

export interface AlphaManifest {
  model: string;
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
  bakedAt: number;
}

interface LoadedBundle {
  manifest: AlphaManifest;
  /** Loaded PNG as an ImageBitmap for GPU upload */
  bitmap: ImageBitmap;
}

const _memoryCache = new Map<string, LoadedBundle>();

function layerDir(layerId: string): string {
  return `${CUTOUT_DIR}/${layerId}`;
}

/** Serialize a stack of Uint8Array masks to a single PNG blob */
export async function encodeAlphaSheet(
  masks: Uint8Array[],
  width: number,
  height: number,
): Promise<Blob> {
  const totalHeight = height * masks.length;
  const canvas = new OffscreenCanvas(width, totalHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('OffscreenCanvas 2D unavailable');

  const imgData = ctx.createImageData(width, totalHeight);
  for (let i = 0; i < masks.length; i++) {
    const mask = masks[i];
    const yOffset = i * height * width;
    const rgbaOffset = i * height * width * 4;
    for (let p = 0; p < mask.length; p++) {
      const v = mask[p];
      imgData.data[rgbaOffset + p * 4]     = v;
      imgData.data[rgbaOffset + p * 4 + 1] = v;
      imgData.data[rgbaOffset + p * 4 + 2] = v;
      imgData.data[rgbaOffset + p * 4 + 3] = 255;
    }
    void yOffset;
  }
  ctx.putImageData(imgData, 0, 0);
  return await canvas.convertToBlob({ type: 'image/png' });
}

/** Save the baked bundle for a layer to disk */
export async function saveBakedAlpha(
  layerId: string,
  masks: Uint8Array[],
  width: number,
  height: number,
  manifest: AlphaManifest,
): Promise<void> {
  const adapter: any = StorageManager.getInstance().getAdapter();
  if (!adapter?.saveInternalFile) {
    console.warn('[CutoutAlphaCache] Adapter lacks saveInternalFile — cannot persist bake');
    return;
  }
  const dir = layerDir(layerId);

  // Encode + write PNG
  const blob = await encodeAlphaSheet(masks, width, height);
  await adapter.saveInternalFile(`${dir}/alpha.png`, blob);

  // Write manifest
  const manifestBlob = new Blob(
    [JSON.stringify(manifest, null, 2)],
    { type: 'application/json' },
  );
  await adapter.saveInternalFile(`${dir}/manifest.json`, manifestBlob);

  // Invalidate any in-memory bundle
  const existing = _memoryCache.get(layerId);
  if (existing) {
    try { existing.bitmap.close(); } catch {}
    _memoryCache.delete(layerId);
  }
}

/** Load the baked bundle for a layer (cached in memory across calls) */
export async function loadBakedAlpha(layerId: string): Promise<LoadedBundle | null> {
  const existing = _memoryCache.get(layerId);
  if (existing) return existing;

  const adapter: any = StorageManager.getInstance().getAdapter();
  if (!adapter?.loadInternalFile) return null;

  const dir = layerDir(layerId);
  try {
    const manifestBlob: Blob | null = await adapter.loadInternalFile(`${dir}/manifest.json`);
    if (!manifestBlob) return null;
    const manifest = JSON.parse(await manifestBlob.text()) as AlphaManifest;

    const alphaBlob: Blob | null = await adapter.loadInternalFile(`${dir}/alpha.png`);
    if (!alphaBlob) return null;

    const bitmap = await createImageBitmap(alphaBlob);
    const bundle: LoadedBundle = { manifest, bitmap };
    _memoryCache.set(layerId, bundle);
    return bundle;
  } catch (err) {
    console.warn(`[CutoutAlphaCache] Failed to load bake for ${layerId}:`, err);
    return null;
  }
}

/** Delete baked alpha for a layer */
export async function deleteBakedAlpha(layerId: string): Promise<void> {
  const adapter: any = StorageManager.getInstance().getAdapter();
  if (!adapter?.deleteInternalDirectory) return;
  try {
    await adapter.deleteInternalDirectory(layerDir(layerId));
  } catch {}
  const existing = _memoryCache.get(layerId);
  if (existing) {
    try { existing.bitmap.close(); } catch {}
    _memoryCache.delete(layerId);
  }
}

/** Free memory bitmap without deleting disk file */
export function releaseBakedAlphaFromMemory(layerId: string): void {
  const existing = _memoryCache.get(layerId);
  if (existing) {
    try { existing.bitmap.close(); } catch {}
    _memoryCache.delete(layerId);
  }
}

/** Get one frame's slice of the baked bundle (for GPU sub-rect upload) */
export function getBakedFrameRect(
  bundle: LoadedBundle,
  frame: number,
): { x: number; y: number; w: number; h: number } | null {
  if (frame < 0 || frame >= bundle.manifest.frameCount) return null;
  return {
    x: 0,
    y: frame * bundle.manifest.frameHeight,
    w: bundle.manifest.frameWidth,
    h: bundle.manifest.frameHeight,
  };
}