import React, { useState, useCallback } from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useSelectionStore } from '../../../state/selectionStore';
import { useToolStore } from '../../../state/toolStore';
import { TOOLS } from '../../../config/constants';
import type { CameraManager } from '../../../renderer/CameraManager';
import type { Layer, ShapeData, ShapeFill, GradientFill, LinearGradient, RadialGradient } from '../../../types/layer';
import { useCameraSubscribe } from './hooks/useCameraSubscribe';

interface Props {
  cameraManager: CameraManager | null;
  viewportSize: { width: number; height: number };
}


/** Get shape half-width/half-height in world units (after scale). */
function getShapeWH(layer: Layer): { hw: number; hh: number } {
  const d = layer.data as ShapeData | undefined;
  if (!d) return { hw: 50, hh: 50 };
  const sc = layer.transform.scale;
  let w = 100, h = 100;
  if ('width' in d) { w = d.width; h = d.height; }
  else if ('radiusX' in d) { w = d.radiusX * 2; h = d.radiusY * 2; }
  else if ('radius' in d) { w = d.radius * 2; h = d.radius * 2; }
  return {
    hw: (w / 2) * (sc.x / 100),
    hh: (h / 2) * (sc.y / 100),
  };
}

export const GradientOverlay: React.FC<Props> = ({ cameraManager, viewportSize }) => {
  const activeTool = useToolStore((s) => s.activeTool);
  const selectedIds = useSelectionStore((s) =>
    s.selected.filter((x) => x.type === 'layer').map((x) => x.id),
  );
  const comp = useCompositionStore((s) => {
    const id = s.activeCompositionId;
    return id ? s.compositions.find((c) => c.id === id) ?? null : null;
  });

  const [, forceUpdate] = useState(0);
  const rerender = useCallback(() => forceUpdate((n) => n + 1), []);
  useCameraSubscribe(cameraManager, rerender);

  // Only show for gradient tool + a shape layer with gradient fill selected
  if (activeTool !== (TOOLS.GRADIENT as any)) return null;
  if (!cameraManager || !comp || selectedIds.length === 0) return null;

  const layer = comp.layers.find((l) => l.id === selectedIds[0]);
  if (!layer || layer.type !== 'shape') return null;
  const fill = (layer.data as any)?.fill as ShapeFill | undefined;
  if (!fill || fill.type === 'solid' || !fill.gradient) return null;

  return (
    <svg
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
        zIndex: 26,
      }}
      width={viewportSize.width} height={viewportSize.height}
    >
      {fill.gradient.type === 'linear-gradient' ? (
        <LinearHandles
          layer={layer}
          gradient={fill.gradient}
          fill={fill}
          compId={comp.id}
          cam={cameraManager}
        />
      ) : (
        <RadialHandles
          layer={layer}
          gradient={fill.gradient}
          fill={fill}
          compId={comp.id}
          cam={cameraManager}
        />
      )}
    </svg>
  );
};

/** ─── LINEAR HANDLES ─────────────────────────────────────── */

interface HandlesProps<T extends GradientFill> {
  layer: Layer;
  gradient: T;
  fill: ShapeFill;
  compId: string;
  cam: CameraManager;
}

