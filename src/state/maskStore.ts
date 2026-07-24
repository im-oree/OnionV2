/**
 * MaskStore — manages the new VectorMask model.
 *
 * Multiple masks per layer, each with its own shape, transform, and
 * blending settings. All numeric properties are keyframeable via
 * property paths of the form `mask.<maskId>.<field>`.
 */
import { create } from 'zustand';
import type { PathCommand } from '../types/layer';
import type {
  VectorMask, MaskShapeType, MaskMode, MaskShapeParams,
  TrackDirection, BrushStroke,
} from '../types/mask';
import { generateMaskPath, computeMaskBounds } from '../shapes/maskShapes';
import { captureSnapshot, useHistoryStore } from './historyStore';

const MASK_COLORS = [
  '#4A90E2', '#E25B4A', '#4AE28A', '#E2C84A',
  '#B44AE2', '#4AE2D8', '#F27C1B', '#7CD3B3',
];
let _ci = 0;

function genId(): string {
  return `mask_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
}

function nextColor(): string {
  return MASK_COLORS[(_ci++) % MASK_COLORS.length];
}

/** Default params for a given shape type */
function defaultParams(shapeType: MaskShapeType): MaskShapeParams {
  switch (shapeType) {
    case 'rectangle':  return { roundCorners: 0 };
    case 'ellipse':
    case 'circle':     return {};
    case 'star':       return { sides: 5, innerRatio: 0.4 };
    case 'heart':      return {};
    case 'filmstrip':  return { stripCount: 8, stripGap: 0.15 };
    case 'split':      return { splitDirection: 'vertical', splitOffset: 0 };
    case 'text':       return {
      textContent: 'Default text',
      textFont: 'system-ui, sans-serif',
      textSize: 80,
      textBold: false,
      textItalic: false,
      textUnderline: false,
      textAlign: 'center',
      textCharacterSpacing: 0,
      textLineSpacing: 0,
      textZoom: 100,
    };
    case 'brush':      return { brushSize: 60, brushStrokes: [] };
    case 'pen':
    case 'path':       return {};
    default:           return {};
  }
}

/** Default label for a shape type */
function defaultLabel(shapeType: MaskShapeType): string {
  switch (shapeType) {
    case 'rectangle': return 'Rectangle';
    case 'ellipse':   return 'Ellipse';
    case 'circle':    return 'Circle';
    case 'star':      return 'Stars';
    case 'heart':     return 'Heart';
    case 'filmstrip': return 'Filmstrip';
    case 'split':     return 'Split';
    case 'text':      return 'Text';
    case 'brush':     return 'Brush';
    case 'pen':       return 'Pen';
    case 'path':      return 'Path';
  }
}

function makeMask(
  layerId: string,
  shapeType: MaskShapeType,
  index: number,
  sizeW = 400,
  sizeH = 300,
  overrideCommands?: PathCommand[],
): VectorMask {
  const params = defaultParams(shapeType);
  const commands = overrideCommands ?? generateMaskPath(shapeType, sizeW, sizeH, params);
  return {
    id: genId(),
    name: `Mask${index} ${defaultLabel(shapeType)}`,
    layerId,
    shapeType,
    params,
    commands,
    bounds: computeMaskBounds(commands),
    positionX: 0,
    positionY: 0,
    rotation: 0,
    sizeW,
    sizeH,
    linkSize: shapeType === 'circle',
    mode: 'add',
    inverted: false,
    opacity: 100,
    feather: 0,
    expansion: 0,
    trackDirection: 'both',
    enabled: true,
    locked: false,
    color: nextColor(),
    collapsed: false,
  };
}

interface MaskStore {
  masksByLayer: Record<string, VectorMask[]>;
  selectedMaskId: string | null;
  /** Whether the mask panel/system is enabled for the currently active layer */
  maskEnabledByLayer: Record<string, boolean>;
  revision: number;
  /** Active brush mode when editing a brush mask */
  brushMode: 'paint' | 'erase';

  // Create
  addMask: (layerId: string, shapeType: MaskShapeType, sizeW?: number, sizeH?: number) => VectorMask;
  addPathMask: (layerId: string, commands: PathCommand[]) => VectorMask;

  // Delete + reorder + duplicate
  removeMask: (layerId: string, maskId: string) => void;
  reorderMask: (layerId: string, maskId: string, newIndex: number) => void;
  duplicateMask: (layerId: string, maskId: string) => VectorMask | null;

  // Update
  updateMask: (layerId: string, maskId: string, patch: Partial<VectorMask>) => void;
  updateMaskParams: (layerId: string, maskId: string, params: Partial<MaskShapeParams>) => void;
  updateMaskCommands: (layerId: string, maskId: string, commands: PathCommand[]) => void;
  /** Change the shape type of an existing mask, regenerating commands */
  changeShape: (layerId: string, maskId: string, newShape: MaskShapeType) => void;

  // Brush-specific
  addBrushStroke: (layerId: string, maskId: string, stroke: BrushStroke) => void;
  clearBrushStrokes: (layerId: string, maskId: string) => void;

  // Selection
  selectMask: (maskId: string | null) => void;

  // Master enable
  setMaskEnabled: (layerId: string, enabled: boolean) => void;
  isMaskEnabled: (layerId: string) => boolean;

  // Track
  setTrackDirection: (layerId: string, maskId: string, dir: TrackDirection) => void;

  // Query
  getMasksForLayer: (layerId: string) => VectorMask[];
  getSelectedMask: (layerId: string) => VectorMask | null;
}

export const useMaskStore = create<MaskStore>((set, get) => ({
  masksByLayer: {},
  selectedMaskId: null,
  maskEnabledByLayer: {},
  revision: 0,
  brushMode: 'paint',

  addMask: (layerId, shapeType, sizeW, sizeH) => {
    const snapshot = captureSnapshot();
    const existing = get().masksByLayer[layerId] ?? [];
    const mask = makeMask(layerId, shapeType, existing.length + 1, sizeW, sizeH);
    set(s => ({
      masksByLayer: { ...s.masksByLayer, [layerId]: [...existing, mask] },
      selectedMaskId: mask.id,
      maskEnabledByLayer: { ...s.maskEnabledByLayer, [layerId]: true },
      revision: s.revision + 1,
    }));
    useHistoryStore.getState().pushEntry('Add Mask', snapshot);
    return mask;
  },

  addPathMask: (layerId, commands) => {
    const snapshot = captureSnapshot();
    const existing = get().masksByLayer[layerId] ?? [];
    const bounds = computeMaskBounds(commands);
    const w = Math.max(2, bounds.maxX - bounds.minX);
    const h = Math.max(2, bounds.maxY - bounds.minY);
    // Center commands around (0,0)
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    const centered = commands.map(c => ({
      type: c.type,
      points: c.points.map((v, i) => i % 2 === 0 ? v - cx : v - cy),
    }));
    const mask = makeMask(layerId, 'pen', existing.length + 1, w, h, centered);
    mask.positionX = cx;
    mask.positionY = cy;
    set(s => ({
      masksByLayer: { ...s.masksByLayer, [layerId]: [...existing, mask] },
      selectedMaskId: mask.id,
      maskEnabledByLayer: { ...s.maskEnabledByLayer, [layerId]: true },
      revision: s.revision + 1,
    }));
    useHistoryStore.getState().pushEntry('Add Path Mask', snapshot);
    return mask;
  },

  removeMask: (layerId, maskId) => {
    const snapshot = captureSnapshot();
    set(s => ({
      masksByLayer: {
        ...s.masksByLayer,
        [layerId]: (s.masksByLayer[layerId] ?? []).filter(m => m.id !== maskId),
      },
      selectedMaskId: s.selectedMaskId === maskId ? null : s.selectedMaskId,
      revision: s.revision + 1,
    }));
    useHistoryStore.getState().pushEntry('Remove Mask', snapshot);
  },

  reorderMask: (layerId, maskId, newIndex) => {
    const snapshot = captureSnapshot();
    set(s => {
      const masks = [...(s.masksByLayer[layerId] ?? [])];
      const idx = masks.findIndex(m => m.id === maskId);
      if (idx < 0) return s;
      const [moved] = masks.splice(idx, 1);
      masks.splice(Math.max(0, Math.min(newIndex, masks.length)), 0, moved);
      return {
        masksByLayer: { ...s.masksByLayer, [layerId]: masks },
        revision: s.revision + 1,
      };
    });
    useHistoryStore.getState().pushEntry('Reorder Mask', snapshot);
  },

  duplicateMask: (layerId, maskId) => {
    const mask = (get().masksByLayer[layerId] ?? []).find(m => m.id === maskId);
    if (!mask) return null;
    const snapshot = captureSnapshot();
    const clone: VectorMask = {
      ...mask,
      id: genId(),
      name: mask.name + ' Copy',
      color: nextColor(),
      commands: mask.commands.map(c => ({ ...c, points: [...c.points] })),
      params: JSON.parse(JSON.stringify(mask.params)),
    };
    set(s => ({
      masksByLayer: {
        ...s.masksByLayer,
        [layerId]: [...(s.masksByLayer[layerId] ?? []), clone],
      },
      selectedMaskId: clone.id,
      revision: s.revision + 1,
    }));
    useHistoryStore.getState().pushEntry('Duplicate Mask', snapshot);
    return clone;
  },

  updateMask: (layerId, maskId, patch) => {
    const snapshot = captureSnapshot();
    set(s => ({
      masksByLayer: {
        ...s.masksByLayer,
        [layerId]: (s.masksByLayer[layerId] ?? []).map(m => {
          if (m.id !== maskId) return m;
          const merged = { ...m, ...patch };
          // If linkSize is on and only one of W/H was patched, mirror the other
          if (merged.linkSize) {
            if (patch.sizeW !== undefined && patch.sizeH === undefined) {
              merged.sizeH = patch.sizeW;
            } else if (patch.sizeH !== undefined && patch.sizeW === undefined) {
              merged.sizeW = patch.sizeH;
            }
          }
          // Regenerate commands if size or shape-affecting fields changed
          const needsRebuild =
            patch.sizeW !== undefined ||
            patch.sizeH !== undefined;
          if (needsRebuild) {
            merged.commands = generateMaskPath(
              merged.shapeType,
              merged.sizeW,
              merged.sizeH,
              merged.params,
              m.commands, // preserve pen/path shape commands
            );
            merged.bounds = computeMaskBounds(merged.commands);
          }
          return merged;
        }),
      },
      revision: s.revision + 1,
    }));
    useHistoryStore.getState().pushEntry('Update Mask', snapshot);
  },

  updateMaskParams: (layerId, maskId, params) => {
    const snapshot = captureSnapshot();
    set(s => ({
      masksByLayer: {
        ...s.masksByLayer,
        [layerId]: (s.masksByLayer[layerId] ?? []).map(m => {
          if (m.id !== maskId) return m;
          const newParams = { ...m.params, ...params };
          const newCmds = generateMaskPath(
            m.shapeType, m.sizeW, m.sizeH, newParams, m.commands,
          );
          return {
            ...m,
            params: newParams,
            commands: newCmds,
            bounds: computeMaskBounds(newCmds),
          };
        }),
      },
      revision: s.revision + 1,
    }));
    useHistoryStore.getState().pushEntry('Update Mask Params', snapshot);
  },

  updateMaskCommands: (layerId, maskId, commands) => {
    const snapshot = captureSnapshot();
    set(s => ({
      masksByLayer: {
        ...s.masksByLayer,
        [layerId]: (s.masksByLayer[layerId] ?? []).map(m =>
          m.id === maskId
            ? { ...m, commands, bounds: computeMaskBounds(commands) }
            : m,
        ),
      },
      revision: s.revision + 1,
    }));
    useHistoryStore.getState().pushEntry('Update Mask Path', snapshot);
  },

  changeShape: (layerId, maskId, newShape) => {
    const snapshot = captureSnapshot();
    set(s => ({
      masksByLayer: {
        ...s.masksByLayer,
        [layerId]: (s.masksByLayer[layerId] ?? []).map(m => {
          if (m.id !== maskId) return m;
          const params = { ...defaultParams(newShape), ...m.params };
          const commands = generateMaskPath(newShape, m.sizeW, m.sizeH, params);
          const shortLabel = defaultLabel(newShape);
          // Update the trailing shape word in the mask name
          const nameMatch = m.name.match(/^(Mask\d+)/);
          const newName = nameMatch ? `${nameMatch[1]} ${shortLabel}` : m.name;
          return {
            ...m,
            shapeType: newShape,
            params,
            commands,
            bounds: computeMaskBounds(commands),
            name: newName,
          };
        }),
      },
      revision: s.revision + 1,
    }));
    useHistoryStore.getState().pushEntry('Change Mask Shape', snapshot);
  },

  addBrushStroke: (layerId, maskId, stroke) => {
    const snapshot = captureSnapshot();
    set(s => ({
      masksByLayer: {
        ...s.masksByLayer,
        [layerId]: (s.masksByLayer[layerId] ?? []).map(m => {
          if (m.id !== maskId) return m;
          const strokes = [...(m.params.brushStrokes ?? []), stroke];
          const newParams = { ...m.params, brushStrokes: strokes };
          const newCmds = generateMaskPath(
            m.shapeType, m.sizeW, m.sizeH, newParams, m.commands,
          );
          return {
            ...m,
            params: newParams,
            commands: newCmds,
            bounds: computeMaskBounds(newCmds),
          };
        }),
      },
      revision: s.revision + 1,
    }));
    useHistoryStore.getState().pushEntry('Brush Stroke', snapshot);
  },

  clearBrushStrokes: (layerId, maskId) => {
    const snapshot = captureSnapshot();
    set(s => ({
      masksByLayer: {
        ...s.masksByLayer,
        [layerId]: (s.masksByLayer[layerId] ?? []).map(m => {
          if (m.id !== maskId) return m;
          const newParams = { ...m.params, brushStrokes: [] };
          const newCmds = generateMaskPath(
            m.shapeType, m.sizeW, m.sizeH, newParams, m.commands,
          );
          return {
            ...m,
            params: newParams,
            commands: newCmds,
            bounds: computeMaskBounds(newCmds),
          };
        }),
      },
      revision: s.revision + 1,
    }));
    useHistoryStore.getState().pushEntry('Clear Brush', snapshot);
  },

  selectMask: (maskId) => set({ selectedMaskId: maskId }),

  setMaskEnabled: (layerId, enabled) => {
    set(s => ({
      maskEnabledByLayer: { ...s.maskEnabledByLayer, [layerId]: enabled },
      revision: s.revision + 1,
    }));
  },
  isMaskEnabled: (layerId) => {
    // Default: enabled if any masks exist for the layer
    const explicit = get().maskEnabledByLayer[layerId];
    if (typeof explicit === 'boolean') return explicit;
    return (get().masksByLayer[layerId] ?? []).length > 0;
  },

  setTrackDirection: (layerId, maskId, dir) => {
    const snapshot = captureSnapshot();
    set(s => ({
      masksByLayer: {
        ...s.masksByLayer,
        [layerId]: (s.masksByLayer[layerId] ?? []).map(m =>
          m.id === maskId ? { ...m, trackDirection: dir } : m,
        ),
      },
      revision: s.revision + 1,
    }));
    useHistoryStore.getState().pushEntry('Set Track Direction', snapshot);
  },

  getMasksForLayer: (layerId) => get().masksByLayer[layerId] ?? [],
  getSelectedMask: (layerId) => {
    const id = get().selectedMaskId;
    if (!id) return null;
    return (get().masksByLayer[layerId] ?? []).find(m => m.id === id) ?? null;
  },
}));