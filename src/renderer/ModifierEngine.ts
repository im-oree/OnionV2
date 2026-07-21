import type { ModifierInstance, BlendMode } from '../types/modifier';
import type { Layer } from '../types/layer';

// Perlin-like noise function
function noise1D(x: number): number {
  const n = Math.sin(x * 12.9898 + x * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

function fbmNoise(x: number, octaves: number, lacunarity: number, roughness: number): number {
  let val = 0, amp = 1, freq = 1, maxAmp = 0;
  for (let i = 0; i < octaves; i++) {
    val += noise1D(x * freq) * amp;
    maxAmp += amp;
    amp *= roughness;
    freq *= lacunarity;
  }
  return val / maxAmp;
}

export class ModifierEngine {
  static apply(layer: Layer, currentTime: number): any {
    const modifiers = layer.modifiers?.filter(m => m.enabled) ?? [];
    if (modifiers.length === 0) return layer.transform;

    const result = { ...layer.transform, position: { ...layer.transform.position }, scale: { ...layer.transform.scale } };

    for (const mod of modifiers) {
      // Check frame range restriction
      const frame = currentTime * 30; // approximate fps
      if (mod.restrictFrameRange) {
        if (frame < mod.frameStart || frame > mod.frameEnd) continue;
      }

      const influence = this._computeInfluence(mod, frame);

      for (const target of mod.targets) {
        const value = this._evaluateModifier(mod, target, currentTime, layer);
        const blended = this._applyBlend(result, target, value * influence, mod.blendMode, mod.influence);
        this._setProperty(result, target, blended);
      }
    }

    return result;
  }

  static _computeInfluence(mod: ModifierInstance, frame: number): number {
    let inf = mod.influence;

    if (mod.restrictFrameRange) {
      if (mod.blendIn > 0 && frame < mod.frameStart + mod.blendIn) {
        inf *= (frame - mod.frameStart) / mod.blendIn;
      }
      if (mod.blendOut > 0 && frame > mod.frameEnd - mod.blendOut) {
        inf *= (mod.frameEnd - frame) / mod.blendOut;
      }
    }

    return Math.max(0, Math.min(1, inf));
  }

  static _evaluateModifier(mod: ModifierInstance, target: string, time: number, _layer: Layer): number {
    const p = mod.params;
    const t = time;

    switch (mod.type) {
      case 'noise': {
        const scale = (p.scale as number) ?? 33.6;
        const strength = (p.strength as number) ?? 0.3;
        const offset = (p.offset as number) ?? 0;
        const phase = (p.phase as number) ?? 1;
        const depth = Math.max(1, (p.depth as number) ?? 0);
        const lac = (p.lacunarity as number) ?? 2;
        const rough = (p.roughness as number) ?? 0.5;
        const val = fbmNoise((t * phase + offset) * (1 / scale), depth, lac, rough);
        return (val - 0.5) * 2 * strength * 100;
      }
      case 'generator': {
        const amp = (p.amplitude as number) ?? 50;
        const freq = (p.frequency as number) ?? 1;
        const wave = (p.waveform as string) ?? 'sine';
        if (wave === 'sine') return Math.sin(t * freq * Math.PI * 2) * amp;
        if (wave === 'square') return (Math.sin(t * freq * Math.PI * 2) > 0 ? 1 : -1) * amp;
        if (wave === 'triangle') return (2 / Math.PI) * Math.asin(Math.sin(t * freq * Math.PI * 2)) * amp;
        if (wave === 'sawtooth') return (2 * (t * freq - Math.floor(t * freq + 0.5))) * amp;
        return 0;
      }
      case 'wiggle': {
        const freq = (p.frequency as number) ?? 3;
        const amp = (p.amplitude as number) ?? 50;
        return Math.sin(t * freq * 7.3 + noise1D(t * 2.1) * 10) * amp;
      }
      case 'cameraNoise': {
        const scale = (p.scale as number) ?? 30;
        const strength = (p.strength as number) ?? 0.5;
        const phase = (p.phase as number) ?? 1;
        const val = fbmNoise((t * phase) * (1 / scale), 2, 2, 0.5);
        return (val - 0.5) * 2 * strength * 100;
      }
      case 'delay': {
        const delay = (p.delayFrames as number) ?? 5;
        const delayedTime = t - delay / 30;
        if (delayedTime < 0) return 0;
        return Math.sin(delayedTime * 3 * Math.PI * 2) * 50;
      }
      case 'cycles': {
        // Simple cycle repeat — cycles through the animation
        const cycles = (p.cycles as number) ?? 1;
        const cycleTime = (t * cycles) % 1;
        return Math.sin(cycleTime * Math.PI * 2) * 50;
      }
      case 'steppedInterpolation': {
        const stepSize = (p.stepSize as number) ?? 5;
        return Math.floor(t * 30 / stepSize) * stepSize;
      }
      case 'limits': {
        const min = (p.minX as number) ?? -100;
        const max = (p.maxX as number) ?? 100;
        const current = this._getProperty(_layer.transform, target);
        return Math.max(min, Math.min(max, current));
      }
      case 'envelope': {
        const amp = (p.amplitude as number) ?? 1;
        // Simple envelope that ramps up then down
        const cycle = (t * 0.5) % 2;
        if (cycle < 1) return cycle * amp * 50;
        return (2 - cycle) * amp * 50;
      }
      default:
        return 0;
    }
  }

  static _applyBlend(
    transform: any,
    target: string,
    value: number,
    blendMode: BlendMode,
    _influence: number,
  ): number {
    const current = this._getProperty(transform, target) ?? 0;
    // value already has influence baked in — don't multiply again
    switch (blendMode) {
      case 'replace': return value;
      case 'add': return current + value;
      case 'multiply': return current * (1 + value * 0.01);
      case 'subtract': return current - value;
      default: return current + value;
    }
  }

  static _getProperty(transform: any, path: string): number {
    const parts = path.split('.');
    let obj = transform;
    for (const p of parts) {
      if (obj == null) return 0;
      obj = obj[p];
    }
    return typeof obj === 'number' ? obj : 0;
  }

  static _setProperty(transform: any, path: string, value: number): void {
    const parts = path.split('.');
    let obj = transform;
    for (let i = 0; i < parts.length - 1; i++) {
      if (obj[parts[i]] == null) obj[parts[i]] = {};
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = value;
  }
}
