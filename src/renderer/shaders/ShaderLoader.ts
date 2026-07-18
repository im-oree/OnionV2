/**
 * ShaderLoader — fetches GLSL from /public/shaders/, caches compiled programs.
 * Handles #include directives via a custom preprocessor for shared functions.
 */
import * as THREE from 'three';

const VERTEX_SHADER_URL = '/shaders/quad.vert';
const vertexShaderPromise = fetch(VERTEX_SHADER_URL)
  .then((r) => r.text())
  .catch(() => {
    // Fallback vertex shader if file doesn't exist yet
    return 'void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  });

class ShaderLoaderClass {
  private cache = new Map<string, THREE.ShaderMaterial>();
  private fragmentCache = new Map<string, string>();
  private loading = new Map<string, Promise<string>>();

  /** Load a fragment shader source, processing #include directives */
  async loadFragment(path: string): Promise<string> {
    if (this.fragmentCache.has(path)) return this.fragmentCache.get(path)!;
    if (this.loading.has(path)) return this.loading.get(path)!;

    const promise = this._loadAndProcess(path);
    this.loading.set(path, promise);
    const source = await promise;
    this.fragmentCache.set(path, source);
    this.loading.delete(path);
    return source;
  }

  /** Create a ShaderMaterial from a fragment shader path and uniforms */
  async createMaterial(
    fragmentPath: string,
    uniforms: Record<string, THREE.IUniform>,
  ): Promise<THREE.ShaderMaterial> {
    const cacheKey = `${fragmentPath}_${JSON.stringify(Object.keys(uniforms))}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey)!.clone();

    const [vertexShader, fragmentShader] = await Promise.all([
      vertexShaderPromise,
      this.loadFragment(fragmentPath),
    ]);

    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });

    this.cache.set(cacheKey, mat);
    return mat.clone();
  }

  /** Preload all effect shaders (call at app startup) */
  preloadAll(paths: string[]): Promise<void[]> {
    return Promise.all(paths.map((p) => this.loadFragment(p).then(() => {})));
  }

  private async _loadAndProcess(path: string): Promise<string> {
    const url = `/shaders/${path}`;
    const response = await fetch(url);
    if (!response.ok) {
      // Return a passthrough shader if file not found
      return this._passthroughFragment();
    }
    let source = await response.text();

    // Process #include "..." directives
    const includeRegex = /#include\s+"([^"]+)"/g;
    let match: RegExpExecArray | null;
    while ((match = includeRegex.exec(source)) !== null) {
      const includePath = match[1];
      const includeSource = await this._loadAndProcess(`includes/${includePath}`);
      source = source.replace(match[0], includeSource);
    }

    return source;
  }

  private _passthroughFragment(): string {
    return `uniform sampler2D uTexture;
      varying vec2 vUv;
      void main() { gl_FragColor = texture2D(uTexture, vUv); }`;
  }
}

export const shaderLoader = new ShaderLoaderClass();
