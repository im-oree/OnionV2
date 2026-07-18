/**
 * keyframeStore — Zustand store for keyframe state.
 * Manages keyframes by (layerId, propertyPath) and selection.
 */
import { create } from 'zustand';
import { KeyframeEngine } from '../animation/KeyframeEngine';
import type { Keyframe, InterpolationType } from '../types/keyframe';

export interface KeyframeState {
  /** The engine instance that holds and evaluates keyframes */
  engine: KeyframeEngine;
  /** Selected keyframe IDs */
  selectedKeyframeIds: Set<string>;
  /** Which properties have animation enabled (stopwatch on) per layer */
  animatedProperties: Map<string, Set<string>>; // layerId → Set<propertyPath>

  // Actions
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

  addKeyframe: (layerId, keyframe) => {
    get().engine.addKeyframe(layerId, keyframe);
    set({ engine: get().engine }); // Trigger re-render by replacing reference
  },

  removeKeyframe: (keyframeId) => {
    get().engine.removeKeyframe(keyframeId);
    set((s) => {
      const next = new Set(s.selectedKeyframeIds);
      next.delete(keyframeId);
      return { selectedKeyframeIds: next };
    });
  },

  updateKeyframe: (keyframeId, patch) => {
    get().engine.updateKeyframe(keyframeId, patch);
  },

  moveKeyframe: (keyframeId, newTime) => {
    get().engine.moveKeyframe(keyframeId, newTime);
  },

  setInterpolation: (keyframeId, interpolation) => {
    get().engine.setInterpolation(keyframeId, interpolation);
  },

  deleteSelectedKeyframes: () => {
    const ids = get().selectedKeyframeIds;
    for (const id of ids) get().engine.removeKeyframe(id);
    set({ selectedKeyframeIds: new Set() });
  },

  toggleKeyframeSelection: (id) => {
    set((s) => {
      const next = new Set(s.selectedKeyframeIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedKeyframeIds: next };
    });
  },

  selectKeyframe: (id, addToSelection) => {
    set((s) => {
      const next = addToSelection ? new Set(s.selectedKeyframeIds) : new Set<string>();
      next.add(id);
      return { selectedKeyframeIds: next };
    });
  },

  deselectKeyframe: (id) => {
    set((s) => {
      const next = new Set(s.selectedKeyframeIds);
      next.delete(id);
      return { selectedKeyframeIds: next };
    });
  },

  clearKeyframeSelection: () => set({ selectedKeyframeIds: new Set() }),

  getKeyframeIdsForLayer: (layerId) => {
    return get().engine.getAllKeyframesForLayer(layerId).map((k) => k.id);
  },

  toggleAnimatedProperty: (layerId, property) => {
    set((s) => {
      const next = new Map(s.animatedProperties);
      const existing = next.get(layerId);
      if (existing?.has(property)) {
        existing.delete(property);
        if (existing.size === 0) next.delete(layerId);
        else next.set(layerId, existing);
        // Remove all keyframes for this property
        s.engine.removeAllForProperty(layerId, property);
      } else {
        const props = existing ? new Set(existing) : new Set<string>();
        props.add(property);
        next.set(layerId, props);
      }
      return { animatedProperties: next };
    });
  },

  isPropertyAnimated: (layerId, property) => {
    return get().animatedProperties.get(layerId)?.has(property) ?? false;
  },
}));
