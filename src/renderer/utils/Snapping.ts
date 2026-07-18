/**
 * Snapping — handles snapping of points to composition edges, center, guides, and layers.
 * Returns snapped position plus which snap lines were hit (for visual display).
 */
import { VIEWPORT_CONFIG } from '../../config/viewportConfig';

export interface SnapResult {
  x: number;
  y: number;
  /** Whether a snap occurred */
  snapped: boolean;
  /** Snap lines to draw (positions in world coords) */
  lines: SnapLine[];
}

export interface SnapLine {
  type: 'horizontal' | 'vertical';
  position: number;
}

export interface SnapTargets {
  /** Composition edges (left, right, top, bottom) */
  compLeft: number;
  compRight: number;
  compTop: number;
  compBottom: number;
  /** Composition center */
  compCenterX: number;
  compCenterY: number;
  /** Guide lines (world positions) */
  guidesH: number[];
  guidesV: number[];
  /** Layer edges (Phase 3: populated by layer bounds) */
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

  /**
   * Snap a world-space point to nearby targets.
   * Returns the snapped position and which snap lines were hit.
   */
  snapPoint(
    worldX: number,
    worldY: number,
    targets: SnapTargets,
    thresholdPx?: number,
  ): SnapResult {
    const result: SnapResult = { x: worldX, y: worldY, snapped: false, lines: [] };

    if (!this._enabled) return result;

    const threshold = (thresholdPx ?? VIEWPORT_CONFIG.SNAP_THRESHOLD_PX);

    const snapTargets: Array<{ type: 'horizontal' | 'vertical'; pos: number; axis: 'x' | 'y' }> = [
      // Composition edges
      { type: 'vertical', pos: targets.compLeft, axis: 'x' },
      { type: 'vertical', pos: targets.compRight, axis: 'x' },
      { type: 'vertical', pos: targets.compCenterX, axis: 'x' },
      { type: 'horizontal', pos: targets.compTop, axis: 'y' },
      { type: 'horizontal', pos: targets.compBottom, axis: 'y' },
      { type: 'horizontal', pos: targets.compCenterY, axis: 'y' },
      // Guides
      ...targets.guidesH.map((p) => ({ type: 'horizontal' as const, pos: p, axis: 'y' as const })),
      ...targets.guidesV.map((p) => ({ type: 'vertical' as const, pos: p, axis: 'x' as const })),
      // Layers (Phase 3: populated dynamically)
      ...(targets.layers ?? []).flatMap((l) => [
        { type: 'vertical' as const, pos: l.left, axis: 'x' as const },
        { type: 'vertical' as const, pos: l.right, axis: 'x' as const },
        { type: 'vertical' as const, pos: l.centerX, axis: 'x' as const },
        { type: 'horizontal' as const, pos: l.top, axis: 'y' as const },
        { type: 'horizontal' as const, pos: l.bottom, axis: 'y' as const },
        { type: 'horizontal' as const, pos: l.centerY, axis: 'y' as const },
      ]),
    ];

    let snappedX = worldX;
    let snappedY = worldY;

    for (const target of snapTargets) {
      if (target.axis === 'x') {
        const dist = Math.abs(worldX - target.pos);
        if (dist < threshold) {
          snappedX = target.pos;
          result.snapped = true;
          if (!result.lines.some((l) => l.type === 'vertical' && Math.abs(l.position - target.pos) < 1)) {
            result.lines.push({ type: 'vertical', position: target.pos });
          }
        }
      } else {
        const dist = Math.abs(worldY - target.pos);
        if (dist < threshold) {
          snappedY = target.pos;
          result.snapped = true;
          if (!result.lines.some((l) => l.type === 'horizontal' && Math.abs(l.position - target.pos) < 1)) {
            result.lines.push({ type: 'horizontal', position: target.pos });
          }
        }
      }
    }

    result.x = snappedX;
    result.y = snappedY;
    return result;
  }
}

/** Singleton used by the renderer */
export const snapping = new Snapping();
