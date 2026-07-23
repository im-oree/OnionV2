/**
 * CacheHasher — deterministic per-frame hash for cache keying.
 *
 * Hash inputs:
 *   compId + frame + width + height + each visible layer's
 *   id, type, transform, effect params, source asset hash.
 *
 * Uses FNV-1a 32-bit (fast, non-crypto, zero dependencies).
 */
import type { Composition } from '../../types/composition';
import type { Layer } from '../../types/layer';

// ── FNV-1a 32-bit ─────────────────────────────────────────────
const FNV_PRIME = 0x01000193;
const FNV_OFFSET = 0x811c9dc5;

function fnv1a(str: string): number {
  let hash = FNV_OFFSET;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    // Force 32-bit unsigned multiply
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash >>> 0;
}

function hashNum(n: number): string {
  // Quantise floats to 4 decimal places to avoid float noise
  return Number.isInteger(n) ? String(n) : n.toFixed(4);
}

// ── Layer state serialiser ─────────────────────────────────────

function serialiseLayer(layer: Layer): string {
  const parts: string[] = [
    layer.id,
    layer.type,
    layer.visible ? '1' : '0',
    layer.locked ? '1' : '0',
    layer.startFrame.toString(),
    layer.endFrame.toString(),
    layer.blendMode ?? 'normal',
    hashNum(layer.opacity ?? 1),
  ];

  // Transform
  const t = layer.transform;
  if (t) {
    parts.push(
      hashNum(t.x ?? 0),
      hashNum(t.y ?? 0),
      hashNum(t.scaleX ?? 1),
      hashNum(t.scaleY ?? 1),
      hashNum(t.rotation ?? 0),
      hashNum(t.anchorX ?? 0),
      hashNum(t.anchorY ?? 0),
    );
  }

  // 3D transform
  const t3 = layer.transform3D;
  if (t3) {
    parts.push(
      hashNum(t3.position?.x ?? 0),
      hashNum(t3.position?.y ?? 0),
      hashNum(t3.position?.z ?? 0),
      hashNum(t3.rotation?.x ?? 0),
      hashNum(t3.rotation?.y ?? 0),
      hashNum(t3.rotation?.z ?? 0),
      hashNum(t3.scale?.x ?? 1),
      hashNum(t3.scale?.y ?? 1),
      hashNum(t3.scale?.z ?? 1),
    );
  }

  // Effects — serialise each effect's id + all param values
  if (layer.effects && layer.effects.length > 0) {
    for (const fx of layer.effects) {
      if (!fx.enabled) { parts.push('fx:disabled'); continue; }
      parts.push(`fx:${fx.effectId}`);
      if (fx.params) {
        for (const [k, v] of Object.entries(fx.params)) {
          parts.push(`${k}=${typeof v === 'number' ? hashNum(v) : String(v)}`);
        }
      }
    }
  }

  // Source asset reference (image/video/audio url or comp id)
  const data = layer.data as any;
  if (data?.url)         parts.push(`src:${data.url}`);
  if (data?.sourceCompId) parts.push(`comp:${data.sourceCompId}`);
  if (data?.assetId)     parts.push(`asset:${data.assetId}`);

  return parts.join('|');
}

// ── Public API ─────────────────────────────────────────────────

export interface FrameHashInput {
  comp: Composition;
  frame: number;
  /** Optional extra qualifier (e.g. 'half' for half-res preview) */
  qualifier?: string;
}

/**
 * Returns a hex string cache key for the given frame state.
 * Pure function — no side effects.
 */
export function hashFrame(input: FrameHashInput): string {
  const { comp, frame, qualifier } = input;

  const header = [
    comp.id,
    frame.toString(),
    comp.width.toString(),
    comp.height.toString(),
    comp.fps.toString(),
    qualifier ?? 'full',
  ].join(':');

  // Only hash visible layers (invisible layers can't affect output)
  const visibleLayers = comp.layers.filter(l => l.visible !== false);

  let combined = header;
  for (const layer of visibleLayers) {
    combined += '§' + serialiseLayer(layer);
  }

  const h = fnv1a(combined);
  return h.toString(16).padStart(8, '0');
}

/**
 * Compute a lighter hash covering only layers that are visible
 * at the given frame (between startFrame and endFrame).
 * Faster than hashing all layers for long timelines.
 */
export function hashFrameAtTime(
  comp: Composition,
  frame: number,
  qualifier?: string,
): string {
  const activeComp: Composition = {
    ...comp,
    layers: comp.layers.filter(
      l => l.visible !== false && frame >= l.startFrame && frame <= l.endFrame,
    ),
  };
  return hashFrame({ comp: activeComp, frame, qualifier });
}