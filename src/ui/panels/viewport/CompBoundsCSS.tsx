/**
 * CompBoundsCSS â€” renders the composition bounds rectangle in the viewport.
 * - Comp bg: exactly what the user chose (never swapped).
 * - Outside area: distinct radial gradient so the comp always stands out
 *   regardless of what bg color the user picks.
 * - Border: thick, high-contrast accent color with glow.
 * - Corner brackets for extra clarity.
 */
import React, { useState, useCallback, useMemo } from 'react';
import type { Composition } from '../../../types/composition';
import type { CameraManager } from '../../../renderer/CameraManager';
import { useViewportStore } from '../../../state/viewportStore';
import { useCameraSubscribe } from './hooks/useCameraSubscribe';

interface Props {
  comp: Composition;
  viewportSize: { width: number; height: number };
  cameraManager: CameraManager | null;
  zoom: number;
}

const BORDER_ACCENT = 'rgba(120,140,255,0.95)';
const BORDER_GLOW   = 'rgba(120,140,255,0.35)';
const BORDER_INNER  = 'rgba(0,0,0,0.55)';
const BORDER_THICK  = 3;
const CORNER_SIZE = 14;
const CORNER_THICKNESS = 3;

const CornerBrackets: React.FC<{
  x: number; y: number; w: number; h: number;
}> = React.memo(({ x, y, w, h }) => {
  const corners = [
    { cx: x, cy: y, dx: 1, dy: 1 },
    { cx: x + w, cy: y, dx: -1, dy: 1 },
    { cx: x + w, cy: y + h, dx: -1, dy: -1 },
    { cx: x, cy: y + h, dx: 1, dy: -1 },
  ];
  return (
    <>
      {corners.map((c, i) => (
        <React.Fragment key={i}>
          <div
            style={{
              position: 'absolute',
              left: c.dx > 0 ? c.cx - 1 : c.cx - CORNER_SIZE + 1,
              top: c.cy - CORNER_THICKNESS / 2,
              width: CORNER_SIZE,
              height: CORNER_THICKNESS,
              background: BORDER_ACCENT,
              borderRadius: 1,
              pointerEvents: 'none',
              boxShadow: '0 0 4px rgba(120,140,255,0.5)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: c.cx - CORNER_THICKNESS / 2,
              top: c.dy > 0 ? c.cy - 1 : c.cy - CORNER_SIZE + 1,
              width: CORNER_THICKNESS,
              height: CORNER_SIZE,
              background: BORDER_ACCENT,
              borderRadius: 1,
              pointerEvents: 'none',
              boxShadow: '0 0 4px rgba(120,140,255,0.5)',
            }}
          />
        </React.Fragment>
      ))}
    </>
  );
});
CornerBrackets.displayName = 'CornerBrackets';

const DimensionLabel: React.FC<{
  x: number; y: number; w: number; comp: Composition;
}> = React.memo(({ x, y, w, comp }) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y - 20,
      width: w,
      textAlign: 'center',
      fontSize: 10,
      fontFamily: 'system-ui, sans-serif',
      fontWeight: 500,
      color: 'rgba(180,190,255,0.65)',
      letterSpacing: '0.4px',
      pointerEvents: 'none',
      userSelect: 'none',
      whiteSpace: 'nowrap',
      overflow: 'visible',
      textShadow: '0 1px 2px rgba(0,0,0,0.6)',
    }}
  >
    {comp.width} x {comp.height}
  </div>
));
DimensionLabel.displayName = 'DimensionLabel';

