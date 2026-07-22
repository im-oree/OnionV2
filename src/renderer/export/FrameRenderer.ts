/**
 * FrameRenderer — renders individual composition frames to ImageBitmap
 * at an exact target resolution for export.
 *
 * Strategy: temporarily switch the WebGL renderer's canvas size to the
 * export resolution, render synchronously, read the framebuffer pixels,
 * then restore the original canvas size. This guarantees the exported
 * frame is exactly `width × height` with the comp perfectly fitted,
 * regardless of the on-screen viewport panel size or aspect ratio.
 *
 * The viewport panel is briefly hidden visually during export via a
 * flag the Renderer can honor to skip live-viewport-only overlays.
 */
import * as THREE from 'three';
import type { Renderer } from '../Renderer';

export interface RenderedFrame {
  bitmap: ImageBitmap;
  width: number;
  height: number;
  frameNumber: number;
  timeSec: number;
}

export class FrameRenderer {
  private renderer: Renderer;
  private _scratchCanvas: OffscreenCanvas | HTMLCanvasElement | null = null;

  // Saved state so we can restore after export
  private _savedSize: { w: number; h: number } | null = null;
  private _savedPixelRatio: number = 1;
  private _savedCompScissorFlag: boolean = true;
  private _exporting: boolean = false;

  // Saved overlay visibility state
  private _savedOverlayState: {
    compBounds: boolean;
    grid: boolean;
    safeZones: boolean;
    selectionOverlay: boolean;
  } | null = null;

  constructor(renderer: Renderer) {
    this.renderer = renderer;
  }

  /**
   * Enter export mode: resize the WebGL canvas to exact export dimensions,
   * hide all UI-only scene overlays (comp bounds, grid, safe zones, selection),
   * and configure the camera so the composition fills the framebuffer 1:1
   * with zero margin.
   */
  beginExport(width: number, height: number): void {
    if (this._exporting) return;
    this._exporting = true;

    const r = this.renderer;
    const wr = r.renderer;
    const sm = r.sceneManager;

    // Save current state
    const size = new THREE.Vector2();
    wr.getSize(size);
    this._savedSize = { w: size.x, h: size.y };
    this._savedPixelRatio = wr.getPixelRatio();
    this._savedCompScissorFlag = r.clipToCompositionBounds;

    // Save overlay visibility
    this._savedOverlayState = {
      compBounds: sm.compBounds.group.visible,
      grid: sm.grid.group.visible,
      safeZones: sm.safeZones.group.visible,
      selectionOverlay: r.selectionOverlay.visible,
    };

    // ── Hide all UI-only overlays that would contaminate the export ──
    sm.compBounds.group.visible = false;
    sm.grid.group.visible = false;
    sm.safeZones.group.visible = false;
    r.selectionOverlay.hide();

    // ── Resize renderer to exact export dimensions ──
    wr.setPixelRatio(1);
    wr.setSize(width, height, false);
    r.cameraManager.setViewportSize(width, height);

    // ── Disable comp scissor — full framebuffer is comp ──
    r.setClipToCompositionBounds(false);

    // ── Fit camera EXACTLY to comp (no margin) ──
    // fitToComposition() adds a 10% breathing-room margin which we don't want.
    // Instead set zoom=1 and pan=0 so the ortho camera frustum exactly
    // matches the composition rectangle at the current viewport aspect.
    r.cameraManager.setZoom(1);
    r.cameraManager.setPan(0, 0);
  }

  /**
   * Exit export mode: restore renderer size, overlay visibility, and
   * viewport interactions.
   */
  endExport(): void {
    if (!this._exporting) return;
    this._exporting = false;

    const r = this.renderer;
    const wr = r.renderer;
    const sm = r.sceneManager;

    if (this._savedSize) {
      wr.setPixelRatio(this._savedPixelRatio);
      wr.setSize(this._savedSize.w, this._savedSize.h, false);
      r.cameraManager.setViewportSize(this._savedSize.w, this._savedSize.h);
    }
    r.setClipToCompositionBounds(this._savedCompScissorFlag);

    // Restore overlay visibility
    if (this._savedOverlayState) {
      sm.compBounds.group.visible = this._savedOverlayState.compBounds;
      sm.grid.group.visible = this._savedOverlayState.grid;
      sm.safeZones.group.visible = this._savedOverlayState.safeZones;
      if (this._savedOverlayState.selectionOverlay) {
        r.selectionOverlay.show();
      }
    }

    this._savedSize = null;
    this._savedOverlayState = null;

    // Refit camera + trigger live render so viewport returns to normal
    r.cameraManager.fitToComposition();
    r.renderLoop.requestRender();
  }

