/**
 * MaskOverlay — draws mask outlines with transform (position + rotation)
 * and interactive handles for the selected mask in the Properties panel.
 *
 * Handles:
 *  - 4 corner handles → resize (respects linkSize)
 *  - 4 edge handles → resize single axis
 *  - Rotation handle above the mask → rotate
 *  - Body drag → move (updates positionX/Y)
 *
 * Brush mode: click+drag paints strokes into the active brush mask.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useMaskStore } from '../../../state/maskStore';
import { useSelectionStore } from '../../../state/selectionStore';
import { useCompositionStore } from '../../../state/compositionStore';
import type { VectorMask, BrushStroke } from '../../../types/mask';
import { useCameraSubscribe } from './hooks/useCameraSubscribe';
import type { CameraManager } from '../../../renderer/CameraManager';
import type { PathCommand } from '../../../types/layer';

interface Props {
  cameraManager: CameraManager | null;
  viewportSize: { width: number; height: number };
}

type HandleId =
  | 'move'
  | 'rotate'
  | 'tl' | 'tr' | 'br' | 'bl'
  | 'top' | 'right' | 'bottom' | 'left';

// ── Helpers ─────────────────────────────────────────────────

function genStrokeId(): string {
  return `stroke_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
}

/** Apply mask transform (position + rotation) to a local point → returns layer-space point */
function applyMaskTransform(
  localX: number, localY: number, mask: VectorMask,
): { x: number; y: number } {
  const rad = (mask.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: mask.positionX + localX * cos - localY * sin,
    y: mask.positionY + localX * sin + localY * cos,
  };
}

