export type LayerType =
  | 'solid' | 'shape' | 'text' | 'image' | 'video' | 'null' | 'adjustment';

export interface Vec2 { x: number; y: number }

export type ShapeData =
  | { type:'rectangle'; width:number; height:number; borderRadius:number }
  | { type:'ellipse'; radiusX:number; radiusY:number }
  | { type:'polygon'; sides:number; radius:number }
  | { type:'path'; points:Vec2[]; closed:boolean };

export interface SolidData { color:string; width:number; height:number }
export interface ImageData { src:string; naturalWidth:number; naturalHeight:number; textureId?:string }
export interface VideoData { src:string; naturalWidth:number; naturalHeight:number; duration:number; textureId?:string; currentTime?:number }
export interface TextData { text:string; fontFamily:string; fontSize:number; fontWeight:number; color:string; lineHeight:number; letterSpacing:number; alignment:'left'|'center'|'right' }

export type LayerPayload = SolidData | ShapeData | ImageData | VideoData | TextData | Record<string,never>;

export interface Mask {
  id:string; points:Vec2[]; inverted:boolean; feather:number;
  opacity:number; expansion:number; mode:'add'|'subtract'|'intersect'|'difference';
}

import type { Transform, BlendMode } from './composition';
import type { Effect } from './effect';

export interface Layer {
  id:string; type:LayerType; name:string;
  enabled:boolean; locked:boolean; solo:boolean;
  blendMode:BlendMode; opacity:number;
  transform:Transform;
  inPoint:number; outPoint:number; startTime:number; stretch:number;
  effects:Effect[]; masks:Mask[];
  parentId:string|null;
  data?:LayerPayload;
}
