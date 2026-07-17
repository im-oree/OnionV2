export type EffectType =
  | 'gaussianBlur' | 'dropShadow' | 'glow' | 'colorCorrection'
  | 'levels' | 'fill' | 'tint' | 'gradient';

export interface EffectParameter {
  id:string; name:string;
  type:'number'|'color'|'boolean'|'dropdown'|'vector2';
  value:number|string|boolean|[number,number];
  min?:number; max?:number; step?:number;
  options?:{label:string;value:string}[];
}

export interface Effect {
  id:string; type:EffectType; name:string;
  enabled:boolean; parameters:EffectParameter[];
}

export interface EffectDefinition {
  type:EffectType; name:string; category:string;
  createParameters:()=>EffectParameter[];
}

export const EFFECT_CATEGORIES = [
  'Blur & Sharpen','Generate','Color Correction',
  'Stylize','Perspective','Distort','Transition',
] as const;
