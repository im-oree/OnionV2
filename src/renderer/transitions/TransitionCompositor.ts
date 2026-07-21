import * as THREE from 'three';
import { getTransitionById } from './library';
import type { TransitionDefinition, TransitionParam } from './types';

const BASIC_VERTEX = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * TransitionCompositor — applies transition effects by blending two frame
 * textures (A = frame before transition, B = frame after transition).
 *
 * Like the effects system, each transition is a procedural shader with
 * parameters. The compositor manages a material cache for each transition type.
 */
export class TransitionCompositor {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private quad: THREE.Mesh;
  private materials = new Map<string, THREE.ShaderMaterial>();

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0, 1);

    this.quad = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.ShaderMaterial({
        vertexShader: BASIC_VERTEX,
        fragmentShader: 'void main(){gl_FragColor=vec4(1.0);}',
        transparent: true,
      }),
    );
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
  }

  /** Get or create a cached material for a transition definition */
  getMaterial(def: TransitionDefinition): THREE.ShaderMaterial {
    let mat = this.materials.get(def.id);
    if (!mat) {
      mat = new THREE.ShaderMaterial({
        vertexShader: BASIC_VERTEX,
        fragmentShader: def.fragmentShader,
        uniforms: this._buildUniforms(def),
        transparent: true,
        depthWrite: false,
        depthTest: false,
      });
      this.materials.set(def.id, mat);
    }
    return mat;
  }

  /**
   * Apply a transition effect.
   * Renders the blended result into `targetFBO`.
   */
  apply(
    transitionId: string,
    params: Record<string, number | string | boolean>,
    progress: number,
    textureA: THREE.Texture,
    textureB: THREE.Texture,
    targetFBO: THREE.WebGLRenderTarget,
    width: number,
    height: number,
  ): void {
    const def = getTransitionById(transitionId);
    if (!def) return;

    const mat = this.getMaterial(def);

    // Set standard uniforms
    mat.uniforms.uProgress = { value: progress };
    mat.uniforms.uTextureA = { value: textureA };
    mat.uniforms.uTextureB = { value: textureB };
    mat.uniforms.uResolution = { value: new THREE.Vector2(width, height) };
    mat.uniforms.uTime = { value: performance.now() / 1000 };

    // Apply custom parameters
    for (const p of def.params) {
      const val = params[p.id] ?? p.defaultValue;
      if (p.uniform === 'uCenterX' || p.uniform === 'uCenterY') {
        if (!mat.uniforms.uCenter) mat.uniforms.uCenter = { value: new THREE.Vector2(0.5, 0.5) };
        if (p.uniform === 'uCenterX') mat.uniforms.uCenter.value.x = val as number;
        if (p.uniform === 'uCenterY') mat.uniforms.uCenter.value.y = val as number;
      } else {
        mat.uniforms[p.uniform] = { value: val };
      }
    }

    this.quad.material = mat;
    const oldTarget = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(targetFBO);
    this.renderer.setClearColor(0, 0);
    this.renderer.clear(true, true, true);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(oldTarget);
  }

  private _buildUniforms(def: TransitionDefinition): Record<string, THREE.IUniform> {
    const uniforms: Record<string, THREE.IUniform> = {
      uTextureA: { value: null },
      uTextureB: { value: null },
      uProgress: { value: 0.5 },
      uResolution: { value: new THREE.Vector2(1920, 1080) },
      uTime: { value: 0 },
    };

    for (const p of def.params) {
      if (p.uniform === 'uCenterX' || p.uniform === 'uCenterY') {
        if (!uniforms.uCenter) uniforms.uCenter = { value: new THREE.Vector2(0.5, 0.5) };
      } else {
        uniforms[p.uniform] = { value: p.defaultValue };
      }
    }

    return uniforms;
  }

  dispose(): void {
    for (const mat of this.materials.values()) mat.dispose();
    this.materials.clear();
    this.quad.geometry.dispose();
  }
}
