/**
 * segmentationModels — abstract interface + registry for background
 * removal models. All models produce a per-pixel alpha mask (0 = background,
 * 1 = foreground) from an input image / video frame.
 */
export type CutoutModelId = 'mediapipe' | 'modnet' | 'u2net';

export interface ModelMeta {
  id: CutoutModelId;
  displayName: string;
  description: string;
  /** Approx download size in MB */
  sizeMB: number;
  /** Real-time capable on typical hardware */
  realtime: boolean;
  /** Best for what subjects */
  bestFor: 'people' | 'portrait' | 'general';
}

export const MODEL_REGISTRY: Record<CutoutModelId, ModelMeta> = {
  mediapipe: {
    id: 'mediapipe',
    displayName: 'Fast (MediaPipe)',
    description: 'Realtime segmentation. Best for people, whole body.',
    sizeMB: 1,
    realtime: true,
    bestFor: 'people',
  },
  modnet: {
    id: 'modnet',
    displayName: 'Portrait (MODNet)',
    description: 'Higher quality edges. Best for close-up portraits.',
    sizeMB: 15,
    realtime: false,
    bestFor: 'portrait',
  },
  u2net: {
    id: 'u2net',
    displayName: 'General (U²-Net)',
    description: 'Any subject: people, products, animals. Slowest.',
    sizeMB: 80,
    realtime: false,
    bestFor: 'general',
  },
};

/** A running instance of a segmentation model */
export interface SegmentationModel {
  readonly id: CutoutModelId;
  readonly ready: boolean;

  /**
   * Segment a single frame. Returns a single-channel mask (Uint8Array,
   * width * height bytes). 0 = background, 255 = foreground.
   */
  segment(
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | ImageData,
    outputWidth: number,
    outputHeight: number,
  ): Promise<Uint8Array>;

  /** Free GPU/WASM resources */
  dispose(): void;
}

// ── Lazy loader — only imports/initialises models on demand ────

const _loaders: Record<CutoutModelId, () => Promise<SegmentationModel>> = {
  mediapipe: async () => {
    const mod = await import('./models/mediapipeModel');
    return await mod.createMediaPipeModel();
  },
  modnet: async () => {
    const mod = await import('./models/modnetModel');
    return await mod.createMODNetModel();
  },
  u2net: async () => {
    const mod = await import('./models/u2netModel');
    return await mod.createU2NetModel();
  },
};

const _instances = new Map<CutoutModelId, SegmentationModel>();

/**
 * Get (or create) a model instance. Cached — subsequent calls with the
 * same id return the same instance.
 */
export async function getSegmentationModel(id: CutoutModelId): Promise<SegmentationModel> {
  const existing = _instances.get(id);
  if (existing?.ready) return existing;
  try {
    const inst = await _loaders[id]();
    _instances.set(id, inst);
    return inst;
  } catch (err: any) {
    // Bubble up a clean message — the UI catches this and shows a toast
    const msg = err?.message ?? String(err);
    const wrappedErr = new Error(msg);
    (wrappedErr as any).modelId = id;
    (wrappedErr as any).userFriendly = true;
    throw wrappedErr;
  }
}

/** Dispose a model to reclaim memory (e.g., after finishing a bake) */
export function disposeSegmentationModel(id: CutoutModelId): void {
  const inst = _instances.get(id);
  if (inst) {
    try { inst.dispose(); } catch {}
    _instances.delete(id);
  }
}