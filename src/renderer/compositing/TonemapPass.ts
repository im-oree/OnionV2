/**
 * TonemapPass — renders the 3D scene to an HDR (HalfFloat) FBO, then blits
 * it to the screen with ACES / Reinhard / None tonemapping.
 */
import * as THREE from 'three';

const TONEMAP_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const TONEMAP_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform int uMode; // 0=none, 1=ACES, 2=Reinhard
uniform float uExposure;

// ACES filmic (Narkowicz 2015 fit)
vec3 aces(vec3 x) {
  float a = 2.51;
  float b = 0.03;
  float c = 2.43;
  float d = 0.59;
  float e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

// Reinhard extended
vec3 reinhard(vec3 x) {
  return x / (1.0 + x);
}

// sRGB OETF (linear → sRGB)
vec3 linearToSrgb(vec3 c) {
  vec3 lo = c * 12.92;
  vec3 hi = 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055;
  return mix(lo, hi, step(0.0031308, c));
}

void main() {
  vec4 c = texture2D(uTex, vUv);
  vec3 result = max(c.rgb * uExposure, vec3(0.0));

  if (uMode == 1)      result = aces(result);
  else if (uMode == 2) result = reinhard(result);

  // Apply sRGB transfer since we render with LinearSRGBColorSpace output
  result = linearToSrgb(result);

  gl_FragColor = vec4(result, c.a);
}
`;

export type TonemapMode = 0 | 1 | 2;

const FS_GEO = new THREE.PlaneGeometry(2, 2);
const FS_CAM = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

export class TonemapPass {
  private renderer: THREE.WebGLRenderer;
  private _hdrFBO: THREE.WebGLRenderTarget | null = null;
  private _scene: THREE.Scene | null = null;
  private _material: THREE.ShaderMaterial | null = null;
  private _quad: THREE.Mesh | null = null;
  private _mode: TonemapMode = 0;
  private _exposure = 1.0;

  // Reuse for state save/restore
  private _savedClearColor = new THREE.Color();

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    this._buildQuad();
  }

  set mode(m: TonemapMode) { this._mode = m; }
  get mode(): TonemapMode { return this._mode; }

  set exposure(v: number) {
    this._exposure = Math.max(0, v);
  }
  get exposure(): number { return this._exposure; }

  private _buildQuad(): void {
    this._material = new THREE.ShaderMaterial({
      uniforms: {
        uTex: { value: null },
        uMode: { value: 0 },
        uExposure: { value: 1.0 },
      },
      vertexShader: TONEMAP_VERT,
      fragmentShader: TONEMAP_FRAG,
      depthWrite: false,
      depthTest: false,
    });

    this._quad = new THREE.Mesh(FS_GEO, this._material);
    this._quad.frustumCulled = false;

    this._scene = new THREE.Scene();
    this._scene.add(this._quad);
  }

  private _ensureFBO(w: number, h: number): THREE.WebGLRenderTarget {
    if (w <= 0 || h <= 0) {
      w = Math.max(1, w);
      h = Math.max(1, h);
    }

    if (
      this._hdrFBO &&
      this._hdrFBO.width === w &&
      this._hdrFBO.height === h
    ) {
      return this._hdrFBO;
    }

    this._hdrFBO?.dispose();

    this._hdrFBO = new THREE.WebGLRenderTarget(w, h, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
      stencilBuffer: false,
      // Fix #1 — colorSpace was set to LinearColorSpace which is
      // deprecated in newer Three.js versions. Use LinearSRGBColorSpace
      // which is the canonical name for "no encoding, store raw linear".
      colorSpace: THREE.LinearSRGBColorSpace,
    });

    return this._hdrFBO;
  }

  /**
   * Called BEFORE the scene renders — redirect to HDR FBO.
   */
  beforeRender(
    canvasWidth: number,
    canvasHeight: number,
    clearColor?: THREE.Color | number | string,
    clearAlpha?: number,
  ): void {
    if (this._mode === 0) {
      // Fix #2 — only reset render target if it was pointing to our FBO.
      // Blindly setting null every frame can clobber another pass
      // (e.g. AdjustmentCompositor) that legitimately set a render target.
      if (this.renderer.getRenderTarget() === this._hdrFBO) {
        this.renderer.setRenderTarget(null);
      }
      return;
    }

    const fbo = this._ensureFBO(canvasWidth, canvasHeight);
    this.renderer.setRenderTarget(fbo);

    if (clearColor !== undefined) {
      this.renderer.setClearColor(clearColor, clearAlpha ?? 1);
    }

    this.renderer.clear(true, true, false);
  }

  /**
   * Called AFTER the scene renders — blit HDR FBO to screen with tonemapping.
   */
  afterRender(): void {
    if (this._mode === 0 || !this._hdrFBO) return;
    if (!this._scene || !this._material) return;

    this._material.uniforms.uTex.value = this._hdrFBO.texture;
    this._material.uniforms.uMode.value = this._mode;
    this._material.uniforms.uExposure.value = this._exposure;

    this.renderer.setRenderTarget(null);

    // Fix #3 — old code swapped outputColorSpace to LinearColorSpace
    // to avoid double sRGB encoding. But that is fragile: if anything
    // else reads outputColorSpace during this frame it gets the wrong
    // value. Instead, the shader now applies linearToSrgb() explicitly,
    // and we always render with LinearSRGBColorSpace output so Three.js
    // does NOT apply its own sRGB OETF. We save/restore properly.
    const prevColorSpace = this.renderer.outputColorSpace;
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

    this.renderer.render(this._scene, FS_CAM);

    this.renderer.outputColorSpace = prevColorSpace;
  }

  dispose(): void {
    this._hdrFBO?.dispose();
    this._hdrFBO = null;

    if (this._material) {
      this._material.dispose();
      this._material = null;
    }

    // Don't dispose FS_GEO — it's shared
    this._quad = null;
    this._scene = null;
  }
}