/**
 * CameraFrameGuide — flat 2D overlay showing the composition frame as a
 * viewfinder in the 3D perspective camera view. Unlike the previous version
 * that projected corners through the 3D camera (making it tilt with the scene),
 * this renders as a pure 2D SVG overlay centered in the viewport.
 *
 * Like Blender's camera view, it shows what's in frame vs what's outside it,
 * with corner brackets, a darkened outside area, center crosshair, a
 * "Camera View" label, and an optional rule-of-thirds grid.
 */
import React, { useEffect, useState, useId } from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useViewportStore } from '../../../state/viewportStore';

interface Props {
  viewportSize: { width: number; height: number };
}

export const CameraFrameGuide: React.FC<Props> = ({ viewportSize }) => {
  const [, forceUpdate] = useState(0);
  const maskId = useId();

  // Re-render on view mode changes, camera events, and rule-of-thirds toggle
  useEffect(() => {
    const handler = () => forceUpdate(n => n + 1);
    document.addEventListener('viewport:viewmode', handler);
    const unsubRoT = useViewportStore.subscribe((state, prevState) => {
      if (state.settings.showRuleOfThirds !== prevState.settings.showRuleOfThirds) {
        handler();
      }
    });
    return () => {
      document.removeEventListener('viewport:viewmode', handler);
      unsubRoT();
    };
  }, []);

  const comp = useCompositionStore(s =>
    s.activeCompositionId
      ? s.compositions.find(c => c.id === s.activeCompositionId) ?? null
      : null
  );

  // Only show in 3D perspective mode, not in free view
  if (!comp?.perspective3D) return null;
  const isFree = !!(window as any).__freeViewMode;
  if (isFree) return null;

  const vw = viewportSize.width || 300;
  const vh = viewportSize.height || 200;

  // Calculate frame size to fit in viewport while maintaining comp aspect ratio
  const compAspect = comp.width / comp.height;
  const vpAspect = vw / vh;

  let frameW: number, frameH: number;
  if (vpAspect > compAspect) {
    // Viewport is wider than comp — fit height
    frameH = vh * 0.85;
    frameW = frameH * compAspect;
  } else {
    // Viewport is taller — fit width
    frameW = vw * 0.85;
    frameH = frameW / compAspect;
  }

  const fx = (vw - frameW) / 2;
  const fy = (vh - frameH) / 2;

  const showRoT = useViewportStore.getState().settings.showRuleOfThirds;

  return (
    <svg
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 24 }}
      width={vw} height={vh}
    >
      <defs>
        <mask id={maskId}>
          <rect width="100%" height="100%" fill="white" />
          <rect x={fx} y={fy} width={frameW} height={frameH} fill="black" />
        </mask>
      </defs>

      {/* Dark overlay outside the frame */}
      <rect width={vw} height={vh} fill="rgba(0,0,0,0.45)" mask={`url(#${maskId})`} />

      {/* Dashed frame border */}
      <rect
        x={fx} y={fy} width={frameW} height={frameH}
        fill="none"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth={1.5}
        strokeDasharray="8 4"
      />

      {/* Corner brackets (like camera viewfinder) */}
      {[
        [fx, fy, 1, 1],
        [fx + frameW, fy, -1, 1],
        [fx + frameW, fy + frameH, -1, -1],
        [fx, fy + frameH, 1, -1],
      ].map(([x, y, dx, dy], i) => (
        <g key={i}>
          <line x1={x} y1={y} x2={x + 16 * (dx as number)} y2={y}
            stroke="rgba(255,255,255,0.8)" strokeWidth={1.5} />
          <line x1={x} y1={y} x2={x} y2={y + 16 * (dy as number)}
            stroke="rgba(255,255,255,0.8)" strokeWidth={1.5} />
        </g>
      ))}

      {/* Center crosshair */}
      <line x1={fx + frameW / 2 - 10} y1={fy + frameH / 2}
        x2={fx + frameW / 2 + 10} y2={fy + frameH / 2}
        stroke="rgba(255,255,255,0.35)" strokeWidth={0.5} />
      <line x1={fx + frameW / 2} y1={fy + frameH / 2 - 10}
        x2={fx + frameW / 2} y2={fy + frameH / 2 + 10}
        stroke="rgba(255,255,255,0.35)" strokeWidth={0.5} />

      {/* Label above the frame */}
      <text
        x={fx + frameW / 2}
        y={fy - 8}
        textAnchor="middle"
        fill="rgba(255,255,255,0.5)"
        fontSize={10}
        fontFamily="var(--font-family-mono, monospace)"
      >
        Camera View — {comp.width}×{comp.height}
      </text>

      {/* Rule-of-thirds grid */}
      {showRoT && (
        <g>
          {/* Vertical 1 — at ⅓ width */}
          <line x1={fx + frameW / 3} y1={fy} x2={fx + frameW / 3} y2={fy + frameH}
            stroke="rgba(255,255,255,0.28)" strokeWidth={0.5} strokeDasharray="4 3" />
          {/* Vertical 2 — at ⅔ width */}
          <line x1={fx + frameW * 2 / 3} y1={fy} x2={fx + frameW * 2 / 3} y2={fy + frameH}
            stroke="rgba(255,255,255,0.28)" strokeWidth={0.5} strokeDasharray="4 3" />
          {/* Horizontal 1 — at ⅓ height */}
          <line x1={fx} y1={fy + frameH / 3} x2={fx + frameW} y2={fy + frameH / 3}
            stroke="rgba(255,255,255,0.28)" strokeWidth={0.5} strokeDasharray="4 3" />
          {/* Horizontal 2 — at ⅔ height */}
          <line x1={fx} y1={fy + frameH * 2 / 3} x2={fx + frameW} y2={fy + frameH * 2 / 3}
            stroke="rgba(255,255,255,0.28)" strokeWidth={0.5} strokeDasharray="4 3" />
        </g>
      )}
    </svg>
  );
};
