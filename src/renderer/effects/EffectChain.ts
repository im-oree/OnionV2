/**
 * EffectChain — per-layer GPU effect pipeline.
 * Manages ping-pong FBOs and renders effects sequentially.
 * 
 * Process:
 *   1. Render source layer to FBO A
 *   2. Apply effect 1 → FBO B
 *   3. Apply effect 2 → FBO A (ping-pong)
 *   ... alternating ...
 *   4. Final result composited into scene as textured quad
 * 
 * Operations entirely on GPU — no CPU roundtrips.
 */
import * as THREE from 'three';
import type { EffectInstance, EffectDefinition } from '../../types/effect';
import { effectRegistry } from './EffectRegistry';

export class EffectChain {
  private renderer: THREE.WebGLRenderer;
  /** Cached ShaderMaterial per effect (reused across frames) */
  private materialCache = new Map<string, THREE.ShaderMaterial>();
  /** Source texture (the layer's rendered content) */
  private sourceTexture: THREE.Texture | null = null;

  /** Layer bounds for FBO sizing */
  private layerWidth = 0;
  private layerHeight = 0;

  /** Persistent ping-pong targets. These are NOT returned to FBOPool each frame. */
  private targetA: THREE.WebGLRenderTarget | null = null;
  private targetB: THREE.WebGLRenderTarget | null = null;
  private targetW = 0;
  private targetH = 0;

