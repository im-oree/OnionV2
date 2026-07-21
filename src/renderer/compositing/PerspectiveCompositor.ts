/**
 * PerspectiveCompositor — GPU corner-pin perspective warp.
 *
 * Takes the layer's rendered texture and warps it to 4 arbitrary corner
 * positions using a perspective transform shader (homography mapping).
 */
import * as THREE from 'three';
import type { PerspectiveCorners } from '../../state/perspectiveStore';

const VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAG = `
precision highp float;
uniform sampler2D uTexture;
// Perspective matrix rows (3x3 homography, column-major)
uniform mat3 uH;
varying vec2 vUv;

void main() {
  // Apply inverse homography to find source UV
  vec3 src = uH * vec3(vUv, 1.0);
  vec2 srcUv = src.xy / src.z;

  // Discard pixels outside source bounds
  if (srcUv.x < 0.0 || srcUv.x > 1.0 || srcUv.y < 0.0 || srcUv.y > 1.0) {
    gl_FragColor = vec4(0.0);
    return;
  }

  gl_FragColor = texture2D(uTexture, srcUv);
}
`;

export class PerspectiveCompositor {
  private renderer: THREE.WebGLRenderer;
  private material: THREE.ShaderMaterial;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private quad: THREE.Mesh;

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTexture: { value: null },
        uH: { value: new THREE.Matrix3() },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.material);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
  }

  /**
   * Compute a perspective-warped texture given 4 destination corners.
   * corners are in normalized [0,1] UV space.
   */
  apply(
    sourceTexture: THREE.Texture,
    corners: PerspectiveCorners,
    targetFBO: THREE.WebGLRenderTarget,
  ): void {
    // Convert normalized corners (-0.5..0.5) to UV space (0..1)
    // TL=UV(0,0), TR=UV(1,0), BR=UV(1,1), BL=UV(0,1)
    const dst = [
      { x: corners.tl.x + 0.5, y: 1 - (corners.tl.y + 0.5) },
      { x: corners.tr.x + 0.5, y: 1 - (corners.tr.y + 0.5) },
      { x: corners.br.x + 0.5, y: 1 - (corners.br.y + 0.5) },
      { x: corners.bl.x + 0.5, y: 1 - (corners.bl.y + 0.5) },
    ];

    // Source UV corners (unit square)
    const src = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];

    // Compute homography H that maps src -> dst, then invert for shader
    const H = this._computeHomography(src, dst);
    const Hinv = this._invertMatrix3(H);

    (this.material.uniforms.uH.value as THREE.Matrix3).set(
      Hinv[0], Hinv[1], Hinv[2],
      Hinv[3], Hinv[4], Hinv[5],
      Hinv[6], Hinv[7], Hinv[8],
    );
    this.material.uniforms.uTexture.value = sourceTexture;

    const oldTarget = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(targetFBO);
    this.renderer.setClearColor(0, 0);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(oldTarget);
  }

  private _computeHomography(
    src: Array<{x:number;y:number}>,
    dst: Array<{x:number;y:number}>,
  ): number[] {
    // Direct Linear Transform (DLT) for 4-point homography
    const A: number[][] = [];
    for (let i = 0; i < 4; i++) {
      const sx = src[i].x, sy = src[i].y;
      const dx = dst[i].x, dy = dst[i].y;
      A.push([-sx, -sy, -1,  0,   0,  0, dx*sx, dx*sy, dx]);
      A.push([ 0,   0,   0, -sx, -sy, -1, dy*sx, dy*sy, dy]);
    }
    // Solve via SVD approximation using least-squares Gaussian elimination
    // For simplicity, use a known closed-form 4-point DLT
    return this._dlt4(src, dst);
  }

  private _dlt4(
    src: Array<{x:number;y:number}>,
    dst: Array<{x:number;y:number}>,
  ): number[] {
    // Build 8x8 system, solve for h[0..7], h[8]=1
    const A: number[][] = [];
    const b: number[] = [];
    for (let i = 0; i < 4; i++) {
      const x = src[i].x, y = src[i].y;
      const u = dst[i].x, v = dst[i].y;
      A.push([x, y, 1, 0, 0, 0, -u*x, -u*y]);
      b.push(u);
      A.push([0, 0, 0, x, y, 1, -v*x, -v*y]);
      b.push(v);
    }
    const h = this._solveLinear8(A, b);
    return [...h, 1];
  }

  private _solveLinear8(A: number[][], b: number[]): number[] {
    const n = 8;
    // Augmented matrix
    const M = A.map((row, i) => [...row, b[i]]);
    // Gaussian elimination
    for (let col = 0; col < n; col++) {
      // Find pivot
      let maxRow = col;
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row;
      }
      [M[col], M[maxRow]] = [M[maxRow], M[col]];
      const pivot = M[col][col];
      if (Math.abs(pivot) < 1e-10) continue;
      for (let row = col + 1; row < n; row++) {
        const factor = M[row][col] / pivot;
        for (let j = col; j <= n; j++) {
          M[row][j] -= factor * M[col][j];
        }
      }
    }
    // Back substitution
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = M[i][n];
      for (let j = i + 1; j < n; j++) {
        x[i] -= M[i][j] * x[j];
      }
      x[i] /= M[i][i] || 1;
    }
    return x;
  }

  private _invertMatrix3(m: number[]): number[] {
    const [a,b,c,d,e,f,g,h,k] = m;
    const det = a*(e*k-f*h) - b*(d*k-f*g) + c*(d*h-e*g);
    if (Math.abs(det) < 1e-10) return [1,0,0, 0,1,0, 0,0,1];
    const inv = 1 / det;
    return [
      (e*k-f*h)*inv,  (c*h-b*k)*inv,  (b*f-c*e)*inv,
      (f*g-d*k)*inv,  (a*k-c*g)*inv,  (c*d-a*f)*inv,
      (d*h-e*g)*inv,  (b*g-a*h)*inv,  (a*e-b*d)*inv,
    ];
  }

  dispose(): void {
    this.material.dispose();
    this.quad.geometry.dispose();
  }
}