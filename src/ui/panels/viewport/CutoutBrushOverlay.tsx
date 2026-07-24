/**
 * CutoutBrushOverlay — viewport overlay that captures brush strokes for
 * manual cutout mask correction.
 *
 * Active when the Cutout tab's Manual sub-tab is open + a brush mode is
 * selected. Draws a soft ring cursor at the mouse position and, on drag,
 * appends new points to the current stroke.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSelectionStore } from '../../../state/selectionStore';
import { useCompositionStore } from '../../../state/compositionStore';
import { useCutoutBrushStore } from '../properties/cutout/cutoutBrushStore';
import type { CameraManager } from '../../../renderer/CameraManager';
import type { CutoutManualStroke, CutoutData, Layer } from '../../../types/layer';
import { defaultCutoutData } from '../../../types/layer';

interface Props {
  cameraManager: CameraManager | null;
  viewportSize: { width: number; height: number };
}

function genStrokeId(): string {
  return `mstroke_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

/** Convert screen pixel to normalized 0..1 layer-local coords */
function screenToLayerLocal(
  screenX: number,
  screenY: number,
  layer: Layer,
  cameraManager: CameraManager,
): { x: number; y: number } | null {
  const world = cameraManager.screenToWorld(screenX, screenY);
  const t = layer.transform;
  const sx = t.scale.x / 100;
  const sy = t.scale.y / 100;
  const rad = -(t.rotation || 0) * (Math.PI / 180);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  // World → local (before scale)
  const dx = world.x - t.position.x;
  const dy = world.y - t.position.y;
  const lx = (dx * cos - dy * sin) / sx;
  const ly = (dx * sin + dy * cos) / sy;
  // Get layer's natural size
  const d: any = layer.data;
  const w = d?.naturalWidth ?? 1920;
  const h = d?.naturalHeight ?? 1080;
  if (!w || !h) return null;
  // Layer origin is at (0,0) — corners at (-w/2,-h/2) .. (w/2,h/2)
  const u = (lx + w / 2) / w;
  const v = (ly + h / 2) / h;
  // Reject clicks outside the layer bounds
  if (u < -0.05 || u > 1.05 || v < -0.05 || v > 1.05) return null;
  return { x: Math.max(0, Math.min(1, u)), y: Math.max(0, Math.min(1, v)) };
}

