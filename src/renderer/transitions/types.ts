/**
 * Transition types — matches the EffectModule/EffectDefinition pattern
 * used by the effects library. Each transition is a self-contained
 * definition with a fragment shader, parameters, and metadata.
 */

export interface TransitionParam {
  id: string;
  name: string;
  type: 'number' | 'color' | 'boolean' | 'select';
  value: number | string | boolean;
  defaultValue: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  uniform: string;
  options?: Array<{ label: string; value: number | string }>;
}

export interface TransitionDefinition {
  id: string;
  name: string;
  category: 'basic' | 'slide' | 'wipe' | 'zoom' | 'stylize';
  description: string;
  /** Fragment shader for the transition */
  fragmentShader: string;
  /** Default parameters */
  params: TransitionParam[];
}

export interface TransitionInstance {
  id: string;
  type: string;
  enabled: boolean;
  params: Record<string, number | string | boolean>;
}

/**
 * Helper to build a TransitionParam with sensible defaults.
 */
export function param(overrides: Partial<TransitionParam> & { id: string; name: string }): TransitionParam {
  const uniform = overrides.uniform ?? `u${overrides.id.charAt(0).toUpperCase() + overrides.id.slice(1)}`;
  const defaultValue = overrides.defaultValue ?? overrides.value ?? 0;
  return {
    type: 'number',
    value: defaultValue,
    defaultValue,
    uniform,
    ...overrides,
  } as TransitionParam;
}
