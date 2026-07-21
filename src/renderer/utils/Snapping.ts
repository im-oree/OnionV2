/**
 * Snapping — handles snapping of points/rects to composition edges, center, guides, and layers.
 */
import { VIEWPORT_CONFIG } from '../../config/viewportConfig';

export interface SnapResult {
  x: number;
  y: number;
  snapped: boolean;
  lines: SnapLine[];
}

export interface SnapLine {
  type: 'horizontal' | 'vertical';
  position: number;
}

export interface SnapTargets {
  compLeft: number;
  compRight: number;
  compTop: number;
  compBottom: number;
  compCenterX: number;
  compCenterY: number;
  guidesH: number[];
  guidesV: number[];
  layers?: LayerSnapRect[];
}

export interface LayerSnapRect {
  id: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

export class Snapping {
  private _enabled = true;

  get enabled(): boolean { return this._enabled; }
  set enabled(val: boolean) { this._enabled = val; }
  toggle(): void { this._enabled = !this._enabled; }

  snapPoint(
    worldX: number,
    worldY: number,
    targets: SnapTargets,
    thresholdPx?: number,
  ): SnapResult {
    const result: SnapResult = { x: worldX, y: worldY, snapped: false, lines: [] };
    if (!this._enabled) return result;

    const threshold = thresholdPx ?? VIEWPORT_CONFIG.SNAP_THRESHOLD_PX;
    const { verticals, horizontals } = this._flattenTargets(targets);

    let bestDx = 0;
    let bestDy = 0;
    let bestXDist = Infinity;
    let bestYDist = Infinity;
    let bestXLine: number | null = null;
    let bestYLine: number | null = null;

    for (const x of verticals) {
      const d = Math.abs(worldX - x);
      if (d < threshold && d < bestXDist) {
        bestXDist = d;
        bestDx = x - worldX;
        bestXLine = x;
      }
    }

    for (const y of horizontals) {
      const d = Math.abs(worldY - y);
      if (d < threshold && d < bestYDist) {
        bestYDist = d;
        bestDy = y - worldY;
        bestYLine = y;
      }
    }

    if (bestXLine !== null) {
      result.x += bestDx;
      result.snapped = true;
      result.lines.push({ type: 'vertical', position: bestXLine });
    }

    if (bestYLine !== null) {
      result.y += bestDy;
      result.snapped = true;
      result.lines.push({ type: 'horizontal', position: bestYLine });
    }

    return result;
  }

  /**
   * Snap a moving rectangle by comparing its left/right/centerX and
   * top/bottom/centerY against all target lines.
   *
   * dx/dy are the current proposed movement offsets.
   */
  snapRect(
    rect: LayerSnapRect,
    dx: number,
    dy: number,
    targets: SnapTargets,
    thresholdPx?: number,
  ): { dx: number; dy: number; snapped: boolean; lines: SnapLine[] } {
    const result = { dx, dy, snapped: false, lines: [] as SnapLine[] };
    if (!this._enabled) return result;

    const threshold = thresholdPx ?? VIEWPORT_CONFIG.SNAP_THRESHOLD_PX;
    const { verticals, horizontals } = this._flattenTargets(targets);

    const movingXs = [
      rect.left + dx,
      rect.centerX + dx,
      rect.right + dx,
    ];

    const movingYs = [
      rect.bottom + dy,
      rect.centerY + dy,
      rect.top + dy,
    ];

    let bestDx = 0;
    let bestDy = 0;
    let bestXDist = Infinity;
    let bestYDist = Infinity;
    let bestXLine: number | null = null;
    let bestYLine: number | null = null;

    for (const movingX of movingXs) {
      for (const targetX of verticals) {
        const d = Math.abs(movingX - targetX);
        if (d < threshold && d < bestXDist) {
          bestXDist = d;
          bestDx = targetX - movingX;
          bestXLine = targetX;
        }
      }
    }

    for (const movingY of movingYs) {
      for (const targetY of horizontals) {
        const d = Math.abs(movingY - targetY);
        if (d < threshold && d < bestYDist) {
          bestYDist = d;
          bestDy = targetY - movingY;
          bestYLine = targetY;
        }
      }
    }

    if (bestXLine !== null) {
      result.dx += bestDx;
      result.snapped = true;
      result.lines.push({ type: 'vertical', position: bestXLine });
    }

    if (bestYLine !== null) {
      result.dy += bestDy;
      result.snapped = true;
      result.lines.push({ type: 'horizontal', position: bestYLine });
    }

    return result;
  }

  private _flattenTargets(targets: SnapTargets): { verticals: number[]; horizontals: number[] } {
    const verticals = [
      targets.compLeft,
      targets.compCenterX,
      targets.compRight,
      ...targets.guidesV,
    ];

    const horizontals = [
      targets.compBottom,
      targets.compCenterY,
      targets.compTop,
      ...targets.guidesH,
    ];

    for (const l of targets.layers ?? []) {
      verticals.push(l.left, l.centerX, l.right);
      horizontals.push(l.bottom, l.centerY, l.top);
    }

    return { verticals, horizontals };
  }
}

export const snapping = new Snapping();
