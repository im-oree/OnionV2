/**
 * u2netModel — general-purpose foreground/background segmentation via U²-Net.
 *
 * Model input: 1x3x320x320 RGB, normalized (mean=[0.485,0.456,0.406], std=[0.229,0.224,0.225])
 * Model output: 7 side outputs — we use d0 (primary) at 1x1x320x320.
 *
 * We prefer u2netp.onnx (small variant, ~4.7 MB) over full u2net.onnx (~168 MB)
 * for browser use. Users can drop either at /models/u2net.onnx and it works.
 */
import type { SegmentationModel } from '../segmentationModels';
import { loadOnnxSession, imageToTensor, tensorToMask } from './onnxRuntime';

const MODEL_URL = '/models/u2net.onnx';
const INPUT_SIZE = 320;

class U2NetModel implements SegmentationModel {
  readonly id = 'u2net' as const;
  private _session: any = null;
  private _ready = false;

  async init(): Promise<void> {
    try {
      this._session = await loadOnnxSession(MODEL_URL);
      this._ready = true;
    } catch (err: any) {
      throw new Error(
        `U²-Net model not found at ${MODEL_URL}. ` +
        `Download u2netp.onnx (small, ~5 MB) or u2net.onnx (full, ~170 MB) ` +
        `from https://github.com/xuebinqin/U-2-Net and place at public/models/u2net.onnx. ` +
        `Original error: ${err?.message ?? err}`,
      );
    }
  }

  get ready(): boolean { return this._ready; }

  async segment(
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | ImageData,
    outputWidth: number,
    outputHeight: number,
  ): Promise<Uint8Array> {
    if (!this._ready || !this._session) {
      throw new Error('U²-Net not initialised');
    }

    const tensor = imageToTensor(input, INPUT_SIZE, INPUT_SIZE, {
      mean: [0.485, 0.456, 0.406],
      std: [0.229, 0.224, 0.225],
    });

    const inputName = this._session.inputNames[0];
    const feeds: Record<string, any> = { [inputName]: tensor };

    const results = await this._session.run(feeds);
    // U²-Net returns 7 outputs (d0..d6). Prefer d0 (highest quality primary).
    // Fall back to first output if names differ.
    const outputName = this._session.outputNames.find((n: string) => /d0|1877|1943|output/.test(n))
      ?? this._session.outputNames[0];
    const output = results[outputName];

    // U²-Net output is unnormalized — apply sigmoid + clamp
    const raw = output.data as Float32Array;
    const sigmoided = new Float32Array(raw.length);
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < raw.length; i++) {
      const v = 1 / (1 + Math.exp(-raw[i]));  // sigmoid
      sigmoided[i] = v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    // Normalize to [0,1] for consistent range
    const range = max - min || 1;
    for (let i = 0; i < sigmoided.length; i++) {
      sigmoided[i] = (sigmoided[i] - min) / range;
    }
    // Replace tensor data for tensorToMask helper
    (output as any).data = sigmoided;

    return tensorToMask(output, outputWidth, outputHeight);
  }

  dispose(): void {
    try { this._session?.release?.(); } catch {}
    this._session = null;
    this._ready = false;
  }
}

export async function createU2NetModel(): Promise<SegmentationModel> {
  const inst = new U2NetModel();
  await inst.init();
  return inst;
}