export const CutoutBrushOverlay: React.FC<Props> = ({ cameraManager, viewportSize }) => {
  const brush = useCutoutBrushStore();
  const active = brush.active && brush.tool !== 'none';
  const selectedIds = useSelectionStore(s =>
    s.selected.filter(x => x.type === 'layer').map(x => x.id),
  );

  const comp = useCompositionStore(s =>
    s.activeCompositionId
      ? s.compositions.find(c => c.id === s.activeCompositionId) ?? null
      : null,
  );

  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const strokeRef = useRef<{
    layerId: string;
    strokeId: string;
    keep: boolean;
    size: number;
    points: { x: number; y: number }[];
  } | null>(null);

  const targetLayer = React.useMemo(() => {
    if (selectedIds.length !== 1 || !comp) return null;
    const l = comp.layers.find(x => x.id === selectedIds[0]);
    if (!l) return null;
    if (!['video', 'image'].includes(l.type)) return null;
    return l;
  }, [selectedIds, comp]);

  // Convert screen size to layer-local point-radius for cursor display
  const cursorRadiusPx = brush.size * (cameraManager?.zoom ?? 1) / 2;

  const beginStroke = useCallback((e: React.MouseEvent) => {
    if (!active || !targetLayer || !cameraManager) return;
    e.preventDefault();
    e.stopPropagation();

    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const local = screenToLayerLocal(
      e.clientX - rect.left, e.clientY - rect.top, targetLayer, cameraManager,
    );
    if (!local) return;

    strokeRef.current = {
      layerId: targetLayer.id,
      strokeId: genStrokeId(),
      keep: brush.tool === 'keep',
      size: brush.size,
      points: [local],
    };
  }, [active, targetLayer, cameraManager, brush.tool, brush.size]);

  useEffect(() => {
    if (!active) return;

    const onMove = (ev: MouseEvent) => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const withinCanvas =
        ev.clientX >= rect.left && ev.clientX <= rect.right &&
        ev.clientY >= rect.top && ev.clientY <= rect.bottom;
      if (withinCanvas) {
        setCursor({ x: ev.clientX - rect.left, y: ev.clientY - rect.top });
      } else {
        setCursor(null);
      }

      const s = strokeRef.current;
      if (!s || !targetLayer || !cameraManager) return;
      const local = screenToLayerLocal(
        ev.clientX - rect.left, ev.clientY - rect.top, targetLayer, cameraManager,
      );
      if (!local) return;
      // Only add if moved a reasonable amount (in pixel terms)
      const last = s.points[s.points.length - 1];
      const distNorm = Math.hypot(local.x - last.x, local.y - last.y);
      const naturalDim = Math.max(1,
        Math.max(((targetLayer.data as any)?.naturalWidth ?? 1),
                 ((targetLayer.data as any)?.naturalHeight ?? 1)));
      const distPx = distNorm * naturalDim;
      if (distPx > 2) s.points.push(local);
    };

    const onUp = () => {
      const s = strokeRef.current;
      if (!s) return;
      if (s.points.length >= 1) {
        // Commit the stroke into the layer's cutout data
        const cs = useCompositionStore.getState();
        const c = cs.activeCompositionId
          ? cs.compositions.find(x => x.id === cs.activeCompositionId)
          : null;
        if (c) {
          const layer = c.layers.find(l => l.id === s.layerId);
          if (layer) {
            const layerData: any = layer.data ?? {};
            const currentCutout: CutoutData = layerData.cutout ?? defaultCutoutData();
            const newStroke: CutoutManualStroke = {
              id: s.strokeId,
              keep: s.keep,
              points: s.points,
              size: s.size,
            };
            // Auto-enable "correct" mode when the first stroke lands
            const nextMode = currentCutout.manualMode === 'ai'
              ? 'correct'
              : currentCutout.manualMode;
            const newCutout: CutoutData = {
              ...currentCutout,
              manualStrokes: [...(currentCutout.manualStrokes ?? []), newStroke],
              manualMode: nextMode,
            };
            cs.updateLayer(c.id, s.layerId, {
              data: { ...layerData, cutout: newCutout },
            });
            // Ask renderer to redraw
            const renderer: any = (window as any).__renderer;
            renderer?.renderLoop?.requestRender?.();
          }
        }
      }
      strokeRef.current = null;
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [active, targetLayer, cameraManager]);

  // Nothing to render if brush is inactive OR no eligible layer selected
  if (!active || !targetLayer) return null;

  const cursorColor = brush.tool === 'erase' ? '#ef5b5b' : '#4ade80';
  const showHint = !cursor;

  return (
    <svg
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'all',
        zIndex: 60,
        cursor: 'crosshair',
      }}
      width={viewportSize.width}
      height={viewportSize.height}
      onMouseDown={beginStroke}
    >
      {/* Fullscreen catcher so mousedown always fires */}
      <rect
        x={0} y={0}
        width={viewportSize.width}
        height={viewportSize.height}
        fill="transparent"
      />

      {cursor && (
        <>
          <circle
            cx={cursor.x} cy={cursor.y}
            r={cursorRadiusPx}
            fill="none"
            stroke={cursorColor}
            strokeWidth={1.5}
            opacity={0.8}
          />
          <circle
            cx={cursor.x} cy={cursor.y}
            r={2}
            fill={cursorColor}
          />
          <text
            x={cursor.x + cursorRadiusPx + 8}
            y={cursor.y + 4}
            fill={cursorColor}
            fontSize={10}
            fontFamily="var(--font-family-mono)"
            style={{ pointerEvents: 'none' }}
          >
            {brush.tool === 'keep' ? '+ keep' : '− erase'}
          </text>
        </>
      )}

      {showHint && (
        <text
          x={viewportSize.width / 2}
          y={40}
          textAnchor="middle"
          fill="rgba(255,255,255,0.7)"
          fontSize={12}
          fontFamily="system-ui, sans-serif"
        >
          Move the mouse over the layer to paint corrections
        </text>
      )}
    </svg>
  );
};

export default CutoutBrushOverlay;