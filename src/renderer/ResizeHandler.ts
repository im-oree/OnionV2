/**
 * ResizeHandler — observes a DOM element for size changes and updates
 * the renderer and camera accordingly. Uses ResizeObserver.
 */
import * as THREE from 'three';
import { CameraManager } from './CameraManager';

export class ResizeHandler {
  private renderer: THREE.WebGLRenderer;
  private cameraManager: CameraManager;
  private observer: ResizeObserver | null = null;
  private onResize?: (width: number, height: number) => void;

  constructor(renderer: THREE.WebGLRenderer, cameraManager: CameraManager) {
    this.renderer = renderer;
    this.cameraManager = cameraManager;
  }

  /** Start observing a container element for resize events */
  observe(el: HTMLElement): void {
    this.disconnect();
    /* element stored internally by ResizeObserver */
    this.observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        this.handleResize(
          Math.floor(width * devicePixelRatio),
          Math.floor(height * devicePixelRatio),
          width,
          height,
        );
      }
    });
    this.observer.observe(el);

    // Initial resize
    const rect = el.getBoundingClientRect();
    this.handleResize(
      Math.floor(rect.width * devicePixelRatio),
      Math.floor(rect.height * devicePixelRatio),
      rect.width,
      rect.height,
    );
  }

  /** Set a callback fired on resize */
  setCallback(cb: (width: number, height: number) => void): void {
    this.onResize = cb;
  }

  /** Update renderer pixel size and camera viewport */
  private handleResize(
    pixelWidth: number,
    pixelHeight: number,
    cssWidth: number,
    cssHeight: number,
  ): void {
    this.renderer.setSize(pixelWidth, pixelHeight);
    this.renderer.setPixelRatio(devicePixelRatio);
    this.cameraManager.setViewportSize(cssWidth, cssHeight);
    this.onResize?.(cssWidth, cssHeight);
  }

  /** Stop observing and clean up */
  disconnect(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  /** Dispose */
  dispose(): void {
    this.disconnect();
  }
}
