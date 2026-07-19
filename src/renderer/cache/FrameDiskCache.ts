/**
 * FrameDiskCache — persists cached frames to IndexedDB for fast reload.
 *
 * Frames are stored as PNG Blobs keyed by `compId_frameNumber`.
 * On app load, frames are eagerly loaded from disk into the in-memory FrameCache.
 * Writes are debounced and batched into single transactions for performance.
 */
import { FrameCache, type CacheQuality } from './FrameCache';

const DB_NAME = 'OnionFrameCache';
const DB_VERSION = 1;
const STORE_NAME = 'frames';

interface DiskFrameEntry {
  id: string;
  compId: string;
  frame: number;
  quality: CacheQuality;
  blob: Blob;
  byteSize: number;
  timestamp: number;
}

export class FrameDiskCache {
  private _db: IDBDatabase | null = null;
  private _available = false;
  private _frameCache: FrameCache;
  private _flushTimer: ReturnType<typeof setTimeout> | null = null;
  /** Set of JSON-stringified `[compId, frame]` tuples queued for writing */
  private _pendingKeys = new Set<string>();
  private _onWriteError: ((err: Error) => void) | null = null;

  constructor(frameCache: FrameCache) {
    this._frameCache = frameCache;
    this._available = typeof indexedDB !== 'undefined';
    if (this._available) {
      this._openDB().catch(() => { this._available = false; });
    }
  }

  set onWriteError(cb: ((err: Error) => void) | null) { this._onWriteError = cb; }
  get available(): boolean { return this._available; }

  private async _openDB(): Promise<IDBDatabase> {
    if (this._db) return this._db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('compId', 'compId', { unique: false });
        }
      };
      req.onsuccess = () => {
        this._db = req.result;
        this._db.onclose = () => { this._db = null; };
        this._db.onversionchange = () => { this._db?.close(); this._db = null; };
        resolve(this._db);
      };
      req.onerror = () => reject(req.error);
    });
  }

  /** Get total disk cache size for a specific composition */
  async getDiskUsage(compId: string): Promise<number> {
    if (!this._available) return 0;
    try {
      const db = await this._openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index('compId');
        const req = index.openCursor(IDBKeyRange.only(compId));
        let total = 0;
        req.onsuccess = () => {
          const cursor = req.result;
          if (cursor) {
            total += (cursor.value as DiskFrameEntry).byteSize;
            cursor.continue();
          } else resolve(total);
        };
        req.onerror = () => reject(req.error);
      });
    } catch { return 0; }
  }

  /** Load all disk-cached frames for a composition into the in-memory FrameCache */
  async loadIntoCache(compId: string): Promise<number> {
    if (!this._available) return 0;
    try {
      const db = await this._openDB();
      const entries = await new Promise<DiskFrameEntry[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index('compId');
        const req = index.getAll(IDBKeyRange.only(compId));
        req.onsuccess = () => resolve(req.result ?? []);
        req.onerror = () => reject(req.error);
      });

      let loaded = 0;
      for (const entry of entries) {
        if (this._frameCache.has(compId, entry.frame, entry.quality)) continue;
        try {
          const bitmap = await createImageBitmap(entry.blob);
          this._frameCache.store(compId, entry.frame, bitmap, entry.quality);
          loaded++;
        } catch {
          this._deleteEntry(entry.id).catch(() => {});
        }
      }
      return loaded;
    } catch { return 0; }
  }

  /** Schedule a frame for disk storage (debounced, batched) */
  scheduleStore(compId: string, frame: number): void {
    if (!this._available) return;
    this._pendingKeys.add(JSON.stringify([compId, frame]));
    if (!this._flushTimer) {
      this._flushTimer = setTimeout(() => this._flush(), 500);
    }
  }

  /** Immediately store all pending frames in a single transaction */
  private async _flush(): Promise<void> {
    this._flushTimer = null;
    if (this._pendingKeys.size === 0) return;

    const keys = Array.from(this._pendingKeys);
    this._pendingKeys.clear();

    // Collect entries from in-memory cache
    const entries: DiskFrameEntry[] = [];
    for (const key of keys) {
      // Key is JSON.stringify([compId, frame])
      const parsed: [string, number] = JSON.parse(key);
      const compId = parsed[0];
      const frame = parsed[1];

      const cached = this._frameCache.get(compId, frame);
      if (!cached || !cached.imageBitmap) continue;

      try {
        const blob = await this._bitmapToBlob(cached.imageBitmap);
        if (!blob) continue;
        entries.push({
          id: `${compId}_${frame}`,
          compId,
          frame,
          quality: cached.quality,
          blob,
          byteSize: cached.byteSize,
          timestamp: Date.now(),
        });
      } catch {}
    }

    if (entries.length === 0) return;

    // Batch all writes in a single transaction
    try {
      const db = await this._openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        for (const entry of entries) store.put(entry);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      this._onWriteError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }

  /** Convert ImageBitmap to PNG Blob via OffscreenCanvas */
  private async _bitmapToBlob(bitmap: ImageBitmap): Promise<Blob | null> {
    try {
      if (typeof OffscreenCanvas !== 'undefined') {
        const oc = new OffscreenCanvas(bitmap.width, bitmap.height);
        const ctx = oc.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(bitmap, 0, 0);
        return await oc.convertToBlob({ type: 'image/png' });
      }
      return null;
    } catch { return null; }
  }

  /** Invalidate disk cache for a frame range */
  async invalidate(compId: string, fromFrame?: number, toFrame?: number): Promise<void> {
    if (!this._available) return;
    try {
      const db = await this._openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('compId');
      const req = index.openCursor(IDBKeyRange.only(compId));

      await new Promise<void>((resolve, reject) => {
        req.onsuccess = () => {
          const cursor = req.result;
          if (cursor) {
            const entry = cursor.value as DiskFrameEntry;
            const match = fromFrame === undefined || toFrame === undefined ||
              (entry.frame >= fromFrame && entry.frame <= toFrame);
            if (match) cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };
        req.onerror = () => reject(req.error);
      });
      tx.oncomplete = () => {};
    } catch {}
  }

  /** Clear ALL disk cache for a composition */
  async clearComposition(compId: string): Promise<void> {
    if (!this._available) return;
    try {
      const db = await this._openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('compId');
      const req = index.openCursor(IDBKeyRange.only(compId));
      await new Promise<void>((resolve) => {
        req.onsuccess = () => {
          const cursor = req.result;
          if (cursor) { cursor.delete(); cursor.continue(); }
          else resolve();
        };
      });
    } catch {}
  }

  /** Clear ALL disk cache across all compositions */
  async clearAll(): Promise<void> {
    if (!this._available) return;
    try {
      const db = await this._openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {}
  }

  /** Get total disk cache size across all compositions */
  async getTotalDiskUsage(): Promise<number> {
    if (!this._available) return 0;
    try {
      const db = await this._openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).openCursor();
        let total = 0;
        req.onsuccess = () => {
          const cursor = req.result;
          if (cursor) {
            total += (cursor.value as DiskFrameEntry).byteSize;
            cursor.continue();
          } else resolve(total);
        };
        req.onerror = () => reject(req.error);
      });
    } catch { return 0; }
  }

  /** Delete a specific entry by ID */
  private async _deleteEntry(id: string): Promise<void> {
    if (!this._available) return;
    try {
      const db = await this._openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {}
  }

  dispose(): void {
    if (this._flushTimer) {
      clearTimeout(this._flushTimer);
      this._flushTimer = null;
    }
    this._pendingKeys.clear();
    this._db?.close();
    this._db = null;
  }
}
