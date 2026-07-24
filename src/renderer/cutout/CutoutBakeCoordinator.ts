/**
 * CutoutBakeCoordinator — offline bake pipeline for cutout.
 *
 * For a video layer:
 *   1. Iterate every frame from startFrame..endFrame
 *   2. Seek video, wait for `seeked` event
 *   3. Run segmentation model on the current frame
 *   4. Collect all masks, save as one PNG sheet + manifest
 *
 * For an image layer: single-frame bake, done in one shot.
 *
 * For a comp layer: iterate frames and use the rendered comp texture as
 * input (nested composition already goes through the renderer, so we sample
 * the rendered output at each frame).
 */
import type { Layer, CutoutData } from '../../types/layer';
import { getSegmentationModel, type CutoutModelId } from './segmentationModels';
import { saveBakedAlpha } from './CutoutAlphaCache';
import { useCompositionStore } from '../../state/compositionStore';
import { assetManager } from '../../storage/AssetManager';

export interface BakeProgress {
  layerId: string;
  currentFrame: number;
  totalFrames: number;
  fraction: number;   // 0..1
}

export type BakeProgressListener = (p: BakeProgress) => void;

interface ActiveJob {
  layerId: string;
  cancelled: boolean;
  totalFrames: number;
}

/** In-flight jobs keyed by layerId (only one bake per layer at a time) */
const _activeJobs = new Map<string, ActiveJob>();
const _listeners = new Set<BakeProgressListener>();

export function subscribeToBakeProgress(fn: BakeProgressListener): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

function emit(p: BakeProgress): void {
  for (const l of _listeners) {
    try { l(p); } catch {}
  }
}

export function cancelBake(layerId: string): void {
  const job = _activeJobs.get(layerId);
  if (job) job.cancelled = true;
}

export function isBaking(layerId: string): boolean {
  return _activeJobs.has(layerId);
}

/**
 * Bake alpha masks for a layer. Returns true on success, false on cancel/error.
 */
