/**
 * cacheWorker — off-thread cache operations.
 *
 * Handles:
 *   1. cache-trim    — LRU eviction computation (existing)
 *   2. disk-opfs-read   — read frame blob from OPFS
 *   3. disk-opfs-write  — write frame blob to OPFS
 *   4. disk-opfs-delete — delete frame blob from OPFS
 *
 * OPFS directory structure:
 *   <root>/onion-frame-cache/<hash>.bin
 */

// ── Types ──────────────────────────────────────────────────────

interface BaseMessage {
  id: string;
  type: string;
  payload: any;
}

interface TrimRequest extends BaseMessage {
  type: 'cache-trim';
  payload: {
    entries: Array<{
      compId: string;
      frame: number;
      lastAccessed: number;
      byteSize: number;
    }>;
    targetBytes: number;
  };
}

interface OPFSReadRequest extends BaseMessage {
  type: 'disk-opfs-read';
  payload: { hash: string };
}

interface OPFSWriteRequest extends BaseMessage {
  type: 'disk-opfs-write';
  payload: { hash: string; buffer: ArrayBuffer };
}

interface OPFSDeleteRequest extends BaseMessage {
  type: 'disk-opfs-delete';
  payload: { hash: string };
}

type WorkerMessage = TrimRequest | OPFSReadRequest | OPFSWriteRequest | OPFSDeleteRequest;

// ── OPFS root dir (lazy init) ──────────────────────────────────

let _cacheDir: FileSystemDirectoryHandle | null = null;

async function getCacheDir(): Promise<FileSystemDirectoryHandle> {
  if (_cacheDir) return _cacheDir;
  const root = await navigator.storage.getDirectory();
  _cacheDir = await root.getDirectoryHandle('onion-frame-cache', { create: true });
  return _cacheDir;
}

// ── OPFS operations ────────────────────────────────────────────

async function opfsRead(hash: string): Promise<ArrayBuffer | null> {
  try {
    const dir = await getCacheDir();
    const file = await dir.getFileHandle(`${hash}.bin`);
    const f = await file.getFile();
    return await f.arrayBuffer();
  } catch {
    // File doesn't exist — normal cache miss
    return null;
  }
}

async function opfsWrite(hash: string, buffer: ArrayBuffer): Promise<void> {
  const dir = await getCacheDir();
  const file = await dir.getFileHandle(`${hash}.bin`, { create: true });
  // Use createWritable (supported in workers)
  const writable = await (file as any).createWritable();
  await writable.write(buffer);
  await writable.close();
}

async function opfsDelete(hash: string): Promise<void> {
  try {
    const dir = await getCacheDir();
    await dir.removeEntry(`${hash}.bin`);
  } catch {
    // Already gone — fine
  }
}

// ── LRU eviction (existing logic) ─────────────────────────────

interface CacheEntry {
  compId: string;
  frame: number;
  lastAccessed: number;
  byteSize: number;
}

function computeLRUEviction(
  entries: CacheEntry[],
  targetBytes: number,
): { evictedIds: Array<{ compId: string; frame: number }>; remainingBytes: number } {
  if (entries.length === 0) return { evictedIds: [], remainingBytes: 0 };

  let totalBytes = entries.reduce((s, e) => s + e.byteSize, 0);
  if (totalBytes <= targetBytes) return { evictedIds: [], remainingBytes: totalBytes };

  const sorted = [...entries].sort((a, b) => a.lastAccessed - b.lastAccessed);
  const evictedIds: Array<{ compId: string; frame: number }> = [];

  for (const entry of sorted) {
    if (totalBytes <= targetBytes) break;
    totalBytes -= entry.byteSize;
    evictedIds.push({ compId: entry.compId, frame: entry.frame });
  }

  return { evictedIds, remainingBytes: totalBytes };
}

// ── Message handler ────────────────────────────────────────────

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { id, type, payload } = e.data;

  try {
    switch (type) {
      case 'cache-trim': {
        const result = computeLRUEviction(
          (payload as TrimRequest['payload']).entries,
          (payload as TrimRequest['payload']).targetBytes,
        );
        self.postMessage({ id, type, success: true, payload: result });
        break;
      }

      case 'disk-opfs-read': {
        const buf = await opfsRead((payload as OPFSReadRequest['payload']).hash);
        // Transfer buffer back zero-copy
        if (buf) {
          self.postMessage({ id, type, success: true, payload: buf }, [buf]);
        } else {
          self.postMessage({ id, type, success: true, payload: null });
        }
        break;
      }

      case 'disk-opfs-write': {
        const { hash, buffer } = payload as OPFSWriteRequest['payload'];
        await opfsWrite(hash, buffer);
        self.postMessage({ id, type, success: true, payload: null });
        break;
      }

      case 'disk-opfs-delete': {
        await opfsDelete((payload as OPFSDeleteRequest['payload']).hash);
        self.postMessage({ id, type, success: true, payload: null });
        break;
      }

      default:
        self.postMessage({ id, type, success: false, error: `Unknown message type: ${type}` });
    }
  } catch (err) {
    self.postMessage({
      id,
      type,
      success: false,
      error: (err as Error).message ?? String(err),
    });
  }
};