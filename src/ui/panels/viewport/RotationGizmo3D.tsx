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
type Handle = Axis | 'trackball';

const AXIS_COLOR: Record<Axis, string> = { x: '#ff2e88', y: '#78e800', z: '#00c8ff' };
const AXIS_LIGHT: Record<Axis, string> = { x: '#ff89b8', y: '#c8f078', z: '#a8e8ff' };
const RING_RADIUS = 110;
const GRAB_DOT_PX = 12;
const ARM_LEN = 130;

export const RotationGizmo3D: React.FC<Props> = ({ cameraManager, viewportSize }) => {
  const [, forceUpdate] = useState(0);
  useCameraSubscribe(cameraManager, () => forceUpdate(n => n + 1));
  const [hover, setHover] = useState<Handle | null>(null);

  const selectedIds = useSelectionStore(s =>
    s.selected.filter(x => x.type === 'layer').map(x => x.id),
  );
  const comp = useCompositionStore(s =>
    s.activeCompositionId
      ? s.compositions.find(c => c.id === s.activeCompositionId) ?? null
      : null,
  );
  const isPerspective = comp?.perspective3D ?? false;
  const tool = useToolStore(s => s.activeTool);

  const layerId = selectedIds[0] ?? null;
  const layer = comp && layerId ? comp.layers.find(l => l.id === layerId) ?? null : null;
  const t3d = layer?.transform3D ?? null;
  const compId = comp?.id ?? null;

  const dragRef = useRef<{
    axis: Handle; layerId: string; compId: string;
    startAngle: number;
    startRot: { x: number; y: number; z: number };
    centerScreen: { x: number; y: number };
    startX: number; startY: number;
    signFlip: number;
  } | null>(null);

  /** AE-space → GL-space Z flip so worldToScreen matches mesh placement. */
  const w2s = useCallback(
    (wx: number, wy: number, wz: number) =>
      cameraManager!.worldToScreen(wx, wy, -wz),
    [cameraManager],
  );

  const computeAxisSign = useCallback(
    (axis: Axis, worldPos: { x: number; y: number; z: number }): number => {
      if (!cameraManager) return 1;
      const cam = (cameraManager as any).getActiveCamera?.() ?? (cameraManager as any).camera;
      if (!cam) return 1;
      const camPos = cam.position;
      // Convert AE-space obj pos to GL-space (negate Z) to match camera position
      const objGLx = worldPos.x, objGLy = worldPos.y, objGLz = -worldPos.z;
      const toCamX = camPos.x - objGLx;
      const toCamY = camPos.y - objGLy;
      const toCamZ = camPos.z - objGLz;
      // AE-Z axis maps to -Z in GL
      const ax = axis === 'x' ? 1 : 0;
      const ay = axis === 'y' ? 1 : 0;
      const az = axis === 'z' ? -1 : 0;
      const dot = ax * toCamX + ay * toCamY + az * toCamZ;
      return dot >= 0 ? -1 : 1;
    },
    [cameraManager],
  );

  const startDrag = useCallback(
    (axis: Handle, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!compId || !layerId || !cameraManager) return;

      const cs = useCompositionStore.getState();
      const fresh = cs.compositions.find(c => c.id === compId)?.layers.find(l => l.id === layerId);
      if (!fresh?.transform3D) return;
      const lt = fresh.transform3D;

      const centerScreen = w2s(lt.position.x, lt.position.y, lt.position.z);
      const getAngle = (mx: number, my: number) =>
        Math.atan2(my - centerScreen.y, mx - centerScreen.x);

      const signFlip = axis === 'trackball' ? 1 : computeAxisSign(axis, lt.position);

      dragRef.current = {
        axis, layerId, compId,
        startAngle: getAngle(e.clientX, e.clientY),
        startRot: { x: lt.rotationX, y: lt.rotationY, z: lt.rotationZ },
        centerScreen: { x: centerScreen.x, y: centerScreen.y },
        startX: e.clientX, startY: e.clientY,
        signFlip,
      };

      const onMove = (ev: MouseEvent) => {
        const d = dragRef.current;
        if (!d) return;
        const cs2 = useCompositionStore.getState();
        const l2 = cs2.compositions.find(c => c.id === d.compId)?.layers.find(l => l.id === d.layerId);
        if (!l2?.transform3D) return;

        const patch: any = { transform3D: { ...l2.transform3D } };
        const norm = (v: number) => (((v + 180) % 360) + 360) % 360 - 180;

        if (d.axis === 'trackball') {
          const mdx = ev.clientX - d.startX;
          const mdy = ev.clientY - d.startY;
          patch.transform3D.rotationX = norm(d.startRot.x + mdy * 0.5);
          patch.transform3D.rotationY = norm(d.startRot.y + mdx * 0.5);
        } else {
          const cur = Math.atan2(ev.clientY - d.centerScreen.y, ev.clientX - d.centerScreen.x);
          const deltaDeg = (cur - d.startAngle) * (180 / Math.PI) * d.signFlip;
          if (d.axis === 'x') patch.transform3D.rotationX = norm(d.startRot.x + deltaDeg);
          else if (d.axis === 'y') patch.transform3D.rotationY = norm(d.startRot.y + deltaDeg);
          else patch.transform3D.rotationZ = norm(d.startRot.z + deltaDeg);
        }

        cs2.updateLayer(d.compId, d.layerId, patch, true);
      };
      const onUp = () => {
        dragRef.current = null;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [compId, layerId, cameraManager, computeAxisSign, w2s],
  );

  if (!cameraManager || selectedIds.length !== 1 || !comp || !layerId) return null;
  if (!isPerspective || tool !== 'rotate') return null;
  if (!layer || !layer.is3D || !t3d) return null;

  const center = w2s(t3d.position.x, t3d.position.y, t3d.position.z);

  const buildRing = (axis: Axis) => {
    const segs = 64;
    const pts: string[] = [];
    let grab = { x: 0, y: 0 };
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const c = Math.cos(a) * RING_RADIUS;
      const s = Math.sin(a) * RING_RADIUS;
      let wx = 0, wy = 0, wz = 0;
      if (axis === 'x')      { wy = c; wz = s; }
      else if (axis === 'y') { wx = c; wz = s; }
      else                    { wx = c; wy = s; }
      const p = w2s(
        t3d.position.x + wx,
        t3d.position.y + wy,
        t3d.position.z + wz,
      );
      pts.push(`${i === 0 ? 'M' : 'L'}${p.x},${p.y}`);
      if (i === Math.floor(segs / 8)) grab = { x: p.x, y: p.y };
    }
    return { path: pts.join(' '), grab };
  };

  const rings = (['z', 'y', 'x'] as Axis[]).map(axis => ({ axis, ...buildRing(axis) }));

  const armProjection = (axis: Axis) => {
    const tip = {
      x: t3d.position.x + (axis === 'x' ? ARM_LEN : 0),
      y: t3d.position.y + (axis === 'y' ? ARM_LEN : 0),
      z: t3d.position.z + (axis === 'z' ? ARM_LEN : 0),
    };
    return w2s(tip.x, tip.y, tip.z);
  };

  const isHovered = (h: Handle) => hover === h;
  const glowFilter = (h: Handle) => isHovered(h) ? 'url(#rotGizmoGlow)' : undefined;

  return (
    <svg
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 28 }}
      width={viewportSize.width}
      height={viewportSize.height}
    >
      <defs>
        <filter id="rotGizmoGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {(['x','y','z'] as Axis[]).map(axis => {
        const tip = armProjection(axis);
        return (
          <line
            key={`arm-${axis}`}
            x1={center.x} y1={center.y} x2={tip.x} y2={tip.y}
            stroke={AXIS_COLOR[axis]} strokeWidth={2} opacity={0.35}
            strokeLinecap="round"
          />
        );
      })}

      {rings.map(({ axis, path, grab }) => {
        const hovered = isHovered(axis);
        const ringColor = hovered ? '#ffffff' : AXIS_COLOR[axis];
        const dotFill = hovered ? '#ffffff' : AXIS_LIGHT[axis];
        return (
          <g
            key={axis}
            filter={glowFilter(axis)}
            onMouseEnter={() => setHover(axis)}
            onMouseLeave={() => setHover(h => h === axis ? null : h)}
          >
            <path
              d={path} fill="none" stroke="transparent" strokeWidth={26}
              style={{ pointerEvents: 'all', cursor: 'grab' }}
              onMouseDown={e => startDrag(axis, e)}
            />
            <path d={path} fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth={hovered ? 6 : 5} />
            <path d={path} fill="none" stroke={ringColor} strokeWidth={hovered ? 4 : 3} />
            <g
              style={{ pointerEvents: 'all', cursor: 'grab' }}
              onMouseDown={e => startDrag(axis, e)}
            >
              <circle cx={grab.x} cy={grab.y} r={GRAB_DOT_PX + 2} fill="rgba(0,0,0,0.5)" />
              <circle
                cx={grab.x} cy={grab.y}
                r={hovered ? GRAB_DOT_PX + 2 : GRAB_DOT_PX}
                fill={dotFill}
                stroke={AXIS_COLOR[axis]} strokeWidth={hovered ? 3 : 2}
              />
            </g>
          </g>
        );
      })}

      {(() => {
        const hovered = isHovered('trackball');
        return (
          <g
            style={{ pointerEvents: 'all', cursor: 'grab' }}
            onMouseDown={e => startDrag('trackball', e)}
            onMouseEnter={() => setHover('trackball')}
            onMouseLeave={() => setHover(h => h === 'trackball' ? null : h)}
            filter={glowFilter('trackball')}
          >
            <circle
              cx={center.x} cy={center.y}
              r={hovered ? 13 : 11}
              fill={hovered ? '#ffffff' : 'rgba(220,220,220,0.9)'}
              stroke="rgba(0,0,0,0.5)" strokeWidth={1.5}
            />
            <circle cx={center.x} cy={center.y} r={3.5} fill="rgba(50,50,50,0.9)" />
          </g>
        );
      })()}
    </svg>
  );
};