export type InterpolationType = 'linear' | 'bezier' | 'hold';

export interface BezierTangent { x:number; y:number }

export interface Keyframe {
  id:string; time:number;
  value:number|number[];
  interpolation:InterpolationType;
  inTangent?:BezierTangent; outTangent?:BezierTangent;
  autoBezier?:boolean; hold?:boolean; easing?:string;
}

export interface AnimatedProperty {
  path:string;
  defaultValue:number|number[];
  keyframes:Keyframe[];
  animated:boolean;
}

export type AnimatedProperties = Record<string, AnimatedProperty>;
export interface EvaluatedProperties { [propertyPath:string]: number|number[] }