  private fullscreenScene: THREE.Scene | null = null;
  private fullscreenCamera: THREE.OrthographicCamera | null = null;
  private fullscreenQuad: THREE.Mesh | null = null;

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
  }

  /** Set the source texture to process through the chain */
  setSource(texture: THREE.Texture, width: number, height: number): void {
    this.sourceTexture = texture;
    this.layerWidth = Math.max(1, Math.ceil(width));
    this.layerHeight = Math.max(1, Math.ceil(height));
  }

  /** Render the effect stack. Returns a persistent final texture. */
  render(effects: EffectInstance[]): THREE.Texture | null {
    if (!this.sourceTexture) return null;

    const enabled = effects.filter((e) => e.enabled);
    if (enabled.length === 0) return this.sourceTexture;

    const w = Math.max(1, Math.ceil(this.layerWidth));
    const h = Math.max(1, Math.ceil(this.layerHeight));
    this._ensureTargets(w, h);

    if (!this.targetA || !this.targetB) return null;

    const oldTarget = this.renderer.getRenderTarget();
    const oldViewport = new THREE.Vector4();
    const oldScissor = new THREE.Vector4();

    this.renderer.getViewport(oldViewport);
    this.renderer.getScissor(oldScissor);
    const oldScissorTest = this.renderer.getScissorTest();

    try {
      // Copy source texture into targetA first.
      this._renderTextureToTarget(this.sourceTexture, this.targetA, w, h);

      let read = this.targetA;
      let write = this.targetB;

      for (const effect of enabled) {
        const def = effectRegistry.get(effect.type);
        if (!def || def.passes === 0) continue;

        // Blurs run as two separable 1D passes for a smooth result.
        if (effect.type === 'gaussianBlur' || effect.type === 'boxBlur') {
          const passH = this._getBlurMaterial(effect, 'h');
          const passV = this._getBlurMaterial(effect, 'v');
          if (!passH || !passV) continue;

          this._syncUniforms(passH, effect);
          this._syncUniforms(passV, effect);

          (passH.uniforms as any).uTexture.value = read.texture;
          (passH.uniforms as any).uResolution.value.set(w, h);
          this._renderMaterialToTarget(passH, write, w, h);
          [read, write] = [write, read];

          (passV.uniforms as any).uTexture.value = read.texture;
          (passV.uniforms as any).uResolution.value.set(w, h);
          this._renderMaterialToTarget(passV, write, w, h);
          [read, write] = [write, read];
          continue;
        }

        const mat = this._getMaterial(def, effect);
        if (!mat) continue;

        this._syncUniforms(mat, effect);

        if ((mat.uniforms as any).uTexture) {
          (mat.uniforms as any).uTexture.value = read.texture;
        }

        if ((mat.uniforms as any).uResolution?.value?.set) {
          (mat.uniforms as any).uResolution.value.set(w, h);
        }

        this._renderMaterialToTarget(mat, write, w, h);
        [read, write] = [write, read];
      }

      return read.texture;
    } finally {
      this.renderer.setRenderTarget(oldTarget);
      this.renderer.setViewport(oldViewport);
      this.renderer.setScissor(oldScissor);
      this.renderer.setScissorTest(oldScissorTest);
    }
  }

  /** Kept for compatibility. Persistent targets are released only on resize/dispose. */
  releaseResult(): void {
    // no-op
  }

  private _ensureTargets(w: number, h: number): void {
    if (this.targetA && this.targetB && this.targetW === w && this.targetH === h) {
      return;
    }

    this._disposeTargets();

    this.targetA = this._createTarget(w, h, 'effect-chain-A');
    this.targetB = this._createTarget(w, h, 'effect-chain-B');
    this.targetW = w;
    this.targetH = h;
  }

  private _createTarget(w: number, h: number, name: string): THREE.WebGLRenderTarget {
    const rt = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: false,
      stencilBuffer: false,
    });

    rt.texture.name = `${name}-${w}x${h}`;
    rt.texture.colorSpace = THREE.SRGBColorSpace;

    return rt;
  }

  private _disposeTargets(): void {
    if (this.targetA) {
      this.targetA.dispose();
      this.targetA = null;
    }
    if (this.targetB) {
      this.targetB.dispose();
      this.targetB = null;
    }
    this.targetW = 0;
    this.targetH = 0;
  }

  private _getFullscreenObjects(): {
    scene: THREE.Scene;
    camera: THREE.OrthographicCamera;
    quad: THREE.Mesh;
  } {
    if (!this.fullscreenScene) {
      this.fullscreenScene = new THREE.Scene();
    }

    if (!this.fullscreenCamera) {
      this.fullscreenCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      this.fullscreenCamera.position.z = 0;
    }

    if (!this.fullscreenQuad) {
      const geo = new THREE.PlaneGeometry(2, 2);
      const mat = new THREE.MeshBasicMaterial({
        depthWrite: false,
        depthTest: false,
        transparent: true,
      });

      this.fullscreenQuad = new THREE.Mesh(geo, mat);
      this.fullscreenQuad.frustumCulled = false;
      this.fullscreenScene.add(this.fullscreenQuad);
    }

    return {
      scene: this.fullscreenScene,
      camera: this.fullscreenCamera,
      quad: this.fullscreenQuad,
    };
  }

  private _renderTextureToTarget(
    texture: THREE.Texture,
    target: THREE.WebGLRenderTarget,
    w: number,
    h: number,
  ): void {
    const { scene, camera, quad } = this._getFullscreenObjects();

    let mat = quad.material as THREE.MeshBasicMaterial;
    if (!(mat instanceof THREE.MeshBasicMaterial)) {
      mat = new THREE.MeshBasicMaterial({
        depthWrite: false,
        depthTest: false,
        transparent: true,
      });
      quad.material = mat;
    }

    mat.map = texture;
    mat.color.set(0xffffff);
    mat.needsUpdate = true;

    this.renderer.setRenderTarget(target);
    this.renderer.setViewport(0, 0, w, h);
    this.renderer.setScissor(0, 0, w, h);
    this.renderer.setScissorTest(false);
    this.renderer.clear();
    this.renderer.render(scene, camera);
  }

  private _renderMaterialToTarget(
    material: THREE.ShaderMaterial,
    target: THREE.WebGLRenderTarget,
    w: number,
    h: number,
  ): void {
    const { scene, camera, quad } = this._getFullscreenObjects();

    quad.material = material;

    this.renderer.setRenderTarget(target);
    this.renderer.setViewport(0, 0, w, h);
    this.renderer.setScissor(0, 0, w, h);
    this.renderer.setScissorTest(false);
    this.renderer.clear();
    this.renderer.render(scene, camera);
  }

  /** Sync ShaderMaterial uniforms from current effect instance parameters */
  private _syncUniforms(mat: THREE.ShaderMaterial, effect: EffectInstance): void {
    for (const param of effect.parameters) {
      const uniform = (mat.uniforms as any)[param.uniform];
      if (!uniform) continue;
      const val = param.value;
      // Vector2 params come as [number, number] → set to THREE.Vector2
      if (Array.isArray(val) && uniform.value?.set) {
        uniform.value.set(val[0], val[1]);
      } else if (typeof val === 'string' && param.type === 'color') {
        // Color strings → set as THREE.Color
        if (uniform.value?.set) uniform.value.set(val);
        else uniform.value = val;
      } else {
        uniform.value = val;
      }
    }
  }

  /** Get or create a separable blur material (h or v pass). */
  private _getBlurMaterial(instance: EffectInstance, dir: 'h' | 'v'): THREE.ShaderMaterial | null {
    const key = `blur_${dir}_${instance.id}`;
    if (this.materialCache.has(key)) return this.materialCache.get(key)!;

    const uniforms: Record<string, THREE.IUniform> = {
      uTexture: { value: null },
      uResolution: { value: new THREE.Vector2(this.layerWidth, this.layerHeight) },
    };
    for (const param of instance.parameters) {
      if (param.type === 'color') {
        uniforms[param.uniform] = { value: new THREE.Color(param.value as string) };
      } else if (param.type === 'vector2' && Array.isArray(param.value)) {
        uniforms[param.uniform] = { value: new THREE.Vector2(param.value[0], param.value[1]) };
      } else {
        uniforms[param.uniform] = { value: param.value };
      }
    }

    const vs = `varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`;
    const fs = dir === 'h' ? this._blurShaderH() : this._blurShaderV();

    const mat = new THREE.ShaderMaterial({
      vertexShader: vs,
      fragmentShader: fs,
      uniforms,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });

    this.materialCache.set(key, mat);
    return mat;
  }

  /** Get or create a ShaderMaterial for an effect */
  private _getMaterial(def: EffectDefinition, instance: EffectInstance): THREE.ShaderMaterial | null {
    const key = `${def.type}_${instance.id}`;
    if (this.materialCache.has(key)) return this.materialCache.get(key)!;

    // Build uniforms from instance parameters
    const uniforms: Record<string, THREE.IUniform> = {
      uTexture: { value: null },
      uResolution: { value: new THREE.Vector2(this.layerWidth, this.layerHeight) },
    };
    for (const param of instance.parameters) {
      // Color params need THREE.Color, not hex string
      if (param.type === 'color') {
        uniforms[param.uniform] = { value: new THREE.Color(param.value as string) };
      } else if (param.type === 'vector2' && Array.isArray(param.value)) {
        uniforms[param.uniform] = { value: new THREE.Vector2(param.value[0], param.value[1]) };
      } else {
        uniforms[param.uniform] = { value: param.value };
      }
    }

    // Standard fullscreen quad vertex shader with UV varying
    const vs = `varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`;
    const fs = this._getFallbackShader(def.type);

    const mat = new THREE.ShaderMaterial({
      vertexShader: vs,
      fragmentShader: fs,
      uniforms,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });

    this.materialCache.set(key, mat);
    return mat;
  }

  /** Fallback built-in shaders when GLSL files aren't available yet */
  private _getFallbackShader(type: string): string {
    switch (type) {
      // gaussianBlur / boxBlur handled specially in render() via separable passes
      case 'gaussianBlur':
      case 'boxBlur':
        return `uniform sampler2D uTexture; varying vec2 vUv;
          void main() { gl_FragColor = texture2D(uTexture, vUv); }`;
      case 'glow':
        return this._glowShader();
      case 'colorCorrection':
        return this._colorCorrectShader();
      case 'dropShadow':
        return this._dropShadowShader();
      case 'tint':
        return this._tintShader();
      case 'invert':
        return this._invertShader();
      case 'threshold':
        return this._thresholdShader();
      case 'hueSaturation':
        return this._hueSatShader();
      case 'levels':
        return this._levelsShader();
      case 'fill':
        return this._fillShader();
      case 'gradient':
        return this._gradientShader();
      case 'wave':
        return this._waveShader();
      default:
        return `uniform sampler2D uTexture; varying vec2 vUv;
          void main() { gl_FragColor = texture2D(uTexture, vUv); }`;
    }
  }

  private _blurShaderH(): string {
    return `uniform sampler2D uTexture; uniform float uRadius; uniform vec2 uResolution;
      varying vec2 vUv;
      void main() {
        float sigma = max(uRadius, 0.5);
        float texelX = 1.0 / uResolution.x;
        vec4 col = vec4(0.0);
        float total = 0.0;
        for (int i = -6; i <= 6; i++) {
          float fi = float(i);
          float w = exp(-(fi * fi) / (2.0 * sigma * sigma));
          vec2 off = vec2(fi * texelX * (sigma / 3.0), 0.0);
          col += texture2D(uTexture, vUv + off) * w;
          total += w;
        }
        gl_FragColor = col / total;
      }`;
  }

  private _blurShaderV(): string {
    return `uniform sampler2D uTexture; uniform float uRadius; uniform vec2 uResolution;
      varying vec2 vUv;
      void main() {
        float sigma = max(uRadius, 0.5);
        float texelY = 1.0 / uResolution.y;
        vec4 col = vec4(0.0);
        float total = 0.0;
        for (int i = -6; i <= 6; i++) {
          float fi = float(i);
          float w = exp(-(fi * fi) / (2.0 * sigma * sigma));
          vec2 off = vec2(0.0, fi * texelY * (sigma / 3.0));
          col += texture2D(uTexture, vUv + off) * w;
          total += w;
        }
        gl_FragColor = col / total;
      }`;
  }

  private _glowShader(): string {
    return `uniform sampler2D uTexture; uniform float uThreshold; uniform float uIntensity; uniform vec3 uColor; uniform vec2 uResolution;
      varying vec2 vUv;
      void main() {
        vec4 src = texture2D(uTexture, vUv);
        float lum = dot(src.rgb, vec3(0.299, 0.587, 0.114));
        float glow = max(0.0, lum - uThreshold) * uIntensity;
        vec2 off = vec2(1.0 / uResolution.x, 1.0 / uResolution.y) * 8.0;
        vec4 blur = vec4(0.0);
        for (int x = -2; x <= 2; x++) for (int y = -2; y <= 2; y++)
          blur += texture2D(uTexture, vUv + vec2(float(x)*off.x, float(y)*off.y));
        blur /= 25.0;
        gl_FragColor = src + vec4(uColor * glow, 0.0) * blur.a;
      }`;
  }

  private _colorCorrectShader(): string {
    return `uniform sampler2D uTexture; uniform float uBrightness; uniform float uContrast; uniform float uSaturation; uniform float uHue; uniform float uGamma;
      varying vec2 vUv;
      vec3 rgb2hsv(vec3 c) {
        vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
        vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
        vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
        float d = q.x - min(q.w, q.y);
        float e = 1.0e-10;
        return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
      }
      vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }
      void main() {
        vec4 col = texture2D(uTexture, vUv);
        col.rgb = pow(col.rgb, vec3(1.0 / max(uGamma, 0.01)));
        col.rgb = (col.rgb - 0.5) * (1.0 + uContrast / 100.0) + 0.5;
        col.rgb += uBrightness / 100.0;
        vec3 hsv = rgb2hsv(col.rgb);
        hsv.x += uHue / 360.0;
        hsv.y *= (1.0 + uSaturation / 100.0);
        col.rgb = hsv2rgb(hsv);
        gl_FragColor = col;
      }`;
  }

  private _dropShadowShader(): string {
    return `uniform sampler2D uTexture; uniform vec3 uColor; uniform float uOpacity; uniform float uDistance; uniform float uSoftness; uniform vec2 uResolution;
      varying vec2 vUv;
      void main() {
        vec4 src = texture2D(uTexture, vUv);
        vec2 dir = normalize(vec2(1.0, -1.0)) * uDistance * vec2(1.0 / uResolution.x, 1.0 / uResolution.y);
        vec2 blurOff = vec2(1.0 / uResolution.x, 1.0 / uResolution.y) * uSoftness;
        vec4 shadow = vec4(0.0);
        for (int x = -2; x <= 2; x++) for (int y = -2; y <= 2; y++)
          shadow += texture2D(uTexture, vUv - dir + vec2(float(x)*blurOff.x, float(y)*blurOff.y));
        shadow /= 25.0;
        float shadowAlpha = shadow.a * uOpacity;
        gl_FragColor = vec4(mix(src.rgb, uColor, shadowAlpha), max(src.a, shadowAlpha));
      }`;
  }

  private _tintShader(): string {
    return `uniform sampler2D uTexture; uniform vec3 uColorA; uniform vec3 uColorB;
      varying vec2 vUv;
      void main() {
        vec4 src = texture2D(uTexture, vUv);
        float lum = dot(src.rgb, vec3(0.299, 0.587, 0.114));
        vec3 tinted = mix(uColorA, uColorB, lum);
        gl_FragColor = vec4(tinted, src.a);
      }`;
  }

  private _invertShader(): string {
    return `uniform sampler2D uTexture; varying vec2 vUv;
      void main() {
        vec4 src = texture2D(uTexture, vUv);
        gl_FragColor = vec4(1.0 - src.rgb, src.a);
      }`;
  }

  private _thresholdShader(): string {
    return `uniform sampler2D uTexture; uniform float uLevel; uniform float uSmoothness;
      varying vec2 vUv;
      void main() {
        vec4 src = texture2D(uTexture, vUv);
        float lum = dot(src.rgb, vec3(0.299, 0.587, 0.114));
        float thresh = smoothstep(uLevel - uSmoothness, uLevel + uSmoothness, lum);
        gl_FragColor = vec4(vec3(thresh), src.a * thresh);
      }`;
  }

  private _hueSatShader(): string {
    return `uniform sampler2D uTexture; uniform float uHueShift; uniform float uSatFactor;
      varying vec2 vUv;
      vec3 rgb2hsv(vec3 c) {
        vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
        vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
        vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
        float d = q.x - min(q.w, q.y);
        float e = 1.0e-10;
        return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
      }
      vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }
      void main() {
        vec4 src = texture2D(uTexture, vUv);
        vec3 hsv = rgb2hsv(src.rgb);
        hsv.x += uHueShift / 360.0;
        hsv.y *= uSatFactor;
        gl_FragColor = vec4(hsv2rgb(hsv), src.a);
      }`;
  }

  private _levelsShader(): string {
    return `uniform sampler2D uTexture; uniform float uInputBlack; uniform float uInputWhite; uniform float uGamma; uniform float uOutputBlack; uniform float uOutputWhite;
      varying vec2 vUv;
      void main() {
        vec4 src = texture2D(uTexture, vUv);
        vec3 c = src.rgb;
        c = (c - uInputBlack) / max(uInputWhite - uInputBlack, 0.001);
        c = pow(max(c, 0.0), vec3(1.0 / max(uGamma, 0.01)));
        c = c * (uOutputWhite - uOutputBlack) + uOutputBlack;
        gl_FragColor = vec4(clamp(c, 0.0, 1.0), src.a);
      }`;
  }

  private _fillShader(): string {
    return `uniform sampler2D uTexture; uniform vec3 uFillColor; uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        vec4 src = texture2D(uTexture, vUv);
        gl_FragColor = vec4(mix(src.rgb, uFillColor, uOpacity), src.a);
      }`;
  }

  private _gradientShader(): string {
    return `uniform sampler2D uTexture; uniform vec3 uColorA; uniform vec3 uColorB; uniform float uAngle; uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        vec4 src = texture2D(uTexture, vUv);
        float a = radians(uAngle);
        vec2 dir = vec2(cos(a), sin(a));
        float t = dot(vUv - 0.5, dir) + 0.5;
        vec3 grad = mix(uColorA, uColorB, clamp(t, 0.0, 1.0));
        gl_FragColor = vec4(mix(src.rgb, grad, uOpacity), src.a);
      }`;
  }

  private _waveShader(): string {
    return `uniform sampler2D uTexture; uniform float uAmplitude; uniform float uFrequency; uniform float uSpeed; uniform vec2 uDirection; uniform vec2 uResolution;
      varying vec2 vUv;
      void main() {
        vec2 uv = vUv;
        float wave = sin(uv.x * uFrequency * 10.0 + uSpeed) * uAmplitude / uResolution.x;
        uv.x += wave * uDirection.x;
        uv.y += wave * uDirection.y;
        gl_FragColor = texture2D(uTexture, clamp(uv, 0.0, 1.0));
      }`;
  }

  dispose(): void {
    for (const mat of this.materialCache.values()) mat.dispose();
    this.materialCache.clear();

    this._disposeTargets();

    if (this.fullscreenQuad) {
      this.fullscreenQuad.geometry.dispose();
      if (this.fullscreenQuad.material instanceof THREE.Material) {
        this.fullscreenQuad.material.dispose();
      }
      this.fullscreenQuad = null;
    }

    this.fullscreenScene = null;
    this.fullscreenCamera = null;
  }
}
