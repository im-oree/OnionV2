import { create } from 'zustand';
import type { Composition } from '../types/composition';
import type { Layer, CompData } from '../types/layer';
import { DEFAULT_COMPOSITION } from '../config/defaults';
import { canNestComposition, findCompositionsUsing } from '../utils/compositionGraph';
import { markProjectDirty } from '../storage/StorageManager';
import { captureSnapshot } from './historyStore';
import { useHistoryStore } from './historyStore';

function genId(): string { return `comp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`; }

export interface CompositionState {
  compositions: Composition[];
  activeCompositionId: string | null;
  clearAll: () => void;
  addComposition: (overrides?: Partial<Composition>) => Composition;
  removeComposition: (id: string) => { ok: boolean; reason?: string };
  setActiveComposition: (id: string) => void;
  updateComposition: (id: string, updates: Partial<Composition>) => void;
  addLayer: (compId: string, layer: Layer) => void;
  /**
   * Add a nested composition layer to `parentCompId`. Blocks cycles.
   * Returns { ok: false, reason } if unsafe.
   */
  addCompLayer: (parentCompId: string, sourceCompId: string) => { ok: boolean; reason?: string; layer?: Layer };
  removeLayer: (compId: string, layerId: string) => void;
  updateLayer: (compId: string, layerId: string, updates: Partial<Layer>, skipHistory?: boolean) => void;
  reorderLayers: (compId: string, from: number, to: number) => void;
  setCurrentTime: (compId: string, time: number) => void;
  getActiveComposition: () => Composition | null;
}

