/**
 * Displacement Map (AE-style) — uses a chosen scene LAYER as the map.
 * Reads luminance / R / G / B / A from the map to drive X/Y pixel displacement.
 *
 * Registered as 'displacementMap2' to coexist with the existing procedural
 * displacementMap effect.
 */
import * as THREE from 'three';
import type { EffectModule, EffectRenderContext } from './types';
import { def, param } from './types';

export const displacementMap2Effect: EffectModule = {
  definition: def(
    'displacementMap2',
    'Displacement Map (AE)',
    'distort',
    'Distort using another layer as a map (AE-style).',
    1,
    [
      param({
        id: 'mapLayer',
        name: 'Displacement Map Layer',
        type: 'layerRef' as any,
        value: '',
        defaultValue: '',
        uniform: 'uMapTex',
      }),
      param({
        id: 'horizChannel',
        name: 'Use Channel (Horiz)',
        type: 'select',
        value: 4,
        defaultValue: 4,
        options: [
          { label: 'Red', value: 0 },
          { label: 'Green', value: 1 },
          { label: 'Blue', value: 2 },
          { label: 'Alpha', value: 3 },
          { label: 'Luminance', value: 4 },
        ],
        uniform: 'uHChan',
      }),
      param({
        id: 'vertChannel',
        name: 'Use Channel (Vert)',
        type: 'select',
        value: 4,
        defaultValue: 4,
        options: [
          { label: 'Red', value: 0 },
          { label: 'Green', value: 1 },
          { label: 'Blue', value: 2 },
          { label: 'Alpha', value: 3 },
          { label: 'Luminance', value: 4 },
        ],
        uniform: 'uVChan',
      }),
      param({
        id: 'maxH',
        name: 'Max Horizontal Displacement',
        value: 20,
        min: -500,
        max: 500,
        step: 1,
        uniform: 'uMaxH',
      }),
      param({
        id: 'maxV',
        name: 'Max Vertical Displacement',
        value: 20,
        min: -500,
        max: 500,
        step: 1,
        uniform: 'uMaxV',
      }),
      param({
        id: 'wrapPixels',
        name: 'Wrap Pixels',
        type: 'boolean',
        value: false,
        defaultValue: false,
        uniform: 'uWrap',
      }),
      param({
        id: 'expandOutput',
        name: 'Expand Output',
        type: 'boolean',
        value: false,
        defaultValue: false,
        uniform: 'uExpand',
      }),
    ],
  ),

  customRender: (ctx: EffectRenderContext) => {
    // Look up the chosen layer's rendered texture and bind it as uMapTex.
    const mapLayerId = String(
      ctx.instance.parameters.find((p) => p.id === 'mapLayer')?.value ?? '',
    );
    let mapTex: THREE.Texture | null = null;
    try {
      const renderer: any = (window as any).__renderer;
      // Prefer post-effect result if the map layer has effects, else raw material texture.
      const effectResult = renderer?.effectsRenderer?.getLayerResultTexture?.(mapLayerId);
      if (effectResult) {
        mapTex = effectResult;
      } else {
        const lr = renderer?.layerSync?.getRenderer?.(mapLayerId);
        const mat = lr?.mesh?.material as THREE.MeshBasicMaterial | undefined;
        if (mat?.map) mapTex = mat.map;
      }
    } catch {
      /* ignore */
    }

    const mat = ctx.getMaterial(
      'main',
      `
      uniform sampler2D uTexture;
      uniform sampler2D uMapTex;
      uniform float uHChan;
      uniform float uVChan;
      uniform float uMaxH;
      uniform float uMaxV;
      uniform bool  uWrap;
      uniform bool  uExpand;
      uniform vec2  uResolution;
      varying vec2 vUv;

      float pickChan(vec4 c, float k) {
        if (k < 0.5) return c.r;
        if (k < 1.5) return c.g;
        if (k < 2.5) return c.b;
        if (k < 3.5) return c.a;
        return dot(c.rgb, vec3(0.299, 0.587, 0.114));
      }

      void main() {
        vec4 mc = texture2D(uMapTex, vUv);
        float h = pickChan(mc, uHChan) - 0.5;
        float v = pickChan(mc, uVChan) - 0.5;
        vec2 disp = vec2(h * uMaxH, -v * uMaxV) / uResolution;
        vec2 uv = vUv + disp;
        if (uWrap) uv = fract(uv); else uv = clamp(uv, 0.0, 1.0);
        gl_FragColor = texture2D(uTexture, uv);
      }
      `,
      {
        uMapTex: { value: null },
        uHChan: { value: 4 },
        uVChan: { value: 4 },
        uMaxH: { value: 20 },
        uMaxV: { value: 20 },
        uWrap: { value: false },
        uExpand: { value: false },
      },
    );

    const u: any = mat.uniforms;
    u.uTexture.value = ctx.readTexture;
    u.uMapTex.value = mapTex ?? ctx.readTexture; // fallback to self
    u.uResolution.value.set(ctx.width, ctx.height);
    for (const p of ctx.instance.parameters) {
      if (p.uniform === 'uMapTex') continue;
      const un = u[p.uniform];
      if (un) un.value = p.value;
    }
    ctx.renderPass(mat, ctx.writeTarget);
  },
};
