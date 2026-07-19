/**
 * Expression Controls — special effects that have no visual output.
 * They exist solely as variables for expressions to read.
 * Registered under 'expression' category.
 */
import { effectRegistry } from './EffectRegistry';
import type { EffectParameter, EffectDefinition, EffectType } from '../../types/effect';

function param(overrides: Partial<EffectParameter> & { id: string; name: string }): EffectParameter {
  return {
    type: 'number',
    value: 0,
    defaultValue: 0,
    uniform: '',
    ...overrides,
  } as EffectParameter;
}

function def(type: string, displayName: string, params: EffectParameter[]): EffectDefinition {
  return {
    type: type as EffectType,
    displayName,
    category: 'generate', // Hidden among generate, but visually distinct
    description: `Expression control — ${displayName.toLowerCase()} variable for expressions`,
    shaderPath: '',
    passes: 0,
    requiresOriginal: false,
    createDefaultParameters: () => params.map((p) => ({ ...p, value: p.defaultValue })),
  };
}

export function registerExpressionControls(): void {
  effectRegistry.register(def('sliderControl', 'Slider Control', [
    param({ id: 'slider', name: 'Slider', type: 'number', value: 0, defaultValue: 0, min: 0, max: 100, step: 0.1 }),
    param({ id: 'min', name: 'Min', type: 'number', value: 0, defaultValue: 0, min: -99999, max: 99999, step: 1 }),
    param({ id: 'max', name: 'Max', type: 'number', value: 100, defaultValue: 100, min: -99999, max: 99999, step: 1 }),
  ]));

  effectRegistry.register(def('angleControl', 'Angle Control', [
    param({ id: 'angle', name: 'Angle', type: 'angle', value: 0, defaultValue: 0, min: 0, max: 360, step: 1 }),
  ]));

  effectRegistry.register(def('pointControl', 'Point Control', [
    param({ id: 'point', name: 'Point', type: 'vector2', value: [0, 0] as [number, number], defaultValue: [0, 0] as [number, number] }),
  ]));

  effectRegistry.register(def('colorControl', 'Color Control', [
    param({ id: 'color', name: 'Color', type: 'color', value: '#ffffff', defaultValue: '#ffffff' }),
  ]));

  effectRegistry.register(def('checkboxControl', 'Checkbox Control', [
    param({ id: 'checkbox', name: 'Checkbox', type: 'boolean', value: false, defaultValue: false }),
  ]));

  effectRegistry.register(def('layerControl', 'Layer Control', [
    param({ id: 'layer', name: 'Layer', type: 'select', value: '', defaultValue: '', options: [{ label: 'None', value: '' }], uniform: '' }),
  ]));

  effectRegistry.register(def('dropdownControl', 'Dropdown Control', [
    param({ id: 'dropdown', name: 'Dropdown', type: 'select', value: 0, defaultValue: 0, options: [{ label: 'Option 1', value: 0 }, { label: 'Option 2', value: 1 }, { label: 'Option 3', value: 2 }] }),
  ]));
}
