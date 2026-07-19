/**
 * effectsStore — Zustand store for managing effect instances per layer.
 * Supports CRUD, ordering, parameter updates, and clipboard.
 * Effect params are keyframable via the same keyframe system from Phase 4.
 */
import { create } from 'zustand';
import type { EffectInstance, EffectType } from '../types/effect';
import { effectRegistry } from '../renderer/effects/EffectRegistry';
import { captureSnapshot, useHistoryStore } from './historyStore';

function genId(): string {
  return `efx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export interface EffectsState {
  /** Map<layerId, EffectInstance[]> */
  effectsByLayer: Record<string, EffectInstance[]>;
  /** Clipboard for copy/paste */
  clipboard: EffectInstance[] | null;

  // Actions
  addEffect: (layerId: string, effectType: EffectType) => void;
  removeEffect: (layerId: string, effectId: string) => void;
  reorderEffect: (layerId: string, effectId: string, newIndex: number) => void;
  updateParameter: (layerId: string, effectId: string, paramId: string, value: any) => void;
  toggleEffect: (layerId: string, effectId: string) => void;
  duplicateEffect: (layerId: string, effectId: string) => void;
  copyEffects: (layerId: string) => void;
  pasteEffects: (layerId: string) => void;
  removeAllEffects: (layerId: string) => void;
  getEffectsForLayer: (layerId: string) => EffectInstance[];
  /** Get the stored value of an effect parameter for keyframing */
  getParameterValue: (layerId: string, effectId: string, paramId: string) => any;
  /** Set via keyframe evaluation */
  setParameterValue: (layerId: string, effectId: string, paramId: string, value: any) => void;
}

export const useEffectsStore = create<EffectsState>((set, get) => ({
  effectsByLayer: {},
  clipboard: null,

  addEffect: (layerId, effectType) => {
    const def = effectRegistry.get(effectType);
    if (!def) return;
    const snapshot = captureSnapshot();
    const existing = get().effectsByLayer[layerId] ?? [];
    const newEffect: EffectInstance = {
      id: genId(),
      type: effectType,
      name: def.displayName,
      enabled: true,
      collapsed: false,
      parameters: def.createDefaultParameters(),
    };
    set((s) => ({
      effectsByLayer: { ...s.effectsByLayer, [layerId]: [...existing, newEffect] },
    }));
    useHistoryStore.getState().pushEntry('Add Effect', snapshot);
  },

  removeEffect: (layerId, effectId) => {
    const snapshot = captureSnapshot();
    set((s) => {
      const list = (s.effectsByLayer[layerId] ?? []).filter((e) => e.id !== effectId);
      return { effectsByLayer: { ...s.effectsByLayer, [layerId]: list } };
    });
    useHistoryStore.getState().pushEntry('Remove Effect', snapshot);
  },

  reorderEffect: (layerId, effectId, newIndex) => {
    const snapshot = captureSnapshot();
    set((s) => {
      const list = [...(s.effectsByLayer[layerId] ?? [])];
      const idx = list.findIndex((e) => e.id === effectId);
      if (idx === -1) return s;
      const [item] = list.splice(idx, 1);
      list.splice(newIndex, 0, item);
      return { effectsByLayer: { ...s.effectsByLayer, [layerId]: list } };
    });
    useHistoryStore.getState().pushEntry('Reorder Effect', snapshot);
  },

  updateParameter: (layerId, effectId, paramId, value) => {
    const snapshot = captureSnapshot();
    set((s) => {
      const list = (s.effectsByLayer[layerId] ?? []).map((e) => {
        if (e.id !== effectId) return e;
        return {
          ...e,
          parameters: e.parameters.map((p) =>
            p.id === paramId ? { ...p, value } : p,
          ),
        };
      });
      return { effectsByLayer: { ...s.effectsByLayer, [layerId]: list } };
    });
    useHistoryStore.getState().pushEntry('Update Effect Parameter', snapshot);
  },

  toggleEffect: (layerId, effectId) => {
    const snapshot = captureSnapshot();
    set((s) => {
      const list = (s.effectsByLayer[layerId] ?? []).map((e) =>
        e.id === effectId ? { ...e, enabled: !e.enabled } : e,
      );
      return { effectsByLayer: { ...s.effectsByLayer, [layerId]: list } };
    });
    useHistoryStore.getState().pushEntry('Toggle Effect', snapshot);
  },

  duplicateEffect: (layerId, effectId) => {
    const snapshot = captureSnapshot();
    const list = get().effectsByLayer[layerId] ?? [];
    const orig = list.find((e) => e.id === effectId);
    if (!orig) return;
    const dup: EffectInstance = {
      ...JSON.parse(JSON.stringify(orig)),
      id: genId(),
      name: `${orig.name} (copy)`,
    };
    const idx = list.findIndex((e) => e.id === effectId);
    const newList = [...list];
    newList.splice(idx + 1, 0, dup);
    set((s) => ({ effectsByLayer: { ...s.effectsByLayer, [layerId]: newList } }));
    useHistoryStore.getState().pushEntry('Duplicate Effect', snapshot);
  },

  copyEffects: (layerId) => {
    const list = get().effectsByLayer[layerId] ?? [];
    set({ clipboard: JSON.parse(JSON.stringify(list)) });
  },

  pasteEffects: (layerId) => {
    const clip = get().clipboard;
    if (!clip) return;
    const snapshot = captureSnapshot();
    const newEffects = clip.map((e) => ({
      ...JSON.parse(JSON.stringify(e)),
      id: genId(),
    }));
    set((s) => ({
      effectsByLayer: {
        ...s.effectsByLayer,
        [layerId]: [...(s.effectsByLayer[layerId] ?? []), ...newEffects],
      },
    }));
    useHistoryStore.getState().pushEntry('Paste Effects', snapshot);
  },

  removeAllEffects: (layerId) => {
    const snapshot = captureSnapshot();
    set((s) => {
      const { [layerId]: _, ...rest } = s.effectsByLayer;
      return { effectsByLayer: rest };
    });
    useHistoryStore.getState().pushEntry('Remove All Effects', snapshot);
  },

  getEffectsForLayer: (layerId) => get().effectsByLayer[layerId] ?? [],

  getParameterValue: (layerId, effectId, paramId) => {
    const effects = get().effectsByLayer[layerId] ?? [];
    const effect = effects.find((e) => e.id === effectId);
    const param = effect?.parameters.find((p) => p.id === paramId);
    return param?.value;
  },

  setParameterValue: (layerId, effectId, paramId, value) => {
    get().updateParameter(layerId, effectId, paramId, value);
  },
}));
