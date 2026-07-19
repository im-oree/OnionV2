import type { EffectInstance } from './effect';

export type LayerType =
  | 'solid' | 'shape' | 'text' | 'image' | 'video' | 'null' | 'adjustment' | 'comp'
  | 'camera' | 'light';

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

export interface Vec3 { x: number; y: number; z: number; }

export interface Transform3D {
  position: Vec3;
  scale: Vec3;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  orientation: Vec3;
  anchorPoint: Vec3;
  opacity: number;
}

export interface MaterialProperties {
  castsShadows: boolean;
  lightTransmission: number;
  acceptsShadows: boolean;
  acceptsLights: boolean;
  ambient: number;
  diffuse: number;
  specular: number;
  shininess: number;
  metal: number;
}

export type AutoOrientMode = 'off' | 'along-path' | 'orient-toward-point-of-interest';

export interface CameraData {
  cameraType: 'perspective' | 'orthographic';
  focalLength: number;
  zoom: number;
  aperture: number;
  blurLevel: number;
  focusDistance: number;
  filmSize: number;
  autoOrient: AutoOrientMode;
  pointOfInterest: Vec3;
}

export type LightType = 'parallel' | 'spot' | 'point' | 'ambient';
export type LightFalloff = 'none' | 'smooth' | 'inverse-square-clamped';

export interface LightData {
  lightType: LightType;
  color: string;
  intensity: number;
  castsShadows: boolean;
  shadowDarkness: number;
  shadowDiffusion: number;
  falloff: LightFalloff;
  falloffDistance: number;
  falloffRadius: number;
  coneAngle: number;
  coneFeather: number;
  pointOfInterest: Vec3;
}

export function defaultMaterialProperties(): MaterialProperties {
  return { castsShadows: true, lightTransmission: 0, acceptsShadows: true, acceptsLights: true, ambient: 100, diffuse: 100, specular: 50, shininess: 50, metal: 0 };
}

export function defaultCameraData(): CameraData {
  return { cameraType: 'perspective', focalLength: 50, zoom: 1, aperture: 0, blurLevel: 0, focusDistance: 500, filmSize: 36, autoOrient: 'off', pointOfInterest: { x: 0, y: 0, z: 0 } };
}

export function defaultLightData(): LightData {
  return { lightType: 'parallel', color: '#ffffff', intensity: 100, castsShadows: false, shadowDarkness: 75, shadowDiffusion: 0, falloff: 'none', falloffDistance: 500, falloffRadius: 500, coneAngle: 54, coneFeather: 50, pointOfInterest: { x: 0, y: 0, z: 0 } };
}

export function defaultTransform3D(): Transform3D {
  return { position: { x: 0, y: 0, z: 0 }, scale: { x: 100, y: 100, z: 100 }, rotationX: 0, rotationY: 0, rotationZ: 0, orientation: { x: 0, y: 0, z: 0 }, anchorPoint: { x: 0, y: 0, z: 0 }, opacity: 100 };
}

export interface GradientStop { offset: number; color: string; }

export interface LinearGradient {
  type: 'linear-gradient';
  angle: number;
  stops: GradientStop[];
}
export interface RadialGradient {
  type: 'radial-gradient';
  centerX: number; centerY: number; radius: number;
  stops: GradientStop[];
}
export interface ConicGradient {
  type: 'conic-gradient';
  angle: number; centerX: number; centerY: number;
  stops: GradientStop[];
}
export type GradientFill = LinearGradient | RadialGradient | ConicGradient;

export interface ShapeFill {
  type: 'solid' | 'linear-gradient' | 'radial-gradient' | 'conic-gradient';
  color: string;
  opacity: number;
  gradient?: GradientFill;
}
export interface ShapeStroke {
  enabled: boolean;
  color: string;
  width: number;
  opacity: number;
  fillType: 'solid' | 'linear-gradient' | 'radial-gradient';
  gradient?: GradientFill;
  cap: 'butt' | 'round' | 'square';
  join: 'miter' | 'round' | 'bevel';
  dashArray: number[];
  dashOffset: number;
}

export function defaultShapeFill(): ShapeFill {
  return { type: 'solid', color: '#ffffff', opacity: 100 };
}
export function defaultShapeStroke(): ShapeStroke {
  return { enabled: false, color: '#ffffff', width: 2, opacity: 100, fillType: 'solid', cap: 'butt', join: 'miter', dashArray: [], dashOffset: 0 };
}

export interface ShapeRectangle {
  type: 'rectangle'; width: number; height: number; borderRadius: number;
  fill?: ShapeFill; stroke?: ShapeStroke; presetId?: string; presetParams?: Record<string,number>;
}
export interface ShapeEllipse {
  type: 'ellipse'; radiusX: number; radiusY: number;
  fill?: ShapeFill; stroke?: ShapeStroke; presetId?: string; presetParams?: Record<string,number>;
}
export interface ShapePolygon {
  type: 'polygon'; sides: number; radius: number; roundness: number;
  fill?: ShapeFill; stroke?: ShapeStroke; presetId?: string; presetParams?: Record<string,number>;
}
export interface ShapeStar {
  type: 'star'; points: number; radius: number; innerRadius: number; roundness: number;
  fill?: ShapeFill; stroke?: ShapeStroke; presetId?: string; presetParams?: Record<string,number>;
}

