import React, { useCallback, useRef, useState } from 'react';
import { useSelectionStore } from '../../../state/selectionStore';
import { useCompositionStore } from '../../../state/compositionStore';
import { useToolStore } from '../../../state/toolStore';
import type { CameraManager } from '../../../renderer/CameraManager';
import { useCameraSubscribe } from './hooks/useCameraSubscribe';

interface Props {
  cameraManager: CameraManager | null;
  viewportSize: { width: number; height: number };
}

type Axis = 'x' | 'y' | 'z';

const AXIS_COLORS: Record<Axis, string> = {
  x: '#ff3355',
  y: '#55dd33',
  z: '#3388ff',
};

const RING_RADIUS = 50;

export const RotationGizmo3D: React.FC<Props> = ({
  cameraManager,
  viewportSize,
}) => {
  const [, forceUpdate] = useState(0);
  useCameraSubscribe(cameraManager, () => forceUpdate((n) => n + 1));

  const selectedIds = useSelectionStore((s) =>
    s.selected
      .filter((x) => x.type === 'layer')
      .map((x) => x.id),
  );

  const comp = useCompositionStore((s) =>
    s.activeCompositionId
      ? (s.compositions.find(
          (c) => c.id === s.activeCompositionId,
        ) ?? null)
      : null,
  );

  const isPerspective = comp?.perspective3D ?? false;
  const tool = useToolStore((s) => s.activeTool);

  const dragRef = useRef<{
    axis: Axis;
    layerId: string;
    compId: string;
    startAngle: number;
    startRotX: number;
    startRotY: number;
    startRotZ: number;
  } | null>(null);

  const layerId = selectedIds[0] ?? null;
  const layer = comp && layerId
    ? comp.layers.find((l) => l.id === layerId) ?? null
    : null;
  const t3d = layer?.transform3D ?? null;

  // Stable compId string for useCallback dep (avoids broken ?? '' dep)
  const compId = comp?.id ?? null;

  const handleRingMouseDown = useCallback(
    (axis: Axis, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!compId || !layerId || !cameraManager) return;

      const cs = useCompositionStore.getState();
      const freshLayer = cs.compositions
        .find((c) => c.id === compId)
        ?.layers.find((ll) => ll.id === layerId);

      if (!freshLayer?.transform3D) return;

      const lt3d = freshLayer.transform3D;

      const screenCenter = cameraManager.worldToScreen(
        lt3d.position.x,
        lt3d.position.y,
        lt3d.position.z,
      );

      const getAngle = (mx: number, my: number) =>
        Math.atan2(my - screenCenter.y, mx - screenCenter.x);

      dragRef.current = {
        axis,
        layerId,
        compId,
        startAngle: getAngle(e.clientX, e.clientY),
        startRotX: lt3d.rotationX,
        startRotY: lt3d.rotationY,
        startRotZ: lt3d.rotationZ,
      };

      const onMove = (ev: MouseEvent) => {
        const d = dragRef.current;
        if (!d) return;

        const cs2 = useCompositionStore.getState();
        const freshLayer2 = cs2.compositions
          .find((c) => c.id === d.compId)
          ?.layers.find((ll) => ll.id === d.layerId);

        if (!freshLayer2?.transform3D) return;

        const currentAngle = getAngle(ev.clientX, ev.clientY);
        const delta =
          (currentAngle - d.startAngle) * (180 / Math.PI);

        let newRotX = d.startRotX;
        let newRotY = d.startRotY;
        let newRotZ = d.startRotZ;

        if (d.axis === 'x') newRotX = d.startRotX + delta;
        else if (d.axis === 'y') newRotY = d.startRotY + delta;
        else newRotZ = d.startRotZ + delta;

        const normalize = (v: number) =>
          ((v + 180) % 360 + 360) % 360 - 180;

        cs2.updateLayer(
          d.compId,
          d.layerId,
          {
            transform3D: {
              ...freshLayer2.transform3D,
              rotationX: normalize(newRotX),
              rotationY: normalize(newRotY),
              rotationZ: normalize(newRotZ),
            },
          },
          true,
        );
      };

      const onUp = () => {
        dragRef.current = null;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [layerId, compId, cameraManager],
  );

  // ── Early returns ──────────────────────────────────────────────
  if (
    !cameraManager ||
    selectedIds.length !== 1 ||
    !comp ||
    !layerId
  ) {
    return null;
  }

  if (!isPerspective || tool !== 'rotate') return null;
  if (!layer || !layer.is3D || !t3d) return null;

  const layerZ = t3d.position.z;
  const center = cameraManager.worldToScreen(
    t3d.position.x,
    t3d.position.y,
    layerZ,
  );

  const getRingPath = (axis: Axis): string => {
    const segments = 48;
    const points: string[] = [];

    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;

      let wx = 0;
      let wy = 0;

      if (axis === 'z') {
        wx = Math.cos(a) * RING_RADIUS;
        wy = Math.sin(a) * RING_RADIUS;
      } else if (axis === 'x') {
        wx = 0;
        wy = Math.cos(a) * RING_RADIUS;
      } else {
        wx = Math.cos(a) * RING_RADIUS;
        wy = 0;
      }

      const screen = cameraManager.worldToScreen(
        t3d.position.x + wx,
        t3d.position.y + wy,
        layerZ,
      );

      points.push(
        `${i === 0 ? 'M' : 'L'}${screen.x},${screen.y}`,
      );
    }

    return points.join(' ');
  };

  const axes: Axis[] = ['z', 'y', 'x'];

  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 28,
      }}
      width={viewportSize.width}
      height={viewportSize.height}
    >
      {axes.map((axis) => (
        <g
          key={axis}
          style={{ pointerEvents: 'all', cursor: 'grab' }}
          onMouseDown={(e) => handleRingMouseDown(axis, e)}
        >
          <path
            d={getRingPath(axis)}
            fill="none"
            stroke="rgba(0,0,0,0.4)"
            strokeWidth={4}
          />
          <path
            d={getRingPath(axis)}
            fill="none"
            stroke={AXIS_COLORS[axis]}
            strokeWidth={2}
            strokeDasharray={axis === 'x' ? '4 3' : undefined}
            opacity={0.85}
          />
        </g>
      ))}

      <circle
        cx={center.x}
        cy={center.y}
        r={4}
        fill="white"
        stroke="rgba(0,0,0,0.3)"
        strokeWidth={1}
        style={{ pointerEvents: 'none' }}
      />
    </svg>
  );
};