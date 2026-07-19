import React, { useMemo } from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useSelectionStore } from '../../../state/selectionStore';
import { useKeyframeStore } from '../../../state/keyframeStore';
import { useCameraSubscribe } from './hooks/useCameraSubscribe';
import type { CameraManager } from '../../../renderer/CameraManager';

interface Props {
  cameraManager: CameraManager | null;
  viewportSize: { width: number; height: number };
}

export const MotionPathOverlay: React.FC<Props> = ({ cameraManager, viewportSize }) => {
  const revision = useKeyframeStore((s) => s.revision);
  const [, forceUpdate] = React.useState(0);
  useCameraSubscribe(cameraManager, () => forceUpdate((n) => n + 1));
  void revision;

  const comp = useCompositionStore((s) => s.activeCompositionId
    ? s.compositions.find((c) => c.id === s.activeCompositionId) ?? null : null);
  const selectedIds = useSelectionStore((s) =>
    s.selected.filter((x) => x.type === 'layer').map((x) => x.id));
  const engine = useKeyframeStore((s) => s.engine);

  const paths = useMemo(() => {
    if (!comp || selectedIds.length === 0 || !cameraManager) return [];
    const currentFrame = Math.round(comp.currentTime * comp.fps);
    const totalFrames = Math.floor(comp.duration * comp.fps);
    const result: { d: string; kfPoints: { x: number; y: number; time: number; current: boolean }[] }[] = [];

    for (const layerId of selectedIds) {
      const layer = comp.layers.find((l) => l.id === layerId);
      if (!layer) continue;

      const posKfs = engine.getKeyframesForProperty(layerId, 'transform.position');
      if (posKfs.length < 2) continue;

      // Sample every frame from first to last keyframe for smooth curve
      const firstFrame = Math.max(0, posKfs[0].time);
      const lastFrame = Math.min(totalFrames, posKfs[posKfs.length - 1].time);

      const points: { x: number; y: number }[] = [];
      for (let f = firstFrame; f <= lastFrame; f += 1) {
        const r = engine.evaluate(layerId, 'transform.position', f);
        if (Array.isArray(r.value)) {
          const world = cameraManager.worldToScreen(r.value[0], r.value[1]);
          points.push({ x: world.x, y: world.y });
        }
      }
      if (points.length < 2) continue;

      let d = `M${points[0].x},${points[0].y}`;
      for (let i = 1; i < points.length; i++) d += ` L${points[i].x},${points[i].y}`;

      const kfPoints = posKfs.map((kf) => {
        const v = kf.value as number[];
        const s = cameraManager.worldToScreen(v[0], v[1]);
        return { x: s.x, y: s.y, time: kf.time, current: kf.time === currentFrame };
      });

      result.push({ d, kfPoints });
    }
    return result;
  }, [comp, selectedIds, cameraManager, revision]);

  if (!cameraManager || paths.length === 0 || viewportSize.width === 0) return null;

  return (
    <svg
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
        zIndex: 16,
      }}
      width={viewportSize.width} height={viewportSize.height}
    >
      {paths.map((p, i) => (
        <g key={i}>
          {/* Path shadow */}
          <path d={p.d} fill="none" stroke="#000" strokeWidth={3} opacity={0.4} />
          {/* Path main */}
          <path d={p.d} fill="none" stroke="var(--color-accent)" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.8} />
          {/* Keyframe dots */}
          {p.kfPoints.map((kp, j) => (
            <g key={j}>
              <circle cx={kp.x} cy={kp.y} r={kp.current ? 5 : 3.5}
                fill={kp.current ? '#fff' : 'var(--color-accent)'}
                stroke={kp.current ? 'var(--color-accent)' : '#000'}
                strokeWidth={kp.current ? 2 : 1} />
            </g>
          ))}
        </g>
      ))}
    </svg>
  );
};