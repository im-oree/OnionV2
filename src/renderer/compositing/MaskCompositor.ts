/**
 * MaskCompositor — applies VectorMasks to a layer's rendered canvas.
 *
 * Each mask has its own transform (position, rotation, size) that's applied
 * on top of the layer's own transform. Text masks are rendered as canvas
 * text; brush masks use the vectorized stroke path from the store.
 */
import type { VectorMask } from '../../types/mask';
import type { PathCommand } from '../../types/layer';

export class MaskCompositor {
  static applyMasks(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    masks: VectorMask[],
    layerW: number,
    layerH: number,
    dpi: number,
  ): void {
    const activeMasks = masks.filter(
      m => m.enabled && (m.commands.length > 0 || m.shapeType === 'text'),
    );
    if (activeMasks.length === 0) return;

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const mCtx = maskCanvas.getContext('2d');
    if (!mCtx) return;

    // Layer coordinate origin at center
    const cx = layerW / 2;
    const cy = layerH / 2;

    mCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

    for (const mask of activeMasks) {
      mCtx.save();
      mCtx.scale(dpi, dpi);

      // Apply per-mask transform on top of layer-center origin
      mCtx.translate(cx + mask.positionX, cy + mask.positionY);
      if (mask.rotation !== 0) {
        mCtx.rotate((mask.rotation * Math.PI) / 180);
      }

      const globalAlpha = Math.max(0, Math.min(1, mask.opacity / 100));
      mCtx.globalAlpha = globalAlpha;
      mCtx.filter = mask.feather > 0 ? `blur(${mask.feather}px)` : 'none';

      // Special path: text mask paints glyphs directly (no Path2D)
      const drawFill = () => {
        if (mask.shapeType === 'text') {
          MaskCompositor._paintTextMask(mCtx, mask);
        } else {
          const path = MaskCompositor.commandsToPath2D(mask.commands, 0, 0);
          mCtx.fill(path, 'nonzero');
        }
      };

      switch (mask.mode) {
        case 'add': {
          if (mask.inverted) {
            // Fill covering entire mask canvas white, then cut path out
            mCtx.save();
            mCtx.setTransform(dpi, 0, 0, dpi, 0, 0);
            mCtx.globalCompositeOperation = 'source-over';
            mCtx.fillStyle = 'rgba(255,255,255,1)';
            mCtx.fillRect(0, 0, canvas.width / dpi, canvas.height / dpi);
            mCtx.restore();
            mCtx.globalCompositeOperation = 'destination-out';
            mCtx.fillStyle = 'rgba(0,0,0,1)';
            drawFill();
          } else {
            mCtx.globalCompositeOperation = 'source-over';
            mCtx.fillStyle = 'rgba(255,255,255,1)';
            drawFill();
          }
          break;
        }
        case 'subtract': {
          if (mask.inverted) {
            mCtx.globalCompositeOperation = 'source-over';
            mCtx.fillStyle = 'rgba(255,255,255,1)';
            drawFill();
          } else {
            mCtx.globalCompositeOperation = 'destination-out';
            mCtx.fillStyle = 'rgba(0,0,0,1)';
            drawFill();
          }
          break;
        }
        case 'intersect': {
          if (mask.inverted) {
            mCtx.save();
            mCtx.setTransform(dpi, 0, 0, dpi, 0, 0);
            mCtx.globalCompositeOperation = 'source-over';
            mCtx.fillStyle = 'rgba(255,255,255,1)';
            mCtx.fillRect(0, 0, canvas.width / dpi, canvas.height / dpi);
            mCtx.restore();
            mCtx.globalCompositeOperation = 'destination-out';
            mCtx.fillStyle = 'rgba(0,0,0,1)';
            drawFill();
            mCtx.globalCompositeOperation = 'destination-in';
            drawFill();
          } else {
            mCtx.globalCompositeOperation = 'destination-in';
            mCtx.fillStyle = 'rgba(255,255,255,1)';
            drawFill();
          }
          break;
        }
        case 'difference': {
          mCtx.globalCompositeOperation = 'xor';
          mCtx.fillStyle = 'rgba(255,255,255,1)';
          drawFill();
          break;
        }
      }

      // Expansion via stroke (only for non-text masks)
      if (mask.expansion !== 0 && mask.shapeType !== 'text') {
        const path = MaskCompositor.commandsToPath2D(mask.commands, 0, 0);
        mCtx.globalCompositeOperation =
          mask.expansion < 0 ? 'destination-out' : 'source-over';
        mCtx.strokeStyle =
          mask.expansion < 0 ? 'rgba(0,0,0,1)' : 'rgba(255,255,255,1)';
        mCtx.lineWidth = Math.abs(mask.expansion) * 2;
        mCtx.globalAlpha = globalAlpha;
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

  /** Paint text glyphs directly onto ctx at current transform origin (0,0) */
  private static _paintTextMask(
    ctx: CanvasRenderingContext2D,
    mask: VectorMask,
  ): void {
    const p = mask.params;
    const text = p.textContent ?? 'Text';
    const font = p.textFont ?? 'system-ui, sans-serif';
    const size = (p.textSize ?? 80) * ((p.textZoom ?? 100) / 100);
    const bold = p.textBold ? 'bold' : 'normal';
    const italic = p.textItalic ? 'italic' : 'normal';
    const align = p.textAlign ?? 'center';
    const charSpacing = p.textCharacterSpacing ?? 0;
    const lineSpacing = p.textLineSpacing ?? 0;

    ctx.font = `${italic} ${bold} ${size}px ${font}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';

    const lines = text.split('\n');
    const lineHeight = size * (1 + lineSpacing / 100);
    const totalHeight = lineHeight * lines.length;
    let y = -totalHeight / 2 + lineHeight / 2;

    for (const line of lines) {
      if (charSpacing !== 0) {
        // Render char-by-char for spacing
        const totalW = ctx.measureText(line).width
          + charSpacing * (line.length - 1);
        let x = align === 'left' ? -totalW / 2
          : align === 'right' ? totalW / 2
          : 0;
        // For char-by-char we need left alignment reference
        ctx.textAlign = 'left';
        x = align === 'left' ? -totalW / 2
          : align === 'right' ? totalW / 2 - totalW
          : -totalW / 2;
        for (const ch of line) {
          ctx.fillText(ch, x, y);
          x += ctx.measureText(ch).width + charSpacing;
        }
        ctx.textAlign = align;
      } else {
        ctx.fillText(line, 0, y);
      }
      // Underline
      if (p.textUnderline) {
        const w = ctx.measureText(line).width;
        ctx.save();
        ctx.strokeStyle = ctx.fillStyle as string;
        ctx.lineWidth = Math.max(1, size / 20);
        const uy = y + size * 0.35;
        const ux0 = align === 'left' ? 0 : align === 'right' ? -w : -w / 2;
        ctx.beginPath();
        ctx.moveTo(ux0, uy);
        ctx.lineTo(ux0 + w, uy);
        ctx.stroke();
        ctx.restore();
      }
      y += lineHeight;
    }
  }

  static commandsToPath2D(
    commands: PathCommand[],
    offX: number,
    offY: number,
  ): Path2D {
    const p = new Path2D();
    for (const cmd of commands) {
      const pts = cmd.points;
      switch (cmd.type) {
        case 'M':
          if (pts.length >= 2) p.moveTo(pts[0] + offX, pts[1] + offY);
          break;
        case 'L':
          if (pts.length >= 2) p.lineTo(pts[0] + offX, pts[1] + offY);
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