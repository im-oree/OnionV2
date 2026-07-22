/**
 * ResizeHandler â€” observes a DOM element for size changes and updates
 * the renderer and camera.
 *
 * Preview-resolution scaling:
 *   - The drawing buffer is rendered at (containerSize Ã— scale Ã— dpr) pixels
 *     so we render fewer pixels for a real speedup during playback.
 *   - The canvas element ALWAYS fills the container (100% x 100%) so what
 *     you see is upscaled to fit â€” standard AE/Blender preview-resolution
 *     behavior.
 */
import * as THREE from 'three';
import { CameraManager } from './CameraManager';
import { RenderLoop } from './RenderLoop';
import { VIEWPORT_CONFIG } from '../config/viewportConfig';
import { usePreviewResolutionStore } from '../state/previewResolutionStore';

export class ResizeHandler {
  private renderer: THREE.WebGLRenderer;
  private cameraManager: CameraManager;
  private renderLoop: RenderLoop;
  private observer: ResizeObserver | null = null;
  private onResize?: (width: number, height: number) => void;
  private rafId = 0;

  private _lastCssW = 0;
  private _lastCssH = 0;
  private _unsubStore: (() => void) | null = null;

  constructor(
    renderer: THREE.WebGLRenderer,
    cameraManager: CameraManager,
    renderLoop: RenderLoop,
  ) {
    this.renderer = renderer;
    this.cameraManager = cameraManager;
    this.renderLoop = renderLoop;

    // Force canvas to fill its parent from the start. Three.js sets
    // width/height style attributes on setSize(), and we override them
    // here so preview-scale changes don't reintroduce shrinkage.
    const canvas = this.renderer.domElement;
    canvas.style.position = 'absolute';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';

    let lastScale = usePreviewResolutionStore.getState().getEffectiveScale();
    this._unsubStore = usePreviewResolutionStore.subscribe((s) => {
      const cur = s.getEffectiveScale();
      if (cur !== lastScale) {
        lastScale = cur;
        this._reapplySize();
      }
    });
  }

  observe(el: HTMLElement): void {
    this.disconnect();

    this.observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.rafId = requestAnimationFrame(() => {
          this.handleResize(Math.floor(width), Math.floor(height));
          this.renderLoop.requestRender();
        });
      }
    });

    this.observer.observe(el);

    const rect = el.getBoundingClientRect();
    this.handleResize(Math.floor(rect.width), Math.floor(rect.height));
  }

  setCallback(cb: (width: number, height: number) => void): void {
    this.onResize = cb;
  }

  private _reapplySize(): void {
    if (this._lastCssW > 0 && this._lastCssH > 0) {
      this.handleResize(this._lastCssW, this._lastCssH);
      this.renderLoop.requestRender();
    }
  }

  private handleResize(containerW: number, containerH: number): void {
    if (containerW === 0 || containerH === 0) return;
    this._lastCssW = containerW;
    this._lastCssH = containerH;

    const dpr = Math.min(window.devicePixelRatio || 1, VIEWPORT_CONFIG.MAX_DPR);
    const previewScale = usePreviewResolutionStore.getState().getEffectiveScale();

    // Backing-store resolution: containerSize Ã— dpr Ã— previewScale.
    // Three.js internally multiplies size Ã— pixelRatio to compute drawing
    // buffer pixels, so we set pixelRatio = dpr Ã— previewScale.
    const effectiveDpr = dpr * previewScale;
    this.renderer.setPixelRatio(effectiveDpr);

    // updateStyle = FALSE so Three.js never touches canvas.style.width/height.
    // We manage those ourselves (100% / 100%) so the browser upscales the
    // smaller backing store to fill the view.
    this.renderer.setSize(containerW, containerH, false);

    // setSize(updateStyle=false) already calls setViewport(0, 0, w, h)
    // internally, and Three.js's setViewport multiplies by pixelRatio.
    // So no manual viewport/scissor calls needed — that would double-apply.
    this.renderer.setScissorTest(false);

    // Enforce fill-parent CSS every resize (Three.js used to set inline
    // px width/height on the canvas when updateStyle was true; guard against
    // any stale styles).
    const canvas = this.renderer.domElement;
    canvas.style.position = 'absolute';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';

    this.renderer.setClearColor(0x000000, 0);

    // CameraManager viewport uses container size (CSS pixels), which
    // matches what the user sees. Screen-to-world math stays correct.
    this.cameraManager.setViewportSize(containerW, containerH);
    this.onResize?.(containerW, containerH);
  }

  disconnect(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  dispose(): void {
    this.disconnect();
    if (this._unsubStore) {
      this._unsubStore();
      this._unsubStore = null;
    }
  }
}