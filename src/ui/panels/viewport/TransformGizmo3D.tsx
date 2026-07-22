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
type Plane = 'xy' | 'xz' | 'yz';
type Handle = Axis | Plane | 'uniform';

const AXIS_COLOR: Record<Axis, string> = { x: '#ff2e88', y: '#78e800', z: '#00c8ff' };
const AXIS_LIGHT: Record<Axis, string> = { x: '#ff89b8', y: '#c8f078', z: '#a8e8ff' };
const PLANE_COLOR: Record<Plane, string> = { xy: '#00c8ff', xz: '#78e800', yz: '#ff2e88' };

const ARM_LEN = 140;
const CAGE_FRAC = 0.42;
const PLANE_HANDLE_PX = 16;
const ARROW_HEAD_PX = 16;
const STROKE = 3;

/**
 * IMPORTANT: This app stores 3D positions in "AE-space" (Y-down, Z-into-screen).
 * BaseLayerRenderer.updateTransform3D writes the mesh at GL position
 * (pos.x, pos.y, -pos.z). CameraManager.worldToScreen works in GL space.
 *
 * So when the gizmo asks "where does this AE-space point project on screen?",
 * we must negate the Z before calling worldToScreen — otherwise the gizmo
 * lands at a different depth than the object and drag directions invert.
 */

