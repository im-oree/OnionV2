/**
 * MotionPathOverlay — displays animated position paths for selected layers.
 * Shows the interpolated path, keyframe diamonds, and current position marker.
 */
import React, { useMemo, useState, useCallback } from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useSelectionStore } from '../../../state/selectionStore';
import { useKeyframeStore } from '../../../state/keyframeStore';
import { useCameraSubscribe } from './hooks/useCameraSubscribe';
import type { CameraManager } from '../../../renderer/CameraManager';

interface Props {
  cameraManager: CameraManager | null;
  viewportSize: { width: number; height: number };
}

// ── Constants ────────────────────────────────────────────────

const THEME = {
  pathColor: 'rgba(130,160,255,0.4)',
  pathShadow: 'rgba(0,0,0,0.25)',
  kfFill: 'rgba(130,160,255,0.7)',
  kfStroke: 'rgba(0,0,0,0.3)',
  kfActiveFill: '#ffffff',
  kfActiveStroke: 'rgba(100,140,255,0.9)',
  tangentColor: 'rgba(130,160,255,0.2)',
  currentMarkerFill: 'rgba(255,255,255,0.9)',
  currentMarkerStroke: 'rgba(100,140,255,0.6)',
} as const;

const MAX_SAMPLE_FRAMES = 600;
const KF_SIZE = 4;
const KF_ACTIVE_SIZE = 5.5;
const CURRENT_MARKER_SIZE = 4;

// ── Types ────────────────────────────────────────────────────

interface ScreenPt {
  x: number;
  y: number;
}

interface KfPoint extends ScreenPt {
  time: number;
  isCurrent: boolean;
}

interface PathData {
  layerId: string;
  d: string;
  kfPoints: KfPoint[];
  currentPos: ScreenPt | null;
}

// ── Sub-components ───────────────────────────────────────────

const KeyframeDiamond: React.FC<{
  x: number;
  y: number;
  isCurrent: boolean;
}> = React.memo(({ x, y, isCurrent }) => {
  if (!isFinite(x) || !isFinite(y)) return null;

  const size = isCurrent ? KF_ACTIVE_SIZE : KF_SIZE;

  return (
    <rect
      x={x - size / 2}
      y={y - size / 2}
      width={size}
      height={size}
      rx={1}
      transform={`rotate(45 ${x} ${y})`}
      fill={isCurrent ? THEME.kfActiveFill : THEME.kfFill}
      stroke={isCurrent ? THEME.kfActiveStroke : THEME.kfStroke}
      strokeWidth={isCurrent ? 1.5 : 1}
    />
  );
});

KeyframeDiamond.displayName = 'KeyframeDiamond';

const CurrentPositionMarker: React.FC<{
  x: number;
  y: number;
}> = React.memo(({ x, y }) => {
  if (!isFinite(x) || !isFinite(y)) return null;

  return (
    <g>
      {/* Outer glow */}
      <circle
        cx={x} cy={y}
        r={CURRENT_MARKER_SIZE + 3}
        fill="none"
        stroke={THEME.currentMarkerStroke}
        strokeWidth={1}
        opacity={0.3}
      />
      {/* Inner dot */}
      <circle
        cx={x} cy={y}
        r={CURRENT_MARKER_SIZE}
        fill={THEME.currentMarkerFill}
        stroke={THEME.currentMarkerStroke}
        strokeWidth={1.5}
      />
    </g>
  );
});

CurrentPositionMarker.displayName = 'CurrentPositionMarker';

// ── Main component ──────────────────────────────────────────