const LinearHandles: React.FC<HandlesProps<LinearGradient>> = ({
  layer, gradient, fill, compId, cam,
}) => {
  const { hw, hh } = getShapeWH(layer);
  const cx = layer.transform.position.x;
  const cy = layer.transform.position.y;
  const rot = (layer.transform.rotation * Math.PI) / 180;

  // Gradient direction in local space (angle=0 → left→right)
  const gAng = (gradient.angle * Math.PI) / 180;
  const dx = Math.cos(gAng);
  const dy = Math.sin(gAng);

  // Handle offsets in shape-local space: from -half to +half along direction
  const halfLen = Math.min(hw, hh) * 0.9;
  const localStart = { x: -dx * halfLen, y: -dy * halfLen };
  const localEnd   = { x:  dx * halfLen, y:  dy * halfLen };

  // Rotate to world by layer rotation
  const rot2 = (px: number, py: number) => ({
    x: cx + px * Math.cos(rot) - py * Math.sin(rot),
    y: cy + px * Math.sin(rot) + py * Math.cos(rot),
  });

  const wStart = rot2(localStart.x, localStart.y);
  const wEnd   = rot2(localEnd.x, localEnd.y);
  const wCenter = { x: cx, y: cy };

  const sStart  = cam.worldToScreen(wStart.x, wStart.y);
  const sEnd    = cam.worldToScreen(wEnd.x, wEnd.y);
  const sCenter = cam.worldToScreen(wCenter.x, wCenter.y);

  const updateAngle = useCallback((mouseWorld: { x: number; y: number }, isStart: boolean) => {
    // Vector from center to mouse
    const dxw = mouseWorld.x - cx;
    const dyw = mouseWorld.y - cy;
    // Undo layer rotation to get local-space angle
    const cosR = Math.cos(-rot);
    const sinR = Math.sin(-rot);
    const lx = dxw * cosR - dyw * sinR;
    const ly = dxw * sinR + dyw * cosR;
    let ang = Math.atan2(ly, lx) * (180 / Math.PI);
    if (isStart) ang += 180;
    // Round to nearest degree
    const newAngle = Math.round(ang);
    const newGrad: LinearGradient = { ...gradient, angle: newAngle };
    useCompositionStore.getState().updateLayer(compId, layer.id, {
      data: { ...(layer.data as any), fill: { ...fill, gradient: newGrad } },
    } as any);
  }, [cx, cy, rot, gradient, fill, compId, layer]);

  const startDrag = useCallback((isStart: boolean, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    document.body.style.cursor = 'grabbing';
    const mm = (ev: MouseEvent) => {
      const world = cam.screenToWorld(ev.clientX - getViewportOffsetX(), ev.clientY - getViewportOffsetY());
      updateAngle(world, isStart);
    };
    const mu = () => {
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', mm);
      document.removeEventListener('mouseup', mu);
    };
    document.addEventListener('mousemove', mm);
    document.addEventListener('mouseup', mu);
  }, [cam, updateAngle]);

  return (
    <g>
      {/* Line: shadow + accent */}
      <line x1={sStart.x} y1={sStart.y} x2={sEnd.x} y2={sEnd.y}
        stroke="#000" strokeWidth={3} strokeOpacity={0.6} />
      <line x1={sStart.x} y1={sStart.y} x2={sEnd.x} y2={sEnd.y}
        stroke="var(--color-accent)" strokeWidth={1.5} strokeDasharray="4 3" />

      {/* Center marker */}
      <circle cx={sCenter.x} cy={sCenter.y} r={4}
        fill="var(--color-accent)" stroke="#fff" strokeWidth={1.5} />

      {/* Start handle (represents stop 0) */}
      <Handle
        x={sStart.x} y={sStart.y}
        color={gradient.stops[0]?.color ?? '#fff'}
        onMouseDown={(e) => startDrag(true, e)}
      />

      {/* End handle (represents last stop) */}
      <Handle
        x={sEnd.x} y={sEnd.y}
        color={gradient.stops[gradient.stops.length - 1]?.color ?? '#000'}
        onMouseDown={(e) => startDrag(false, e)}
      />
    </g>
  );
};

/** ─── RADIAL HANDLES ─────────────────────────────────────── */

