/**
 * EffectShaderRegistry — stores per-effect shader/render implementation.
 *
 * Sibling to EffectRegistry (which stores metadata). This registry stores
 * the GPU implementation: shader source and optional customRender hook.
 *
 * The EffectChain reads from this registry to render each effect. If an
 * effect has customRender, it takes precedence over fragmentShader.
 */
import type { EffectType } from '../../types/effect';
import type { EffectModule } from './library/types';

class EffectShaderRegistryClass {
  private modules = new Map<EffectType, EffectModule>();

  register(module: EffectModule): void {
    this.modules.set(module.definition.type, module);
  }

  get(type: EffectType): EffectModule | undefined {
    return this.modules.get(type);
  }

  has(type: EffectType): boolean {
    return this.modules.has(type);
  }
}

export const effectShaderRegistry = new EffectShaderRegistryClass();