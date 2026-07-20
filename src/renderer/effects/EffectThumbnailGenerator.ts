/**
 * EffectThumbnailGenerator — runs each registered effect against a sample
 * gradient image and produces a small PNG thumbnail. Thumbnails are cached
 * to the workspace folder (or IndexedDB as fallback) under `.thumbs/effects/`.
 *
 * Called once at startup after effect registration. Missing thumbnails are
 * generated lazily on first request.
 */
import * as THREE from 'three';
import { effectRegistry } from './EffectRegistry';
import { EffectChain } from './EffectChain';
import { StorageManager } from '../../storage/StorageManager';
import type { EffectType, EffectInstance } from '../../types/effect';

const THUMB_SIZE = 96;
const THUMB_DIR = '.thumbs/effects';
const THUMB_VERSION = 1;

interface ThumbCacheEntry {
  version: number;
  dataUrl: string;
}

class EffectThumbnailGeneratorClass {
  private cache = new Map<EffectType, string>();
  private inflight = new Map<EffectType, Promise<string | null>>();
  private sampleTexture: THREE.CanvasTexture | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private disposed = false;

  /** IndexedDB fallback cache for when no workspace is set. */
  private memFallback = new Map<EffectType, string>();

  /** Register a renderer (shared with the main WebGL renderer). */
  setRenderer(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
  }

  /** Get a thumbnail (data URL) for an effect type. Triggers generation if missing. */
  async getThumbnail(type: EffectType): Promise<string | null> {
    if (this.cache.has(type)) return this.cache.get(type)!;
    if (this.inflight.has(type)) return this.inflight.get(type)!;

    const promise = this._loadOrGenerate(type);
    this.inflight.set(type, promise);
    const result = await promise;
    this.inflight.delete(type);
    if (result) this.cache.set(type, result);
    return result;
  }

  /** Kick off background generation of all missing thumbnails. */
  async generateAll(onProgress?: (done: number, total: number) => void): Promise<void> {
    const all = effectRegistry.list();
    let done = 0;
    for (const def of all) {
      if (this.disposed) return;
      if (def.passes === 0) {
        done++;
        onProgress?.(done, all.length);
        continue;
      }
      await this.getThumbnail(def.type);
      done++;
      onProgress?.(done, all.length);
    }
  }

  /** Clear all cached thumbnails (both memory and workspace). */
  async clearAll(): Promise<void> {
    this.cache.clear();
    this.memFallback.clear();
    try {
      const sm = StorageManager.getInstance();
      const adapter: any = sm.getAdapter();
      if (adapter?.deleteInternalDirectory) {
        await adapter.deleteInternalDirectory(THUMB_DIR);
      }
    } catch {
      /* best effort */
    }
  }

  dispose(): void {
    this.disposed = true;
    this.cache.clear();
    this.memFallback.clear();
    this.inflight.clear();
    if (this.sampleTexture) {
      this.sampleTexture.dispose();
      this.sampleTexture = null;
    }
  }

  private async _loadOrGenerate(type: EffectType): Promise<string | null> {
    // 1. Try workspace cache
    const cached = await this._loadFromStorage(type);
    if (cached) return cached;

    // 2. Generate fresh
    const dataUrl = await this._render(type);
    if (!dataUrl) return null;

    // 3. Persist for next time
    void this._saveToStorage(type, dataUrl);

    return dataUrl;
  }

  private async _loadFromStorage(type: EffectType): Promise<string | null> {
    const key = this._storageKey(type);

    // Workspace fs adapter path
    try {
      const sm = StorageManager.getInstance();
      const adapter: any = sm.getAdapter();
      if (adapter?.loadInternalFile) {
        const blob: Blob | null = await adapter.loadInternalFile(key);
        if (blob) {
          const text = await blob.text();
          try {
            const parsed = JSON.parse(text) as ThumbCacheEntry;
            if (parsed?.version === THUMB_VERSION && parsed?.dataUrl) {
              return parsed.dataUrl;
            }
          } catch {
            /* corrupted — regenerate */
          }
        }
      }
    } catch {
      /* fall through */
    }

    // Memory fallback
    if (this.memFallback.has(type)) return this.memFallback.get(type)!;

    return null;
  }