export interface PathCommand {
  type: 'M' | 'L' | 'C' | 'Q' | 'Z';
  points: number[];
}
export interface ShapePath {
  type: 'path';
  commands: PathCommand[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  fill?: ShapeFill; stroke?: ShapeStroke;
  presetId?: string; presetParams?: Record<string,number>;
  closed?: boolean;
}

/** Custom preset-based shape — the new unified way. */
export interface ShapeCustom {
  type: 'custom';
  preset: string;                    // e.g. 'star', 'chatbox', 'gear'
  width: number;
  height: number;
  params: Record<string, number>;    // preset-specific params (keyframeable)
  fill?: ShapeFill;
  stroke?: ShapeStroke;
}

export function computePathBounds(commands: PathCommand[]): { minX:number; minY:number; maxX:number; maxY:number } {
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for (const cmd of commands) {
    for (let i=0;i<cmd.points.length;i+=2) {
      const x=cmd.points[i],y=cmd.points[i+1];
      if(x<minX)minX=x; if(x>maxX)maxX=x; if(y<minY)minY=y; if(y>maxY)maxY=y;
    }
  }
  if(!isFinite(minX)) return {minX:0,minY:0,maxX:0,maxY:0};
  return {minX,minY,maxX,maxY};
}

export type ShapeData = ShapeRectangle | ShapeEllipse | ShapePolygon | ShapeStar | ShapePath | ShapeCustom;

export interface SolidData { color: string; width: number; height: number; }
export interface ImageData { assetId: string; naturalWidth: number; naturalHeight: number; }
export interface VideoData {
  assetId: string; naturalWidth: number; naturalHeight: number;
  duration: number; muted: boolean; volume: number; playbackRate: number;
}

export type TextAlignment = 'left'|'center'|'right'|'justify';
export type TextVerticalAlign = 'top'|'middle'|'bottom';

export interface TextShadow {
  enabled: boolean; color: string; blur: number; offsetX: number; offsetY: number;
}

export interface TextAnimatorProperty {
  opacity?: number; positionX?: number; positionY?: number;
  rotation?: number; scale?: number; color?: string;
  blur?: number; skewX?: number; skewY?: number;
}

export type AnimatorRangeShape = 'square'|'ramp up'|'ramp down'|'triangle'|'round'|'smooth';
export type AnimatorSelector = 'characters'|'words'|'lines';

export interface TextAnimator {
  id: string; name: string; enabled: boolean;
  selector: AnimatorSelector;
  rangeStart: number; rangeEnd: number;
  rangeShape: AnimatorRangeShape;
  randomize: boolean; randomSeed: number;
  properties: TextAnimatorProperty;
}

export interface TextData {
  text: string;
  fontFamily: string; fontSize: number; fontWeight: number;
  fontStyle: 'normal'|'italic'|'oblique';
  color: string;
  lineHeight: number; letterSpacing: number; wordSpacing: number;
  alignment: TextAlignment; verticalAlign: TextVerticalAlign;
  tracking: number; leading: number; baselineShift: number;
  allCaps: boolean; smallCaps: boolean; underline: boolean; strikethrough: boolean;
  fillType: 'solid'|'linear-gradient'|'radial-gradient';
  fillGradient?: GradientFill;
  stroke: { enabled: boolean; color: string; width: number; fillType: 'solid'|'linear-gradient'|'radial-gradient'; gradient?: GradientFill; };
  shadow: TextShadow;
  animators: TextAnimator[];
  maxWidth?: number;
  padding: number;
}

export function defaultTextData(): TextData {
  return {
    text: 'Text', fontFamily: 'Inter', fontSize: 48, fontWeight: 400, fontStyle: 'normal',
    color: '#ffffff', lineHeight: 1.2, letterSpacing: 0, wordSpacing: 0,
    alignment: 'center', verticalAlign: 'top', tracking: 0, leading: 0, baselineShift: 0,
    allCaps: false, smallCaps: false, underline: false, strikethrough: false,
    fillType: 'solid', stroke: { enabled: false, color: '#000000', width: 1, fillType: 'solid' },
    shadow: { enabled: false, color: '#000000', blur: 4, offsetX: 2, offsetY: 2 },
    animators: [], padding: 8,
  };
}

export interface CompData {
  sourceCompId: string; loop: boolean; timeScale: number; timeOffset: number;
}

export type LayerPayload = SolidData | ShapeData | ImageData | VideoData | TextData | CompData | Record<string,never>;

export interface Mask {
  id: string; points: Array<{x:number;y:number}>; inverted: boolean;
  feather: number; opacity: number; expansion: number;
  mode: 'add'|'subtract'|'intersect'|'difference';
}

export interface BaseLayer {
  id: string; type: LayerType; name: string;
  visible: boolean; locked: boolean; soloed: boolean; shy: boolean;
  parentId: string | null; blendMode: BlendMode; opacity: number;
  startFrame: number; endFrame: number;
  transform: Transform; zIndex: number;
  effects: EffectInstance[]; masks: Mask[];
  color?: string; data?: LayerPayload;
  is3D?: boolean;
  transform3D?: Transform3D;
  material?: MaterialProperties;
  cameraData?: CameraData;
  lightData?: LightData;
}

export type Layer = BaseLayer;

export function defaultShapeCustom(presetId: string, width: number, height: number, params: Record<string, number>): ShapeCustom {
  return {
    type: 'custom',
    preset: presetId,
    width, height, params,
    fill: defaultShapeFill(),
    stroke: defaultShapeStroke(),
  };
}

export function defaultTransform(): Transform {
  return { position:{x:0,y:0}, scale:{x:100,y:100}, rotation:0, anchorPoint:{x:0,y:0} };
}