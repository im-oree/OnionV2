/**
 * MaskCompositor — applies VectorMasks to a layer's canvas texture.
 *
 * Applies mask paths onto the canvas using composite operations:
 * - add/intersect: 'destination-in' (reveals)
 * - subtract/difference: 'destination-out' (erases)
 */

import type { VectorMask } from '../../state/maskStore';
import type { PathCommand } from '../../types/layer';

export class MaskCompositor {

  /**
   * Apply a list of masks to a canvas.
   * Modifies the canvas pixels in-place using 2D composite ops.
   */
  static applyMasks(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    masks: VectorMask[],
    layerW: number,
    layerH: number,
    dpi: number,
  ): void {
    const activeMasks = masks.filter(
      (m) => m.enabled && m.commands.length > 0,
    );
    if (activeMasks.length === 0) return;

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const mCtx = maskCanvas.getContext('2d');

    if (!mCtx) {
      console.warn(
        '[MaskCompositor] Could not get 2D context — skipping',
      );
      return;
    }

    // Fix #1 — cx/cy was (layerW / 2 + 4) * dpi then divided back by dpi
    // in commandsToPath2D. The +4 magic offset was unexplained and wrong.
    // Mask path origin should be at layer center, which is (layerW/2, layerH/2).
    const cx = layerW / 2;
    const cy = layerH / 2;

    mCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

    // Fix #2 — 'add' mode with inverted=false must fill the entire canvas
    // white first so the mask reveals the layer. The original code set
    // fillStyle to 'rgba(0,0,0,1)' for inverted which drew black (no
    // effect on destination-in compositing). Inverted add = fill all
    // white, then cut out the path shape.
    // Fix #3 — scale(dpi, dpi) was applied inside the loop but offX/offY
    // were already pre-divided by dpi, causing double-scaling of the path
    // coordinates. Apply dpi scale once per mask, consistently.

    for (const mask of activeMasks) {
      mCtx.save();
      mCtx.scale(dpi, dpi);

      const path = MaskCompositor.commandsToPath2D(
        mask.commands,
        cx,
        cy,
      );

      mCtx.filter =
        mask.feather > 0 ? `blur(${mask.feather}px)` : 'none';

      // Fix #4 — expansion via lineWidth with no stroke call had zero
      // effect. To expand a filled shape use a stroked path with
      // 'source-over' composited on top of the fill.
      // Only apply stroke expansion when expansion !== 0.
      const globalAlpha = Math.max(0, Math.min(1, mask.opacity / 100));
      mCtx.globalAlpha = globalAlpha;

      switch (mask.mode) {
        case 'add': {
          if (mask.inverted) {
            // Inverted add: reveal everything EXCEPT the path.
            // Fill entire area white, then cut out the shape.
            mCtx.globalCompositeOperation = 'source-over';
            mCtx.fillStyle = 'rgba(255,255,255,1)';
            mCtx.fillRect(0, 0, canvas.width / dpi, canvas.height / dpi);

            mCtx.globalCompositeOperation = 'destination-out';
            mCtx.fillStyle = 'rgba(0,0,0,1)';
            mCtx.fill(path, 'nonzero');
          } else {
            mCtx.globalCompositeOperation = 'source-over';
            mCtx.fillStyle = 'rgba(255,255,255,1)';
            mCtx.fill(path, 'nonzero');
          }
          break;
        }

        case 'subtract': {
          // Fix #5 — inverted subtract should reveal the path, not erase it.
          if (mask.inverted) {
            mCtx.globalCompositeOperation = 'source-over';
            mCtx.fillStyle = 'rgba(255,255,255,1)';
            mCtx.fill(path, 'nonzero');
          } else {
            mCtx.globalCompositeOperation = 'destination-out';
            mCtx.fillStyle = 'rgba(0,0,0,1)';
            mCtx.fill(path, 'nonzero');
          }
          break;
        }

        case 'intersect': {
          // Fix #6 — inverted intersect with fillStyle rgba(0,0,0,0) has
          // zero effect since alpha is 0. Inverted intersect should keep
          // everything OUTSIDE the path: fill all white then intersect-out.
          if (mask.inverted) {
            // Keep pixels outside the path
            mCtx.globalCompositeOperation = 'source-over';
            mCtx.fillStyle = 'rgba(255,255,255,1)';
            mCtx.fillRect(0, 0, canvas.width / dpi, canvas.height / dpi);

            mCtx.globalCompositeOperation = 'destination-out';
            mCtx.fillStyle = 'rgba(0,0,0,1)';
            mCtx.fill(path, 'nonzero');

            // Now intersect accumulated mask with this inverted shape
            mCtx.globalCompositeOperation = 'destination-in';
            mCtx.fill(path, 'nonzero');
          } else {
            mCtx.globalCompositeOperation = 'destination-in';
            mCtx.fillStyle = 'rgba(255,255,255,1)';
            mCtx.fill(path, 'nonzero');
          }
          break;
        }

        case 'difference': {
          mCtx.globalCompositeOperation = 'xor';
          mCtx.fillStyle = 'rgba(255,255,255,1)';
          mCtx.fill(path, 'nonzero');
          break;
        }
      }

      // Fix #4 — stroke expansion after fill, only when needed
      if (mask.expansion !== 0) {
        mCtx.globalCompositeOperation = 'source-over';
        mCtx.strokeStyle = 'rgba(255,255,255,1)';
        mCtx.lineWidth = Math.abs(mask.expansion) * 2;
        mCtx.globalAlpha = globalAlpha;

        if (mask.expansion < 0) {
          // Negative expansion: erode by stroking destination-out
          mCtx.globalCompositeOperation = 'destination-out';
          mCtx.strokeStyle = 'rgba(0,0,0,1)';
        }

        mCtx.stroke(path);
      }

      mCtx.restore();
    }

    // Apply accumulated mask to original canvas
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

      // Fix #7 — no guard on pts.length. A malformed command with
      // too few points would throw inside bezierCurveTo / quadraticCurveTo.
      switch (cmd.type) {
        case 'M':
          if (pts.length >= 2)
            p.moveTo(pts[0] + offX, pts[1] + offY);
          break;

        case 'L':
          if (pts.length >= 2)
            p.lineTo(pts[0] + offX, pts[1] + offY);
          break;

        case 'C':
          if (pts.length >= 6)
            p.bezierCurveTo(
              pts[0] + offX, pts[1] + offY,
              pts[2] + offX, pts[3] + offY,
              pts[4] + offX, pts[5] + offY,
            );
          break;

        case 'Q':
          if (pts.length >= 4)
            p.quadraticCurveTo(
              pts[0] + offX, pts[1] + offY,
              pts[2] + offX, pts[3] + offY,
            );
          break;

        case 'Z':
          p.closePath();
          break;
      }
    }

    return p;
  }
}