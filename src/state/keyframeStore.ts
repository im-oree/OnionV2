import { create } from 'zustand';
import { KeyframeEngine } from '../animation/KeyframeEngine';
import type { Keyframe, InterpolationType } from '../types/keyframe';

export interface KeyframeState {
  engine: KeyframeEngine;
  selectedKeyframeIds: Set<string>;
  animatedProperties: Map<string, Set<string>>;
  revision: number;

  addKeyframe: (layerId: string, keyframe: Keyframe) => void;
  removeKeyframe: (keyframeId: string) => void;
  updateKeyframe: (keyframeId: string, patch: Partial<Keyframe>) => void;
  moveKeyframe: (keyframeId: string, newTime: number) => void;
  setInterpolation: (keyframeId: string, interpolation: InterpolationType) => void;
  deleteSelectedKeyframes: () => void;
  toggleKeyframeSelection: (id: string) => void;
  selectKeyframe: (id: string, addToSelection?: boolean) => void;
  deselectKeyframe: (id: string) => void;
  clearKeyframeSelection: () => void;
  getKeyframeIdsForLayer: (layerId: string) => string[];
  toggleAnimatedProperty: (layerId: string, property: string) => void;
  isPropertyAnimated: (layerId: string, property: string) => boolean;
}

export const useKeyframeStore = create<KeyframeState>((set, get) => ({
  engine: new KeyframeEngine(),
  selectedKeyframeIds: new Set(),
  animatedProperties: new Map(),
  revision: 0,

  addKeyframe: (layerId, keyframe) => {
    get().engine.addKeyframe(layerId, keyframe);
    set(s => ({ revision: s.revision + 1 }));
  },

  removeKeyframe: (keyframeId) => {
    get().engine.removeKeyframe(keyframeId);
    set(s => {
      const next = new Set(s.selectedKeyframeIds);
      next.delete(keyframeId);
      return { selectedKeyframeIds: next, revision: s.revision + 1 };
    });
  },

  updateKeyframe: (keyframeId, patch) => {
    get().engine.updateKeyframe(keyframeId, patch);
    set(s => ({ revision: s.revision + 1 }));
  },

  moveKeyframe: (keyframeId, newTime) => {
    get().engine.moveKeyframe(keyframeId, newTime);
    set(s => ({ revision: s.revision + 1 }));
  },

  setInterpolation: (keyframeId, interpolation) => {
    get().engine.setInterpolation(keyframeId, interpolation);
    set(s => ({ revision: s.revision + 1 }));
  },

  deleteSelectedKeyframes: () => {
    const ids = get().selectedKeyframeIds;
    for (const id of ids) get().engine.removeKeyframe(id);
    set(s => ({ selectedKeyframeIds: new Set(), revision: s.revision + 1 }));
  },

  toggleKeyframeSelection: (id) => set(s => {
    const next = new Set(s.selectedKeyframeIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    return { selectedKeyframeIds: next };
  }),

  selectKeyframe: (id, add) => set(s => {
    const next = add ? new Set(s.selectedKeyframeIds) : new Set<string>();
    next.add(id);
    return { selectedKeyframeIds: next };
  }),

  deselectKeyframe: (id) => set(s => {
    const next = new Set(s.selectedKeyframeIds);
    next.delete(id);
    return { selectedKeyframeIds: next };
  }),

  clearKeyframeSelection: () => set({ selectedKeyframeIds: new Set() }),

  getKeyframeIdsForLayer: (layerId) =>
    get().engine.getAllKeyframesForLayer(layerId).map(k => k.id),

  toggleAnimatedProperty: (layerId, property) => set(s => {
    const next = new Map(s.animatedProperties);
    const existing = next.get(layerId);
    if (existing?.has(property)) {
      existing.delete(property);
      if (existing.size === 0) next.delete(layerId);
      s.engine.removeAllForProperty(layerId, property);
    } else {
      const props = existing ? new Set(existing) : new Set<string>();
      props.add(property);
      next.set(layerId, props);
    }
    return { animatedProperties: next, revision: s.revision + 1 };
  }),

  isPropertyAnimated: (layerId, property) =>
    get().animatedProperties.get(layerId)?.has(property) ?? false,
}));