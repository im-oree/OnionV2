/**
 * ApplyBlendMode — maps a layer's blendMode string to the appropriate
 * Three.js material blending config. Called by LayerSync when the
 * blendMode changes.
 *
 * Photoshop-style modes not natively supported by Three.js (darken,
 * screen, overlay, etc.) fall back to normal blending here — the
 * proper compositor pipeline handles those in a future patch.
 */
import * as THREE from 'three';
import type { BlendMode } from '../../types/layer';

interface BlendConfig {
  blending: THREE.Blending;
  blendSrc?: THREE.BlendingSrcFactor;
  blendDst?: THREE.BlendingDstFactor;
  blendEquation?: THREE.BlendingEquation;
  supported: boolean;
}

export function getBlendConfig(mode: BlendMode | string): BlendConfig {
  switch (mode) {
    case 'normal':
      return { blending: THREE.NormalBlending, supported: true };

    case 'multiply':
      return {
        blending: THREE.CustomBlending,
        blendSrc: THREE.DstColorFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor,
        blendEquation: THREE.AddEquation,
        supported: true,
      };

    case 'add':
    case 'linearDodge':
      return { blending: THREE.AdditiveBlending, supported: true };

    case 'subtract':
      return { blending: THREE.SubtractiveBlending, supported: true };

    case 'screen':
      return {
        blending: THREE.CustomBlending,
        blendSrc: THREE.OneMinusDstColorFactor,
        blendDst: THREE.OneFactor,
        blendEquation: THREE.AddEquation,
        supported: true,
      };

    case 'darken':
      return {
        blending: THREE.CustomBlending,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneFactor,
        blendEquation: THREE.MinEquation,
        supported: true,
      };

    case 'lighten':
      return {
        blending: THREE.CustomBlending,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneFactor,
        blendEquation: THREE.MaxEquation,
        supported: true,
      };

    case 'difference':
      return {
        blending: THREE.CustomBlending,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneFactor,
        blendEquation: THREE.ReverseSubtractEquation,
        supported: true,
      };

    default:
      // Overlay, softLight, hardLight, colorBurn, colorDodge, hue,
      // saturation, color, luminosity, etc. — require compositor pass.
      return { blending: THREE.NormalBlending, supported: false };
  }
}

/** Apply blend mode config to a material. */
export function applyBlendModeToMaterial(
  material: THREE.Material,
  mode: BlendMode | string,
): void {
  const cfg = getBlendConfig(mode);
  material.blending = cfg.blending;
  if (cfg.blending === THREE.CustomBlending) {
    (material as any).blendSrc = cfg.blendSrc ?? THREE.SrcAlphaFactor;
    (material as any).blendDst = cfg.blendDst ?? THREE.OneMinusSrcAlphaFactor;
    (material as any).blendEquation = cfg.blendEquation ?? THREE.AddEquation;
  }
  material.transparent = true;
  material.needsUpdate = true;
}