const RadialHandles: React.FC<HandlesProps<RadialGradient>> = ({
  layer, gradient, fill, compId, cam,
}) => {
  const { hw, hh } = getShapeWH(layer);
  const cx = layer.transform.position.x;
  const cy = layer.transform.position.y;
  const rot = (layer.transform.rotation * Math.PI) / 180;

  // Center in local space: (centerX-0.5) * 2*hw
  const localCx = (gradient.centerX - 0.5) * 2 * hw;
  const localCy = (gradient.centerY - 0.5) * 2 * hh;

  const rot2 = (px: number, py: number) => ({
    x: cx + px * Math.cos(rot) - py * Math.sin(rot),
    y: cy + px * Math.sin(rot) + py * Math.cos(rot),
  });

  const wCenter = rot2(localCx, localCy);
  // Radius handle along +X in local space
  const rWorld = gradient.radius * Math.min(hw, hh) * 2;
  const wEdge = rot2(localCx + rWorld, localCy);

  const sCenter = cam.worldToScreen(wCenter.x, wCenter.y);
  const sEdge = cam.worldToScreen(wEdge.x, wEdge.y);
  const rScreen = Math.hypot(sEdge.x - sCenter.x, sEdge.y - sCenter.y);

  const updateCenter = useCallback((mouseWorld: { x: number; y: number }) => {
    // Convert mouse world → local shape space
    const dxw = mouseWorld.x - cx;
    const dyw = mouseWorld.y - cy;
    const cosR = Math.cos(-rot);
    const sinR = Math.sin(-rot);
    const lx = dxw * cosR - dyw * sinR;
    const ly = dxw * sinR + dyw * cosR;
    const newCx = 0.5 + lx / (2 * hw);
    const newCy = 0.5 + ly / (2 * hh);
    const newGrad: RadialGradient = { ...gradient, centerX: newCx, centerY: newCy };
    useCompositionStore.getState().updateLayer(compId, layer.id, {
      data: { ...(layer.data as any), fill: { ...fill, gradient: newGrad } },
    } as any);
  }, [cx, cy, rot, hw, hh, gradient, fill, compId, layer]);

  const updateRadius = useCallback((mouseWorld: { x: number; y: number }) => {
    const dxw = mouseWorld.x - wCenter.x;
    const dyw = mouseWorld.y - wCenter.y;
    const dist = Math.hypot(dxw, dyw);
    const newRadius = dist / (Math.min(hw, hh) * 2);
    const newGrad: RadialGradient = { ...gradient, radius: Math.max(0.05, Math.min(3, newRadius)) };
    useCompositionStore.getState().updateLayer(compId, layer.id, {
      data: { ...(layer.data as any), fill: { ...fill, gradient: newGrad } },
    } as any);
  }, [wCenter, hw, hh, gradient, fill, compId, layer]);

  const startDrag = useCallback((which: 'center' | 'edge', e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    document.body.style.cursor = 'grabbing';
    const mm = (ev: MouseEvent) => {
      const world = cam.screenToWorld(ev.clientX - getViewportOffsetX(), ev.clientY - getViewportOffsetY());
      if (which === 'center') updateCenter(world);
      else updateRadius(world);
    };
    const mu = () => {
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', mm);
      document.removeEventListener('mouseup', mu);
    };
    document.addEventListener('mousemove', mm);
    document.addEventListener('mouseup', mu);
  }, [cam, updateCenter, updateRadius]);

  return (
    <g>
      {/* Radius ring */}
      <circle cx={sCenter.x} cy={sCenter.y} r={rScreen}
        fill="none" stroke="#000" strokeWidth={3} strokeOpacity={0.6} />
      <circle cx={sCenter.x} cy={sCenter.y} r={rScreen}
        fill="none" stroke="var(--color-accent)" strokeWidth={1.5} strokeDasharray="4 3" />

      {/* Line from center to edge */}
      <line x1={sCenter.x} y1={sCenter.y} x2={sEdge.x} y2={sEdge.y}
        stroke="var(--color-accent)" strokeWidth={1} strokeDasharray="3 2" />

      {/* Center handle */}
      <Handle
        x={sCenter.x} y={sCenter.y}
        color={gradient.stops[0]?.color ?? '#fff'}
        onMouseDown={(e) => startDrag('center', e)}
      />

      {/* Edge handle */}
      <Handle
        x={sEdge.x} y={sEdge.y}
        color={gradient.stops[gradient.stops.length - 1]?.color ?? '#000'}
        onMouseDown={(e) => startDrag('edge', e)}
        small
      />
    </g>
  );
};

/** ─── HANDLE COMPONENT ────────────────────────────────────── */

interface HandleProps {
  x: number; y: number;
  color: string;
  onMouseDown: (e: React.MouseEvent) => void;
  small?: boolean;
}

const Handle: React.FC<HandleProps> = ({ x, y, color, onMouseDown, small }) => {
  const size = small ? 8 : 10;
  return (
    <g style={{ pointerEvents: 'all', cursor: 'grab' }} onMouseDown={onMouseDown}>
      {/* Shadow */}
      <circle cx={x} cy={y} r={size + 2} fill="rgba(0,0,0,0.5)" />
      {/* White ring */}
      <circle cx={x} cy={y} r={size} fill="#fff" stroke="var(--color-accent)" strokeWidth={2} />
      {/* Color dot */}
      <circle cx={x} cy={y} r={size - 3} fill={color} />
    </g>
  );
};

/** Utility: viewport panel's screen offset (needed because gradient tool works globally) */
function getViewportOffsetX(): number {
  const canvas = document.querySelector<HTMLCanvasElement>('canvas');
  if (!canvas) return 0;
  return canvas.getBoundingClientRect().left;
}
function getViewportOffsetY(): number {
  const canvas = document.querySelector<HTMLCanvasElement>('canvas');
  if (!canvas) return 0;
  return canvas.getBoundingClientRect().top;
}