/**
 * Worker message types — shared between main thread and workers.
 */

// ── Keyframe Evaluation Worker ──────────────────────────
export interface KeyframeEvalRequest {
  type: 'keyframe-eval';
  frame: number;
  layers: Array<{
    id: string;
    properties: Record<string, Array<{
      time: number;
      value: number | number[];
      interpolation: string;
      outTangent?: { x: number; y: number };
      inTangent?: { x: number; y: number };
    }>>;
  }>;
}

export interface KeyframeEvalResult {
  type: 'keyframe-eval';
  results: Record<string, Record<string, { value: number | number[]; inKeyframe: boolean }>>;
}

// ── Asset Decode Worker ─────────────────────────────────
export interface AssetDecodeRequest {
  type: 'asset-decode';
  buffer: ArrayBuffer;
  mimeType: string;
}

export interface AssetDecodeResult {
  type: 'asset-decode';
  bitmap?: ImageBitmap;
  error?: string;
}

// ── Cache Trim Worker ──────────────────────────────────
export interface CacheTrimRequest {
  type: 'cache-trim';
  entries: Array<{ compId: string; frame: number; lastAccessed: number; byteSize: number }>;
  targetBytes: number;
}

export interface CacheTrimResult {
  type: 'cache-trim';
  evictedIds: Array<{ compId: string; frame: number }>;
}

// ── Union type for message handling ─────────────────────
export type WorkerRequest = KeyframeEvalRequest | AssetDecodeRequest | CacheTrimRequest;
export type WorkerResult = KeyframeEvalResult | AssetDecodeResult | CacheTrimResult;
