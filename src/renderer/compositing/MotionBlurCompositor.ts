/**
 * MotionBlurCompositor — velocity-based directional motion blur.
 *
 * Instead of re-rendering each layer N times at sub-frame samples (expensive,
 * breaks effects), we render each layer ONCE to an offscreen FBO, then apply
 * a 1D directional blur shader along the velocity vector.
 *
 * Velocity is computed from the delta between the previous frame's transform
 * and the current frame's transform. This is:
 * - ~N× cheaper than sub-frame sampling (1 render + 1 blur pass vs N renders)
 * - Compatible with effects (blur is applied after effects are rendered)
 * - Visually smooth (continuous, not discrete samples)
 */
import * as THREE from 'three';
import type { LayerSync } from '../sync/LayerSync';
import type { Composition, MotionBlurSettings } from '../../types/composition';
import type { Layer } from '../../types/layer';

// ── Blur shader: 1D directional blur along velocity ──────────

const VELOCITY_BLUR_VERTEX = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const VELOCITY_BLUR_FRAGMENT = `
precision highp float;

uniform sampler2D tDiffuse;
uniform vec2 uVelocity;    // blur direction & magnitude in uv coords
uniform float uSamples;    // number of tap points (quality)

varying vec2 vUv;

void main() {
  vec4 color = vec4(0.0);
  float totalWeight = 0.0;

  // Triangle-weighted sampling for smoother falloff.
  // Center frame has highest weight, edges trail off.
  float halfN = floor(uSamples * 0.5);
  for (float i = -16.0; i <= 16.0; i += 1.0) {
    if (abs(i) > halfN) continue;
    float t = i / halfN;
    vec2 uv = vUv + uVelocity * t * 0.5;
    // Clamp to avoid bleeding outside the rendered layer rect.
    uv = clamp(uv, 0.0, 1.0);
    float w = 1.0 - abs(t);
    color += texture2D(tDiffuse, uv) * w;
    totalWeight += w;
  }
  gl_FragColor = color / max(totalWeight, 0.001);
}
`;

// ── Per-layer cache ──────────────────────────────────────────

interface LayerBlurCache {
  /** Full-screen quad for the blur pass (has blurMaterial, reads renderTarget). */
  blurMesh: THREE.Mesh;
  /** FBO storing the rendered layer (before blur). */
  renderTarget: THREE.WebGLRenderTarget;
  /** FBO storing the blurred result. */
  blurTarget: THREE.WebGLRenderTarget;
  /** Scene quad that replaces the original layer mesh (has displayMat, maps blurTarget). */
  quad: THREE.Mesh;
  /** Blur shader material. */
  blurMaterial: THREE.ShaderMaterial;
}

interface PrevTransform {
  px: number; py: number;
  sx: number; sy: number;
  rz: number;
}

export class MotionBlurCompositor {
  private renderer: THREE.WebGLRenderer;
  private layerSync: LayerSync;

  /** Per-layer FBO + quad cache. */
  private cache = new Map<string, LayerBlurCache>();

  /** Previous frame transforms for velocity computation. */
  private prevTransforms = new Map<string, PrevTransform>();

  /** Reusable scene for the blur pass (only one quad active at a time). */
  private _blurScene: THREE.Scene;
  /** Orthographic camera that covers the full FBO for the blur pass. */
  private _blurCam: THREE.OrthographicCamera;

