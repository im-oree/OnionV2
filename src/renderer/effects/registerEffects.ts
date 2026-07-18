/**
 * registerAllEffects — registers all built-in effects with the EffectRegistry.
 * Called once at app startup.
 */
import { effectRegistry } from './EffectRegistry';
import type { EffectParameter, EffectDefinition, EffectType, EffectCategory } from '../../types/effect';

function param(overrides: Partial<EffectParameter> & { id: string; name: string }): EffectParameter {
  return {
    type: 'number',
    value: 0,
    defaultValue: 0,
    uniform: `u${overrides.id.charAt(0).toUpperCase() + overrides.id.slice(1)}`,
    ...overrides,
  } as EffectParameter;
}

function def(type: EffectType, displayName: string, category: EffectCategory, desc: string, passes: number, params: EffectParameter[]): EffectDefinition {
  return {
    type,
    displayName,
    category,
    description: desc,
    shaderPath: `effects/${category}/${type}.frag`,
    passes,
    requiresOriginal: false,
    createDefaultParameters: () => params.map((p) => ({ ...p, value: p.defaultValue })),
  };
}

export function registerAllEffects(): void {
  // ── Blur & Sharpen ──────────────────────────────────
  effectRegistry.register(def('gaussianBlur', 'Gaussian Blur', 'blur', 'Standard gaussian blur with adjustable radius', 1, [
    param({ id: 'radius', name: 'Radius', type: 'number', value: 10, defaultValue: 10, min: 0, max: 100, step: 0.5, uniform: 'uRadius' }),
    param({ id: 'quality', name: 'Quality', type: 'select', value: 'medium', defaultValue: 'medium', options: [{ label: 'Low', value: 'low' }, { label: 'Medium', value: 'medium' }, { label: 'High', value: 'high' }], uniform: 'uQuality' }),
  ]));

  effectRegistry.register(def('boxBlur', 'Box Blur', 'blur', 'Fast box blur', 1, [
    param({ id: 'radius', name: 'Radius', type: 'number', value: 5, defaultValue: 5, min: 0, max: 100, step: 1, uniform: 'uRadius' }),
  ]));

  effectRegistry.register(def('directionalBlur', 'Directional Blur', 'blur', 'Blur along a direction', 1, [
    param({ id: 'angle', name: 'Angle', type: 'angle', value: 45, defaultValue: 45, min: 0, max: 360, step: 1, uniform: 'uAngle' }),
    param({ id: 'distance', name: 'Distance', type: 'number', value: 20, defaultValue: 20, min: 0, max: 200, step: 1, uniform: 'uDistance' }),
  ]));

  effectRegistry.register(def('radialBlur', 'Radial Blur', 'blur', 'Radial blur from center', 1, [
    param({ id: 'amount', name: 'Amount', type: 'number', value: 10, defaultValue: 10, min: 0, max: 100, step: 0.5, uniform: 'uAmount' }),
    param({ id: 'center', name: 'Center', type: 'vector2', value: [0.5, 0.5] as [number, number], defaultValue: [0.5, 0.5] as [number, number], uniform: 'uCenter' }),
  ]));

  // ── Color Correction ────────────────────────────────
  effectRegistry.register(def('colorCorrection', 'Color Correction', 'color', 'Brightness, contrast, saturation, hue, gamma', 1, [
    param({ id: 'brightness', name: 'Brightness', type: 'number', value: 0, defaultValue: 0, min: -100, max: 100, step: 1, uniform: 'uBrightness' }),
    param({ id: 'contrast', name: 'Contrast', type: 'number', value: 0, defaultValue: 0, min: -100, max: 100, step: 1, uniform: 'uContrast' }),
    param({ id: 'saturation', name: 'Saturation', type: 'number', value: 0, defaultValue: 0, min: -100, max: 100, step: 1, uniform: 'uSaturation' }),
    param({ id: 'hue', name: 'Hue', type: 'angle', value: 0, defaultValue: 0, min: -180, max: 180, step: 1, uniform: 'uHue' }),
    param({ id: 'gamma', name: 'Gamma', type: 'number', value: 1, defaultValue: 1, min: 0.1, max: 3, step: 0.1, uniform: 'uGamma' }),
  ]));

  effectRegistry.register(def('levels', 'Levels', 'color', 'Input/output levels per channel', 1, [
    param({ id: 'inputBlack', name: 'Input Black', type: 'number', value: 0, defaultValue: 0, min: 0, max: 255, step: 1, uniform: 'uInputBlack' }),
    param({ id: 'inputWhite', name: 'Input White', type: 'number', value: 255, defaultValue: 255, min: 0, max: 255, step: 1, uniform: 'uInputWhite' }),
    param({ id: 'gamma', name: 'Gamma', type: 'number', value: 1, defaultValue: 1, min: 0.1, max: 3, step: 0.1, uniform: 'uGamma' }),
    param({ id: 'outputBlack', name: 'Output Black', type: 'number', value: 0, defaultValue: 0, min: 0, max: 255, step: 1, uniform: 'uOutputBlack' }),
    param({ id: 'outputWhite', name: 'Output White', type: 'number', value: 255, defaultValue: 255, min: 0, max: 255, step: 1, uniform: 'uOutputWhite' }),
  ]));

  effectRegistry.register(def('hueSaturation', 'Hue/Saturation', 'color', 'Shift hue and adjust saturation', 1, [
    param({ id: 'hueShift', name: 'Hue Shift', type: 'angle', value: 0, defaultValue: 0, min: -180, max: 180, step: 1, uniform: 'uHueShift' }),
    param({ id: 'satFactor', name: 'Saturation', type: 'number', value: 1, defaultValue: 1, min: 0, max: 3, step: 0.1, uniform: 'uSatFactor' }),
  ]));

  effectRegistry.register(def('tint', 'Tint', 'color', 'Map shadows to color A and highlights to color B', 1, [
    param({ id: 'colorA', name: 'Shadow Color', type: 'color', value: '#0000ff', defaultValue: '#0000ff', uniform: 'uColorA' }),
    param({ id: 'colorB', name: 'Highlight Color', type: 'color', value: '#ffaa00', defaultValue: '#ffaa00', uniform: 'uColorB' }),
  ]));

  effectRegistry.register(def('invert', 'Invert', 'color', 'Invert colors', 1, []));

  effectRegistry.register(def('threshold', 'Threshold', 'color', 'Threshold to black and white', 1, [
    param({ id: 'level', name: 'Level', type: 'number', value: 0.5, defaultValue: 0.5, min: 0, max: 1, step: 0.01, uniform: 'uLevel' }),
    param({ id: 'smoothness', name: 'Smoothness', type: 'number', value: 0.1, defaultValue: 0.1, min: 0, max: 1, step: 0.01, uniform: 'uSmoothness' }),
  ]));

  effectRegistry.register(def('fill', 'Fill', 'color', 'Fill with color over original', 1, [
    param({ id: 'fillColor', name: 'Color', type: 'color', value: '#ffffff', defaultValue: '#ffffff', uniform: 'uFillColor' }),
    param({ id: 'opacity', name: 'Opacity', type: 'percent', value: 100, defaultValue: 100, min: 0, max: 100, step: 1, uniform: 'uOpacity' }),
  ]));

  // ── Stylize ──────────────────────────────────────────
  effectRegistry.register(def('glow', 'Glow', 'stylize', 'Bloom/glow effect', 1, [
    param({ id: 'threshold', name: 'Threshold', type: 'number', value: 0.7, defaultValue: 0.7, min: 0, max: 1, step: 0.01, uniform: 'uThreshold' }),
    param({ id: 'radius', name: 'Radius', type: 'number', value: 20, defaultValue: 20, min: 0, max: 100, step: 1, uniform: 'uRadius' }),
    param({ id: 'intensity', name: 'Intensity', type: 'number', value: 1.5, defaultValue: 1.5, min: 0, max: 5, step: 0.1, uniform: 'uIntensity' }),
    param({ id: 'color', name: 'Color', type: 'color', value: '#ffffff', defaultValue: '#ffffff', uniform: 'uColor' }),
  ]));

  effectRegistry.register(def('dropShadow', 'Drop Shadow', 'stylize', 'Drop shadow behind layer', 1, [
    param({ id: 'color', name: 'Color', type: 'color', value: '#000000', defaultValue: '#000000', uniform: 'uColor' }),
    param({ id: 'opacity', name: 'Opacity', type: 'percent', value: 75, defaultValue: 75, min: 0, max: 100, step: 1, uniform: 'uOpacity' }),
    param({ id: 'distance', name: 'Distance', type: 'number', value: 10, defaultValue: 10, min: 0, max: 500, step: 1, uniform: 'uDistance' }),
    param({ id: 'softness', name: 'Softness', type: 'number', value: 10, defaultValue: 10, min: 0, max: 100, step: 1, uniform: 'uSoftness' }),
  ]));

  // ── Distort ──────────────────────────────────────────
  effectRegistry.register(def('wave', 'Wave Distortion', 'distort', 'Sine wave distortion', 1, [
    param({ id: 'amplitude', name: 'Amplitude', type: 'number', value: 10, defaultValue: 10, min: 0, max: 100, step: 1, uniform: 'uAmplitude' }),
    param({ id: 'frequency', name: 'Frequency', type: 'number', value: 5, defaultValue: 5, min: 0.1, max: 50, step: 0.5, uniform: 'uFrequency' }),
    param({ id: 'speed', name: 'Speed', type: 'number', value: 1, defaultValue: 1, min: 0, max: 20, step: 0.5, uniform: 'uSpeed' }),
    param({ id: 'direction', name: 'Direction', type: 'vector2', value: [1, 0] as [number, number], defaultValue: [1, 0] as [number, number], uniform: 'uDirection' }),
  ]));

  // ── Generate ─────────────────────────────────────────
  effectRegistry.register(def('gradient', 'Gradient', 'generate', 'Linear gradient overlay', 1, [
    param({ id: 'colorA', name: 'Color A', type: 'color', value: '#ff0000', defaultValue: '#ff0000', uniform: 'uColorA' }),
    param({ id: 'colorB', name: 'Color B', type: 'color', value: '#0000ff', defaultValue: '#0000ff', uniform: 'uColorB' }),
    param({ id: 'angle', name: 'Angle', type: 'angle', value: 0, defaultValue: 0, min: 0, max: 360, step: 1, uniform: 'uAngle' }),
    param({ id: 'opacity', name: 'Opacity', type: 'percent', value: 100, defaultValue: 100, min: 0, max: 100, step: 1, uniform: 'uOpacity' }),
  ]));
}
