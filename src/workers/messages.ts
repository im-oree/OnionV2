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

// ── Cache Trim Worker ───────────────────────────────────────────
export interface CacheTrimRequest {
  type: 'cache-trim';
  entries: Array<{ compId: string; frame: number; lastAccessed: number; byteSize: number }>;
  targetBytes: number;
}

export interface CacheTrimResult {
  type: 'cache-trim';
  evictedIds: Array<{ compId: string; frame: number }>;
}

// ── Disk Cache OPFS Worker ──────────────────────────────────────
export interface DiskOPFSReadRequest {
  type: 'disk-opfs-read';
  hash: string;
}

export interface DiskOPFSReadResult {
  type: 'disk-opfs-read';
  buffer: ArrayBuffer | null;
}

export interface DiskOPFSWriteRequest {
  type: 'disk-opfs-write';
  hash: string;
  buffer: ArrayBuffer;
}

export interface DiskOPFSWriteResult {
  type: 'disk-opfs-write';
  success: boolean;
}

export interface DiskOPFSDeleteRequest {
  type: 'disk-opfs-delete';
  hash: string;
}

export interface DiskOPFSDeleteResult {
  type: 'disk-opfs-delete';
  success: boolean;
}

// ── Union types ─────────────────────────────────────────────────
export type WorkerRequest =
  | KeyframeEvalRequest
  | AssetDecodeRequest
  | CacheTrimRequest
  | DiskOPFSReadRequest
  | DiskOPFSWriteRequest
  | DiskOPFSDeleteRequest;

export type WorkerResult =
  | KeyframeEvalResult
  | AssetDecodeResult
  | CacheTrimResult
  | DiskOPFSReadResult
  | DiskOPFSWriteResult
  | DiskOPFSDeleteResult;
