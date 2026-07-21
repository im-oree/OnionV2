/**
 * historyStore — Full undo/redo via serialized state snapshots.
 *
 * Every user action that mutates data pushes a snapshot of ALL mutable state
 * (compositions, keyframes, effects, masks, markers) onto the undo stack.
 * Undo pops a snapshot and restores it; redo re-applies popped snapshots.
 *
 * Memory management:
 * - Up to RAM_LIMIT snapshots stay in memory (fast restore)
 * - Overflow snapshots are persisted to IndexedDB (slower but saves RAM)
 * - On undo, if the needed snapshot is on disk, it's loaded async
 *
 * High-frequency mutations (drag, scrub) use the debounced capture API
 * to avoid snapshot spam — only the final state is recorded.
 */
import { create } from 'zustand';

// ── Constants ──────────────────────────────────────────
const RAM_LIMIT = 30;          // snapshots kept in RAM
const DISK_LIMIT = 200;        // max snapshots on disk
const DEBOUNCE_MS = 150;       // debounce window for rapid mutations

// ── Types ──────────────────────────────────────────────
export interface HistoryEntry {
  name: string;
  snapshot: string;            // JSON-serialized full state
}

export interface DiskEntry {
  id: number;                  // auto-increment key in IndexedDB
  snapshot: string;
  name: string;
}

export interface HistoryState {
  past: HistoryEntry[];        // in-memory undo stack (most recent last)
  future: HistoryEntry[];      // in-memory redo stack (most recent last)
  isApplying: boolean;         // guard against re-entrant snapshots during undo/redo
  diskPastCount: number;       // how many entries are on disk before the in-memory stack

  // Actions
  pushEntry: (name: string, beforeSnapshot: string) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  clear: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  getUndoLabel: () => string | null;
  getRedoLabel: () => string | null;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  isApplying: false,
  diskPastCount: 0,

  pushEntry: (name, beforeSnapshot) => {
    if (get().isApplying) return;
    const entry: HistoryEntry = { name, snapshot: beforeSnapshot };

    let newPast = [...get().past, entry];
    let overflow = 0;

    // If past exceeds RAM limit, spill oldest entries to disk
    if (newPast.length > RAM_LIMIT) {
      overflow = newPast.length - RAM_LIMIT;
      const toSpill = newPast.slice(0, overflow);
      newPast = newPast.slice(overflow);
      // Spill to disk (fire-and-forget)
      _spillToDisk(toSpill).catch(() => {});
    }

    set({
      past: newPast,
      future: [],               // new action clears redo stack
      diskPastCount: get().diskPastCount + overflow,
    });
  },

  undo: async () => {
    const { past, future, isApplying } = get();
    if (isApplying || past.length === 0) return;

    set({ isApplying: true });
    try {
      const entry = past[past.length - 1];
      const currentSnapshot = captureSnapshot();

      // If past has only 1 entry and we have disk entries, load the previous one from disk
      let restoredSnapshot = entry.snapshot;
      let newPast = past.slice(0, -1);
      let newDiskPastCount = get().diskPastCount;

      if (newPast.length === 0 && newDiskPastCount > 0) {
        // Load the most recent disk entry
        const diskEntry = await _popFromDisk();
        if (diskEntry) {
          restoredSnapshot = diskEntry.snapshot;
          newDiskPastCount = Math.max(0, newDiskPastCount - 1);

          // Also load some disk entries back into RAM to refill
          const refill = await _loadFromDisk(newDiskPastCount, Math.min(10, RAM_LIMIT - 1));
          newPast = refill.entries;
          newDiskPastCount = refill.remaining;
        }
      }

      set({
        past: newPast,
        future: [...future, { name: entry.name, snapshot: currentSnapshot }],
        diskPastCount: newDiskPastCount,
      });

      await restoreSnapshot(restoredSnapshot);
    } finally {
      set({ isApplying: false });
    }
  },

  redo: async () => {
    const { past, future, isApplying } = get();
    if (isApplying || future.length === 0) return;

    set({ isApplying: true });
    try {
      const entry = future[future.length - 1];
      const currentSnapshot = captureSnapshot();

      set({
        past: [...past, { name: entry.name, snapshot: currentSnapshot }],
        future: future.slice(0, -1),
      });

      await restoreSnapshot(entry.snapshot);
    } finally {
      set({ isApplying: false });
    }
  },

  clear: () => {
    set({ past: [], future: [], diskPastCount: 0 });
    _clearDisk().catch(() => {});
  },

