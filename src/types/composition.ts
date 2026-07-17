import type { Layer } from './layer';

export interface Transform {
  position: { x:number; y:number };
  scale: { x:number; y:number };
  rotation: number;
  anchorPoint: { x:number; y:number };
  positionZ?: number; scaleZ?: number;
  rotationX?: number; rotationY?: number; rotationZ?: number;
}

export type BlendMode =
  | 'normal'|'multiply'|'screen'|'overlay'|'darken'|'lighten'
  | 'colorDodge'|'colorBurn'|'hardLight'|'softLight'
  | 'difference'|'exclusion'|'hue'|'saturation'|'color'|'luminosity';

export interface WorkArea { start:number; end:number; enabled:boolean }

export interface Composition {
  id:string; name:string;
  width:number; height:number;
  fps:number; duration:number;
  backgroundColor:string;
  layers:Layer[];
  currentTime:number;
  workAreaStart:number; workAreaEnd:number;
  pixelAspect:number;
}
