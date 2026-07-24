/**
 * modnetModel — portrait matting via MODNet ONNX model.
 *
 * Model input: 1x3x512x512 RGB, normalized to [-1, 1]
 * Model output: 1x1x512x512 alpha matte [0, 1]
 *
 * Model URL is fetched from /models/modnet.onnx (users must drop it there).
 * Falls back with a clear error if missing.
 */
import type { SegmentationModel } from '../segmentationModels';
import { loadOnnxSession, imageToTensor, tensorToMask } from './onnxRuntime';

const MODEL_URL = '/models/modnet.onnx';
const INPUT_SIZE = 512;

class MODNetModel implements SegmentationModel {
  readonly id = 'modnet' as const;
  private _session: any = null;
  private _ready = false;

  async init(): Promise<void> {
    try {
      this._session = await loadOnnxSession(MODEL_URL);
      this._ready = true;
    } catch (err: any) {
      throw new Error(
        `MODNet model not found at ${MODEL_URL}. ` +
        `Download modnet.onnx and place in the public/models/ folder. ` +
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
      throw new Error('MODNet not initialised');
    }

    // MODNet normalization: mean=[0.5,0.5,0.5], std=[0.5,0.5,0.5] → [-1,1]
    const tensor = imageToTensor(input, INPUT_SIZE, INPUT_SIZE, {
      mean: [0.5, 0.5, 0.5],
      std: [0.5, 0.5, 0.5],
    });

    // Input name may be 'input' or 'img' depending on export
    const inputName = this._session.inputNames[0];
    const feeds: Record<string, any> = { [inputName]: tensor };

    const results = await this._session.run(feeds);
    const outputName = this._session.outputNames[0];
    const output = results[outputName];

    return tensorToMask(output, outputWidth, outputHeight);
  }

  dispose(): void {
    try { this._session?.release?.(); } catch {}
    this._session = null;
    this._ready = false;
  }
}

export async function createMODNetModel(): Promise<SegmentationModel> {
  const inst = new MODNetModel();
  await inst.init();
  return inst;
}