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

  const t = layer.transform;
  if (t) {
    parts.push(
      hashNum(t.position?.x ?? 0),
      hashNum(t.position?.y ?? 0),
      hashNum(t.scale?.x ?? 1),
      hashNum(t.scale?.y ?? 1),
      hashNum(t.rotation ?? 0),
      hashNum(t.anchorPoint?.x ?? 0),
      hashNum(t.anchorPoint?.y ?? 0),
    );
  }

  const t3 = layer.transform3D;
  if (t3) {
    parts.push(
      hashNum(t3.position?.x ?? 0),
      hashNum(t3.position?.y ?? 0),
      hashNum(t3.position?.z ?? 0),
      hashNum(t3.rotationX ?? 0),
      hashNum(t3.rotationY ?? 0),
      hashNum(t3.rotationZ ?? 0),
      hashNum(t3.scale?.x ?? 1),
      hashNum(t3.scale?.y ?? 1),
      hashNum(t3.scale?.z ?? 1),
    );
  }

  if (layer.effects && layer.effects.length > 0) {
    for (const fx of layer.effects) {
      if (!fx.enabled) { parts.push('fx:disabled'); continue; }
      parts.push(`fx:${fx.type}`);
      if (fx.parameters && fx.parameters.length > 0) {
        for (const p of fx.parameters) {
          parts.push(`${p.id}=${typeof p.value === 'number' ? hashNum(p.value) : String(p.value)}`);
        }
      }
    }
  }

  const data = layer.data as any;
  if (data?.url)         parts.push(`src:${data.url}`);
  if (data?.sourceCompId) parts.push(`comp:${data.sourceCompId}`);
  if (data?.assetId)     parts.push(`asset:${data.assetId}`);

  // ── Adjust (color grading + LUT) — MUST be in hash so cache
  // busts when user changes a slider or picks a LUT.
  const adj = data?.adjust;
  if (adj) {
    parts.push(
      `adj:${adj.enabled ? 1 : 0}`,
      hashNum(adj.temp ?? 0),
      hashNum(adj.tint ?? 0),
      hashNum(adj.saturation ?? 0),
      hashNum(adj.exposure ?? 0),
      hashNum(adj.contrast ?? 0),
      hashNum(adj.highlights ?? 0),
      hashNum(adj.shadows ?? 0),
      hashNum(adj.whites ?? 0),
      hashNum(adj.blacks ?? 0),
      hashNum(adj.brilliance ?? 0),
      hashNum(adj.sharpen ?? 0),
      hashNum(adj.clarity ?? 0),
      hashNum(adj.fade ?? 0),
      hashNum(adj.vignette ?? 0),
      hashNum(adj.vignetteFeather ?? 50),
      `lut:${adj.lutId ?? '__identity'}`,
      hashNum(adj.lutIntensity ?? 100),
      `skin:${adj.protectSkinTone ? 1 : 0}`,
    );
  }

  // ── Cutout (background removal) — must bust cache on toggle,
  // bake completion, model change, chroma/stroke tweaks.
  const cut = data?.cutout;
  if (cut) {
    parts.push(
      `cut:${cut.enabled ? 1 : 0}`,
      `mdl:${cut.model ?? 'none'}`,
      `bake:${cut.bakeComplete ? 1 : 0}:${cut.bakedFrameCount ?? 0}`,
      hashNum(cut.feather ?? 0),
      hashNum(cut.contract ?? 0),
      hashNum(cut.smoothing ?? 0),
      hashNum(cut.threshold ?? 50),
      `mode:${cut.manualMode ?? 'ai'}`,
      `strokes:${cut.manualStrokes?.length ?? 0}`,
    );
    const c = cut.chroma;
    if (c) {
      parts.push(
        `chr:${c.enabled ? 1 : 0}:${c.keyColor}`,
        hashNum(c.similarity ?? 0),
        hashNum(c.smoothness ?? 0),
        hashNum(c.spillSuppress ?? 0),
      );
    }
    const s = cut.stroke;
    if (s) {
      parts.push(
        `stk:${s.enabled ? 1 : 0}:${s.color}:${s.position}:${s.style}`,
        hashNum(s.width ?? 0),
        hashNum(s.softness ?? 0),
      );
    }
  }

  // Masks — count + a quick position digest
  if (Array.isArray(layer.masks) && layer.masks.length > 0) {
    for (const m of layer.masks) {
      parts.push(
        `mask:${m.id}:${m.mode}:${m.inverted ? 1 : 0}`,
        hashNum(m.feather ?? 0),
        hashNum(m.opacity ?? 100),
        hashNum(m.expansion ?? 0),
        hashNum(m.points?.length ?? 0),
      );
    }
  }

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
  return hashFrame({ comp: activeComp, frame, ...(qualifier ? { qualifier } : {}) });
}