/** Inverse — layer-space point → mask-local point */
function inverseMaskTransform(
  worldX: number, worldY: number, mask: VectorMask,
): { x: number; y: number } {
  const rad = -(mask.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = worldX - mask.positionX;
  const dy = worldY - mask.positionY;
  return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
}

// ── Main component ──────────────────────────────────────────

export const MaskOverlay: React.FC<Props> = ({ cameraManager, viewportSize }) => {
  const [, forceUpdate] = useState(0);
  useCameraSubscribe(cameraManager, () => forceUpdate(n => n + 1));

  const selectedIds = useSelectionStore(s =>
    s.selected.filter(x => x.type === 'layer').map(x => x.id),
  );
  const comp = useCompositionStore(s =>
    s.activeCompositionId
      ? s.compositions.find(c => c.id === s.activeCompositionId) ?? null
      : null,
  );

  // Subscribe to store so we re-render on mask changes
  const masksRevision = useMaskStore(s => s.revision);
  void masksRevision;
  const maskStore = useMaskStore();
  const selectedMaskId = useMaskStore(s => s.selectedMaskId);
  const brushMode = useMaskStore(s => (s as any).brushMode as 'paint'|'erase' | undefined) ?? 'paint';

  // Track drag state via ref (avoids stale closures)
  const dragRef = useRef<null | {
    handle: HandleId;
    startMouse: { x: number; y: number };
    startMask: {
      positionX: number; positionY: number;
      sizeW: number; sizeH: number; rotation: number;
    };
    layerId: string;
    maskId: string;
  }>(null);

  // Brush stroke in progress
  const strokeRef = useRef<null | {
    layerId: string;
    maskId: string;
    points: { x: number; y: number }[];
    size: number;
    erase: boolean;
  }>(null);

  const [_, setStrokePreview] = useState<{ x: number; y: number }[] | null>(null);

  // ── Handle mouse events for gizmo drag ──────────────────────

  const handleMouseDown = useCallback((
    e: React.MouseEvent, handle: HandleId, layerId: string, maskId: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const mask = maskStore.getMasksForLayer(layerId).find(m => m.id === maskId);
    if (!mask) return;

    dragRef.current = {
      handle,
      startMouse: { x: e.clientX, y: e.clientY },
      startMask: {
        positionX: mask.positionX,
        positionY: mask.positionY,
        sizeW: mask.sizeW,
        sizeH: mask.sizeH,
        rotation: mask.rotation,
      },
      layerId,
      maskId,
    };
    maskStore.selectMask(maskId);
  }, [maskStore]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d || !cameraManager) return;
      const dxPx = e.clientX - d.startMouse.x;
      const dyPx = e.clientY - d.startMouse.y;

      const zoom = cameraManager.zoom || 1;
      const dxWorld = dxPx / zoom;
      const dyWorld = dyPx / zoom;

      const mask = maskStore.getMasksForLayer(d.layerId).find(m => m.id === d.maskId);
      if (!mask) return;

      switch (d.handle) {
        case 'move': {
          maskStore.updateMask(d.layerId, d.maskId, {
            positionX: d.startMask.positionX + dxWorld,
            positionY: d.startMask.positionY + dyWorld,
          });
          break;
        }
        case 'rotate': {
          const cs = useCompositionStore.getState();
          const c = cs.compositions.find(cc => cc.id === cs.activeCompositionId);
          const layer = c?.layers.find(l => l.id === d.layerId);
          if (!layer) return;
          // Rotation handle: compute angle from mask center to mouse
          const cx = layer.transform.position.x + d.startMask.positionX;
          const cy = layer.transform.position.y + d.startMask.positionY;
          const canvas = document.querySelector('canvas');
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
          const mouseWorld = cameraManager.screenToWorld(
            e.clientX - rect.left, e.clientY - rect.top,
          );
          const startWorld = cameraManager.screenToWorld(
            d.startMouse.x - rect.left, d.startMouse.y - rect.top,
          );
          const startAngle = Math.atan2(startWorld.y - cy, startWorld.x - cx);
          const curAngle = Math.atan2(mouseWorld.y - cy, mouseWorld.x - cx);
          let deltaDeg = ((curAngle - startAngle) * 180) / Math.PI;
          const newRot = d.startMask.rotation + deltaDeg;
          maskStore.updateMask(d.layerId, d.maskId, { rotation: newRot });
          break;
        }
        default: {
          // Resize handles — rotate the mouse delta into mask-local space
          const rad = -(d.startMask.rotation * Math.PI) / 180;
          const cos = Math.cos(rad), sin = Math.sin(rad);
          const localDx = dxWorld * cos - dyWorld * sin;
          const localDy = dxWorld * sin + dyWorld * cos;

          let newW = d.startMask.sizeW;
          let newH = d.startMask.sizeH;
          let dPosX = 0;
          let dPosY = 0;

          // For each handle, adjust size + position so opposite edge stays put
          switch (d.handle) {
            case 'right':
              newW = Math.max(4, d.startMask.sizeW + localDx * 2);
              break;
            case 'left':
              newW = Math.max(4, d.startMask.sizeW - localDx * 2);
              break;
            case 'top':
              newH = Math.max(4, d.startMask.sizeH - localDy * 2);
              break;
            case 'bottom':
              newH = Math.max(4, d.startMask.sizeH + localDy * 2);
              break;
            case 'tl':
              newW = Math.max(4, d.startMask.sizeW - localDx * 2);
              newH = Math.max(4, d.startMask.sizeH - localDy * 2);
              break;
            case 'tr':
              newW = Math.max(4, d.startMask.sizeW + localDx * 2);
              newH = Math.max(4, d.startMask.sizeH - localDy * 2);
              break;
            case 'br':
              newW = Math.max(4, d.startMask.sizeW + localDx * 2);
              newH = Math.max(4, d.startMask.sizeH + localDy * 2);
              break;
            case 'bl':
              newW = Math.max(4, d.startMask.sizeW - localDx * 2);
              newH = Math.max(4, d.startMask.sizeH + localDy * 2);
              break;
          }

          // Respect link — keep aspect ratio when link is on
          if (mask.linkSize && (d.handle === 'tl' || d.handle === 'tr' ||
              d.handle === 'br' || d.handle === 'bl')) {
            const scale = Math.max(newW / d.startMask.sizeW, newH / d.startMask.sizeH);
            newW = d.startMask.sizeW * scale;
            newH = d.startMask.sizeH * scale;
          }

          maskStore.updateMask(d.layerId, d.maskId, {
            sizeW: Math.round(newW),
            sizeH: Math.round(newH),
            positionX: d.startMask.positionX + dPosX,
            positionY: d.startMask.positionY + dPosY,
          });
          break;
        }
      }
    };

    const onUp = () => {
      dragRef.current = null;
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [cameraManager, maskStore]);

  // ── Brush painting ──────────────────────────────────────────

  const startBrushStroke = useCallback((e: React.MouseEvent, mask: VectorMask, layerId: string) => {
    if (!cameraManager) return;
    e.preventDefault();
    e.stopPropagation();

    const cs = useCompositionStore.getState();
    const c = cs.compositions.find(cc => cc.id === cs.activeCompositionId);
    const layer = c?.layers.find(l => l.id === layerId);
    if (!layer) return;

    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const world = cameraManager.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    // Convert layer-world to mask-local
    const layerLocal = {
      x: (world.x - layer.transform.position.x) / (layer.transform.scale.x / 100),
      y: (world.y - layer.transform.position.y) / (layer.transform.scale.y / 100),
    };
    const maskLocal = inverseMaskTransform(layerLocal.x, layerLocal.y, mask);

    strokeRef.current = {
      layerId,
      maskId: mask.id,
      points: [maskLocal],
      size: mask.params.brushSize ?? 60,
      erase: brushMode === 'erase',
    };
    setStrokePreview([maskLocal]);
  }, [cameraManager, brushMode]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const s = strokeRef.current;
      if (!s || !cameraManager) return;
      const cs = useCompositionStore.getState();
      const c = cs.compositions.find(cc => cc.id === cs.activeCompositionId);
      const layer = c?.layers.find(l => l.id === s.layerId);
      const mask = maskStore.getMasksForLayer(s.layerId).find(m => m.id === s.maskId);
      if (!layer || !mask) return;
      const canvas = document.querySelector('canvas');
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const world = cameraManager.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
      const layerLocal = {
        x: (world.x - layer.transform.position.x) / (layer.transform.scale.x / 100),
        y: (world.y - layer.transform.position.y) / (layer.transform.scale.y / 100),
      };
      const maskLocal = inverseMaskTransform(layerLocal.x, layerLocal.y, mask);
      // Only sample every ~4 units to keep stroke smooth but light
      const last = s.points[s.points.length - 1];
      if (Math.hypot(maskLocal.x - last.x, maskLocal.y - last.y) > 3) {
        s.points.push(maskLocal);
        setStrokePreview([...s.points]);
      }
    };

    const onUp = () => {
      const s = strokeRef.current;
      if (!s) return;
      if (s.points.length >= 2) {
        const stroke: BrushStroke = {
          id: genStrokeId(),
          points: s.points,
          size: s.size,
          erase: s.erase,
        };
        maskStore.addBrushStroke(s.layerId, s.maskId, stroke);
      }
      strokeRef.current = null;
      setStrokePreview(null);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [cameraManager, maskStore]);

  // ── Early returns AFTER all hooks ──

  if (!cameraManager || selectedIds.length !== 1 || !comp) return null;

  const layerId = selectedIds[0];
  const isEnabled = maskStore.isMaskEnabled(layerId);
  if (!isEnabled) return null;

  const masks = maskStore.getMasksForLayer(layerId);
  if (masks.length === 0) return null;

  const layer = comp.layers.find(l => l.id === layerId);
  if (!layer) return null;

  const tx = layer.transform.position.x;
  const ty = layer.transform.position.y;
  const sx = layer.transform.scale.x / 100;
  const sy = layer.transform.scale.y / 100;

  const activeMask = masks.find(m => m.id === selectedMaskId);

  // Convert mask-local → layer-space → world-space → screen-space
  const toScreen = (mask: VectorMask, localX: number, localY: number) => {
    const t = applyMaskTransform(localX, localY, mask);
    const wx = tx + t.x * sx;
    const wy = ty + t.y * sy;
    return cameraManager.worldToScreen(wx, wy);
  };

  // Build SVG path d-string for a mask (using its commands + transform)
  const maskToSvgD = (mask: VectorMask): string => {
    let d = '';
    for (const cmd of mask.commands) {
      const pts = cmd.points;
      if (cmd.type === 'M') {
        const s = toScreen(mask, pts[0], pts[1]);
        d += `M${s.x},${s.y}`;
      } else if (cmd.type === 'L') {
        const s = toScreen(mask, pts[0], pts[1]);
        d += ` L${s.x},${s.y}`;
      } else if (cmd.type === 'C') {
        const c1 = toScreen(mask, pts[0], pts[1]);
        const c2 = toScreen(mask, pts[2], pts[3]);
        const e = toScreen(mask, pts[4], pts[5]);
        d += ` C${c1.x},${c1.y} ${c2.x},${c2.y} ${e.x},${e.y}`;
      } else if (cmd.type === 'Q') {
        const c = toScreen(mask, pts[0], pts[1]);
        const e = toScreen(mask, pts[2], pts[3]);
        d += ` Q${c.x},${c.y} ${e.x},${e.y}`;
      } else if (cmd.type === 'Z') {
        d += ' Z';
      }
    }
    return d;
  };

  // ── Compute handle positions for the active mask ──
  const handles: { id: HandleId; x: number; y: number }[] = [];
  let rotHandlePos: { x: number; y: number } | null = null;
  let bodyBox: { d: string } | null = null;

  if (activeMask && activeMask.shapeType !== 'brush' && activeMask.shapeType !== 'pen' && activeMask.shapeType !== 'path') {
    const hw = activeMask.sizeW / 2;
    const hh = activeMask.sizeH / 2;
    const cornerLocal: Array<{ id: HandleId; lx: number; ly: number }> = [
      { id: 'tl', lx: -hw, ly: -hh },
      { id: 'tr', lx:  hw, ly: -hh },
      { id: 'br', lx:  hw, ly:  hh },
      { id: 'bl', lx: -hw, ly:  hh },
      { id: 'top',    lx: 0,    ly: -hh },
      { id: 'right',  lx:  hw,  ly: 0 },
      { id: 'bottom', lx: 0,    ly:  hh },
      { id: 'left',   lx: -hw,  ly: 0 },
    ];
    for (const c of cornerLocal) {
      const s = toScreen(activeMask, c.lx, c.ly);
      handles.push({ id: c.id, x: s.x, y: s.y });
    }
    // Rotation handle: 30 px above the top center in local space
    const rotOffset = 30 / cameraManager.zoom;
    const rs = toScreen(activeMask, 0, -hh - rotOffset);
    rotHandlePos = { x: rs.x, y: rs.y };
    // Bounding rectangle for the body drag handle
    const tl = toScreen(activeMask, -hw, -hh);
    const tr = toScreen(activeMask,  hw, -hh);
    const br = toScreen(activeMask,  hw,  hh);
    const bl = toScreen(activeMask, -hw,  hh);
    bodyBox = {
      d: `M${tl.x},${tl.y} L${tr.x},${tr.y} L${br.x},${br.y} L${bl.x},${bl.y} Z`,
    };
  }

  // Brush stroke preview
  const strokePrev = strokeRef.current;
  const previewPoints = strokePrev
    ? strokePrev.points.map(p => {
        const s = toScreen(activeMask!, p.x, p.y);
        return `${s.x},${s.y}`;
      })
    : null;

  const isBrushActive = activeMask?.shapeType === 'brush';

  return (
    <svg
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 27,
      }}
      width={viewportSize.width}
      height={viewportSize.height}
    >
      {/* Non-active mask outlines */}
      {masks.filter(m => m.id !== selectedMaskId).map(mask => (
        <path
          key={mask.id}
          d={maskToSvgD(mask)}
          fill="rgba(255,255,255,0.03)"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth={1}
          strokeDasharray="4 3"
          style={{ pointerEvents: 'all', cursor: 'pointer' }}
          onMouseDown={(e) => { e.stopPropagation(); maskStore.selectMask(mask.id); }}
        />
      ))}

      {/* Active mask outline */}
      {activeMask && (
        <>
          <path
            d={maskToSvgD(activeMask)}
            fill={activeMask.mode === 'add' ? 'rgba(74,144,226,0.10)' : 'rgba(226,91,74,0.10)'}
            stroke={activeMask.color}
            strokeWidth={1.5}
            strokeDasharray={activeMask.inverted ? '5 3' : 'none'}
            style={{
              pointerEvents: isBrushActive ? 'none' : 'all',
              cursor: isBrushActive ? 'crosshair' : 'move',
            }}
            onMouseDown={(e) => {
              if (isBrushActive) startBrushStroke(e, activeMask, layerId);
              else handleMouseDown(e, 'move', layerId, activeMask.id);
            }}
          />

          {/* Bounding box body handle for shape masks (transparent, catches drags) */}
          {bodyBox && !isBrushActive && (
            <path
              d={bodyBox.d}
              fill="transparent"
              style={{ pointerEvents: 'all', cursor: 'move' }}
              onMouseDown={(e) => handleMouseDown(e, 'move', layerId, activeMask.id)}
            />
          )}

          {/* Rotation handle line + circle */}
          {rotHandlePos && bodyBox && !isBrushActive && (() => {
            const hw = activeMask.sizeW / 2;
            const hh = activeMask.sizeH / 2;
            const topCenter = toScreen(activeMask, 0, -hh);
            return (
              <>
                <line
                  x1={topCenter.x} y1={topCenter.y}
                  x2={rotHandlePos.x} y2={rotHandlePos.y}
                  stroke={activeMask.color}
                  strokeWidth={1}
                  opacity={0.7}
                />
                <circle
                  cx={rotHandlePos.x} cy={rotHandlePos.y}
                  r={7}
                  fill="white"
                  stroke={activeMask.color}
                  strokeWidth={1.5}
                  style={{ pointerEvents: 'all', cursor: 'grab' }}
                  onMouseDown={(e) => handleMouseDown(e, 'rotate', layerId, activeMask.id)}
                />
                <circle
                  cx={rotHandlePos.x} cy={rotHandlePos.y}
                  r={2.5}
                  fill={activeMask.color}
                  style={{ pointerEvents: 'none' }}
                />
              </>
            );
          })()}

          {/* Resize handles */}
          {!isBrushActive && handles.map(h => {
            const isCorner = ['tl', 'tr', 'br', 'bl'].includes(h.id);
            const cursor =
              h.id === 'tl' || h.id === 'br' ? 'nwse-resize' :
              h.id === 'tr' || h.id === 'bl' ? 'nesw-resize' :
              h.id === 'top' || h.id === 'bottom' ? 'ns-resize' : 'ew-resize';
            return (
              <rect
                key={h.id}
                x={h.x - 5} y={h.y - 5}
                width={10} height={10}
                fill="white"
                stroke={activeMask.color}
                strokeWidth={1.5}
                rx={isCorner ? 0 : 5}
                style={{ pointerEvents: 'all', cursor }}
                onMouseDown={(e) => handleMouseDown(e, h.id, layerId, activeMask.id)}
              />
            );
          })}

          {/* Brush mode: catch-all overlay for painting */}
          {isBrushActive && (
            <rect
              x={0} y={0}
              width={viewportSize.width} height={viewportSize.height}
              fill="transparent"
              style={{ pointerEvents: 'all', cursor: 'crosshair' }}
              onMouseDown={(e) => startBrushStroke(e, activeMask, layerId)}
            />
          )}

          {/* Brush stroke live preview */}
          {previewPoints && previewPoints.length > 1 && (
            <polyline
              points={previewPoints.join(' ')}
              fill="none"
              stroke={brushMode === 'erase' ? '#ff5b4a' : activeMask.color}
              strokeWidth={(activeMask.params.brushSize ?? 60) * cameraManager.zoom * sx}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.5}
              style={{ pointerEvents: 'none' }}
            />
          )}
        </>
      )}
    </svg>
  );
};

export default MaskOverlay;