export const TransformGizmo3D: React.FC<Props> = ({ cameraManager, viewportSize }) => {
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

  const layerId = selectedIds[0];
  const layer = comp ? comp.layers.find(l => l.id === layerId) : null;
  const t3d = layer?.transform3D;
  const compId = comp?.id ?? null;
  const isScale = tool === 'scale';

  const dragRef = useRef<{
    handle: Handle; layerId: string; compId: string;
    startX: number; startY: number;
    startPos: { x: number; y: number; z: number };
    startScale: { x: number; y: number; z: number };
    uDirX: number; uDirY: number; uWorldPerPx: number;
    vDirX: number; vDirY: number; vWorldPerPx: number;
    uAxis: Axis | null; vAxis: Axis | null;
  } | null>(null);

  /** AE-space → screen (negates Z so it matches renderer's mesh placement). */
  const w2s = useCallback(
    (wx: number, wy: number, wz: number) =>
      cameraManager!.worldToScreen(wx, wy, -wz),
    [cameraManager],
  );

  const projectAxis = useCallback(
    (origin: { x: number; y: number; z: number }, axis: Axis, len: number) => {
      if (!cameraManager) return null;
      const tip = {
        x: origin.x + (axis === 'x' ? len : 0),
        y: origin.y + (axis === 'y' ? len : 0),
        z: origin.z + (axis === 'z' ? len : 0),
      };
      const o = w2s(origin.x, origin.y, origin.z);
      const t = w2s(tip.x, tip.y, tip.z);
      const dx = t.x - o.x;
      const dy = t.y - o.y;
      const lenPx = Math.hypot(dx, dy);
      if (lenPx < 0.5) return null;
      return { o, t, dirX: dx / lenPx, dirY: dy / lenPx, lenPx, worldPerPx: len / lenPx };
    },
    [cameraManager, w2s],
  );

  const handleDown = useCallback(
    (handle: Handle, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!cameraManager || !compId || !layerId) return;

      const cs = useCompositionStore.getState();
      const l = cs.compositions.find(c => c.id === compId)?.layers.find(l => l.id === layerId);
      if (!l?.transform3D) return;
      const lt = l.transform3D;

      let uAxis: Axis | null = null, vAxis: Axis | null = null;
      if (handle === 'x' || handle === 'y' || handle === 'z') uAxis = handle;
      else if (handle === 'xy') { uAxis = 'x'; vAxis = 'y'; }
      else if (handle === 'xz') { uAxis = 'x'; vAxis = 'z'; }
      else if (handle === 'yz') { uAxis = 'y'; vAxis = 'z'; }

      let uDirX = 0, uDirY = 0, uWorldPerPx = 1;
      let vDirX = 0, vDirY = 0, vWorldPerPx = 1;
      if (uAxis) {
        const p = projectAxis(lt.position, uAxis, ARM_LEN);
        if (!p) return;
        uDirX = p.dirX; uDirY = p.dirY; uWorldPerPx = p.worldPerPx;
      }
      if (vAxis) {
        const p = projectAxis(lt.position, vAxis, ARM_LEN);
        if (!p) return;
        vDirX = p.dirX; vDirY = p.dirY; vWorldPerPx = p.worldPerPx;
      }

      dragRef.current = {
        handle, layerId, compId,
        startX: e.clientX, startY: e.clientY,
        startPos: { ...lt.position },
        startScale: { ...lt.scale },
        uDirX, uDirY, uWorldPerPx,
        vDirX, vDirY, vWorldPerPx,
        uAxis, vAxis,
      };

      const onMove = (ev: MouseEvent) => {
        const d = dragRef.current;
        if (!d) return;
        const cs2 = useCompositionStore.getState();
        const l2 = cs2.compositions.find(c => c.id === d.compId)?.layers.find(l => l.id === d.layerId);
        if (!l2?.transform3D) return;

        const mdx = ev.clientX - d.startX;
        const mdy = ev.clientY - d.startY;
        let du = 0, dv = 0;
        if (d.uAxis && !d.vAxis) {
          du = (mdx * d.uDirX + mdy * d.uDirY) * d.uWorldPerPx;
        } else if (d.uAxis && d.vAxis) {
          const det = d.uDirX * d.vDirY - d.uDirY * d.vDirX;
          if (Math.abs(det) > 1e-6) {
            const a = (mdx * d.vDirY - mdy * d.vDirX) / det;
            const b = (d.uDirX * mdy - d.uDirY * mdx) / det;
            du = a * d.uWorldPerPx;
            dv = b * d.vWorldPerPx;
          }
        }

        const patch: any = { transform3D: { ...l2.transform3D } };
        if (isScale) {
          patch.transform3D.scale = { ...d.startScale };
          if (d.handle === 'uniform') {
            const factor = Math.max(0.01, 1 - mdy * 0.005);
            patch.transform3D.scale.x = Math.max(1, d.startScale.x * factor);
            patch.transform3D.scale.y = Math.max(1, d.startScale.y * factor);
            patch.transform3D.scale.z = Math.max(1, d.startScale.z * factor);
          } else if (d.uAxis && !d.vAxis) {
            const factor = Math.max(0.01, 1 + du / ARM_LEN);
            patch.transform3D.scale[d.uAxis] = Math.max(1, d.startScale[d.uAxis] * factor);
          } else if (d.uAxis && d.vAxis) {
            const fu = Math.max(0.01, 1 + du / ARM_LEN);
            const fv = Math.max(0.01, 1 + dv / ARM_LEN);
            patch.transform3D.scale[d.uAxis] = Math.max(1, d.startScale[d.uAxis] * fu);
            patch.transform3D.scale[d.vAxis] = Math.max(1, d.startScale[d.vAxis] * fv);
          }
        } else {
          patch.transform3D.position = { ...d.startPos };
          if (d.handle === 'uniform') {
            // Free screen-plane drag. screenToWorld returns GL-space Z=0 plane
            // point; X/Y between AE and GL agree, so use deltas directly.
            const px = w2s(d.startPos.x, d.startPos.y, d.startPos.z);
            const wA = cameraManager.screenToWorld(px.x, px.y);
            const wB = cameraManager.screenToWorld(px.x + mdx, px.y + mdy);
            patch.transform3D.position.x = d.startPos.x + (wB.x - wA.x);
            patch.transform3D.position.y = d.startPos.y + (wB.y - wA.y);
          } else if (d.uAxis && !d.vAxis) {
            patch.transform3D.position[d.uAxis] = d.startPos[d.uAxis] + du;
          } else if (d.uAxis && d.vAxis) {
            patch.transform3D.position[d.uAxis] = d.startPos[d.uAxis] + du;
            patch.transform3D.position[d.vAxis] = d.startPos[d.vAxis] + dv;
          }
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
    [cameraManager, compId, layerId, isScale, projectAxis, w2s],
  );

  // Early returns
  if (!cameraManager || selectedIds.length !== 1 || !comp) return null;
  if (!isPerspective) return null;
  if (!layer || !layer.is3D || !t3d) return null;
  // Select tool = no gizmo. Only Move + Scale get this gizmo. Rotate handled elsewhere.
  if (tool !== 'move' && tool !== 'scale') return null;

  const origin = t3d.position;
  const O = w2s(origin.x, origin.y, origin.z);
  const xTip = w2s(origin.x + ARM_LEN, origin.y, origin.z);
  const yTip = w2s(origin.x, origin.y + ARM_LEN, origin.z);
  const zTip = w2s(origin.x, origin.y, origin.z + ARM_LEN);

  const cageLen = ARM_LEN * CAGE_FRAC;
  const cageX = w2s(origin.x + cageLen, origin.y, origin.z);
  const cageY = w2s(origin.x, origin.y + cageLen, origin.z);
  const cageZ = w2s(origin.x, origin.y, origin.z + cageLen);
  const cageXY = w2s(origin.x + cageLen, origin.y + cageLen, origin.z);
  const cageXZ = w2s(origin.x + cageLen, origin.y, origin.z + cageLen);
  const cageYZ = w2s(origin.x, origin.y + cageLen, origin.z + cageLen);

  const tips: Record<Axis, { x: number; y: number }> = { x: xTip, y: yTip, z: zTip };
  const planeCorners: Record<Plane, { x: number; y: number }> = { xy: cageXY, xz: cageXZ, yz: cageYZ };
  const planeAxisEnds: Record<Plane, [{x:number;y:number}, {x:number;y:number}]> = {
    xy: [cageX, cageY], xz: [cageX, cageZ], yz: [cageY, cageZ],
  };

  const arrowHead = (from: {x:number;y:number}, to: {x:number;y:number}, sizePx = ARROW_HEAD_PX) => {
    const dx = to.x - from.x, dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    const bx = to.x - ux * sizePx, by = to.y - uy * sizePx;
    const px = -uy, py = ux;
    const w = sizePx * 0.55;
    return `${to.x},${to.y} ${bx + px*w},${by + py*w} ${bx - px*w},${by - py*w}`;
  };

  const isHovered = (h: Handle) => hover === h;
  const fillForAxis = (axis: Axis) => isHovered(axis) ? '#ffffff' : AXIS_LIGHT[axis];
  const strokeForAxis = (axis: Axis) => isHovered(axis) ? '#ffffff' : AXIS_COLOR[axis];
  const glowFilter = (h: Handle) => isHovered(h) ? 'url(#gizmoGlow)' : undefined;

  return (
    <svg
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 28 }}
      width={viewportSize.width}
      height={viewportSize.height}
    >
      <defs>
        <filter id="gizmoGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Cage edges */}
      <g opacity={0.85}>
        <line x1={cageX.x} y1={cageX.y} x2={cageXZ.x} y2={cageXZ.y} stroke={AXIS_COLOR.z} strokeWidth={STROKE} />
        <line x1={cageZ.x} y1={cageZ.y} x2={cageXZ.x} y2={cageXZ.y} stroke={AXIS_COLOR.x} strokeWidth={STROKE} />
        <line x1={cageX.x} y1={cageX.y} x2={cageXY.x} y2={cageXY.y} stroke={AXIS_COLOR.y} strokeWidth={STROKE} />
        <line x1={cageY.x} y1={cageY.y} x2={cageXY.x} y2={cageXY.y} stroke={AXIS_COLOR.x} strokeWidth={STROKE} />
        <line x1={cageY.x} y1={cageY.y} x2={cageYZ.x} y2={cageYZ.y} stroke={AXIS_COLOR.z} strokeWidth={STROKE} />
        <line x1={cageZ.x} y1={cageZ.y} x2={cageYZ.x} y2={cageYZ.y} stroke={AXIS_COLOR.y} strokeWidth={STROKE} />
      </g>

      {/* Axis arms */}
      {(['x','y','z'] as Axis[]).map(axis => {
        const tip = tips[axis];
        const dx = tip.x - O.x, dy = tip.y - O.y;
        if (Math.hypot(dx, dy) < 6) return null;
        const hovered = isHovered(axis);
        return (
          <g
            key={`arm-${axis}`}
            style={{ pointerEvents: 'all', cursor: isScale ? 'nesw-resize' : 'grab' }}
            onMouseDown={e => handleDown(axis, e)}
            onMouseEnter={() => setHover(axis)}
            onMouseLeave={() => setHover(h => h === axis ? null : h)}
            filter={glowFilter(axis)}
          >
            <line x1={O.x} y1={O.y} x2={tip.x} y2={tip.y} stroke="transparent" strokeWidth={24} />
            <line
              x1={O.x} y1={O.y} x2={tip.x} y2={tip.y}
              stroke={strokeForAxis(axis)}
              strokeWidth={hovered ? STROKE + 1 : STROKE}
              strokeLinecap="round"
            />
            {!isScale ? (
              <polygon
                points={arrowHead(O, tip)}
                fill={fillForAxis(axis)}
                stroke={strokeForAxis(axis)}
                strokeWidth={1.5}
              />
            ) : (
              <rect
                x={tip.x - 8} y={tip.y - 8} width={16} height={16}
                fill={fillForAxis(axis)}
                stroke={strokeForAxis(axis)}
                strokeWidth={1.5} rx={2}
              />
            )}
          </g>
        );
      })}

      {/* Plane handles */}
      {(['xy','xz','yz'] as Plane[]).map(plane => {
        const hovered = isHovered(plane);
        const baseColor = PLANE_COLOR[plane];
        const fillColor = hovered ? '#ffffff' : baseColor;
        const strokeColor = hovered ? baseColor : 'rgba(0,0,0,0.4)';

        if (isScale) {
          const [a, b] = planeAxisEnds[plane];
          const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
          const ddx = b.x - a.x, ddy = b.y - a.y;
          const ang = Math.atan2(ddy, ddx) * 180 / Math.PI;
          const w = 44, h = 12;
          return (
            <g
              key={`plane-${plane}`}
              style={{ pointerEvents: 'all', cursor: 'move' }}
              onMouseDown={e => handleDown(plane, e)}
              onMouseEnter={() => setHover(plane)}
              onMouseLeave={() => setHover(h => h === plane ? null : h)}
              filter={glowFilter(plane)}
              transform={`translate(${mx},${my}) rotate(${ang})`}
            >
              <rect
                x={-w/2} y={-h/2} width={w} height={h}
                fill={fillColor}
                opacity={hovered ? 1 : 0.85}
                stroke={strokeColor} strokeWidth={hovered ? 2 : 1} rx={3}
              />
            </g>
          );
        }

        const p = planeCorners[plane];
        const size = hovered ? PLANE_HANDLE_PX + 4 : PLANE_HANDLE_PX;
        return (
          <g
            key={`plane-${plane}`}
            style={{ pointerEvents: 'all', cursor: 'move' }}
            onMouseDown={e => handleDown(plane, e)}
            onMouseEnter={() => setHover(plane)}
            onMouseLeave={() => setHover(h => h === plane ? null : h)}
            filter={glowFilter(plane)}
          >
            <rect
              x={p.x - size/2} y={p.y - size/2}
              width={size} height={size}
              fill={fillColor}
              opacity={hovered ? 1 : 0.9}
              stroke={strokeColor} strokeWidth={hovered ? 2 : 1} rx={2}
            />
          </g>
        );
      })}

      {/* Origin ball */}
      {(() => {
        const hovered = isHovered('uniform');
        return (
          <g
            style={{ pointerEvents: 'all', cursor: isScale ? 'nwse-resize' : 'move' }}
            onMouseDown={e => handleDown('uniform', e)}
            onMouseEnter={() => setHover('uniform')}
            onMouseLeave={() => setHover(h => h === 'uniform' ? null : h)}
            filter={glowFilter('uniform')}
          >
            <circle
              cx={O.x} cy={O.y} r={hovered ? 11 : 9}
              fill={hovered ? '#ffffff' : 'rgba(220,220,220,0.9)'}
              stroke="rgba(0,0,0,0.5)" strokeWidth={1.5}
            />
            <circle cx={O.x} cy={O.y} r={3} fill="rgba(50,50,50,0.9)" />
          </g>
        );
      })()}
    </svg>
  );
};