  constructor(
    renderer: THREE.WebGLRenderer,
    layerSync: LayerSync,
  ) {
    this.renderer = renderer;
    this.layerSync = layerSync;
    this._blurScene = new THREE.Scene();
    this._blurCam = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0, 1);
  }

  /**
   * Apply velocity-based motion blur for the current frame.
   *
   * For each layer with motionBlur=true:
   *   1. Compute velocity from prev→current transform delta
   *   2. Render the layer (with effects, blend mode, etc.) to a padded FBO
   *   3. Blur the FBO along the velocity direction via a shader pass
   *   4. Replace the layer's mesh with the blurred quad
   */
  apply(
    comp: Composition,
    scene: THREE.Scene,
    _camera: THREE.OrthographicCamera | THREE.PerspectiveCamera,
    _currentFrame: number,
  ): void {
    const mb: MotionBlurSettings | undefined = comp.motionBlur;
    if (!mb?.enabled) return;

    const shutterFrac = mb.shutterAngle / 360;
    const numSamples = Math.max(4, Math.min(32, mb.samples | 0));
    const qualityScale = mb.samples / numSamples;

    for (const layer of comp.layers) {
      if (!layer.motionBlur || !layer.visible) continue;

      const lr = this.layerSync.getRenderer(layer.id);
      if (!lr) continue;

      const gw = (lr as any).geometryWidth?.() ?? 0;
      const gh = (lr as any).geometryHeight?.() ?? 0;
      if (gw <= 0 || gh <= 0) continue;

      // ── Compute velocity from delta transform ──
      const t = layer.transform;
      const prev = this.prevTransforms.get(layer.id);

      this.prevTransforms.set(layer.id, {
        px: t.position.x,
        py: t.position.y,
        sx: t.scale.x,
        sy: t.scale.y,
        rz: t.rotation,
      });

      // No previous frame = first frame (no velocity yet).
      if (!prev) continue;

      const vx = (t.position.x - prev.px) * shutterFrac;
      const vy = (t.position.y - prev.py) * shutterFrac;

      // Scale-change pseudo-velocity (edge displacement).
      const svx = (t.scale.x - prev.sx) / 100 * shutterFrac * gw * 0.5;
      const svy = (t.scale.y - prev.sy) / 100 * shutterFrac * gh * 0.5;

      const totalVx = vx + svx;
      const totalVy = vy + svy;
      const velMag = Math.sqrt(totalVx * totalVx + totalVy * totalVy);
      if (velMag < 0.1) continue;

      // ── Padded FBO size (blur extends beyond layer bounds) ──
      const padding = Math.min(velMag + 4, 200);
      const fboW = Math.ceil(gw + padding * 2);
      const fboH = Math.ceil(gh + padding * 2);

      // ── Get or create per-layer cache ──
      let c = this.cache.get(layer.id);
      if (!c || c.renderTarget.width !== fboW || c.renderTarget.height !== fboH) {
        c = this._createCache(layer.id, fboW, fboH);
      }

      // ── Save scene state ──
      const prevTarget = this.renderer.getRenderTarget();
      const prevClearColor = new THREE.Color();
      this.renderer.getClearColor(prevClearColor);
      const prevClearAlpha = this.renderer.getClearAlpha();

      // ── Step A: Render layer to renderTarget (only this layer visible) ──
      const layerGroup = lr.group.parent as THREE.Group;
      const siblingSnapshot = this._snapshotVisibility(scene, layerGroup, lr, c.quad);

      lr.group.visible = true;
      lr.mesh.visible = true;

      this.renderer.setRenderTarget(c.renderTarget);
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.clear(true, true, true);

      // Camera centered on the layer's world position, framing layer + padding.
      const layerCam = this._buildLayerCamera(gw, gh, padding);
      layerCam.position.set(lr.group.position.x, lr.group.position.y, 0);
      layerCam.updateMatrixWorld(true);
      this.renderer.render(scene, layerCam);

      // ── Step B: Blur pass — render renderTarget through blurMaterial into blurTarget ──
      // totalVx/vy already includes shutterFrac from the velocity computation
      // above (vx/vy = delta * shutterFrac). DO NOT multiply by shutterFrac
      // again here — that would double-scale the blur to shutterFrac².
      const uvVx = totalVx / fboW;
      const uvVy = totalVy / fboH;

      // Clamp UV velocity to prevent extreme artifacts.
      c.blurMaterial.uniforms.uVelocity.value.set(
        Math.sign(uvVx) * Math.min(Math.abs(uvVx), 0.5),
        Math.sign(uvVy) * Math.min(Math.abs(uvVy), 0.5),
      );
      c.blurMaterial.uniforms.uSamples.value = Math.max(
        4,
        Math.min(numSamples, Math.ceil(velMag * 0.5) * qualityScale),
      );
      c.blurMaterial.needsUpdate = true;

      this.renderer.setRenderTarget(c.blurTarget);
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.clear(true, true, true);

      // Swap blur scene to only this layer's blur quad.
      this._blurScene.clear();
      this._blurScene.add(c.blurMesh);

      // blurMaterial already has depthTest:false, depthWrite:false.
      this.renderer.render(this._blurScene, this._blurCam);

      // ── Step C: Show blurred display quad in main scene ──
      c.quad.position.copy(lr.group.position);
      c.quad.rotation.copy(lr.group.rotation);
      c.quad.scale.set(1, 1, 1);

      // Match quad geometry to layer size (not FBO size).
      const qgeo = c.quad.geometry as THREE.PlaneGeometry;
      if (
        Math.abs(qgeo.parameters.width - gw) > 0.5 ||
        Math.abs(qgeo.parameters.height - gh) > 0.5
      ) {
        qgeo.dispose();
        c.quad.geometry = new THREE.PlaneGeometry(gw, gh);
      }

      this._restoreVisibility(siblingSnapshot);

      const quadMat = c.quad.material as THREE.MeshBasicMaterial;
      quadMat.map = c.blurTarget.texture;
      quadMat.transparent = true;
      quadMat.needsUpdate = true;

      lr.mesh.visible = false;
      if (!c.quad.parent) scene.add(c.quad);
      c.quad.visible = true;

      // ── Restore render target ──
      this.renderer.setRenderTarget(prevTarget);
      this.renderer.setClearColor(prevClearColor, prevClearAlpha);
    }
  }

  /** Restore hidden meshes and remove motion-blur quads. Called after frame render. */
  restore(comp: Composition, scene: THREE.Scene): void {
    for (const layer of comp.layers) {
      if (!layer.motionBlur) continue;
      const lr = this.layerSync.getRenderer(layer.id);
      if (lr && !lr.mesh.visible) lr.mesh.visible = true;
      const c = this.cache.get(layer.id);
      if (c?.quad?.parent === scene) scene.remove(c.quad);
      if (c) c.quad.visible = false;
    }
  }

  /** Seed previous transform for a layer (call on layer creation). */
  seedTransform(layer: Layer): void {
    const t = layer.transform;
    this.prevTransforms.set(layer.id, {
      px: t.position.x, py: t.position.y,
      sx: t.scale.x, sy: t.scale.y,
      rz: t.rotation,
    });
  }

  /** Clear all cached data. */
  clear(): void {
    for (const c of this.cache.values()) {
      c.renderTarget.dispose();
      c.blurTarget.dispose();
      c.blurMaterial.dispose();
      c.blurMesh.geometry.dispose();
      (c.blurMesh.material as THREE.Material).dispose();
      c.quad.geometry.dispose();
      (c.quad.material as THREE.Material).dispose();
    }
    this.cache.clear();
    this.prevTransforms.clear();
  }

  /** Remove a single layer's cache. */
  removeLayer(layerId: string): void {
    const c = this.cache.get(layerId);
    if (c) {
      c.renderTarget.dispose();
      c.blurTarget.dispose();
      c.blurMaterial.dispose();
      c.blurMesh.geometry.dispose();
      (c.blurMesh.material as THREE.Material).dispose();
      c.quad.geometry.dispose();
      (c.quad.material as THREE.Material).dispose();
      this.cache.delete(layerId);
    }
    this.prevTransforms.delete(layerId);
  }

  dispose(): void {
    this.clear();
  }

  // ── Private helpers ────────────────────────────────────────

  private _createCache(layerId: string, w: number, h: number): LayerBlurCache {
    // Dispose old cache if exists.
    const old = this.cache.get(layerId);
    if (old) {
      old.renderTarget.dispose();
      old.blurTarget.dispose();
      old.blurMaterial.dispose();
      old.blurMesh.geometry.dispose();
      (old.blurMesh.material as THREE.Material).dispose();
      old.quad.geometry.dispose();
      (old.quad.material as THREE.Material).dispose();
      this.cache.delete(layerId);
    }

    const renderTarget = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      depthBuffer: true,
    });

    const blurTarget = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      depthBuffer: false,
    });

    const blurMaterial = new THREE.ShaderMaterial({
      vertexShader: VELOCITY_BLUR_VERTEX,
      fragmentShader: VELOCITY_BLUR_FRAGMENT,
      uniforms: {
        tDiffuse: { value: renderTarget.texture },
        uVelocity: { value: new THREE.Vector2(0, 0) },
        uSamples: { value: 8 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });

    // Blur quad (full-screen, always in _blurScene during the blur pass).
    const blurMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), blurMaterial);
    blurMesh.frustumCulled = false;
    blurMesh.renderOrder = -5;

    // Display quad (placed in main scene, shows blurTarget.texture).
    const displayMat = new THREE.MeshBasicMaterial({
      map: blurTarget.texture,
      transparent: true,
      depthWrite: false,
      depthTest: true,
    });
    const displayQuad = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), displayMat);
    displayQuad.frustumCulled = false;
    displayQuad.renderOrder = -3;

    return { blurMesh, renderTarget, blurTarget, quad: displayQuad, blurMaterial };
  }

  private _buildLayerCamera(gw: number, gh: number, padding: number): THREE.OrthographicCamera {
    const halfW = (gw + padding * 2) / 2;
    const halfH = (gh + padding * 2) / 2;
    return new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, -100, 100);
  }

  private _snapshotVisibility(
    scene: THREE.Scene,
    layerGroup: THREE.Group | null,
    lr: { mesh: THREE.Mesh; group: THREE.Group },
    excludeQuad: THREE.Mesh,
  ): Array<{ obj: THREE.Object3D; wasVisible: boolean }> {
    const snapshot: Array<{ obj: THREE.Object3D; wasVisible: boolean }> = [];
    if (layerGroup) {
      for (const child of layerGroup.children) {
        if (child !== lr.group && child !== excludeQuad) {
          snapshot.push({ obj: child, wasVisible: child.visible });
          child.visible = false;
        }
      }
    }
    for (const child of scene.children) {
      if (child !== layerGroup) {
        snapshot.push({ obj: child, wasVisible: child.visible });
        child.visible = false;
      }
    }
    return snapshot;
  }

  private _restoreVisibility(snapshot: Array<{ obj: THREE.Object3D; wasVisible: boolean }>): void {
    for (const { obj, wasVisible } of snapshot) {
      obj.visible = wasVisible;
    }
  }
}
