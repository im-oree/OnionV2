/**
 * mediapipeModel — realtime background segmentation using MediaPipe
 * Selfie Segmentation. Best for people, ~1 MB download.
 *
 * The MediaPipe JS SDK is loaded from a CDN so we don't need to bundle
 * WASM. Users offline can bundle the WASM by adding to public/.
 */
import type { SegmentationModel } from '../segmentationModels';

const MEDIAPIPE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation';

// Lazy-loaded script + WASM. Only fetched on first use.
let _mpModule: any = null;
let _loadPromise: Promise<any> | null = null;

async function loadMediaPipe(): Promise<any> {
  if (_mpModule) return _mpModule;
  if (_loadPromise) return _loadPromise;

  _loadPromise = new Promise((resolve, reject) => {
    // Inject the MediaPipe global script
    const script = document.createElement('script');
    script.src = `${MEDIAPIPE_CDN}/selfie_segmentation.js`;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      const mp = (window as any).SelfieSegmentation;
      if (mp) {
        _mpModule = mp;
        resolve(mp);
      } else {
        reject(new Error('MediaPipe SelfieSegmentation not found on window'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load MediaPipe SDK'));
    document.head.appendChild(script);
  });

  return _loadPromise;
}

class MediaPipeSegmentation implements SegmentationModel {
  readonly id = 'mediapipe' as const;
  private _segmenter: any = null;
  private _ready = false;
  private _pending: ((mask: Uint8Array) => void) | null = null;
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;

  constructor() {
    this._canvas = document.createElement('canvas');
    const c = this._canvas.getContext('2d', { willReadFrequently: true });
    if (!c) throw new Error('2D canvas context unavailable');
    this._ctx = c;
  }

  async init(): Promise<void> {
    const SelfieSegmentation = await loadMediaPipe();
    this._segmenter = new SelfieSegmentation({
      locateFile: (file: string) => `${MEDIAPIPE_CDN}/${file}`,
    });
    this._segmenter.setOptions({
      modelSelection: 1,  // 1 = general model (best quality)
      selfieMode: false,
    });
    this._segmenter.onResults((results: any) => {
      if (!this._pending) return;
      const cb = this._pending;
      this._pending = null;
      // results.segmentationMask is an HTMLCanvasElement with alpha in R channel
      const w = this._canvas.width;
      const h = this._canvas.height;
      this._ctx.drawImage(results.segmentationMask, 0, 0, w, h);
      const imgData = this._ctx.getImageData(0, 0, w, h);
      const mask = new Uint8Array(w * h);
      const src = imgData.data;
      for (let i = 0, j = 0; i < src.length; i += 4, j++) {
        // MediaPipe writes the confidence to all channels; use red.
        mask[j] = src[i];
      }
      cb(mask);
    });
    await this._segmenter.initialize();
    this._ready = true;
  }

  get ready(): boolean { return this._ready; }

  async segment(
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | ImageData,
    outputWidth: number,
    outputHeight: number,
  ): Promise<Uint8Array> {
    if (!this._ready) throw new Error('MediaPipe not initialised');

    this._canvas.width = outputWidth;
    this._canvas.height = outputHeight;

    // Ensure we pass MediaPipe a valid image source
    let source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;
    if (input instanceof ImageData) {
      const tmp = document.createElement('canvas');
      tmp.width = input.width;
      tmp.height = input.height;
      const tctx = tmp.getContext('2d');
      if (!tctx) throw new Error('canvas 2d unavailable');
      tctx.putImageData(input, 0, 0);
      source = tmp;
    } else {
      source = input;
    }

    return await new Promise<Uint8Array>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this._pending = null;
        reject(new Error('MediaPipe segment timeout'));
      }, 5000);

      this._pending = (mask) => {
        clearTimeout(timeout);
        resolve(mask);
      };
      this._segmenter.send({ image: source }).catch((err: any) => {
        clearTimeout(timeout);
        this._pending = null;
        reject(err);
      });
    });
  }

  dispose(): void {
    try { this._segmenter?.close?.(); } catch {}
    this._segmenter = null;
    this._ready = false;
  }
}

export async function createMediaPipeModel(): Promise<SegmentationModel> {
  const inst = new MediaPipeSegmentation();
  await inst.init();
  return inst;
}