export const CompBoundsCSS: React.FC<Props> = ({
  comp,
  viewportSize,
  cameraManager,
  zoom,
}) => {
  const [tick, setTick] = useState(0);
  const rerender = useCallback(() => setTick(n => (n + 1) % 1e9), []);
  useCameraSubscribe(cameraManager, rerender);

  const bounds = useMemo(() => {
    if (
      !cameraManager ||
      viewportSize.width <= 0 ||
      viewportSize.height <= 0 ||
      comp.width <= 0 ||
      comp.height <= 0
    ) {
      return null;
    }

    try {
      const halfW = comp.width / 2;
      const halfH = comp.height / 2;
      const tl = cameraManager.worldToScreen(-halfW, halfH);
      const br = cameraManager.worldToScreen(halfW, -halfH);

      const x = tl.x;
      const y = tl.y;
      const w = br.x - tl.x;
      const h = br.y - tl.y;

      if (!isFinite(x) || !isFinite(y) || w <= 0 || h <= 0) return null;
      return { x, y, w, h };
    } catch {
      return null;
    }
  }, [
    cameraManager,
    viewportSize.width,
    viewportSize.height,
    comp.width,
    comp.height,
    // CRITICAL: recompute whenever the camera changes (tick bumps on
    // camera pan/zoom/orbit via useCameraSubscribe).
    tick,
  ]);

  const effectiveBg =
    (comp.backgroundColor && comp.backgroundColor.trim() !== '')
      ? comp.backgroundColor
      : '#000000';

  const showLabel = zoom < 3 && bounds && bounds.w > 80;

  const outsideBgStyle = useViewportStore((s) => s.settings.outsideBgStyle);
  const showTransparencyCheckerboard = useViewportStore((s) => s.settings.showTransparencyCheckerboard);

  const outsideBg = useMemo<string>(() => {
    switch (outsideBgStyle) {
      case 'checkerboard':
        return `repeating-conic-gradient(#1a1c23 0% 25%, #22252e 0% 50%) 50% / 24px 24px`;
      case 'dark':
        return '#0d0e12';
      case 'gradient':
      default:
        return 'radial-gradient(ellipse 90% 90% at 50% 50%, #1e2029 0%, #14161c 55%, #0a0b10 100%)';
    }
  }, [outsideBgStyle]);

  // Checkerboard pattern for transparency preview inside comp rect
  const compBgStyle = useMemo<string>(() => {
    if (showTransparencyCheckerboard) {
      // Classic dark checkerboard: 16px alternating squares
      return 'repeating-conic-gradient(#2a2a35 0% 25%, #3a3a48 0% 50%) 50% / 16px 16px';
    }
    return effectiveBg;
  }, [showTransparencyCheckerboard, effectiveBg]);

  // Hide comp bounds when comp is in 3D perspective mode — the camera frustum
  // overlay (CameraFrustumOverlay) already communicates the render area in 3D.
  if (comp.perspective3D) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        zIndex: 0,
        background: outsideBg,
      }}
    >
      {bounds && (
        <>
          <div
            style={{
              position: 'absolute',
              left: bounds.x,
              top: bounds.y,
              width: bounds.w,
              height: bounds.h,
              background: compBgStyle,
              pointerEvents: 'none',
              boxShadow: '0 12px 48px rgba(0,0,0,0.65)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: bounds.x - BORDER_THICK,
              top: bounds.y - BORDER_THICK,
              width: bounds.w + BORDER_THICK * 2,
              height: bounds.h + BORDER_THICK * 2,
              border: `${BORDER_THICK}px solid ${BORDER_ACCENT}`,
              borderRadius: 2,
              pointerEvents: 'none',
              boxShadow: [
                `0 0 0 1px ${BORDER_INNER}`,
                `inset 0 0 0 1px ${BORDER_INNER}`,
                `0 0 16px ${BORDER_GLOW}`,
                `0 0 32px rgba(120,140,255,0.15)`,
              ].join(', '),
            }}
          />
          <CornerBrackets
            x={bounds.x}
            y={bounds.y}
            w={bounds.w}
            h={bounds.h}
          />
          {showLabel && (
            <DimensionLabel
              x={bounds.x}
              y={bounds.y}
              w={bounds.w}
              comp={comp}
            />
          )}
        </>
      )}
    </div>
  );
};