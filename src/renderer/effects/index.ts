/**
 * Effects barrel export.
 * Re-exports all effect system components for easy imports.
 */
export { EffectChain } from './EffectChain';
export { EffectsRenderer } from './EffectsRenderer';
export { effectRegistry } from './EffectRegistry';
export { effectShaderRegistry } from './EffectShaderRegistry';
export { fboPool } from './FBOPool';
export { registerAllEffects } from './registerEffects';
export type { EffectModule, EffectRenderContext } from './library/types';