  private async _saveToStorage(type: EffectType, dataUrl: string): Promise<void> {
    const key = this._storageKey(type);
    const payload: ThumbCacheEntry = { version: THUMB_VERSION, dataUrl };
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });

    try {
      const sm = StorageManager.getInstance();
      const adapter: any = sm.getAdapter();
      if (adapter?.saveInternalFile) {
        await adapter.saveInternalFile(key, blob);
        return;
      }
    } catch {
      /* fall through */
    }

    // Memory fallback (survives session)
    this.memFallback.set(type, dataUrl);
  }

  private _storageKey(type: EffectType): string {
    return `${THUMB_DIR}/${type}.json`;
  }

  private async _render(type: EffectType): Promise<string | null> {
    const def = effectRegistry.get(type);
    if (!def) return null;
    if (def.passes === 0) return null;
    if (!this.renderer) return null;

    const sample = this._getSampleTexture();
    if (!sample) return null;

    // Build a temporary EffectChain and feed it the sample.
    const chain = new EffectChain(this.renderer);
    try {
      chain.setSource(sample, THUMB_SIZE, THUMB_SIZE);

      const instance: EffectInstance = {
        id: `thumb_${type}`,
        type,
        name: def.displayName,
        enabled: true,
        collapsed: false,
        parameters: def.createDefaultParameters(),
      };

      const outputTex = chain.render([instance]);
      if (!outputTex) return null;

      // Copy the render target texture to a canvas so we can toDataURL it.
      // We do this by rendering the output texture into a fresh render target,
      // then reading pixels.
      return await this._textureToDataURL(outputTex);
    } catch (err) {
      console.warn(`[EffectThumb] Failed to render ${type}:`, err);
      return null;
    } finally {
      chain.dispose();
    }
  }

  private async _textureToDataURL(texture: THREE.Texture): Promise<string | null> {
    const renderer = this.renderer;
    if (!renderer) return null;

    const rt = new THREE.WebGLRenderTarget(THUMB_SIZE, THUMB_SIZE, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: false,
      stencilBuffer: false,
    });

    const scene = new THREE.Scene();
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geo = new THREE.PlaneGeometry(2, 2);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      depthTest: false,
      depthWrite: false,
      transparent: true,
    });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);

    const oldTarget = renderer.getRenderTarget();
    const oldViewport = new THREE.Vector4();
    renderer.getViewport(oldViewport);

    try {
      renderer.setRenderTarget(rt);
      renderer.setViewport(0, 0, THUMB_SIZE, THUMB_SIZE);
      renderer.setClearColor(0x000000, 0);
      renderer.clear();
      renderer.render(scene, cam);

      const pixels = new Uint8Array(THUMB_SIZE * THUMB_SIZE * 4);
      renderer.readRenderTargetPixels(rt, 0, 0, THUMB_SIZE, THUMB_SIZE, pixels);

      // Flip Y (GL bottom-up → canvas top-down)
      const canvas = document.createElement('canvas');
      canvas.width = THUMB_SIZE;
      canvas.height = THUMB_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      const imgData = ctx.createImageData(THUMB_SIZE, THUMB_SIZE);
      const row = THUMB_SIZE * 4;
      for (let y = 0; y < THUMB_SIZE; y++) {
        const src = y * row;
        const dst = (THUMB_SIZE - 1 - y) * row;
        imgData.data.set(pixels.subarray(src, src + row), dst);
      }
      ctx.putImageData(imgData, 0, 0);
      return canvas.toDataURL('image/png');
    } finally {
      renderer.setRenderTarget(oldTarget);
      renderer.setViewport(oldViewport);
      geo.dispose();
      mat.dispose();
      rt.dispose();
    }
  }

   private _getSampleTexture(): THREE.CanvasTexture | null {
    if (this.sampleTexture) return this.sampleTexture;

    const size = THUMB_SIZE * 2; // Render at 2x for crisper thumbnails
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // ── Background: sunset-style gradient (warm to cool) ──
    const bg = ctx.createLinearGradient(0, 0, 0, size);
    bg.addColorStop(0, '#1e3a8a');   // deep blue sky
    bg.addColorStop(0.35, '#7c3aed'); // purple
    bg.addColorStop(0.6, '#f97316');  // orange
    bg.addColorStop(0.85, '#fbbf24'); // yellow
    bg.addColorStop(1, '#0f172a');    // dark foreground
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);

    // ── Sun disc (bright highlight for glow/threshold effects) ──
    const sunX = size * 0.68;
    const sunY = size * 0.52;
    const sunR = size * 0.11;
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 1.6);
    sunGrad.addColorStop(0, 'rgba(255, 250, 220, 1)');
    sunGrad.addColorStop(0.5, 'rgba(255, 220, 150, 0.9)');
    sunGrad.addColorStop(1, 'rgba(255, 180, 100, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR * 1.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 240, 1)';
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    ctx.fill();

    // ── Mountain silhouettes (dark foreground for contrast) ──
    ctx.fillStyle = '#0a0f1e';
    ctx.beginPath();
    ctx.moveTo(0, size * 0.75);
    ctx.lineTo(size * 0.15, size * 0.58);
    ctx.lineTo(size * 0.28, size * 0.72);
    ctx.lineTo(size * 0.42, size * 0.5);
    ctx.lineTo(size * 0.55, size * 0.68);
    ctx.lineTo(size * 0.72, size * 0.55);
    ctx.lineTo(size * 0.88, size * 0.72);
    ctx.lineTo(size, size * 0.62);
    ctx.lineTo(size, size);
    ctx.lineTo(0, size);
    ctx.closePath();
    ctx.fill();

    // Nearer mountains (slightly lighter for depth)
    ctx.fillStyle = 'rgba(30, 20, 40, 0.9)';
    ctx.beginPath();
    ctx.moveTo(0, size * 0.85);
    ctx.lineTo(size * 0.2, size * 0.72);
    ctx.lineTo(size * 0.35, size * 0.82);
    ctx.lineTo(size * 0.5, size * 0.7);
    ctx.lineTo(size * 0.68, size * 0.82);
    ctx.lineTo(size * 0.85, size * 0.72);
    ctx.lineTo(size, size * 0.78);
    ctx.lineTo(size, size);
    ctx.lineTo(0, size);
    ctx.closePath();
    ctx.fill();

    // ── Color palette swatches (top-left corner) — reveals color effects ──
    const swatches = ['#e11d48', '#22c55e', '#3b82f6', '#eab308'];
    const sw = size * 0.06;
    for (let i = 0; i < swatches.length; i++) {
      ctx.fillStyle = swatches[i];
      ctx.fillRect(size * 0.04 + i * (sw + 2), size * 0.04, sw, sw);
    }

    // ── Skin-tone circle (bottom-left) — reveals hue/saturation shifts ──
    const skinX = size * 0.18;
    const skinY = size * 0.82;
    const skinR = size * 0.08;
    const skinGrad = ctx.createRadialGradient(skinX - skinR * 0.3, skinY - skinR * 0.3, 0, skinX, skinY, skinR);
    skinGrad.addColorStop(0, '#fde3c8');
    skinGrad.addColorStop(1, '#c48b6a');
    ctx.fillStyle = skinGrad;
    ctx.beginPath();
    ctx.arc(skinX, skinY, skinR, 0, Math.PI * 2);
    ctx.fill();

    // ── Fine grid overlay (bottom-right) — reveals blur/distortion ──
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    const gridStart = size * 0.55;
    const gridSize = size * 0.35;
    const cells = 6;
    for (let i = 0; i <= cells; i++) {
      const p = gridStart + (i / cells) * gridSize;
      ctx.beginPath();
      ctx.moveTo(p, size * 0.6);
      ctx.lineTo(p, size * 0.95);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(gridStart, size * 0.6 + (i / cells) * (size * 0.35));
      ctx.lineTo(gridStart + gridSize, size * 0.6 + (i / cells) * (size * 0.35));
      ctx.stroke();
    }

    // ── Sharp text (top-right) — reveals blur clearly ──
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.font = `bold ${size * 0.08}px sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('FX', size * 0.96, size * 0.06);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;

    this.sampleTexture = tex;
    return tex;
  }
}

export const effectThumbnailGenerator = new EffectThumbnailGeneratorClass();