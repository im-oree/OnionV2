/**
 * MotionBlurBadgeOverlay — SVG overlay that renders a small colored 'MB'
 * badge and subtle border glow on each layer that has motion blur enabled,
 * so users can see at a glance which layers are being blurred.
 *
 * The badge appears at the top-right corner of the layer's bounding box
 * in screen space. A soft colored glow is drawn around the layer's
 * bounding box edges when motion blur is active on that layer.
 *
 * Only shows when:
 *  - The composition has a layer with `motionBlur === true`
 *  - The global motion blur toggle is enabled (`comp.motionBlur?.enabled`)
 *
 * Re-paints on camera movement and on each RAF tick during playback.
 */
import React, { useEffect, useState } from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import type { CameraManager } from '../../../renderer/CameraManager';
import type { Layer } from '../../../types/layer';

interface Props {
  cameraManager: CameraManager | null;
  viewportSize: { width: number; height: number };
}

interface BadgeInfo {
  layerId: string;
  /** Screen position of the top-right corner for the badge */
  badgeX: number;
  badgeY: number;
  /** 4 corners of the layer bounding box in screen space (for glow) */
  screenCorners: { x: number; y: number }[];
}

/** Get 4 world-space corners of a layer's bounding box. */
function getLayerWorldCorners(layer: Layer): { x: number; y: number }[] | null {
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

const MB_BADGE_COLOR = '#00d4ff'; // cyan/teal — distinct from selection accent
const MB_GLOW_COLOR = 'rgba(0, 212, 255,'; // alpha appended in template

export const MotionBlurBadgeOverlay: React.FC<Props> = ({
  cameraManager,
  viewportSize,
}) => {
  const comp = useCompositionStore(s =>
    s.activeCompositionId
      ? s.compositions.find(c => c.id === s.activeCompositionId) ?? null
      : null,
  );
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

  if (!comp || !cameraManager) return null;

  // Check if global motion blur is enabled.
  const globalMB = comp.motionBlur;
  if (!globalMB?.enabled) return null;

  const currentFrame = Math.floor(comp.currentTime * comp.fps);

  // Find layers with per-layer motion blur enabled.
  const blurredLayers = comp.layers.filter(
    l =>
      l.motionBlur &&
      l.visible &&
      currentFrame >= l.startFrame &&
      currentFrame <= l.endFrame,
  );
  if (blurredLayers.length === 0) return null;

  const badges: BadgeInfo[] = [];
  for (const layer of blurredLayers) {
    const worldPts = getLayerWorldCorners(layer);
    if (!worldPts) continue;

    const screenPts = worldPts.map(p => cameraManager.worldToScreen(p.x, p.y));

    // Compute bounding box in screen space.
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    for (const p of screenPts) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    // Badge floats just outside the top-right corner (AE-style info badge)
    // so the layer's own content isn't obscured.
    const badgeX = maxX + 8;  // right margin
    const badgeY = minY - 8;  // top margin

    badges.push({
      layerId: layer.id,
      badgeX,
      badgeY,
      screenCorners: screenPts,
    });
  }

  if (badges.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={viewportSize.width}
      height={viewportSize.height}
      style={{ zIndex: 26 }}
    >
      <defs>
        {/* Glow filter for MB badge text */}
        <filter id="mb-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blur" />
          <feFlood floodColor={MB_BADGE_COLOR} floodOpacity="0.5" />
          <feComposite in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {badges.map(b => {
        // Draw the bounding box path.
        const bbD = `M ${b.screenCorners[0].x} ${b.screenCorners[0].y}
                     L ${b.screenCorners[1].x} ${b.screenCorners[1].y}
                     L ${b.screenCorners[2].x} ${b.screenCorners[2].y}
                     L ${b.screenCorners[3].x} ${b.screenCorners[3].y} Z`;

        return (
          <g key={b.layerId}>
            {/* Subtle glow around the layer's bounding box */}
            <path
              d={bbD}
              fill="none"
              stroke={`${MB_GLOW_COLOR}0.3)`}
              strokeWidth={3}
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={bbD}
              fill="none"
              stroke={MB_BADGE_COLOR}
              strokeWidth={1}
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            />

            {/* MB badge */}
            <g transform={`translate(${b.badgeX - 14}, ${b.badgeY - 14})`}>
              {/* Background pill */}
              <rect
                x={-2}
                y={-2}
                width={32}
                height={18}
                rx={4}
                ry={4}
                fill="rgba(0, 0, 0, 0.75)"
                stroke={MB_BADGE_COLOR}
                strokeWidth={1}
                strokeOpacity={0.8}
              />
              {/* MB text label */}
              <text
                x={14}
                y={11}
                textAnchor="middle"
                fontSize={10}
                fontFamily="var(--font-family-mono, monospace)"
                fontWeight={700}
                fill={MB_BADGE_COLOR}
                filter="url(#mb-glow)"
              >
                MB
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
};

export default MotionBlurBadgeOverlay;
