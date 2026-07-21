/**
 * effectsStore — Zustand store for managing effect instances per layer.
 * Supports CRUD, ordering, parameter updates, and clipboard.
 * Effect params are keyframable via the same keyframe system from Phase 4.
 */
import { create } from 'zustand';
import type { EffectInstance, EffectType } from '../types/effect';
import { effectRegistry } from '../renderer/effects/EffectRegistry';
import { BLEND_MODES } from '../renderer/blending/BlendModes';
import { useCompositionStore } from './compositionStore';
import { captureSnapshot, debouncedCapture, useHistoryStore } from './historyStore';

function genId(): string {
  return `efx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Convert a blend mode numeric index (0-26 = BLEND_MODES array index) to its
 * string ID (e.g. 'multiply', 'screen'). The blend mode effect stores the
 * index in its 'mode' select parameter, but layer.blendMode expects the ID.
 */
function blendModeIndexToString(idx: number): string | undefined {
  return BLEND_MODES[idx]?.id;
}


function requestEffectRender(): void {
  try {
    const renderer = (window as any).__renderer;
    renderer?.frameCache?.clear?.();
    renderer?.gpuTextureCache?.invalidateAll?.(
      renderer?.composition?.id ?? '',
    );
    renderer?.renderLoop?.requestRender?.();
  } catch {
    // ignore
  }
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
  setEffectSpace: (layerId: string, effectId: string, space: 'local' | 'screen') => void;
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
      space: 'local',
    };
    set((s) => ({
      effectsByLayer: { ...s.effectsByLayer, [layerId]: [...existing, newEffect] },
    }));

    // Blend mode effect: update layer's blendMode property.
    // The effect uses numeric values (0-26 = BLEND_MODES indices), but
    // layer.blendMode expects string IDs like 'multiply', 'screen', etc.
    if (effectType === 'blendMode') {
      const modeParam = newEffect.parameters.find((p) => p.id === 'mode');
      if (modeParam) {
        const blendModeId = blendModeIndexToString(modeParam.value as number);
        if (blendModeId) {
          const cs = useCompositionStore.getState();
          const comp = cs.activeCompositionId
            ? cs.compositions.find((c) => c.id === cs.activeCompositionId)
            : null;
          if (comp) {
            cs.updateLayer(comp.id, layerId, { blendMode: blendModeId as any });
          }
        }
      }
    }

    useHistoryStore.getState().pushEntry('Add Effect', snapshot);
    requestEffectRender();
  },

  removeEffect: (layerId, effectId) => {
    const snapshot = captureSnapshot();
    set((s) => {
      const list = (s.effectsByLayer[layerId] ?? []).filter((e) => e.id !== effectId);
      return { effectsByLayer: { ...s.effectsByLayer, [layerId]: list } };
    });
    useHistoryStore.getState().pushEntry('Remove Effect', snapshot);
    requestEffectRender();
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
    requestEffectRender();
  },

  updateParameter: (layerId, effectId, paramId, value) => {
    // Use debounced capture for high-frequency slider drags to avoid
    // serializing the entire effects tree on every pixel.
    debouncedCapture('Adjust Effect Parameter');
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
      // Blend mode effect: when 'mode' param changes, update layer's blendMode.
      // Convert numeric index (0-26) to string ID like 'multiply', 'screen'.
      const updatedEffect = (s.effectsByLayer[layerId] ?? []).find((e) => e.id === effectId);
      if (updatedEffect?.type === 'blendMode' && paramId === 'mode') {
        const idx = typeof value === 'string' ? Number(value) : (value as number);
        const safeIdx = Number.isFinite(idx) ? idx : 0;
        const blendModeId = blendModeIndexToString(safeIdx);
        if (blendModeId) {
          const cs = useCompositionStore.getState();
          const comp = cs.activeCompositionId
            ? cs.compositions.find((c) => c.id === cs.activeCompositionId)
            : null;
          if (comp) {
            cs.updateLayer(comp.id, layerId, { blendMode: blendModeId as any }, true);
          }
        }
      }
      return { effectsByLayer: { ...s.effectsByLayer, [layerId]: list } };
    });
    requestEffectRender();
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
    requestEffectRender();
  },

  setEffectSpace: (layerId, effectId, space) => {
    const snapshot = captureSnapshot();
    set((s) => {
      const list = (s.effectsByLayer[layerId] ?? []).map((e) =>
        e.id === effectId ? { ...e, space } : e,
      );
      return { effectsByLayer: { ...s.effectsByLayer, [layerId]: list } };
    });
    requestEffectRender();
    useHistoryStore.getState().pushEntry('Set Effect Space', snapshot);
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
    requestEffectRender();
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
    requestEffectRender();
  },

  removeAllEffects: (layerId) => {
    const snapshot = captureSnapshot();
    set((s) => {
      const { [layerId]: _, ...rest } = s.effectsByLayer;
      return { effectsByLayer: rest };
    });
    useHistoryStore.getState().pushEntry('Remove All Effects', snapshot);
    requestEffectRender();
  },

  getEffectsForLayer: (layerId) => get().effectsByLayer[layerId] ?? [],

  getParameterValue: (layerId, effectId, paramId) => {
    const effects = get().effectsByLayer[layerId] ?? [];
    const effect = effects.find((e) => e.id === effectId);
    const param = effect?.parameters.find((p) => p.id === paramId);
    return param?.value;
  },

  setParameterValue: (layerId, effectId, paramId, value) => {
    // Silent set — bypasses history/debounce entirely.
    // This is called from PropertyBinder on every RAF tick for keyframe
    // evaluation. It must NOT touch debouncedCapture or flushDebouncedSnapshot
    // because those would fight user edits made in the same frame window.
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
    requestEffectRender();
  },
}));
