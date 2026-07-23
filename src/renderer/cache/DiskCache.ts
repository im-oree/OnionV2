/**
 * DiskCache — persistent frame cache.
 *
 * Storage tiers (attempted in order):
 *   1. OPFS (Origin Private File System) via cacheWorker — fastest, quota-free
 *   2. IndexedDB — universal fallback
 *
 * All disk I/O runs off the main thread via the cache worker.
 * The manifest (hash → metadata) is kept in a small IndexedDB
 * table so we can enumerate/purge without reading every blob.
 *
 * Key format: `${compId}/${frame}/${hash}.bin`
 */

export interface DiskCacheManifestEntry {
  hash: string;
  compId: string;
  frame: number;
  byteSize: number;
  width: number;
  height: number;
  storedAt: number;   // timestamp
  tier: 'opfs' | 'idb';
}

export type DiskCacheTier = 'opfs' | 'idb';

// ── IndexedDB helpers ──────────────────────────────────────────

const IDB_NAME = 'OnionDiskCache';
const IDB_FRAME_STORE = 'frames';      // key: hash, value: Uint8Array (raw RGBA)
const IDB_MANIFEST_STORE = 'manifest'; // key: hash, value: DiskCacheManifestEntry
const IDB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_FRAME_STORE)) {
        db.createObjectStore(IDB_FRAME_STORE);
      }
      if (!db.objectStoreNames.contains(IDB_MANIFEST_STORE)) {
        const ms = db.createObjectStore(IDB_MANIFEST_STORE, { keyPath: 'hash' });
        ms.createIndex('compId', 'compId');
        ms.createIndex('storedAt', 'storedAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet(db: IDBDatabase, store: string, key: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, store: string, key: string, value: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function idbPutKeyPath(db: IDBDatabase, store: string, value: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function idbDelete(db: IDBDatabase, store: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function idbGetAll(db: IDBDatabase, store: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── OPFS helpers (run in cacheWorker via postMessage) ──────────
// DiskCache delegates OPFS operations to cacheWorker.
// The worker handles FileSystemFileHandle read/write.
// On main thread we just track whether OPFS is available.

async function checkOPFS(): Promise<boolean> {
  try {
    if (!('storage' in navigator) || !('getDirectory' in navigator.storage)) {
      return false;
    }
    // Quick probe
    await navigator.storage.getDirectory();
    return true;
  } catch {
    return false;
  }
}

// ── DiskCache class ────────────────────────────────────────────

export class DiskCache {
  private _db: IDBDatabase | null = null;
  private _opfsAvailable = false;
  private _maxBytes: number;
  private _usedBytes = 0;
  private _ready: Promise<void>;
  private _hits = 0;
  private _misses = 0;

  /** Worker reference — injected by FrameCache after creation */
  worker: Worker | null = null;
  private _pendingWorker = new Map<string, {
    resolve: (buf: ArrayBuffer | null) => void;
    reject: (e: Error) => void;
  }>();

  constructor(maxBytes = 10 * 1024 * 1024 * 1024) {
    this._maxBytes = Math.max(256 * 1024 * 1024, maxBytes);
    this._ready = this._init();
  }

  private async _init(): Promise<void> {
    try {
      this._db = await openDB();
      this._opfsAvailable = await checkOPFS();
      await this._recomputeUsedBytes();
    } catch (err) {
      console.warn('[DiskCache] Init error:', err);
    }
  }

  get ready(): Promise<void> { return this._ready; }
  get maxBytes(): number { return this._maxBytes; }
  get usedBytes(): number { return this._usedBytes; }
  get isOPFS(): boolean { return this._opfsAvailable; }
  get hits(): number { return this._hits; }
  get misses(): number { return this._misses; }

  setMaxBytes(bytes: number): void {
    this._maxBytes = Math.max(256 * 1024 * 1024, bytes);
    // Fire-and-forget eviction
    this._evictToTarget(this._maxBytes).catch(() => {});
  }

  // ── Get ─────────────────────────────────────────────────────

  async get(hash: string): Promise<ImageData | null> {
    await this._ready;
    if (!this._db) return null;

    const meta = await idbGet(this._db, IDB_MANIFEST_STORE, hash) as DiskCacheManifestEntry | undefined;
    if (!meta) {
      this._misses++;
      return null;
    }

    try {
      let rawRGBA: Uint8Array | null = null;

      if (meta.tier === 'opfs' && this._opfsAvailable && this.worker) {
        rawRGBA = await this._workerRead(hash);
      }

      // Fallback to IDB
      if (!rawRGBA) {
        const buf = await idbGet(this._db, IDB_FRAME_STORE, hash) as Uint8Array | undefined;
        if (!buf) {
          this._misses++;
          return null;
        }
        rawRGBA = buf;
      }

      // Reconstruct ImageData from raw RGBA bytes
      const imageData = new ImageData(
        new Uint8ClampedArray(rawRGBA.buffer, rawRGBA.byteOffset, rawRGBA.byteLength),
        meta.width,
        meta.height,
      );
      this._hits++;
      return imageData;
    } catch (err) {
      console.warn('[DiskCache] get error:', err);
      this._misses++;
      return null;
    }
  }

  // ── Set ─────────────────────────────────────────────────────

  async set(
    hash: string,
    data: ImageData,
    compId: string,
    frame: number,
  ): Promise<void> {
    await this._ready;
    if (!this._db) return;

    const byteSize = data.width * data.height * 4;

    // Skip if single frame exceeds budget
    if (byteSize > this._maxBytes) return;

    // Evict old entries if needed
    await this._evictToTarget(this._maxBytes - byteSize);

    // Determine storage tier
    const tier: DiskCacheTier =
      this._opfsAvailable && this.worker ? 'opfs' : 'idb';

    const raw = new Uint8Array(data.data.buffer, data.data.byteOffset, data.data.byteLength);

    try {
      if (tier === 'opfs' && this.worker) {
        await this._workerWrite(hash, raw);
      } else {
        await idbPut(this._db, IDB_FRAME_STORE, hash, raw);
      }

      const manifest: DiskCacheManifestEntry = {
        hash,
        compId,
        frame,
        byteSize,
        width: data.width,
        height: data.height,
        storedAt: Date.now(),
        tier,
      };
      await idbPutKeyPath(this._db, IDB_MANIFEST_STORE, manifest);
      this._usedBytes += byteSize;
    } catch (err) {
      console.warn('[DiskCache] set error:', err);
    }
  }

  // ── Delete ──────────────────────────────────────────────────

  async delete(hash: string): Promise<void> {
    await this._ready;
    if (!this._db) return;
    const meta = await idbGet(this._db, IDB_MANIFEST_STORE, hash) as DiskCacheManifestEntry | undefined;
    if (!meta) return;
    try {
      if (meta.tier === 'opfs' && this.worker) {
        await this._workerDelete(hash);
      } else {
        await idbDelete(this._db, IDB_FRAME_STORE, hash);
      }
      await idbDelete(this._db, IDB_MANIFEST_STORE, hash);
      this._usedBytes = Math.max(0, this._usedBytes - meta.byteSize);
    } catch (err) {
      console.warn('[DiskCache] delete error:', err);
    }
  }

  async invalidateComp(compId: string): Promise<number> {
    await this._ready;
    if (!this._db) return 0;
    const all = await idbGetAll(this._db, IDB_MANIFEST_STORE) as DiskCacheManifestEntry[];
    const toDelete = all.filter(e => e.compId === compId);
    for (const entry of toDelete) {
      await this.delete(entry.hash);
    }
    return toDelete.length;
  }

  async purgeAll(): Promise<void> {
    await this._ready;
    if (!this._db) return;
    const all = await idbGetAll(this._db, IDB_MANIFEST_STORE) as DiskCacheManifestEntry[];
    for (const entry of all) {
      await this.delete(entry.hash);
    }
    this._usedBytes = 0;
  }

  // ── Eviction ────────────────────────────────────────────────

  private async _evictToTarget(targetBytes: number): Promise<void> {
    if (!this._db) return;
    if (this._usedBytes <= targetBytes) return;

    const all = await idbGetAll(this._db, IDB_MANIFEST_STORE) as DiskCacheManifestEntry[];
    // Sort oldest first
    all.sort((a, b) => a.storedAt - b.storedAt);

    for (const entry of all) {
      if (this._usedBytes <= targetBytes) break;
      await this.delete(entry.hash);
    }
  }

  private async _recomputeUsedBytes(): Promise<void> {
    if (!this._db) return;
    const all = await idbGetAll(this._db, IDB_MANIFEST_STORE) as DiskCacheManifestEntry[];
    this._usedBytes = all.reduce((sum, e) => sum + e.byteSize, 0);
  }

  // ── Worker OPFS bridge ───────────────────────────────────────

  /** Attach the cache worker (called by FrameCache after construction) */
  attachWorker(worker: Worker): void {
    this.worker = worker;
    worker.addEventListener('message', (e: MessageEvent) => {
      const { id, type, success, payload, error } = e.data;
      if (type !== 'disk-opfs-read' && type !== 'disk-opfs-write' && type !== 'disk-opfs-delete') return;
      const pending = this._pendingWorker.get(id);
      if (!pending) return;
      this._pendingWorker.delete(id);
      if (success) {
        pending.resolve(payload ?? null);
      } else {
        pending.reject(new Error(error ?? 'OPFS worker error'));
      }
    });
  }

  private _workerRead(hash: string): Promise<Uint8Array | null> {
    return new Promise((resolve, reject) => {
      if (!this.worker) { resolve(null); return; }
      const id = `opfs-r-${hash}-${Date.now()}`;
      const timeout = setTimeout(() => {
        this._pendingWorker.delete(id);
        resolve(null); // degrade gracefully
      }, 5000);
      this._pendingWorker.set(id, {
        resolve: (buf) => { clearTimeout(timeout); resolve(buf ? new Uint8Array(buf as ArrayBuffer) : null); },
        reject: (e) => { clearTimeout(timeout); reject(e); },
      });
      this.worker.postMessage({ id, type: 'disk-opfs-read', payload: { hash } });
    });
  }

  private _workerWrite(hash: string, data: Uint8Array): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.worker) { reject(new Error('No worker')); return; }
      const id = `opfs-w-${hash}-${Date.now()}`;
      const timeout = setTimeout(() => {
        this._pendingWorker.delete(id);
        reject(new Error('OPFS write timeout'));
      }, 10000);
      // Transfer the buffer for zero-copy
      const buf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      this._pendingWorker.set(id, {
        resolve: () => { clearTimeout(timeout); resolve(); },
        reject: (e) => { clearTimeout(timeout); reject(e); },
      });
      this.worker.postMessage(
        { id, type: 'disk-opfs-write', payload: { hash, buffer: buf } },
        [buf],
      );
    });
  }

  private _workerDelete(hash: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.worker) { resolve(); return; }
      const id = `opfs-d-${hash}-${Date.now()}`;
      const timeout = setTimeout(() => {
        this._pendingWorker.delete(id);
        resolve();
      }, 5000);
      this._pendingWorker.set(id, {
        resolve: () => { clearTimeout(timeout); resolve(); },
        reject: () => { clearTimeout(timeout); resolve(); }, // non-fatal
      });
      this.worker.postMessage({ id, type: 'disk-opfs-delete', payload: { hash } });
    });
  }

  getStats() {
    return {
      usedBytes: this._usedBytes,
      maxBytes: this._maxBytes,
      usageFraction: this._maxBytes > 0 ? this._usedBytes / this._maxBytes : 0,
      hits: this._hits,
      misses: this._misses,
      tier: this._opfsAvailable ? 'opfs' : 'idb',
    };
  }

  dispose(): void {
    this._db?.close();
    this._db = null;
  }
}