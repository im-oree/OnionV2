// Legacy compatibility shim — new system uses VectorMask from state/maskStore
export interface MaskShape {
  type: 'rectangle' | 'ellipse';
  /** Bounds relative to layer center */
  bounds: { x: number; y: number; width: number; height: number };
  cornerRadius: number; // rectangle only
}

export interface Mask {
  id: string;
  name: string;
  layerId: string;
  shape: MaskShape;
  mode: 'add' | 'subtract' | 'intersect' | 'lighten' | 'darken' | 'difference';
  inverted: boolean;
  opacity: number; // 0-100
  feather: { x: number; y: number };
  expansion: number; // pixels, negative shrinks
  enabled: boolean;
  locked: boolean;
  color: string; // UI color
  collapsed: boolean;
}

export function defaultMask(layerId: string, shapeType: 'rectangle' | 'ellipse'): Mask {
  return {
    id: `mask_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    name: shapeType === 'rectangle' ? 'Mask 1' : 'Ellipse Mask 1',
    layerId,
    shape: {
      type: shapeType,
      bounds: { x: -50, y: -50, width: 100, height: 100 },
      cornerRadius: 0,
    },
    mode: 'add',
    inverted: false,
    opacity: 100,
    feather: { x: 0, y: 0 },
    expansion: 0,
    enabled: true,
    locked: false,
    color: '#4A90E2',
    collapsed: false,
  };
}