  canUndo: () => get().past.length > 0 || get().diskPastCount > 0,
  canRedo: () => get().future.length > 0,
  getUndoLabel: () => {
    const { past } = get();
    return past.length > 0 ? past[past.length - 1].name : null;
  },
  getRedoLabel: () => {
    const { future } = get();
    return future.length > 0 ? future[future.length - 1].name : null;
  },
}));

// ═══════════════════════════════════════════════════════════
//  Snapshot capture — includes ALL mutable stores
// ═══════════════════════════════════════════════════════════

function getStoreRef(name: string): any {
  return (window as any)[name] ?? null;
}

export function captureSnapshot(): string {
  try {
    const compStore = getStoreRef('__compositionStore');
    const kfStore = getStoreRef('__keyframeStore');
    const fxStore = getStoreRef('__effectsStore');
    const maskStore = getStoreRef('__maskStore');
    const markerStore = getStoreRef('__markerStore');

    // Compositions
    const compState = compStore?.getState();
    const compositions = compState
      ? compState.compositions.map((c: any) => ({
          ...c,
          layers: c.layers.map((l: any) => ({ ...l })),
        }))
      : [];
    const activeCompositionId = compState?.activeCompositionId ?? null;

    // Keyframes
    const keyframeData: Record<string, Record<string, any[]>> = {};
    if (kfStore) {
      const engine = kfStore.getState().engine;
      const data = (engine as any)._data as Map<string, Map<string, any[]>> | undefined;
      if (data) {
        for (const [layerId, propMap] of data) {
          if (propMap.size === 0) continue;
          const propObj: Record<string, any[]> = {};
          for (const [prop, kfs] of propMap) {
            propObj[prop] = kfs.map((k: any) => ({ ...k }));
          }
          keyframeData[layerId] = propObj;
        }
      }
    }

    // Effects
    const effectsByLayer = fxStore ? { ...fxStore.getState().effectsByLayer } : {};

    // Masks
    const masksByLayer = maskStore ? { ...maskStore.getState().masksByLayer } : {};

    // Markers
    const markersByComposition = markerStore ? { ...markerStore.getState().markersByComposition } : {};

    return JSON.stringify({
      compositions,
      activeCompositionId,
      keyframes: keyframeData,
      effectsByLayer,
      masksByLayer,
      markersByComposition,
    });
  } catch {
    return '{}';
  }
}

// ═══════════════════════════════════════════════════════════
//  Snapshot restore — applies all stores from a snapshot
// ═══════════════════════════════════════════════════════════

async function restoreSnapshot(snapshot: string): Promise<void> {
  try {
    const data = JSON.parse(snapshot);
    if (!data.compositions) return;

    const compStore = getStoreRef('__compositionStore');
    const kfStore = getStoreRef('__keyframeStore');
    const fxStore = getStoreRef('__effectsStore');
    const maskStore = getStoreRef('__maskStore');
    const markerStore = getStoreRef('__markerStore');

    // Restore compositions
    if (compStore) {
      compStore.setState({
        compositions: data.compositions,
        activeCompositionId: data.activeCompositionId,
      });
    }

    // Restore keyframes
    if (kfStore && data.keyframes) {
      const engine = kfStore.getState().engine;
      const engineData = (engine as any)._data as Map<string, Map<string, any[]>>;
      engineData.clear();
      for (const [layerId, propMap] of Object.entries(data.keyframes)) {
        const layerMap = new Map<string, any[]>();
        for (const [prop, kfs] of Object.entries(propMap as Record<string, any[]>)) {
          layerMap.set(prop, kfs.map((k: any) => ({ ...k })));
        }
        engineData.set(layerId, layerMap);
      }
      kfStore.setState({
        revision: Date.now(),
        animatedProperties: syncAnimatedProps(engine),
      });
    }

    // Restore effects
    if (fxStore && data.effectsByLayer) {
      fxStore.setState({ effectsByLayer: data.effectsByLayer });
    }

    // Restore masks
    if (maskStore && data.masksByLayer) {
      maskStore.setState({ masksByLayer: data.masksByLayer });
    }

    // Restore markers
    if (markerStore && data.markersByComposition) {
      markerStore.setState({ markersByComposition: data.markersByComposition });
    }

    // Mark project dirty
    import('../storage/StorageManager').then(m => m.markProjectDirty());
  } catch {
    // Silent fail — snapshot was corrupt or stores unavailable
  }
}

function syncAnimatedProps(engine: any): Map<string, Set<string>> {
  const data = (engine as any)._data as Map<string, Map<string, any[]>>;
  const result = new Map<string, Set<string>>();
  for (const [layerId, propMap] of data) {
    const props = new Set<string>();
    for (const [prop, kfs] of propMap) {
      if (kfs.length > 0) props.add(prop);
    }
    if (props.size > 0) result.set(layerId, props);
  }
  return result;
}

