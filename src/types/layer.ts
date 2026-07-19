import type { EffectInstance } from './effect';

export type LayerType =
  | 'solid' | 'shape' | 'text' | 'image' | 'video' | 'null' | 'adjustment' | 'comp';

export type BlendMode =
  | 'normal'|'multiply'|'screen'|'overlay'|'darken'|'lighten'
  | 'colorDodge'|'colorBurn'|'hardLight'|'softLight'
  | 'difference'|'exclusion'|'hue'|'saturation'|'color'|'luminosity';

export interface Transform {
  position: { x: number; y: number };
  scale: { x: number; y: number };
  rotation: number;
  anchorPoint: { x: number; y: number };
}

/** ─── Gradient types ─── */
export interface GradientStop {
  offset: number; // 0–1
  color: string;  // hex
}

export interface LinearGradient {
  type: 'linear-gradient';
  angle: number;       // degrees
  stops: GradientStop[];
}

export interface RadialGradient {
  type: 'radial-gradient';
  centerX: number;     // 0–1 relative to shape
  centerY: number;     // 0–1 relative to shape
  radius: number;      // 0–1
  stops: GradientStop[];
}

export type GradientFill = LinearGradient | RadialGradient;

/** ─── Shape fill/stroke ─── */
export interface ShapeFill {
  type: 'solid' | 'linear-gradient' | 'radial-gradient';
  color: string;               // used when type='solid'
  opacity: number;             // 0–100
  gradient?: GradientFill;     // used when type is gradient
}

export interface ShapeStroke {
  enabled: boolean;
  color: string;
  width: number;
  opacity: number;  // 0–100
}

/** Default fill */
export function defaultShapeFill(): ShapeFill {
  return { type: 'solid', color: '#ffffff', opacity: 100 };
}

/** Default stroke */
export function defaultShapeStroke(): ShapeStroke {
  return { enabled: false, color: '#ffffff', width: 2, opacity: 100 };
}

/** ─── Shape-specific data ─── */
export interface ShapeRectangle {
  type: 'rectangle';
  width: number;
  height: number;
  borderRadius: number;
  fill?: ShapeFill;
  stroke?: ShapeStroke;
}
export interface ShapeEllipse {
  type: 'ellipse';
  radiusX: number;
  radiusY: number;
  fill?: ShapeFill;
  stroke?: ShapeStroke;
}
export interface ShapePolygon {
  type: 'polygon';
  sides: number;
  radius: number;
  roundness: number;
  fill?: ShapeFill;
  stroke?: ShapeStroke;
}
export interface ShapeStar {
  type: 'star';
  points: number;
  radius: number;
  innerRadius: number;
  roundness: number;
  fill?: ShapeFill;
  stroke?: ShapeStroke;
}
export type ShapeData = ShapeRectangle | ShapeEllipse | ShapePolygon | ShapeStar;

export interface SolidData { color: string; width: number; height: number }
export interface ImageData { assetId: string; naturalWidth: number; naturalHeight: number }
export interface VideoData { assetId: string; naturalWidth: number; naturalHeight: number; duration: number; muted: boolean; volume: number; playbackRate: number }
export interface TextData { text: string; fontFamily: string; fontSize: number; fontWeight: number; color: string; lineHeight: number; letterSpacing: number; alignment: 'left'|'center'|'right' }

export interface CompData {
  sourceCompId: string;
  loop: boolean;
  timeScale: number;
  timeOffset: number;
}

export type LayerPayload = SolidData | ShapeData | ImageData | VideoData | TextData | CompData | Record<string, never>;

export interface Mask {
  id: string; points: Array<{ x: number; y: number }>; inverted: boolean; feather: number;
  opacity: number; expansion: number; mode: 'add'|'subtract'|'intersect'|'difference';
}

export interface BaseLayer {
  id: string;
  type: LayerType;
  name: string;
  visible: boolean;
  locked: boolean;
  soloed: boolean;
  shy: boolean;
  parentId: string | null;
  blendMode: BlendMode;
  opacity: number;
  startFrame: number;
  endFrame: number;
  transform: Transform;
  zIndex: number;
  effects: EffectInstance[];
  masks: Mask[];
  color?: string;
  data?: LayerPayload;
}

export type Layer = BaseLayer;

export function defaultTransform(): Transform {
  return {
    position: { x: 0, y: 0 },
    scale: { x: 100, y: 100 },
    rotation: 0,
    anchorPoint: { x: 0, y: 0 },
  };
}