  /**
   * Render a specific frame at the export resolution.
   * beginExport() must have been called first with matching dimensions.
   */
  async renderFrame(
    _compId: string,
    frameNumber: number,
    fps: number,
    targetWidth: number,
    targetHeight: number,
  ): Promise<RenderedFrame> {
    if (!this._exporting) {
      // Auto-enter export mode with these dimensions
      this.beginExport(targetWidth, targetHeight);
    }

    const timeSec = frameNumber / fps;
    const r = this.renderer;

    r.setCacheRenderTime(timeSec);

    try {
      // Run all the frame-preparation hooks (keyframes, effects, layers)
      r.runBeforeRenderHooks();
      // Actually render
      r.renderSynchronous();

      // Force GPU to complete before reading pixels
      const gl = r.renderer.getContext();
      (gl as WebGL2RenderingContext).finish();

      const canvas = r.renderer.domElement;
      const bitmap = await this._readCanvasToBitmap(canvas, targetWidth, targetHeight);

      return {
        bitmap,
        width: targetWidth,
        height: targetHeight,
        frameNumber,
        timeSec,
      };
    } finally {
      r.clearCacheRenderTime();
    }
  }

  /** Encode a rendered frame to a Blob in the requested image format. */
  async encodeFrame(
    frame: RenderedFrame,
    format: 'png' | 'jpg' | 'webp',
    quality: number = 92,
  ): Promise<Blob> {
    const canvas = this._getScratchCanvas(frame.width, frame.height);
    const ctx = canvas.getContext('2d') as
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D;
    if (!ctx) throw new Error('Failed to get 2D context');
    ctx.clearRect(0, 0, frame.width, frame.height);
    ctx.drawImage(frame.bitmap, 0, 0);

    const mime = format === 'png' ? 'image/png'
      : format === 'jpg' ? 'image/jpeg'
      : 'image/webp';

    if (canvas instanceof OffscreenCanvas) {
      return await canvas.convertToBlob({
        type: mime,
        quality: format === 'png' ? undefined : quality / 100,
      });
    } else {
      return await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('toBlob returned null'))),
          mime,
          format === 'png' ? undefined : quality / 100,
        );
      });
    }
  }

  /** Restore the renderer to normal live-display state after export finishes. */
  finish(): void {
    this.endExport();
    this.renderer.restoreLiveDisplay?.();
  }

  // ── Internal helpers ────────────────────────────────────────────

  /**
   * Read the WebGL canvas pixels into an ImageBitmap of exactly (w × h).
   * The canvas is assumed to be at (w × h) already (beginExport ensures this).
   * WebGL is bottom-up so we flip Y during copy.
   */
  private async _readCanvasToBitmap(
    canvas: HTMLCanvasElement,
    w: number,
    h: number,
  ): Promise<ImageBitmap> {
    // Prefer createImageBitmap directly from the canvas — fastest path.
    // We pass explicit dimensions to guarantee the output size matches.
    try {
      // Note: createImageBitmap(canvas) uses the canvas's actual size, but
      // since beginExport() set the canvas to (w,h), this is correct.
      // The default orientation is "from-image" which for WebGL means
      // the bitmap will be flipped (WebGL origin = bottom-left).
      // Use imageOrientation: 'flipY' to correct that.
      return await createImageBitmap(canvas, {
        imageOrientation: 'flipY' as any,
      });
    } catch {
      // Fallback: manual readPixels + flip
      return this._readPixelsManual(canvas, w, h);
    }
  }

  private async _readPixelsManual(
    canvas: HTMLCanvasElement,
    w: number,
    h: number,
  ): Promise<ImageBitmap> {
    const gl = (canvas.getContext('webgl2') ??
      canvas.getContext('webgl')) as WebGL2RenderingContext | null;
    if (!gl) throw new Error('No WebGL context on canvas');

    const pixels = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    const scratch = this._getScratchCanvas(w, h);
    const ctx = scratch.getContext('2d') as
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D;
    if (!ctx) throw new Error('No 2D ctx');
    const imgData = ctx.createImageData(w, h);
    // Flip Y
    const rowBytes = w * 4;
    for (let y = 0; y < h; y++) {
      const src = y * rowBytes;
      const dst = (h - 1 - y) * rowBytes;
      imgData.data.set(pixels.subarray(src, src + rowBytes), dst);
    }
    ctx.putImageData(imgData, 0, 0);

    if (scratch instanceof OffscreenCanvas) {
      return scratch.transferToImageBitmap();
    } else {
      return await createImageBitmap(scratch);
    }
  }

  private _getScratchCanvas(w: number, h: number): OffscreenCanvas | HTMLCanvasElement {
    if (typeof OffscreenCanvas !== 'undefined') {
      if (
        !(this._scratchCanvas instanceof OffscreenCanvas) ||
        this._scratchCanvas.width !== w ||
        this._scratchCanvas.height !== h
      ) {
        this._scratchCanvas = new OffscreenCanvas(w, h);
      }
    } else {
      if (!(this._scratchCanvas instanceof HTMLCanvasElement)) {
        this._scratchCanvas = document.createElement('canvas');
      }
      if (this._scratchCanvas.width !== w) this._scratchCanvas.width = w;
      if (this._scratchCanvas.height !== h) this._scratchCanvas.height = h;
    }
    return this._scratchCanvas;
  }
}