/**
 * Mask type definitions — the new mask system supports many shape types
 * with per-shape parameters. All numeric properties are keyframeable via
 * property paths like "mask.<maskId>.positionX".
 */
import type { PathCommand } from './layer';

export type MaskShapeType =
  | 'rectangle'
  | 'ellipse'
  | 'circle'
  | 'star'
  | 'heart'
  | 'filmstrip'
  | 'split'
  | 'text'
  | 'brush'
  | 'pen'
  | 'path';   // legacy — freeform pen result

export type MaskMode =
  | 'add'
  | 'subtract'
  | 'intersect'
  | 'difference';

export type TrackDirection = 'both' | 'horizontal' | 'vertical';
export type SplitDirection = 'vertical' | 'horizontal';

/** Per-shape parameters (only the fields relevant to shapeType are used) */
export interface MaskShapeParams {
  // Common
  width?: number;
  height?: number;

  // Rectangle
  roundCorners?: number;

  // Star
  sides?: number;              // 3..20
  innerRatio?: number;         // 0..1

  // Filmstrip
  stripCount?: number;         // 2..40
  stripGap?: number;           // 0..1 (fraction of strip width)

  // Split
  splitDirection?: SplitDirection;
  splitOffset?: number;        // -1..1 (0 = center)

  // Text mask
  textContent?: string;
  textFont?: string;
  textSize?: number;
  textBold?: boolean;
  textItalic?: boolean;
  textUnderline?: boolean;
  textAlign?: 'left' | 'center' | 'right';
  textCharacterSpacing?: number;
  textLineSpacing?: number;
  textZoom?: number;           // 100 = default

  // Brush
  brushSize?: number;
  brushStrokes?: BrushStroke[];
}

/** A single brush stroke — sequence of world-space points */
export interface BrushStroke {
  id: string;
  points: { x: number; y: number }[];
  size: number;
  /** true = paint (add), false = erase (subtract from this brush layer) */
  erase: boolean;
}

/** The new mask model */
export interface VectorMask {
  id: string;
  name: string;
  layerId: string;
  shapeType: MaskShapeType;

  // Per-shape parameters
  params: MaskShapeParams;

  // Baked path — recomputed when shapeType/params/size change,
  // used by the compositor + viewport overlay for rendering
  commands: PathCommand[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };

  // Transform (all keyframeable)
  positionX: number;
  positionY: number;
  rotation: number;      // degrees
  sizeW: number;
  sizeH: number;
  linkSize: boolean;     // when true, sizeW & sizeH change together

  // Blend / appearance
  mode: MaskMode;
  inverted: boolean;
  opacity: number;       // 0..100
  feather: number;       // 0..500 px
  expansion: number;     // -500..500 px

  // Tracking
  trackDirection: TrackDirection;

  // UI
  enabled: boolean;
  locked: boolean;
  color: string;
  collapsed: boolean;
}

/** Legacy Mask interface (kept for storage migration compatibility only) */
export interface MaskShape {
  type: 'rectangle' | 'ellipse';
  bounds: { x: number; y: number; width: number; height: number };
  cornerRadius: number;
}

export interface Mask {
  id: string;
  name: string;
  layerId: string;
  shape: MaskShape;
  mode: 'add' | 'subtract' | 'intersect' | 'lighten' | 'darken' | 'difference';
  inverted: boolean;
  opacity: number;
  feather: { x: number; y: number };
  expansion: number;
  enabled: boolean;
  locked: boolean;
  color: string;
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