export async function bakeCutout(
  layerId: string,
  compId: string,
  cutout: CutoutData,
): Promise<boolean> {
  if (_activeJobs.has(layerId)) {
    console.warn(`[CutoutBake] already baking ${layerId}`);
    return false;
  }

  const cs = useCompositionStore.getState();
  const comp = cs.compositions.find(c => c.id === compId);
  if (!comp) return false;
  const layer = comp.layers.find(l => l.id === layerId);
  if (!layer) return false;

  const modelId = cutout.model as CutoutModelId;
  if (!modelId || modelId === 'none' as any) return false;

  const source = await getBakeSource(layer);
  if (!source) {
    console.warn(`[CutoutBake] no source for ${layerId}`);
    return false;
  }

  const totalFrames = layer.type === 'image'
    ? 1
    : Math.max(1, Math.floor(layer.endFrame - layer.startFrame));

  const job: ActiveJob = { layerId, cancelled: false, totalFrames };
  _activeJobs.set(layerId, job);

  // Update layer's cutout data to reflect that baking has started
  const updateProgress = (baked: number, complete: boolean) => {
    const compState = useCompositionStore.getState();
    const c = compState.compositions.find(x => x.id === compId);
    if (!c) return;
    const l = c.layers.find(x => x.id === layerId);
    if (!l) return;
    const newCutout: CutoutData = {
      ...cutout,
      bakedFrameCount: baked,
      totalFrameCount: totalFrames,
      bakeComplete: complete,
    };
    compState.updateLayer(compId, layerId, {
      data: { ...(l.data ?? {}), cutout: newCutout },
    }, true);
  };

  updateProgress(0, false);

  try {
    const model = await getSegmentationModel(modelId);

    const masks: Uint8Array[] = [];
    // Pick a reasonable working resolution — matches source natural size
    // capped to 720p for perf. Full-res mask still looks good after resampling.
    const naturalW = (source as any).width ?? (source as any).videoWidth ?? 640;
    const naturalH = (source as any).height ?? (source as any).videoHeight ?? 360;
    const cap = 720;
    const scale = Math.min(1, cap / Math.max(naturalW, naturalH));
    const outW = Math.max(64, Math.round(naturalW * scale));
    const outH = Math.max(64, Math.round(naturalH * scale));

    for (let f = 0; f < totalFrames; f++) {
      if (job.cancelled) break;

      // Seek if video
      if (source instanceof HTMLVideoElement) {
        const targetTime = f / comp.fps;
        await seekVideo(source, targetTime);
      }

      // Segment
      let mask: Uint8Array;
      try {
        mask = await model.segment(source, outW, outH);
      } catch (err) {
        console.warn(`[CutoutBake] frame ${f} failed:`, err);
        // Store an empty mask to keep frame indexing correct
        mask = new Uint8Array(outW * outH).fill(255);
      }
      masks.push(mask);

      // Progress update every N frames or on last frame
      if (f % 5 === 0 || f === totalFrames - 1) {
        emit({
          layerId, currentFrame: f + 1, totalFrames,
          fraction: (f + 1) / totalFrames,
        });
        updateProgress(f + 1, false);
        // Yield to let UI paint
        await new Promise(r => setTimeout(r, 0));
      }
    }

    if (job.cancelled) {
      _activeJobs.delete(layerId);
      updateProgress(masks.length, false);
      return false;
    }

    // Save to disk
    await saveBakedAlpha(layerId, masks, outW, outH, {
      model: modelId,
      frameCount: totalFrames,
      frameWidth: outW,
      frameHeight: outH,
      bakedAt: Date.now(),
    });

    updateProgress(totalFrames, true);
    emit({ layerId, currentFrame: totalFrames, totalFrames, fraction: 1 });
    _activeJobs.delete(layerId);

    // Tell the live compositor to drop its stale "no bake found" state and
    // reload the freshly baked alpha, then force a repaint.
    const renderer = (window as any).__renderer;
    renderer?.cutoutCompositor?.invalidateBakedForLayer(layerId);
    renderer?.renderLoop?.requestRender();

    return true;
  } catch (err) {
    console.error(`[CutoutBake] fatal error for ${layerId}:`, err);
    _activeJobs.delete(layerId);
    return false;
  }
}

/**
 * Resolve the source frame producer for a layer.
 * - Image layer: return the HTMLImageElement of the source asset
 * - Video layer: return the HTMLVideoElement wrapped by the renderer
 * - Comp layer: not supported yet — needs a headless render pass, so we
 *   currently only support baking baseline content (video/image)
 */
async function getBakeSource(
  layer: Layer,
): Promise<HTMLVideoElement | HTMLImageElement | null> {
  const d: any = layer.data;
  if (!d?.assetId) return null;
  const asset = assetManager.getAsset(d.assetId);
  if (!asset?.url) return null;

  if (layer.type === 'image') {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    return await new Promise((resolve) => {
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = asset.url;
    });
  }

  if (layer.type === 'video') {
    // Reuse the renderer's video element to skip re-loading
    const renderer = (window as any).__renderer;
    const layerRenderer = renderer?.layerSync?.getRenderer?.(layer.id);
    const vid = layerRenderer?.videoElement as HTMLVideoElement | undefined;
    if (vid) return vid;

    // Fallback: create a fresh element
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.src = asset.url;
    return await new Promise((resolve) => {
      video.onloadeddata = () => resolve(video);
      video.onerror = () => resolve(null);
      video.load();
    });
  }

  // Comp layers: not baked in 12C (needs headless render). Return null.
  return null;
}

/** Seek a video and wait for the seeked event */
function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - time) < 0.01) { resolve(); return; }
    const onSeeked = () => { video.removeEventListener('seeked', onSeeked); resolve(); };
    const timeout = setTimeout(() => {
      video.removeEventListener('seeked', onSeeked);
      resolve();  // Continue even if seeked never fires
    }, 3000);
    video.addEventListener('seeked', () => {
      clearTimeout(timeout);
      onSeeked();
    });
    video.currentTime = time;
  });
}