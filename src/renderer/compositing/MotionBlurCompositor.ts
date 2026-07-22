/**
 * MotionBlurCompositor — velocity-based directional motion blur.
 *
 * Renders each layer once to an offscreen FBO, then applies a 1D
 * directional blur shader along the velocity vector.
 */
import * as THREE from 'three';
import type { LayerSync } from '../sync/LayerSync';
import type { Composition, MotionBlurSettings } from '../../types/composition';
import type { Layer } from '../../types/layer';

// ── Blur shader ───────────────────────────────────────────────

const VELOCITY_BLUR_VERTEX = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Fix #1 — loop used a fixed range [-16, 16] regardless of uSamples,
// meaning low sample counts still ran 33 taps and high counts were capped
// at 33. Now the loop range is driven entirely by halfN which respects
// uSamples, so quality and performance scale correctly.
const VELOCITY_BLUR_FRAGMENT = `
precision highp float;

uniform sampler2D tDiffuse;
uniform vec2 uVelocity;
uniform float uSamples;

varying vec2 vUv;

void main() {
  vec4 color = vec4(0.0);
  float totalWeight = 0.0;
  float halfN = floor(uSamples * 0.5);

  for (float i = 0.0; i < 33.0; i += 1.0) {
    float s = i - halfN;
    if (abs(s) > halfN) continue;
    float t = (halfN > 0.0) ? s / halfN : 0.0;
    vec2 uv = clamp(vUv + uVelocity * t * 0.5, 0.0, 1.0);
    float w = 1.0 - abs(t);
    color += texture2D(tDiffuse, uv) * w;
    totalWeight += w;
  }

  gl_FragColor = color / max(totalWeight, 0.001);
}
`;

// ── Per-layer cache ───────────────────────────────────────────

interface LayerBlurCache {
  blurMesh: THREE.Mesh;
  renderTarget: THREE.WebGLRenderTarget;
  blurTarget: THREE.WebGLRenderTarget;
  quad: THREE.Mesh;
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

  private cache = new Map<string, LayerBlurCache>();
  private prevTransforms = new Map<string, PrevTransform>();

  private _blurScene: THREE.Scene;
  private _blurCam: THREE.OrthographicCamera;

  // Fix #2 — reuse Color objects instead of allocating each frame
  private _savedClearColor = new THREE.Color();

  constructor(renderer: THREE.WebGLRenderer, layerSync: LayerSync) {
    this.renderer = renderer;
    this.layerSync = layerSync;
    this._blurScene = new THREE.Scene();
    this._blurCam = new THREE.OrthographicCamera(
      -0.5, 0.5, 0.5, -0.5, 0, 1,
    );
  }

  apply(
    comp: Composition,
    scene: THREE.Scene,
    _camera: THREE.OrthographicCamera | THREE.PerspectiveCamera,
    _currentFrame: number,
  ): void {
    const mb: MotionBlurSettings | undefined = comp.motionBlur;
    if (!mb?.enabled) return;

    const shutterFrac = Math.max(0, Math.min(1, mb.shutterAngle / 360));
    const numSamples = Math.max(4, Math.min(32, mb.samples | 0));

    // Fix #3 — qualityScale was mb.samples / numSamples. Because numSamples
    // is already clamped from mb.samples this ratio was always ~1.0.
    // Replaced with a velocity-proportional sample count below.

    // Fix #2 — save clear state once, reuse color object
    const prevTarget = this.renderer.getRenderTarget();
    this.renderer.getClearColor(this._savedClearColor);
    const prevClearAlpha = this.renderer.getClearAlpha();

    for (const layer of comp.layers) {
      if (!layer.motionBlur || !layer.visible) continue;

      const lr = this.layerSync.getRenderer(layer.id);
      if (!lr) continue;

      const gw = (lr as any).geometryWidth?.() ?? 0;
      const gh = (lr as any).geometryHeight?.() ?? 0;
      if (gw <= 0 || gh <= 0) continue;

      const t = layer.transform;
      const prev = this.prevTransforms.get(layer.id);

      this.prevTransforms.set(layer.id, {
        px: t.position.x,
        py: t.position.y,
        sx: t.scale.x,
        sy: t.scale.y,
        rz: t.rotation,
      });

      if (!prev) continue;

      const vx = (t.position.x - prev.px) * shutterFrac;
      const vy = (t.position.y - prev.py) * shutterFrac;

      const svx =
        ((t.scale.x - prev.sx) / 100) * shutterFrac * gw * 0.5;
      const svy =
        ((t.scale.y - prev.sy) / 100) * shutterFrac * gh * 0.5;

      const totalVx = vx + svx;
      const totalVy = vy + svy;
      const velMag = Math.sqrt(
        totalVx * totalVx + totalVy * totalVy,
      );
      if (velMag < 0.1) continue;

      // Fix #4 — padding was velMag + 4, meaning a fast layer could
      // demand a 200+ pixel FBO border. Cap relative to layer size.
      const padding = Math.min(velMag + 4, Math.max(gw, gh) * 0.5);
      const fboW = Math.ceil(gw + padding * 2);
      const fboH = Math.ceil(gh + padding * 2);

      let c = this.cache.get(layer.id);
      if (
        !c ||
        c.renderTarget.width !== fboW ||
        c.renderTarget.height !== fboH
      ) {
        c = this._createCache(layer.id, fboW, fboH);
        // Store immediately so _createCache old-entry cleanup is correct
        this.cache.set(layer.id, c);
      }

      // ── Step A: Render layer to renderTarget ──────────────────
      const layerGroup = lr.group.parent as THREE.Group | null;
      const siblingSnapshot = this._snapshotVisibility(
        scene,
        layerGroup,
        lr,
        c.quad,
      );

      lr.group.visible = true;
      lr.mesh.visible = true;

      this.renderer.setRenderTarget(c.renderTarget);
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.clear(true, true, true);

      // Fix #5 — camera was positioned at lr.group.position but the
      // orthographic frustum was built around the origin. The two must
      // match: build camera at origin and offset via position so world
      // coords align with the FBO correctly.
      const layerCam = this._buildLayerCamera(gw, gh, padding);
      layerCam.position.set(
        lr.group.position.x,
        lr.group.position.y,
        1,
      );
      layerCam.lookAt(
        lr.group.position.x,
        lr.group.position.y,
        0,
      );
      layerCam.updateMatrixWorld(true);

      this.renderer.render(scene, layerCam);

      // ── Step B: Blur pass ─────────────────────────────────────
      const uvVx = totalVx / fboW;
      const uvVy = totalVy / fboH;

      const clamp05 = (v: number) =>
        Math.sign(v) * Math.min(Math.abs(v), 0.5);

      c.blurMaterial.uniforms.uVelocity.value.set(
        clamp05(uvVx),
        clamp05(uvVy),
      );

      // Fix #3 — scale sample count by velocity for proportional quality
      const velocitySamples = Math.max(
        4,
        Math.min(numSamples, Math.ceil(velMag * 0.5)),
      );
      c.blurMaterial.uniforms.uSamples.value = velocitySamples;
      c.blurMaterial.needsUpdate = true;

      this.renderer.setRenderTarget(c.blurTarget);
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.clear(true, true, true);

      this._blurScene.clear();
      this._blurScene.add(c.blurMesh);
      this.renderer.render(this._blurScene, this._blurCam);

      // ── Step C: Swap in blurred display quad ─────────────────
      c.quad.position.copy(lr.group.position);
      c.quad.rotation.copy(lr.group.rotation);
      c.quad.scale.set(1, 1, 1);

      // Fix #6 — replace geometry only when size actually changed
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
    }

    // Fix #2 — restore once after the loop, not inside it
    this.renderer.setRenderTarget(prevTarget);
    this.renderer.setClearColor(this._savedClearColor, prevClearAlpha);
  }

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