export const useCompositionStore = create<CompositionState>((set, get) => ({
  compositions: [],
  activeCompositionId: null,

  addComposition: (overrides) => {
    const snapshot = captureSnapshot();
    const c: Composition = {
      ...DEFAULT_COMPOSITION,
      id: genId(),
      name: `Comp ${get().compositions.length + 1}`,
      ...overrides,
    };
    set(s => ({
      compositions: [...s.compositions, c],
      activeCompositionId: s.activeCompositionId ?? c.id,
    }));
    markProjectDirty();
    useHistoryStore.getState().pushEntry('Add Composition', snapshot);
    return c;
  },

  removeComposition: (id) => {
    const state = get();
    const uses = findCompositionsUsing(id, state.compositions);
    if (uses.length > 0) {
      return {
        ok: false,
        reason: `Composition is used as a layer in: ${uses.map(c => c.name).join(', ')}`,
      };
    }
    const snapshot = captureSnapshot();
    set(s => ({
      compositions: s.compositions.filter(c => c.id !== id),
      activeCompositionId: s.activeCompositionId === id
        ? s.compositions.find(c => c.id !== id)?.id ?? null
        : s.activeCompositionId,
    }));
    markProjectDirty();
    useHistoryStore.getState().pushEntry('Remove Composition', snapshot);
    return { ok: true };
  },

  setActiveComposition: (id) => set({ activeCompositionId: id }),

  updateComposition: (id, updates) => {
    const state = get();
    const current = state.compositions.find(c => c.id === id);
    if (!current) return;

    const snapshot = captureSnapshot();

    // If fps is changing, remap all keyframes proportionally
    if (updates.fps !== undefined && updates.fps !== current.fps && updates.fps > 0) {
      const oldFps = current.fps;
      const newFps = updates.fps;
      const ratio = newFps / oldFps;
      // Lazy-import to avoid circular dep
      import('./keyframeStore').then(({ useKeyframeStore }) => {
        const engine: any = useKeyframeStore.getState().engine;
        for (const layer of current.layers) {
          const propMap = engine._data.get(layer.id);
          if (!propMap) continue;
          for (const [, arr] of propMap as Map<string, any[]>) {
            for (const k of arr) k.time = Math.round(k.time * ratio);
            arr.sort((a, b) => a.time - b.time);
          }
        }
        useKeyframeStore.setState(s => ({ revision: s.revision + 1 }));
      });
    }

    set(s => ({
      compositions: s.compositions.map(c => c.id === id ? { ...c, ...updates } : c),
    }));
    markProjectDirty();
    useHistoryStore.getState().pushEntry('Update Composition', snapshot);
  },

  addLayer: (compId, layer) => {
    const snapshot = captureSnapshot();
    set(s => ({
      compositions: s.compositions.map(c => c.id === compId ? { ...c, layers: [...c.layers, layer] } : c),
    }));
    markProjectDirty();
    useHistoryStore.getState().pushEntry('Add Layer', snapshot);
  },

  addCompLayer: (parentCompId, sourceCompId) => {
    const state = get();
    const check = canNestComposition(parentCompId, sourceCompId, state.compositions);
    if (!check.ok) return { ok: false, reason: check.reason };

    const source = state.compositions.find(c => c.id === sourceCompId);
    const parent = state.compositions.find(c => c.id === parentCompId);
    if (!source || !parent) return { ok: false, reason: 'Composition not found' };

    const snapshot = captureSnapshot();

    const data: CompData = { sourceCompId, loop: false, timeScale: 1, timeOffset: 0 };
    const layer: Layer = {
      id: `layer_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: 'comp',
      name: source.name,
      visible: true,
      locked: false,
      soloed: false,
      shy: false,
      parentId: null,
      blendMode: 'normal',
      opacity: 100,
      startFrame: 0,
      endFrame: Math.floor(source.duration * source.fps),
      zIndex: parent.layers.length + 1,
      transform: {
        position: { x: 0, y: 0 },
        scale: { x: 100, y: 100 },
        rotation: 0,
        anchorPoint: { x: 0, y: 0 },
      },
      effects: [],
      masks: [],
      data,
    };
    set(s => ({
      compositions: s.compositions.map(c =>
        c.id === parentCompId ? { ...c, layers: [...c.layers, layer] } : c,
      ),
    }));
    markProjectDirty();
    useHistoryStore.getState().pushEntry('Add Comp Layer', snapshot);
    return { ok: true, layer };
  },

  removeLayer: (compId, layerId) => {
    const snapshot = captureSnapshot();
    set(s => ({
      compositions: s.compositions.map(c =>
        c.id === compId ? { ...c, layers: c.layers.filter(l => l.id !== layerId) } : c,
      ),
    }));
    markProjectDirty();
    useHistoryStore.getState().pushEntry('Remove Layer', snapshot);
  },

  updateLayer: (compId, layerId, updates, skipHistory?: boolean) => {
    // Skip history capture for high-frequency updates (e.g. mouse drag) to avoid
    // serializing the entire project state 60 times/second. The caller (e.g.
    // ModalTransform.confirm()) is responsible for capturing a snapshot on completion.
    const snapshot = !skipHistory ? captureSnapshot() : null;
    set(s => ({
      compositions: s.compositions.map(c =>
        c.id === compId ? { ...c, layers: c.layers.map(l => l.id === layerId ? { ...l, ...updates } : l) } : c,
      ),
    }));
    markProjectDirty();
    if (!skipHistory && snapshot) {
      useHistoryStore.getState().pushEntry('Update Layer', snapshot);
    }
  },


  reorderLayers: (compId, from, to) => {
    const snapshot = captureSnapshot();
    set(s => ({
      compositions: s.compositions.map(c => {
        if (c.id !== compId) return c;
        const layers = [...c.layers];
        const [m] = layers.splice(from, 1);
        if (m) layers.splice(to, 0, m);
        // Update zIndex to match new array positions so sortedLayers
        // (which sorts by zIndex) reflects the new order.
        layers.forEach((l, i) => { l.zIndex = i; });
        return { ...c, layers };
      }),
    }));
    markProjectDirty();
    useHistoryStore.getState().pushEntry('Reorder Layers', snapshot);
  },

  clearAll: () => {
    set({ compositions: [], activeCompositionId: null });
    markProjectDirty();
  },

  setCurrentTime: (compId, time) => {
    set(s => ({
      compositions: s.compositions.map(c => c.id === compId ? { ...c, currentTime: time } : c),
    }));
  },
  // (setCurrentTime intentionally does NOT mark dirty — it's a transient playback change)


  getActiveComposition: () => {
    const s = get();
    return s.activeCompositionId
      ? s.compositions.find(c => c.id === s.activeCompositionId) ?? null
      : null;
  },
}));