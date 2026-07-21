export type BlendMode = 'replace' | 'add' | 'multiply' | 'subtract';

export type ModifierType =
  | 'noise'
  | 'generator'
  | 'cycles'
  | 'steppedInterpolation'
  | 'limits'
  | 'envelope'
  | 'cameraNoise'
  | 'wiggle'
  | 'delay';

export interface ModifierInstance {
  id: string;
  type: ModifierType;
  enabled: boolean;
  /** Which property paths this modifier applies to */
  targets: string[];
  /** Blend mode: how this modifier combines with existing values */
  blendMode: BlendMode;
  /** Influence: 0 = no effect, 1 = full effect */
  influence: number;
  /** Frame range restriction */
  restrictFrameRange: boolean;
  frameStart: number;
  frameEnd: number;
  /** Blend in/out frames for smooth transitions */
  blendIn: number;
  blendOut: number;
  /** Modifier-specific parameters */
  params: Record<string, number | string | boolean>;
}

export function defaultModifier(type: ModifierType): ModifierInstance {
  const base: ModifierInstance = {
    id: `mod_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    type,
    enabled: true,
    targets: [],
    blendMode: 'replace',
    influence: 1,
    restrictFrameRange: false,
    frameStart: 0,
    frameEnd: 300,
    blendIn: 0,
    blendOut: 0,
    params: {},
  };

  switch (type) {
    case 'noise':
      return { ...base, targets: ['transform.position.x', 'transform.position.y'],
        params: { scale: 33.6, strength: 0.3, offset: 0, phase: 1, depth: 0, lacunarity: 2, roughness: 0.5 } };
    case 'generator':
      return { ...base, targets: ['transform.position.x'],
        params: { amplitude: 50, frequency: 1, waveform: 'sine' } };
    case 'cycles':
      return { ...base, targets: ['transform.position.x'],
        params: { startMode: 'repeat', afterMode: 'repeat', cycles: 1 } };
    case 'steppedInterpolation':
      return { ...base, targets: ['transform.position.x'],
        params: { stepSize: 5 } };
    case 'limits':
      return { ...base, targets: ['transform.position.x'],
        params: { minX: -100, maxX: 100, minY: -100, maxY: 100 } };
    case 'envelope':
      return { ...base, targets: ['transform.position.x'],
        params: { amplitude: 1 } };
    case 'cameraNoise':
      return { ...base, targets: ['cameraPositionX', 'cameraPositionY', 'cameraRotationX'],
        params: { scale: 30, strength: 0.5, phase: 1 } };
    case 'wiggle':
      return { ...base, targets: ['transform.position.x', 'transform.position.y'],
        params: { frequency: 3, amplitude: 50 } };
    case 'delay':
      return { ...base, targets: ['transform.position.x'],
        params: { delayFrames: 5, fadeLength: 10 } };
  }
  return base;
}