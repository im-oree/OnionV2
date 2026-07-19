/**
 * historyStore — full undo/redo via serialized snapshots.
 *
 * Before each mutation, call `captureForUndo('Action Name')` to snapshot the
 * current state. undo/redo restores the snapshot by directly calling setState
 * on the composition + keyframe stores.
 *
 * Uses global store references ((window as any).__compositionStore etc.)
 * to avoid circular imports. These are set in App.tsx on mount.
 */
import { create } from 'zustand';

const MAX_HISTORY = 50;

export interface HistoryEntry {
  name: string;
  snapshot: string;
}

export interface HistoryState {
  past: HistoryEntry[];
  future: HistoryEntry[];
  isApplying: boolean;

  /** Push a snapshot of the state BEFORE this mutation */
  pushEntry: (name: string, beforeSnapshot: string) => void;

  undo: () => void;
  redo: () => void;
  clear: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  isApplying: false,

  pushEntry: (name, beforeSnapshot) => {
    if (get().isApplying) return;
    set({
      past: [...get().past.slice(-(MAX_HISTORY - 1)), { name, snapshot: beforeSnapshot }],
      future: [],
    });
  },

  undo: () => {
    const { past, future, isApplying } = get();
    if (isApplying || past.length === 0) return;

    const entry = past[past.length - 1];
    const currentSnapshot = captureSnapshot();

    set({ past: past.slice(0, -1), future: [...future, { name: entry.name, snapshot: currentSnapshot }], isApplying: true });

    restoreSnapshot(entry.snapshot, () => set({ isApplying: false }));
  },

  redo: () => {
    const { past, future, isApplying } = get();
    if (isApplying || future.length === 0) return;

    const entry = future[future.length - 1];
    const currentSnapshot = captureSnapshot();

    set({ future: future.slice(0, -1), past: [...past, { name: entry.name, snapshot: currentSnapshot }], isApplying: true });

    restoreSnapshot(entry.snapshot, () => set({ isApplying: false }));
  },

  clear: () => set({ past: [], future: [] }),
  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
}));

// ── Snapshot helpers (use global window refs to avoid circular imports) ──

function getStoreRef(name: string): any {
  return (window as any)[name] ?? null;
}

export function captureSnapshot(): string {
  try {
    const compStore = getStoreRef('__compositionStore');
    const kfStore = getStoreRef('__keyframeStore');
    if (!compStore || !kfStore) return '{}';

    const compState = compStore.getState();
    const kfState = kfStore.getState();

    const compositions = compState.compositions.map((c: any) => ({
      ...c,
      layers: c.layers.map((l: any) => ({ ...l })),
    }));

    // Serialize keyframe engine data
    const engine = kfState.engine;
    const keyframeData: Record<string, Record<string, any[]>> = {};
    const data = (engine as any)._data as Map<string, Map<string, any[]>>;
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

    return JSON.stringify({
      compositions,
      activeCompositionId: compState.activeCompositionId,
      keyframes: keyframeData,
    });
  } catch {
    return '{}';
  }
}

function restoreSnapshot(snapshot: string, onDone: () => void): void {
  try {
    const data = JSON.parse(snapshot);
    if (!data.compositions) { onDone(); return; }

    const compStore = getStoreRef('__compositionStore');
    const kfStore = getStoreRef('__keyframeStore');
    if (!compStore || !kfStore) { onDone(); return; }

    // Restore compositions
    compStore.setState({
      compositions: data.compositions,
      activeCompositionId: data.activeCompositionId,
    });

    // Restore keyframes
    const kfState = kfStore.getState();
    const engine = kfState.engine;
    const engineData = (engine as any)._data as Map<string, Map<string, any[]>>;
    engineData.clear();

    if (data.keyframes) {
      for (const [layerId, propMap] of Object.entries(data.keyframes)) {
        const layerMap = new Map<string, any[]>();
        for (const [prop, kfs] of Object.entries(propMap as Record<string, any[]>)) {
          layerMap.set(prop, kfs);
        }
        engineData.set(layerId, layerMap);
      }
    }

    // Trigger re-render
    kfStore.setState({
      revision: Date.now(),
      animatedProperties: syncAnimatedProps(engine),
    });

    // Mark project dirty
    import('../storage/StorageManager').then(m => m.markProjectDirty());

    onDone();
  } catch {
    onDone();
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
