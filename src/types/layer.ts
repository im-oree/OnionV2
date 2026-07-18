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

/** Shape-specific data */
export interface ShapeRectangle {
  type: 'rectangle';
  width: number;
  height: number;
  borderRadius: number;
}
export interface ShapeEllipse {
  type: 'ellipse';
  radiusX: number;
  radiusY: number;
}
export interface ShapePolygon {
  type: 'polygon';
  sides: number;
  radius: number;
  roundness: number;
}
export interface ShapeStar {
  type: 'star';
  points: number;
  radius: number;
  innerRadius: number;
  roundness: number;
}
export type ShapeData = ShapeRectangle | ShapeEllipse | ShapePolygon | ShapeStar;

export interface SolidData { color: string; width: number; height: number }
export interface ImageData { assetId: string; naturalWidth: number; naturalHeight: number }
export interface VideoData { assetId: string; naturalWidth: number; naturalHeight: number; duration: number; muted: boolean; volume: number; playbackRate: number }
export interface TextData { text: string; fontFamily: string; fontSize: number; fontWeight: number; color: string; lineHeight: number; letterSpacing: number; alignment: 'left'|'center'|'right' }

export interface CompData {
  /** ID of the source Composition to render inside this layer */
  sourceCompId: string;
  /** Loop when parent time exceeds nested comp duration */
  loop: boolean;
  /** Playback speed multiplier for the nested comp (1.0 = normal) */
  timeScale: number;
  /** Frame offset — nested comp starts at this local frame */
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
  data?: LayerPayload;
}

export type Layer = BaseLayer;

/** Helper to create a default transform */
export function defaultTransform(): Transform {
  return {
    position: { x: 0, y: 0 },
    scale: { x: 100, y: 100 },
    rotation: 0,
    anchorPoint: { x: 0, y: 0 },
  };
}
