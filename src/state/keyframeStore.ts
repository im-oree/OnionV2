import { create } from 'zustand';
import { KeyframeEngine } from '../animation/KeyframeEngine';
import type { Keyframe, InterpolationType } from '../types/keyframe';
import { markProjectDirty } from '../storage/StorageManager';
import { EASY_EASE, EASING_PRESETS, type EasingPresetName } from '../animation/EasingPresets';

/** Records which keyframe was last mutated and how, so cache invalidation
 *  can narrow its range to only the affected frames. */
export interface KeyframeMutation {
  /** Layer that was mutated */
  layerId: string;
  /** Property path on that layer (e.g. 'transform.position.x') */
  property: string;
  /** Time of the mutated keyframe (approximate — for move, the new time) */
  time: number;
  /** Previous time when a keyframe was moved (undefined for add/remove/edit) */
  oldTime?: number;
}

export interface KeyframeState {
  engine: KeyframeEngine;
  selectedKeyframeIds: Set<string>;
  animatedProperties: Map<string, Set<string>>;
  revision: number;
  /** Track the most recent keyframe mutation for range-based cache invalidation */
  lastKeyframeMutation: KeyframeMutation | null;

  addKeyframe: (layerId: string, keyframe: Keyframe) => void;
  removeKeyframe: (keyframeId: string) => void;
  updateKeyframe: (keyframeId: string, patch: Partial<Keyframe>) => void;
  moveKeyframe: (keyframeId: string, newTime: number) => void;
  setInterpolation: (keyframeId: string, interpolation: InterpolationType) => void;
  deleteSelectedKeyframes: () => void;
  applyEasingPreset: (preset: EasingPresetName, keyframeIds?: string[]) => void;
  toggleKeyframeSelection: (id: string) => void;
  selectKeyframe: (id: string, addToSelection?: boolean) => void;
  deselectKeyframe: (id: string) => void;
  clearKeyframeSelection: () => void;
  getKeyframeIdsForLayer: (layerId: string) => string[];
  toggleAnimatedProperty: (layerId: string, property: string) => void;
  isPropertyAnimated: (layerId: string, property: string) => boolean;
}

/** Helper: try to extract (layerId, property, time) from a keyframe in the engine by keyframeId. */
function _findKeyframeData(engine: KeyframeEngine, kfId: string): { layerId: string; property: string; time: number } | null {
  // Access engine internals to find the keyframe — KeyframeEngine stores
  // _data as Map<layerId, Map<property, Keyframe[]>>
  const data: Map<string, Map<string, Keyframe[]>> = (engine as any)._data;
  for (const [layerId, propMap] of data) {
    for (const [property, kfs] of propMap) {
      for (const k of kfs) {
        if (k.id === kfId) return { layerId, property, time: k.time };
      }
    }
  }
  return null;
}

export const useKeyframeStore = create<KeyframeState>((set, get) => ({
  engine: new KeyframeEngine(),
  selectedKeyframeIds: new Set(),
  animatedProperties: new Map(),
  revision: 0,
  lastKeyframeMutation: null,

  addKeyframe: (layerId, keyframe) => {
    get().engine.addKeyframe(layerId, keyframe);
    set(s => ({
      revision: s.revision + 1,
      lastKeyframeMutation: { layerId, property: keyframe.property, time: keyframe.time },
    }));
    markProjectDirty();
  },

  removeKeyframe: (keyframeId) => {
    // Look up the keyframe data BEFORE removing it
    const engine = get().engine;
    const kf = _findKeyframeData(engine, keyframeId);
    engine.removeKeyframe(keyframeId);
    set(s => {
      const next = new Set(s.selectedKeyframeIds);
      next.delete(keyframeId);
      return {
        selectedKeyframeIds: next,
        revision: s.revision + 1,
        lastKeyframeMutation: kf ? { layerId: kf.layerId, property: kf.property, time: kf.time } : null,
      };
    });
    markProjectDirty();
  },

  updateKeyframe: (keyframeId, patch) => {
    // Look up BEFORE update to get original layer/property, then add time from patch or existing
    const engine = get().engine;
    const existing = _findKeyframeData(engine, keyframeId);
    engine.updateKeyframe(keyframeId, patch);
    set(s => ({
      revision: s.revision + 1,
      lastKeyframeMutation: existing ? {
        layerId: existing.layerId,
        property: existing.property,
        time: patch.time ?? existing.time,
      } : null,
    }));
    markProjectDirty();
  },

  moveKeyframe: (keyframeId, newTime) => {
    const engine = get().engine;
    const existing = _findKeyframeData(engine, keyframeId);
    engine.moveKeyframe(keyframeId, newTime);
    set(s => ({
      revision: s.revision + 1,
      lastKeyframeMutation: existing ? {
        layerId: existing.layerId,
        property: existing.property,
        time: newTime,
        oldTime: existing.time,
      } : null,
    }));
    markProjectDirty();
  },

  setInterpolation: (keyframeId, interpolation) => {
    const engine = get().engine;
    const existing = _findKeyframeData(engine, keyframeId);
    // When switching to bezier, ensure tangents exist (default to Easy Ease)
    const patch: Partial<Keyframe> = { interpolation };
    if (interpolation === 'bezier') {
      patch.inTangent = { ...EASY_EASE.in };
      patch.outTangent = { ...EASY_EASE.out };
    }
    engine.updateKeyframe(keyframeId, patch);
    set(s => ({
      revision: s.revision + 1,
      lastKeyframeMutation: existing ? { layerId: existing.layerId, property: existing.property, time: existing.time } : null,
    }));
    markProjectDirty();
  },

  applyEasingPreset: (preset, keyframeIds) => {
    const engine = get().engine;
    const p = EASING_PRESETS[preset];
    if (!p) return;
    const ids = keyframeIds ?? Array.from(get().selectedKeyframeIds);
    if (ids.length === 0) return;
    for (const id of ids) {
      engine.updateKeyframe(id, {
        interpolation: 'bezier',
        inTangent: { ...p.in },
        outTangent: { ...p.out },
      });
    }
    set(s => ({ revision: s.revision + 1, lastKeyframeMutation: null }));
    markProjectDirty();
  },

  deleteSelectedKeyframes: () => {
    const ids = get().selectedKeyframeIds;
    for (const id of ids) get().engine.removeKeyframe(id);
    // Set mutation to null to force broader fallback scan — multiple keyframes
    // across different layers/properties may have been deleted
    set(s => ({
      selectedKeyframeIds: new Set(),
      revision: s.revision + 1,
      lastKeyframeMutation: null,
    }));
    markProjectDirty();
  },

  toggleKeyframeSelection: (id) => {
    set(s => {
      const next = new Set(s.selectedKeyframeIds);
      if (next.has(id)) next.delete(id); else next.add(id);
      return { selectedKeyframeIds: next };
    });
  },
  // Selection changes don't mark dirty

  selectKeyframe: (id, add) => {
    set(s => {
      const next = add ? new Set(s.selectedKeyframeIds) : new Set<string>();
      next.add(id);
      return { selectedKeyframeIds: next };
    });
  },

  deselectKeyframe: (id) => {
    set(s => {
      const next = new Set(s.selectedKeyframeIds);
      next.delete(id);
      return { selectedKeyframeIds: next };
    });
  },

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