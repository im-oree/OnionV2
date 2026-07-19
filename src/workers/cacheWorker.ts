/**
 * cacheWorker — performs LRU eviction and memory accounting off the main thread.
 *
 * Message format:
 *   { id, type: 'cache-trim', payload: { entries, targetBytes } }
 *
 * Response:
 *   { id, type: 'cache-trim', success: true, payload: { evictedIds } }
 */

interface CacheEntry {
  compId: string;
  frame: number;
  lastAccessed: number;
  byteSize: number;
}

interface TrimRequest {
  id: string;
  type: 'cache-trim';
  payload: {
    entries: CacheEntry[];
    targetBytes: number;
  };
}

interface TrimResult {
  evictedIds: Array<{ compId: string; frame: number }>;
  remainingBytes: number;
}

self.onmessage = (e: MessageEvent<TrimRequest>) => {
  const { id, payload } = e.data;
  const { entries, targetBytes } = payload;

  try {
    const result = computeLRUEviction(entries, targetBytes);

    self.postMessage({
      id,
      type: 'cache-trim',
      success: true,
      payload: result,
    });
  } catch (err) {
    self.postMessage({
      id,
      type: 'cache-trim',
      success: false,
      error: (err as Error).message,
    });
  }
};

function computeLRUEviction(
  entries: CacheEntry[],
  targetBytes: number,
): TrimResult {
  if (entries.length === 0) {
    return { evictedIds: [], remainingBytes: 0 };
  }

  // Calculate total bytes
  let totalBytes = entries.reduce((sum, e) => sum + e.byteSize, 0);

  if (totalBytes <= targetBytes) {
    return { evictedIds: [], remainingBytes: totalBytes };
  }

  // Sort by lastAccessed ascending (oldest first)
  const sorted = [...entries].sort((a, b) => a.lastAccessed - b.lastAccessed);

  const evictedIds: Array<{ compId: string; frame: number }> = [];

  for (const entry of sorted) {
    if (totalBytes <= targetBytes) break;

    totalBytes -= entry.byteSize;
    evictedIds.push({ compId: entry.compId, frame: entry.frame });
  }

  return { evictedIds, remainingBytes: totalBytes };
}
