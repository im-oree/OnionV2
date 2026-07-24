/**
 * onnxRuntime — shared ONNX inference helper for MODNet + U²-Net.
 *
 * Handles WASM initialization once, session caching, and image tensor
 * conversion. Both segmentation models feed image data in similar shapes
 * (NCHW float32) so the wrapper is generic.
 */
import * as ort from 'onnxruntime-web';

let _wasmConfigured = false;

function configureWasm(): void {
  if (_wasmConfigured) return;
  // Point to the copied WASM binaries under /ort
  ort.env.wasm.wasmPaths = '/ort/';
  // Limit threads to avoid saturating the browser main thread
  ort.env.wasm.numThreads = Math.min(4, navigator.hardwareConcurrency || 2);
  ort.env.wasm.simd = true;
  _wasmConfigured = true;
}

const _sessionCache = new Map<string, Promise<ort.InferenceSession>>();

/** Load an ONNX model (cached per URL) */
export async function loadOnnxSession(modelUrl: string): Promise<ort.InferenceSession> {
  configureWasm();
  const existing = _sessionCache.get(modelUrl);
  if (existing) return existing;

  const promise = (async () => {
    const resp = await fetch(modelUrl);
    if (!resp.ok) {
      throw new Error(`Failed to fetch model ${modelUrl}: HTTP ${resp.status}`);
    }
    const buffer = await resp.arrayBuffer();
    return await ort.InferenceSession.create(buffer, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    });
  })();

  _sessionCache.set(modelUrl, promise);
  return promise;
}

/** Drop a cached session (free memory) */
export function releaseOnnxSession(modelUrl: string): void {
  const existing = _sessionCache.get(modelUrl);
  if (!existing) return;
  existing.then(session => {
    try { (session as any).release?.(); } catch {}
  }).catch(() => {});
  _sessionCache.delete(modelUrl);
}

/**
 * Prepare an input image as an NCHW float32 tensor.
 * Normalizes to [0,1] by default; pass `mean` and `std` for standard-scored.
 */
export function imageToTensor(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | ImageData,
  width: number,
  height: number,
  options?: {
    mean?: [number, number, number];   // per-channel mean
    std?: [number, number, number];    // per-channel std
    layout?: 'nchw' | 'nhwc';           // default nchw
  },
): ort.Tensor {
  const layout = options?.layout ?? 'nchw';
  const mean = options?.mean ?? [0, 0, 0];
  const std = options?.std ?? [1, 1, 1];

  // Draw to a canvas at target resolution
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2D context unavailable');

  if (source instanceof ImageData) {
    // Need to resize — draw via ImageBitmap
    const tmp = document.createElement('canvas');
    tmp.width = source.width;
    tmp.height = source.height;
    const tctx = tmp.getContext('2d');
    if (!tctx) throw new Error('2D context unavailable');
    tctx.putImageData(source, 0, 0);
    ctx.drawImage(tmp, 0, 0, width, height);
  } else {
    ctx.drawImage(source, 0, 0, width, height);
  }

  const imageData = ctx.getImageData(0, 0, width, height);
  const rgba = imageData.data;
  const numPixels = width * height;

  const float32Data = new Float32Array(3 * numPixels);

  if (layout === 'nchw') {
    // Channels first: [R plane][G plane][B plane]
    for (let i = 0; i < numPixels; i++) {
      const r = rgba[i * 4] / 255;
      const g = rgba[i * 4 + 1] / 255;
      const b = rgba[i * 4 + 2] / 255;
      float32Data[i] = (r - mean[0]) / std[0];
      float32Data[numPixels + i] = (g - mean[1]) / std[1];
      float32Data[2 * numPixels + i] = (b - mean[2]) / std[2];
    }
  } else {
    // Channels last: interleaved RGB
    for (let i = 0; i < numPixels; i++) {
      const r = rgba[i * 4] / 255;
      const g = rgba[i * 4 + 1] / 255;
      const b = rgba[i * 4 + 2] / 255;
      float32Data[i * 3] = (r - mean[0]) / std[0];
      float32Data[i * 3 + 1] = (g - mean[1]) / std[1];
      float32Data[i * 3 + 2] = (b - mean[2]) / std[2];
    }
  }

  return new ort.Tensor(
    'float32',
    float32Data,
    layout === 'nchw' ? [1, 3, height, width] : [1, height, width, 3],
  );
}

/**
 * Convert a model's output tensor (single-channel float32 mask) to a
 * Uint8Array grayscale mask at the requested output resolution.
 */
export function tensorToMask(
  tensor: ort.Tensor,
  outputWidth: number,
  outputHeight: number,
): Uint8Array {
  const raw = tensor.data as Float32Array;
  // Tensor shape may be [1,1,H,W] or [1,H,W,1] etc — flatten
  // and assume it's a single-channel spatial map
  const dims = tensor.dims;
  const total = raw.length;

  // Guess input mask dims (last two are HxW typically)
  const maskH = dims[dims.length - 2];
  const maskW = dims[dims.length - 1];

  if (maskW * maskH !== total && !(dims.length === 4 && dims[1] === 1)) {
    // Not a simple spatial mask — take best guess
  }

  // If mask is already at output resolution, direct copy
  if (maskW === outputWidth && maskH === outputHeight) {
    const out = new Uint8Array(total);
    for (let i = 0; i < total; i++) {
      out[i] = Math.max(0, Math.min(255, Math.round(raw[i] * 255)));
    }
    return out;
  }

  // Otherwise resample via a canvas
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = maskW;
  srcCanvas.height = maskH;
  const srcCtx = srcCanvas.getContext('2d');
  if (!srcCtx) throw new Error('2D context unavailable');
  const srcData = srcCtx.createImageData(maskW, maskH);
  for (let i = 0; i < maskW * maskH; i++) {
    const v = Math.max(0, Math.min(255, Math.round(raw[i] * 255)));
    srcData.data[i * 4] = v;
    srcData.data[i * 4 + 1] = v;
    srcData.data[i * 4 + 2] = v;
    srcData.data[i * 4 + 3] = 255;
  }
  srcCtx.putImageData(srcData, 0, 0);

  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = outputWidth;
  dstCanvas.height = outputHeight;
  const dstCtx = dstCanvas.getContext('2d');
  if (!dstCtx) throw new Error('2D context unavailable');
  dstCtx.imageSmoothingEnabled = true;
  dstCtx.imageSmoothingQuality = 'high';
  dstCtx.drawImage(srcCanvas, 0, 0, outputWidth, outputHeight);
  const dstData = dstCtx.getImageData(0, 0, outputWidth, outputHeight);

  const out = new Uint8Array(outputWidth * outputHeight);
  for (let i = 0; i < out.length; i++) {
    out[i] = dstData.data[i * 4];
  }
  return out;
}