// ═══════════════════════════════════════════════════════════
//  Debounced snapshot capture
// ═══════════════════════════════════════════════════════════

let _debounceTimer: ReturnType<typeof setTimeout> | null = null;
let _pendingSnapshot: string | null = null;
let _pendingName: string = '';

/**
 * Call this BEFORE a high-frequency mutation (e.g., during mouse drag).
 * The actual snapshot is captured DEBOUNCED — only the final state is recorded.
 * Call `flushDebouncedSnapshot()` when the interaction ends (e.g., mouseup).
 */
export function debouncedCapture(name: string): void {
  if (useHistoryStore.getState().isApplying) return;
  _pendingSnapshot = captureSnapshot();
  _pendingName = name;
  if (_debounceTimer) clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(() => {
    if (_pendingSnapshot) {
      useHistoryStore.getState().pushEntry(_pendingName, _pendingSnapshot);
      _pendingSnapshot = null;
      _pendingName = '';
    }
  }, DEBOUNCE_MS);
}

/**
 * Flush the debounced snapshot immediately (call on mouseup / interaction end).
 */
export function flushDebouncedSnapshot(): void {
  if (_debounceTimer) {
    clearTimeout(_debounceTimer);
    _debounceTimer = null;
  }
  if (_pendingSnapshot) {
    useHistoryStore.getState().pushEntry(_pendingName, _pendingSnapshot);
    _pendingSnapshot = null;
    _pendingName = '';
  }
}

/**
 * Cancel any pending debounced snapshot (e.g., if the user cancelled the operation).
 */
export function cancelDebouncedSnapshot(): void {
  if (_debounceTimer) {
    clearTimeout(_debounceTimer);
    _debounceTimer = null;
  }
  _pendingSnapshot = null;
  _pendingName = '';
}

// ═══════════════════════════════════════════════════════════
//  IndexedDB disk persistence for overflow snapshots
// ═══════════════════════════════════════════════════════════

const DB_NAME = 'onion-undo-history';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function _spillToDisk(entries: HistoryEntry[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (const entry of entries) {
      store.add({ snapshot: entry.snapshot, name: entry.name });
    }
    // Trim old entries if over limit
    const countReq = store.count();
    countReq.onsuccess = () => {
      const count = countReq.result;
      if (count > DISK_LIMIT) {
        const toDelete = count - DISK_LIMIT;
        const cursor = store.openCursor();
        let deleted = 0;
        cursor.onsuccess = () => {
          const c = cursor.result;
          if (c && deleted < toDelete) {
            c.delete();
            deleted++;
            c.continue();
          }
        };
      }
    };
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // IndexedDB unavailable — just lose overflow snapshots
  }
}

async function _popFromDisk(): Promise<DiskEntry | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    // Get the last (most recent) entry
    const allReq = store.getAll();
    const entries = await new Promise<DiskEntry[]>((resolve, reject) => {
      allReq.onsuccess = () => resolve(allReq.result as DiskEntry[]);
      allReq.onerror = () => reject(allReq.error);
    });
    db.close();

    if (entries.length === 0) return null;
    const last = entries[entries.length - 1];

    // Delete it from disk
    const db2 = await openDB();
    const tx2 = db2.transaction(STORE_NAME, 'readwrite');
    tx2.objectStore(STORE_NAME).delete(last.id);
    await new Promise<void>((resolve) => { tx2.oncomplete = () => resolve(); });
    db2.close();

    return last;
  } catch {
    return null;
  }
}

async function _loadFromDisk(
  offset: number,
  count: number,
): Promise<{ entries: HistoryEntry[]; remaining: number }> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const allReq = tx.objectStore(STORE_NAME).getAll();
    const all = await new Promise<DiskEntry[]>((resolve, reject) => {
      allReq.onsuccess = () => resolve(allReq.result as DiskEntry[]);
      allReq.onerror = () => reject(allReq.error);
    });
    db.close();

    // Take the last `count` entries (most recent first)
    const sliced = all.slice(-count - offset, all.length - offset);
    return {
      entries: sliced.map(e => ({ name: e.name, snapshot: e.snapshot })),
      remaining: Math.max(0, all.length - sliced.length),
    };
  } catch {
    return { entries: [], remaining: offset };
  }
}

async function _clearDisk(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    await new Promise<void>((resolve) => { tx.oncomplete = () => resolve(); });
    db.close();
  } catch {
    // Ignore
  }
}