export const MotionPathOverlay: React.FC<Props> = ({
  cameraManager,
  viewportSize,
}) => {
  const revision = useKeyframeStore((s) => s.revision);
  const [tick, setTick] = useState(0);

  const rerender = useCallback(
    () => setTick((n) => (n + 1) % 1e9),
    [],
  );

  useCameraSubscribe(cameraManager, rerender);

  const comp = useCompositionStore((s) =>
    s.activeCompositionId
      ? (s.compositions.find(
          (c) => c.id === s.activeCompositionId,
        ) ?? null)
      : null,
  );

  const selectedIds = useSelectionStore((s) =>
    s.selected
      .filter((x) => x.type === 'layer')
      .map((x) => x.id),
  );

  const engine = useKeyframeStore((s) => s.engine);

  const paths = useMemo((): PathData[] => {
    if (
      !comp ||
      selectedIds.length === 0 ||
      !cameraManager ||
      !engine
    ) {
      return [];
    }

    if (comp.fps <= 0 || comp.duration <= 0) return [];

    const currentFrame = Math.round(comp.currentTime * comp.fps);
    const totalFrames = Math.floor(comp.duration * comp.fps);
    const result: PathData[] = [];

    for (const layerId of selectedIds) {
      const layer = comp.layers.find((l) => l.id === layerId);
      if (!layer) continue;

      const posKfs = engine.getKeyframesForProperty(
        layerId,
        'transform.position',
      );

      if (!posKfs || posKfs.length < 2) continue;

      // Sort keyframes by time
      const sorted = [...posKfs].sort((a, b) => a.time - b.time);

      const firstFrame = Math.max(0, sorted[0].time);
      const lastFrame = Math.min(
        totalFrames,
        sorted[sorted.length - 1].time,
      );

      if (lastFrame <= firstFrame) continue;

      const frameRange = lastFrame - firstFrame;

      // Adaptive sampling: fewer points for long paths
      const step = frameRange > MAX_SAMPLE_FRAMES
        ? Math.ceil(frameRange / MAX_SAMPLE_FRAMES)
        : 1;

      const points: ScreenPt[] = [];

      for (let f = firstFrame; f <= lastFrame; f += step) {
        try {
          const r = engine.evaluate(
            layerId,
            'transform.position',
            f,
          );

          if (!r || !Array.isArray(r.value) || r.value.length < 2) {
            continue;
          }

          const [wx, wy] = r.value;
          if (!isFinite(wx) || !isFinite(wy)) continue;

          const screen = cameraManager.worldToScreen(wx, wy);
          if (isFinite(screen.x) && isFinite(screen.y)) {
            points.push(screen);
          }
        } catch {
          continue;
        }
      }

      // Ensure last frame is included
      if (step > 1) {
        try {
          const r = engine.evaluate(
            layerId,
            'transform.position',
            lastFrame,
          );
          if (r && Array.isArray(r.value) && r.value.length >= 2) {
            const screen = cameraManager.worldToScreen(
              r.value[0],
              r.value[1],
            );
            if (isFinite(screen.x) && isFinite(screen.y)) {
              points.push(screen);
            }
          }
        } catch {
          // ignore
        }
      }

      if (points.length < 2) continue;

      // Build SVG path
      let d = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
      for (let i = 1; i < points.length; i++) {
        d += ` L${points[i].x.toFixed(1)},${points[i].y.toFixed(1)}`;
      }

      // Keyframe screen positions
      const kfPoints: KfPoint[] = [];
      for (const kf of sorted) {
        const v = kf.value;
        if (!Array.isArray(v) || v.length < 2) continue;
        if (!isFinite(v[0]) || !isFinite(v[1])) continue;

        const s = cameraManager.worldToScreen(v[0], v[1]);
        if (!isFinite(s.x) || !isFinite(s.y)) continue;

        kfPoints.push({
          x: s.x,
          y: s.y,
          time: kf.time,
          isCurrent: kf.time === currentFrame,
        });
      }

      // Current playhead position
      let currentPos: ScreenPt | null = null;
      if (
        currentFrame >= firstFrame &&
        currentFrame <= lastFrame
      ) {
        try {
          const r = engine.evaluate(
            layerId,
            'transform.position',
            currentFrame,
          );
          if (r && Array.isArray(r.value) && r.value.length >= 2) {
            const s = cameraManager.worldToScreen(
              r.value[0],
              r.value[1],
            );
            if (isFinite(s.x) && isFinite(s.y)) {
              currentPos = s;
            }
          }
        } catch {
          // ignore
        }
      }

      result.push({ layerId, d, kfPoints, currentPos });
    }

    return result;

    // tick and revision ensure recompute on camera / keyframe changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comp, selectedIds, cameraManager, engine, revision, tick]);

  // ── Early return ──────────────────────────────────────────

  if (
    !cameraManager ||
    paths.length === 0 ||
    viewportSize.width <= 0 ||
    viewportSize.height <= 0
  ) {
    return null;
  }

  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 16,
        overflow: 'visible',
      }}
      width={viewportSize.width}
      height={viewportSize.height}
      xmlns="http://www.w3.org/2000/svg"
    >
      {paths.map((p) => (
        <g key={p.layerId}>
          {/* Path shadow — very subtle */}
          <path
            d={p.d}
            fill="none"
            stroke={THEME.pathShadow}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Path line — thin, translucent, not distracting */}
          <path
            d={p.d}
            fill="none"
            stroke={THEME.pathColor}
            strokeWidth={1.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Keyframe diamonds */}
          {p.kfPoints.map((kp, j) => (
            <KeyframeDiamond
              key={j}
              x={kp.x}
              y={kp.y}
              isCurrent={kp.isCurrent}
            />
          ))}

          {/* Current position marker */}
          {p.currentPos && (
            <CurrentPositionMarker
              x={p.currentPos.x}
              y={p.currentPos.y}
            />
          )}
        </g>
      ))}
    </svg>
  );
};