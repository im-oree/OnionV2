/**
 * maskStore — Zustand store for per-layer mask management.
 * Each mask can be individually toggled, reordered, and its properties keyframed.
 */
import { create } from 'zustand';
import type { Mask } from '../types/mask';
import { defaultMask } from '../types/mask';

interface MaskStoreState {
  masksByLayer: Record<string, Mask[]>;
  selectedMaskIds: string[];

  addMask: (layerId: string, shapeType: 'rectangle' | 'ellipse', mode?: Mask['mode']) => void;
  removeMask: (layerId: string, maskId: string) => void;
  updateMask: (layerId: string, maskId: string, patch: Partial<Mask>) => void;
  reorderMask: (layerId: string, maskId: string, newIndex: number) => void;
  setMaskMode: (layerId: string, maskId: string, mode: Mask['mode']) => void;
  toggleMask: (layerId: string, maskId: string) => void;
  selectMask: (maskId: string, additive?: boolean) => void;
  clearMaskSelection: () => void;
  removeAllMasks: (layerId: string) => void;
  getMasksForLayer: (layerId: string) => Mask[];
}

export const useMaskStore = create<MaskStoreState>((set, get) => ({
  masksByLayer: {},
  selectedMaskIds: [],

  addMask: (layerId, shapeType, mode) => {
    const mask = defaultMask(layerId, shapeType);
    if (mode) mask.mode = mode;
    set((s) => ({
      masksByLayer: {
        ...s.masksByLayer,
        [layerId]: [...(s.masksByLayer[layerId] || []), mask],
      },
      selectedMaskIds: [mask.id],
    }));
  },

  removeMask: (layerId, maskId) => {
    set((s) => ({
      masksByLayer: {
        ...s.masksByLayer,
        [layerId]: (s.masksByLayer[layerId] || []).filter((m) => m.id !== maskId),
      },
      selectedMaskIds: s.selectedMaskIds.filter((id) => id !== maskId),
    }));
  },

  updateMask: (layerId, maskId, patch) => {
    set((s) => ({
      masksByLayer: {
        ...s.masksByLayer,
        [layerId]: (s.masksByLayer[layerId] || []).map((m) =>
          m.id === maskId ? { ...m, ...patch } : m,
        ),
      },
    }));
  },

  reorderMask: (layerId, maskId, newIndex) => {
    set((s) => {
      const masks = [...(s.masksByLayer[layerId] || [])];
      const idx = masks.findIndex((m) => m.id === maskId);
      if (idx < 0) return s;
      const [moved] = masks.splice(idx, 1);
      masks.splice(Math.max(0, Math.min(newIndex, masks.length)), 0, moved);
      return {
        masksByLayer: { ...s.masksByLayer, [layerId]: masks },
      };
    });
  },

  setMaskMode: (layerId, maskId, mode) => {
    get().updateMask(layerId, maskId, { mode });
  },

  toggleMask: (layerId, maskId) => {
    const store = get();
    const mask = store.getMasksForLayer(layerId).find((m) => m.id === maskId);
    if (mask) store.updateMask(layerId, maskId, { enabled: !mask.enabled });
  },

  selectMask: (maskId, additive) => {
    set((s) => ({
      selectedMaskIds: additive
        ? s.selectedMaskIds.includes(maskId)
          ? s.selectedMaskIds.filter((id) => id !== maskId)
          : [...s.selectedMaskIds, maskId]
        : [maskId],
    }));
  },

  clearMaskSelection: () => set({ selectedMaskIds: [] }),

  removeAllMasks: (layerId) => {
    set((s) => ({
      masksByLayer: { ...s.masksByLayer, [layerId]: [] },
      selectedMaskIds: [],
    }));
  },

  getMasksForLayer: (layerId) => {
    return get().masksByLayer[layerId] || [];
  },
}));
