/**
 * ResizeHandler — observes a DOM element for size changes and updates
 * the renderer and camera accordingly. Uses ResizeObserver.
 * Caps devicePixelRatio at 2 for performance.
 *
 * IMPORTANT: Uses TRANSPARENT clear color so the CSS-based CompBoundsCSS
 * layer beneath the canvas is visible. Never sets opaque background here.
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

  private handleResize(cssWidth: number, cssHeight: number): void {
    if (cssWidth === 0 || cssHeight === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, VIEWPORT_CONFIG.MAX_DPR);
    const pixelWidth = Math.floor(cssWidth * dpr);
    const pixelHeight = Math.floor(cssHeight * dpr);

    this.renderer.setSize(pixelWidth, pixelHeight);
    this.renderer.setPixelRatio(dpr);
    // CRITICAL: Transparent clear — do NOT overwrite with opaque bg.
    // The CSS-based CompBoundsCSS layer under the canvas provides the bg.
    this.renderer.setClearColor(0x000000, 0);
    this.cameraManager.setViewportSize(cssWidth, cssHeight);
    this.onResize?.(cssWidth, cssHeight);
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
  }
}