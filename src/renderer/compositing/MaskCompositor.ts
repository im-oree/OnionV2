/**
 * MaskCompositor — applies VectorMasks to a layer's canvas texture.
 *
 * Strategy: for each layer that has masks, after ShapeLayerRenderer (or any
 * BaseLayerRenderer) draws to its canvas, we apply masks by compositing
 * the mask path onto the canvas using 'destination-in' (add/intersect) or
 * 'destination-out' (subtract/difference) operations.
 *
 * This runs on the CPU canvas, so it works for ALL layer types without
 * needing GPU FBOs for simple cases.
 */

import type { VectorMask } from '../../state/maskStore';
import type { PathCommand } from '../../types/layer';

export class MaskCompositor {

  /**
   * Apply a list of masks to a canvas.
   * Modifies the canvas pixels in-place using 2D composite ops.
   * Call this after the layer has rendered its content to the canvas.
   */
  static applyMasks(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    masks: VectorMask[],
    layerW: number,
    layerH: number,
    dpi: number,
  ): void {
    const activeMasks = masks.filter(m => m.enabled && m.commands.length > 0);
    if (activeMasks.length === 0) return;

    // We need a scratch canvas to accumulate the mask alpha
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width  = canvas.width;
    maskCanvas.height = canvas.height;
    const mCtx = maskCanvas.getContext('2d')!;

    const cx = (layerW / 2 + 4) * dpi;
    const cy = (layerH / 2 + 4) * dpi;

    // Start with fully transparent mask
    mCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

    for (const mask of activeMasks) {
      if (!mask.enabled) continue;

      mCtx.save();
      mCtx.scale(dpi, dpi);

      // Build Path2D from commands
      const path = MaskCompositor.commandsToPath2D(mask.commands, cx / dpi, cy / dpi);

      // Feather: if feather > 0, use a blur filter on the mask ctx
      if (mask.feather > 0) {
        mCtx.filter = `blur(${mask.feather}px)`;
      } else {
        mCtx.filter = 'none';
      }

      // Apply expansion by scaling the path's context transform
      if (mask.expansion !== 0) {
        const exp = mask.expansion;
        // Expand by setting a scaled version
        mCtx.lineWidth = Math.abs(exp) * 2;
      }

      const globalAlpha = (mask.opacity / 100);

      switch (mask.mode) {
        case 'add':
          // Add white to mask (reveals layer where mask is)
          mCtx.globalCompositeOperation = 'source-over';
          mCtx.globalAlpha = globalAlpha;
          mCtx.fillStyle = mask.inverted ? 'rgba(0,0,0,1)' : 'rgba(255,255,255,1)';
          mCtx.fill(path, 'nonzero');
          if (mask.inverted) {
            // Fill everything white first, then subtract the path
            mCtx.globalCompositeOperation = 'destination-out';
            mCtx.fillStyle = 'rgba(0,0,0,1)';
            mCtx.fill(path, 'nonzero');
          }
          break;

        case 'subtract':
          mCtx.globalCompositeOperation = mask.inverted ? 'source-over' : 'destination-out';
          mCtx.globalAlpha = globalAlpha;
          mCtx.fillStyle = 'rgba(0,0,0,1)';
          mCtx.fill(path, 'nonzero');
          break;

        case 'intersect':
          mCtx.globalCompositeOperation = 'destination-in';
          mCtx.globalAlpha = globalAlpha;
          mCtx.fillStyle = mask.inverted ? 'rgba(0,0,0,0)' : 'rgba(255,255,255,1)';
          mCtx.fill(path, 'nonzero');
          break;

        case 'difference':
          mCtx.globalCompositeOperation = 'xor';
          mCtx.globalAlpha = globalAlpha;
          mCtx.fillStyle = 'rgba(255,255,255,1)';
          mCtx.fill(path, 'nonzero');
          break;
      }

      mCtx.restore();
    }

    // Apply the accumulated mask to the original canvas
    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(maskCanvas, 0, 0);
    ctx.restore();
  }

  static commandsToPath2D(
    commands: PathCommand[],
    offX: number,
    offY: number,
  ): Path2D {
    const p = new Path2D();
    for (const cmd of commands) {
      const pts = cmd.points;
      if (cmd.type === 'M') p.moveTo(pts[0] + offX, pts[1] + offY);
      else if (cmd.type === 'L') p.lineTo(pts[0] + offX, pts[1] + offY);
      else if (cmd.type === 'C') {
        p.bezierCurveTo(
          pts[0] + offX, pts[1] + offY,
          pts[2] + offX, pts[3] + offY,
          pts[4] + offX, pts[5] + offY,
        );
      }
      else if (cmd.type === 'Q') {
        p.quadraticCurveTo(
          pts[0] + offX, pts[1] + offY,
          pts[2] + offX, pts[3] + offY,
        );
      }
      else if (cmd.type === 'Z') p.closePath();
    }
    return p;
  }
}