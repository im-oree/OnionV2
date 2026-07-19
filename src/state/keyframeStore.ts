import { create } from 'zustand';
import { KeyframeEngine } from '../animation/KeyframeEngine';
import type { Keyframe, InterpolationType } from '../types/keyframe';
import { markProjectDirty } from '../storage/StorageManager';
import { EASY_EASE, EASING_PRESETS, type EasingPresetName } from '../animation/EasingPresets';
import { captureSnapshot } from './historyStore';
import { useHistoryStore } from './historyStore';

export interface KeyframeMutation {
  layerId: string;
  property: string;
  time: number;
  oldTime?: number;
}

export interface KeyframeState {
  engine: KeyframeEngine;
  selectedKeyframeIds: Set<string>;
  animatedProperties: Map<string, Set<string>>;
  revision: number;
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

function _findKeyframeData(engine: KeyframeEngine, kfId: string): { layerId: string; property: string; time: number } | null {
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

function _syncAnimatedProps(engine: KeyframeEngine): Map<string, Set<string>> {
  const data: Map<string, Map<string, Keyframe[]>> = (engine as any)._data;
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

export const useKeyframeStore = create<KeyframeState>((set, get) => ({
  engine: new KeyframeEngine(),
  selectedKeyframeIds: new Set(),
  animatedProperties: new Map(),
  revision: 0,
  lastKeyframeMutation: null,

  addKeyframe: (layerId, keyframe) => {
    const snapshot = captureSnapshot();
    const engine = get().engine;
    engine.addKeyframe(layerId, keyframe);
    set(s => ({
      animatedProperties: _syncAnimatedProps(engine),
      revision: s.revision + 1,
      lastKeyframeMutation: { layerId, property: keyframe.property, time: keyframe.time },
    }));
    markProjectDirty();
    useHistoryStore.getState().pushEntry('Add Keyframe', snapshot);
  },

  removeKeyframe: (keyframeId) => {
    const snapshot = captureSnapshot();
    const engine = get().engine;
    const kf = _findKeyframeData(engine, keyframeId);
    engine.removeKeyframe(keyframeId);
    set(s => {
      const next = new Set(s.selectedKeyframeIds);
      next.delete(keyframeId);
      return {
        selectedKeyframeIds: next,
        animatedProperties: _syncAnimatedProps(engine),
        revision: s.revision + 1,
        lastKeyframeMutation: kf ? { layerId: kf.layerId, property: kf.property, time: kf.time } : null,
      };
    });
    markProjectDirty();
    useHistoryStore.getState().pushEntry('Remove Keyframe', snapshot);
  },

  updateKeyframe: (keyframeId, patch) => {
    const snapshot = captureSnapshot();
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
    useHistoryStore.getState().pushEntry('Update Keyframe', snapshot);
  },

  moveKeyframe: (keyframeId, newTime) => {
    const snapshot = captureSnapshot();
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
    useHistoryStore.getState().pushEntry('Move Keyframe', snapshot);
  },

  setInterpolation: (keyframeId, interpolation) => {
    const snapshot = captureSnapshot();
    const engine = get().engine;
    const existing = _findKeyframeData(engine, keyframeId);
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
    useHistoryStore.getState().pushEntry('Set Interpolation', snapshot);
  },

  applyEasingPreset: (preset, keyframeIds) => {
    const snapshot = captureSnapshot();
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
    useHistoryStore.getState().pushEntry('Apply Easing Preset', snapshot);
  },

  deleteSelectedKeyframes: () => {
    const snapshot = captureSnapshot();
    const engine = get().engine;
    const ids = get().selectedKeyframeIds;
    for (const id of ids) engine.removeKeyframe(id);
    set(s => ({
      selectedKeyframeIds: new Set(),
      animatedProperties: _syncAnimatedProps(engine),
      revision: s.revision + 1,
      lastKeyframeMutation: null,
    }));
    markProjectDirty();
    useHistoryStore.getState().pushEntry('Delete Keyframes', snapshot);
  },

  toggleKeyframeSelection: (id) => {
    set(s => {
      const next = new Set(s.selectedKeyframeIds);
      if (next.has(id)) next.delete(id); else next.add(id);
      return { selectedKeyframeIds: next };
    });
  },

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

  toggleAnimatedProperty: (layerId, property) => {
    const snapshot = captureSnapshot();
    set(s => {
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
    });
    useHistoryStore.getState().pushEntry('Toggle Animated Property', snapshot);
  },

  isPropertyAnimated: (layerId, property) =>
    get().animatedProperties.get(layerId)?.has(property) ?? false,
}));