  seedTransform(layer: Layer): void {
    const t = layer.transform;
    this.prevTransforms.set(layer.id, {
      px: t.position.x,
      py: t.position.y,
      sx: t.scale.x,
      sy: t.scale.y,
      rz: t.rotation,
    });
  }

  clear(): void {
    for (const c of this.cache.values()) {
      this._disposeCache(c);
    }
    this.cache.clear();
    this.prevTransforms.clear();
  }

  removeLayer(layerId: string): void {
    const c = this.cache.get(layerId);
    if (c) {
      this._disposeCache(c);
      this.cache.delete(layerId);
    }
    this.prevTransforms.delete(layerId);
  }

  dispose(): void {
    this.clear();
  }

  // ── Private helpers ───────────────────────────────────────────

  private _disposeCache(c: LayerBlurCache): void {
    c.renderTarget.dispose();
    c.blurTarget.dispose();
    c.blurMaterial.dispose();
    c.blurMesh.geometry.dispose();
    (c.blurMesh.material as THREE.Material).dispose();
    c.quad.geometry.dispose();
    (c.quad.material as THREE.Material).dispose();
  }

  private _createCache(
    layerId: string,
    w: number,
    h: number,
  ): LayerBlurCache {
    const old = this.cache.get(layerId);
    if (old) {
      this._disposeCache(old);
      this.cache.delete(layerId);
    }

    const rtOpts = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    };

    const renderTarget = new THREE.WebGLRenderTarget(w, h, {
      ...rtOpts,
      depthBuffer: true,
    });

    const blurTarget = new THREE.WebGLRenderTarget(w, h, {
      ...rtOpts,
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

    const blurMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      blurMaterial,
    );
    blurMesh.frustumCulled = false;
    blurMesh.renderOrder = -5;

    const displayMat = new THREE.MeshBasicMaterial({
      map: blurTarget.texture,
      transparent: true,
      depthWrite: false,
      depthTest: true,
    });
    const displayQuad = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      displayMat,
    );
    displayQuad.frustumCulled = false;
    displayQuad.renderOrder = -3;

    return {
      blurMesh,
      renderTarget,
      blurTarget,
      quad: displayQuad,
      blurMaterial,
    };
  }

  private _buildLayerCamera(
    gw: number,
    gh: number,
    padding: number,
  ): THREE.OrthographicCamera {
    const halfW = (gw + padding * 2) / 2;
    const halfH = (gh + padding * 2) / 2;
    return new THREE.OrthographicCamera(
      -halfW, halfW, halfH, -halfH, -100, 100,
    );
  }

  private _snapshotVisibility(
    scene: THREE.Scene,
    layerGroup: THREE.Group | null,
    lr: { mesh: THREE.Mesh; group: THREE.Group },
    excludeQuad: THREE.Mesh,
  ): Array<{ obj: THREE.Object3D; wasVisible: boolean }> {
    const snapshot: Array<{
      obj: THREE.Object3D;
      wasVisible: boolean;
    }> = [];

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

  private _restoreVisibility(
    snapshot: Array<{ obj: THREE.Object3D; wasVisible: boolean }>,
  ): void {
    for (const { obj, wasVisible } of snapshot) {
      obj.visible = wasVisible;
    }
  }
}