/**
 * OutOfBoundsOverlay — draws dashed outlines for each layer that lies
 * (fully or partially) outside the composition rectangle when
 * `clipToCompBounds` is enabled. Mirrors AE's behaviour where clipped
 * layers still show a bounding box you can select/see.
 */
import React, { useEffect, useState } from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useViewportStore } from '../../../state/viewportStore';
import { useSelectionStore } from '../../../state/selectionStore';
import type { CameraManager } from '../../../renderer/CameraManager';
import type { Layer } from '../../../types/layer';

interface Props {
  cameraManager: CameraManager | null;
  viewportSize: { width: number; height: number };
}

interface LayerBox {
  id: string;
  name: string;
  selected: boolean;
  fullyOutside: boolean;
  points: { x: number; y: number }[];  // 4 corners in screen space
  labelX: number;
  labelY: number;
}

/**
 * Compute the 4 corners of a layer in world space given its transform +
 * geometry size. Returns null when the layer has no size (e.g. null layers).
 */
function computeLayerCorners(layer: Layer): { x: number; y: number }[] | null {
  const data = layer.data as any;
  const w = data?.naturalWidth ?? data?.width ?? 100;
  const h = data?.naturalHeight ?? data?.height ?? 100;
  if (!w || !h) return null;

  const t = layer.transform;
  const scaleX = (t.scale?.x ?? 100) / 100;
  const scaleY = (t.scale?.y ?? 100) / 100;
  const rot = ((t.rotation ?? 0) * Math.PI) / 180;
  const px = t.position?.x ?? 0;
  const py = t.position?.y ?? 0;
  const ax = t.anchorPoint?.x ?? 0;
  const ay = t.anchorPoint?.y ?? 0;

  // Local corners (centered on origin, then anchor offset).
  const halfW = w / 2;
  const halfH = h / 2;
  const local = [
    { x: -halfW - ax, y: -halfH - ay },
    { x:  halfW - ax, y: -halfH - ay },
    { x:  halfW - ax, y:  halfH - ay },
    { x: -halfW - ax, y:  halfH - ay },
  ];

  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  return local.map(p => {
    const sx = p.x * scaleX;
    const sy = p.y * scaleY;
    return {
      x: px + sx * cos - sy * sin,
      y: py + sx * sin + sy * cos,
    };
  });
}

/** True when the given axis-aligned rectangle overlaps the comp rect. */
function rectOverlapsComp(
  points: { x: number; y: number }[],
  compW: number,
  compH: number,
): boolean {
  const halfW = compW / 2;
  const halfH = compH / 2;
  let minX =  Infinity, minY =  Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return !(maxX < -halfW || minX > halfW || maxY < -halfH || minY > halfH);
}

/** True when all corners lie outside the comp rectangle. */
function rectFullyOutsideComp(
  points: { x: number; y: number }[],
  compW: number,
  compH: number,
): boolean {
  const halfW = compW / 2;
  const halfH = compH / 2;
  for (const p of points) {
    if (p.x >= -halfW && p.x <= halfW && p.y >= -halfH && p.y <= halfH) {
      return false;
    }
  }
  return true;
}

/** True when any corner lies outside the comp rectangle. */
function rectPartiallyOutsideComp(
  points: { x: number; y: number }[],
  compW: number,
  compH: number,
): boolean {
  const halfW = compW / 2;
  const halfH = compH / 2;
  for (const p of points) {
    if (p.x < -halfW || p.x > halfW || p.y < -halfH || p.y > halfH) {
      return true;
    }
  }
  return false;
}

