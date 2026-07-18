/**
 * ResizeHandler — observes a DOM element for size changes and updates
 * the renderer and camera accordingly. Uses ResizeObserver.
 * Caps devicePixelRatio at 2 for performance.
 * CRITICAL: calls renderLoop.requestRender() on each resize frame
 * to prevent the viewport from going blank (A2/A3 fix).
 */
import * as THREE from 'three';
import { CameraManager } from './CameraManager';
import { RenderLoop } from './RenderLoop';
import { VIEWPORT_CONFIG } from '../config/viewportConfig';

export class ResizeHandler {
  private renderer: THREE.WebGLRenderer;
  private cameraManager: CameraManager;
  private renderLoop: RenderLoop;
  private observer: ResizeObserver | null = null;
  private onResize?: (width: number, height: number) => void;
  private rafId = 0;

  constructor(
    renderer: THREE.WebGLRenderer,
    cameraManager: CameraManager,
    renderLoop: RenderLoop,
  ) {
    this.renderer = renderer;
    this.cameraManager = cameraManager;
    this.renderLoop = renderLoop;
  }

  /** Start observing a container element for resize events */
  observe(el: HTMLElement): void {
    this.disconnect();

    this.observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.rafId = requestAnimationFrame(() => {
          this.handleResize(Math.floor(width), Math.floor(height));
          // Keep rendering during resize gesture
          this.renderLoop.requestRender();
        });
      }
    });

    this.observer.observe(el);

    // Initial resize
    const rect = el.getBoundingClientRect();
    this.handleResize(Math.floor(rect.width), Math.floor(rect.height));
    this.renderLoop.requestRender();
  }

  /** Set a callback fired on resize */
  setCallback(cb: (width: number, height: number) => void): void {
    this.onResize = cb;
  }

  /** Update renderer pixel size and camera viewport */
  private handleResize(cssWidth: number, cssHeight: number): void {
    if (cssWidth === 0 || cssHeight === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, VIEWPORT_CONFIG.MAX_DPR);
    const pixelWidth = Math.floor(cssWidth * dpr);
    const pixelHeight = Math.floor(cssHeight * dpr);

    this.renderer.setSize(pixelWidth, pixelHeight);
    this.renderer.setPixelRatio(dpr);
    this.cameraManager.setViewportSize(cssWidth, cssHeight);
    this.onResize?.(cssWidth, cssHeight);
  }

  /** Stop observing and clean up */
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

  /** Dispose */
  dispose(): void {
    this.disconnect();
  }
}
