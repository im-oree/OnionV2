/**
 * ManualMaskCache — rasterizes user brush strokes into per-frame mask textures.
 *
 * Strokes live in CutoutData.manualStrokes (persisted with the project).
 * This cache converts them into GPU-ready DataTextures on demand and
 * caches by (layerId, strokes hash) so we only re-rasterize when strokes
 * actually change.
 *
 * Encoding:
 *   R channel: keep-brush accumulation (adds to mask)
 *   G channel: erase-brush accumulation (subtracts from mask)
 *   B channel: unused
 *   A channel: 255 wherever any stroke has been painted
 */
import * as THREE from 'three';
import type { CutoutManualStroke } from '../../types/layer';

interface CachedManualMask {
  hash: string;
  texture: THREE.DataTexture;
  width: number;
  height: number;
}

const _cache = new Map<string, CachedManualMask>();

/** Cheap fingerprint of the strokes array so we can detect changes */
function hashStrokes(strokes: CutoutManualStroke[], w: number, h: number): string {
  const parts: string[] = [String(w), String(h), String(strokes.length)];
  for (const s of strokes) {
    parts.push(s.id, s.keep ? '1' : '0', String(s.size), String(s.points.length));
  }
  return parts.join('|');
}

/** Rasterize strokes to an RGBA Uint8Array */
function rasterizeStrokes(
  strokes: CutoutManualStroke[],
  width: number,
  height: number,
): Uint8Array {
  const size = width * height * 4;
  const data = new Uint8Array(size);
  if (strokes.length === 0) return data;

  // Use a canvas for the actual painting — much faster than manual bresenham
  const canvasKeep = new OffscreenCanvas(width, height);
  const canvasErase = new OffscreenCanvas(width, height);
  const kctx = canvasKeep.getContext('2d');
  const ectx = canvasErase.getContext('2d');
  if (!kctx || !ectx) return data;

  kctx.fillStyle = '#000000';
  kctx.fillRect(0, 0, width, height);
  ectx.fillStyle = '#000000';
  ectx.fillRect(0, 0, width, height);

  const paint = (
    ctx: OffscreenCanvasRenderingContext2D,
    stroke: CutoutManualStroke,
  ) => {
    if (stroke.points.length === 0) return;
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = stroke.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Points are in normalized 0..1 layer coords — scale to pixel space
    if (stroke.points.length === 1) {
      const p = stroke.points[0];
      ctx.beginPath();
      ctx.arc(p.x * width, p.y * height, stroke.size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      const p0 = stroke.points[0];
      ctx.moveTo(p0.x * width, p0.y * height);
      for (let i = 1; i < stroke.points.length; i++) {
        const p = stroke.points[i];
        ctx.lineTo(p.x * width, p.y * height);
      }
      ctx.stroke();
    }
  };

  for (const s of strokes) {
    if (s.keep) paint(kctx, s);
    else paint(ectx, s);
  }

  const keepData = kctx.getImageData(0, 0, width, height).data;
  const eraseData = ectx.getImageData(0, 0, width, height).data;

  // Combine into RGBA: R = keep, G = erase, A = touched anywhere
  for (let i = 0; i < width * height; i++) {
    const k = keepData[i * 4];
    const e = eraseData[i * 4];
    data[i * 4 + 0] = k;
    data[i * 4 + 1] = e;
    data[i * 4 + 2] = 0;
    data[i * 4 + 3] = k > 0 || e > 0 ? 255 : 0;
  }

  return data;
}

/**
 * Get (or build) a manual mask texture for a layer's current strokes.
 * Returns null if no strokes.
 */
export function getManualMaskTexture(
  layerId: string,
  strokes: CutoutManualStroke[],
  width: number,
  height: number,
): THREE.DataTexture | null {
  if (strokes.length === 0) {
    // Clear any cached entry
    const existing = _cache.get(layerId);
    if (existing) {
      existing.texture.dispose();
      _cache.delete(layerId);
    }
    return null;
  }

  const hash = hashStrokes(strokes, width, height);
  const cached = _cache.get(layerId);
  if (cached && cached.hash === hash && cached.width === width && cached.height === height) {
    return cached.texture;
  }

  // Rebuild
  if (cached) cached.texture.dispose();
  const data = rasterizeStrokes(strokes, width, height);
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  _cache.set(layerId, { hash, texture, width, height });
  return texture;
}

/** Free the manual mask cache for a layer */
export function disposeManualMaskCache(layerId: string): void {
  const existing = _cache.get(layerId);
  if (existing) {
    existing.texture.dispose();
    _cache.delete(layerId);
  }
}

/** Free all manual mask caches */
export function clearAllManualMaskCaches(): void {
  for (const entry of _cache.values()) entry.texture.dispose();
  _cache.clear();
}