export const OutOfBoundsOverlay: React.FC<Props> = ({ cameraManager, viewportSize }) => {
  const comp = useCompositionStore(s =>
    s.activeCompositionId
      ? s.compositions.find(c => c.id === s.activeCompositionId) ?? null
      : null,
  );
  const showOOB = useViewportStore(s => s.settings.showOutOfBoundsOutlines);
  const clipEnabled = useViewportStore(s => s.settings.clipToCompBounds);
  const selectedIds = useSelectionStore(s => s.selected.filter(x => x.type === 'layer').map(x => x.id));
  const [, forceTick] = useState(0);

  // Repaint whenever the camera moves (pan/zoom).
  useEffect(() => {
    if (!cameraManager) return;
    const onChange = () => forceTick(t => t + 1);
    const prev = (cameraManager as any).onChanged as (() => void) | undefined;
    (cameraManager as any).onChanged = () => {
      prev?.();
      onChange();
    };
    return () => {
      (cameraManager as any).onChanged = prev ?? null;
    };
  }, [cameraManager]);

  if (!comp || !cameraManager || !showOOB) return null;

  const currentFrame = Math.floor(comp.currentTime * comp.fps);

  const boxes: LayerBox[] = [];
  for (const layer of comp.layers) {
    if (!layer.visible) continue;
    if (currentFrame < layer.startFrame || currentFrame > layer.endFrame) continue;
    if (layer.type === 'null' || layer.type === 'audio' || layer.type === 'adjustment') continue;

    const worldPts = computeLayerCorners(layer);
    if (!worldPts) continue;

    if (!rectOverlapsComp(worldPts, comp.width, comp.height) === false
        && !rectPartiallyOutsideComp(worldPts, comp.width, comp.height)) {
      // Fully inside — nothing to draw.
      continue;
    }

    const fullyOutside = rectFullyOutsideComp(worldPts, comp.width, comp.height);

    // If clipping is off, we only draw outlines for fully-outside layers so
    // the user can find them. If clipping is on, we draw for partially-out
    // AND fully-out layers (matches AE bounding box behaviour).
    if (!clipEnabled && !fullyOutside) continue;

    const screenPts = worldPts.map(p => cameraManager.worldToScreen(p.x, p.y));

    let sumX = 0, sumY = 0;
    for (const p of screenPts) { sumX += p.x; sumY += p.y; }
    const cx = sumX / screenPts.length;
    const cy = sumY / screenPts.length;

    boxes.push({
      id: layer.id,
      name: layer.name,
      selected: selectedIds.includes(layer.id),
      fullyOutside,
      points: screenPts,
      labelX: cx,
      labelY: cy,
    });
  }

  if (boxes.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={viewportSize.width}
      height={viewportSize.height}
      style={{ zIndex: 15 }}
    >
      {boxes.map(b => {
        const d = `M ${b.points[0].x} ${b.points[0].y}
                   L ${b.points[1].x} ${b.points[1].y}
                   L ${b.points[2].x} ${b.points[2].y}
                   L ${b.points[3].x} ${b.points[3].y} Z`;

        const stroke = b.selected
          ? 'var(--color-accent, #5865ff)'
          : b.fullyOutside
            ? 'rgba(240, 180, 90, 0.9)'
            : 'rgba(200, 200, 220, 0.7)';
        const strokeWidth = b.selected ? 1.5 : 1;
        const dash = b.fullyOutside ? '3 4' : '6 4';

        return (
          <g key={b.id}>
            <path
              d={d}
              fill="none"
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={dash}
              vectorEffect="non-scaling-stroke"
            />
            {b.fullyOutside && (
              <>
                <rect
                  x={b.labelX - 40}
                  y={b.labelY - 8}
                  width={80}
                  height={16}
                  rx={3}
                  fill="rgba(15, 17, 22, 0.85)"
                  stroke="rgba(240, 180, 90, 0.6)"
                  strokeWidth={0.75}
                />
                <text
                  x={b.labelX}
                  y={b.labelY + 3}
                  textAnchor="middle"
                  fontSize={9}
                  fontFamily="var(--font-family-mono, monospace)"
                  fill="rgba(240, 200, 130, 0.95)"
                >
                  {b.name.length > 14 ? b.name.slice(0, 12) + '…' : b.name}
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
};

export default OutOfBoundsOverlay;