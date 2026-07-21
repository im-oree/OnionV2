/**
 * PerspectiveOverlay — shows 4 draggable corner handles for the perspective tool.
 * Only visible when the 'perspective' tool is active and a layer is selected.
 */
import React, { useCallback, useRef } from 'react';
import { usePerspectiveStore, defaultCorners } from '../../../state/perspectiveStore';
import { useSelectionStore } from '../../../state/selectionStore';
import { useCompositionStore } from '../../../state/compositionStore';
import { useToolStore } from '../../../state/toolStore';
import type { CameraManager } from '../../../renderer/CameraManager';
import { useCameraSubscribe } from './hooks/useCameraSubscribe';

interface Props {
  cameraManager: CameraManager | null;
  viewportSize: { width: number; height: number };
}

type CornerKey = 'tl' | 'tr' | 'br' | 'bl';

export const PerspectiveOverlay: React.FC<Props> = ({ cameraManager, viewportSize }) => {
  const tool = useToolStore(s => s.activeTool);
  const [, forceUpdate] = React.useState(0);
  useCameraSubscribe(cameraManager, () => forceUpdate(n => n + 1));

  const selectedIds = useSelectionStore(s =>
    s.selected.filter(x => x.type === 'layer').map(x => x.id)
  );
  const comp = useCompositionStore(s =>
    s.activeCompositionId
      ? s.compositions.find(c => c.id === s.activeCompositionId) ?? null
      : null
  );

  const perspStore = usePerspectiveStore();
  const dragRef = useRef<{ corner: CornerKey; layerId: string } | null>(null);

  if (tool !== 'perspective' as any || !cameraManager || selectedIds.length !== 1 || !comp) {
    return null;
  }

  const layerId = selectedIds[0];
  const layer = comp.layers.find(l => l.id === layerId);
  if (!layer) return null;

  const corners = perspStore.getCorners(layerId);

  // Layer world size
  const d: any = layer.data;
  const layerW = d?.width ?? d?.radiusX ? d.radiusX * 2 : 200;
  const layerH = d?.height ?? d?.radiusY ? d.radiusY * 2 : 150;
  const tx = layer.transform.position.x;
  const ty = layer.transform.position.y;

  // Convert normalized corner (-0.5..0.5) to world, then to screen
  const cornerToScreen = (corner: { x: number; y: number }) => {
    const wx = tx + corner.x * layerW;
    const wy = ty + corner.y * layerH;
    return cameraManager.worldToScreen(wx, wy);
  };

  const screenCorners: Record<CornerKey, { x: number; y: number }> = {
    tl: cornerToScreen(corners.tl),
    tr: cornerToScreen(corners.tr),
    br: cornerToScreen(corners.br),
    bl: cornerToScreen(corners.bl),
  };

  const handleMouseDown = useCallback((corner: CornerKey, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { corner, layerId };

    const onMove = (ev: MouseEvent) => {
      const d = dragRef.current;
      if (!d || !cameraManager) return;
      const canvas = document.querySelector('canvas');
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const world = cameraManager.screenToWorld(ev.clientX - rect.left, ev.clientY - rect.top);
      // Convert world back to normalized
      const nx = (world.x - tx) / layerW;
      const ny = (world.y - ty) / layerH;
      usePerspectiveStore.getState().updateCorner(d.layerId, d.corner, nx, ny);
    };

    const onUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [cameraManager, layerId, tx, ty, layerW, layerH]);

  const CORNER_KEYS: CornerKey[] = ['tl', 'tr', 'br', 'bl'];
  const CORNER_LABELS: Record<CornerKey, string> = { tl: 'TL', tr: 'TR', br: 'BR', bl: 'BL' };

  // Draw quad outline
  const pts = [screenCorners.tl, screenCorners.tr, screenCorners.br, screenCorners.bl];
  const polyPts = pts.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <svg
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 27 }}
      width={viewportSize.width}
      height={viewportSize.height}
    >
      {/* Quad outline */}
      <polygon
        points={polyPts}
        fill="rgba(88,101,255,0.08)"
        stroke="var(--color-accent)"
        strokeWidth={1.5}
        strokeDasharray="5 3"
      />
      {/* Diagonals */}
      <line x1={screenCorners.tl.x} y1={screenCorners.tl.y} x2={screenCorners.br.x} y2={screenCorners.br.y}
        stroke="var(--color-accent)" strokeWidth={0.5} strokeDasharray="3 4" opacity={0.4} />
      <line x1={screenCorners.tr.x} y1={screenCorners.tr.y} x2={screenCorners.bl.x} y2={screenCorners.bl.y}
        stroke="var(--color-accent)" strokeWidth={0.5} strokeDasharray="3 4" opacity={0.4} />

      {/* Corner handles */}
      {CORNER_KEYS.map(key => {
        const s = screenCorners[key];
        return (
          <g key={key}>
            {/* Shadow */}
            <circle cx={s.x} cy={s.y} r={9} fill="rgba(0,0,0,0.4)" style={{ pointerEvents: 'none' }} />
            {/* Handle */}
            <circle
              cx={s.x} cy={s.y} r={7}
              fill="white"
              stroke="var(--color-accent)"
              strokeWidth={2}
              style={{ pointerEvents: 'all', cursor: 'move' }}
              onMouseDown={(e) => handleMouseDown(key, e)}
            />
            {/* Label */}
            <text
              x={s.x} y={s.y + 4}
              textAnchor="middle"
              fill="var(--color-accent)"
              fontSize={7}
              fontWeight="bold"
              style={{ pointerEvents: 'none' }}
            >
              {CORNER_LABELS[key]}
            </text>
          </g>
        );
      })}

      {/* Reset button */}
      <g
        style={{ pointerEvents: 'all', cursor: 'pointer' }}
        onClick={() => usePerspectiveStore.getState().resetCorners(layerId)}
      >
        <rect
          x={screenCorners.tl.x - 30}
          y={screenCorners.tl.y - 28}
          width={52} height={18}
          rx={4}
          fill="var(--color-panel-raised)"
          stroke="var(--color-border)"
          strokeWidth={1}
        />
        <text
          x={screenCorners.tl.x - 4}
          y={screenCorners.tl.y - 15}
          textAnchor="middle"
          fill="var(--color-text-secondary)"
          fontSize={9}
          style={{ pointerEvents: 'none' }}
        >
          Reset
        </text>
      </g>
    </svg>
  );
};