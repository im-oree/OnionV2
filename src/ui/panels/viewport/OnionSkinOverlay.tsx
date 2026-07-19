import React, { useMemo } from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useSelectionStore } from '../../../state/selectionStore';
import { useKeyframeStore } from '../../../state/keyframeStore';
import { useOnionSkinStore } from '../../../state/onionSkinStore';
import { useCameraSubscribe } from './hooks/useCameraSubscribe';
import type { CameraManager } from '../../../renderer/CameraManager';
import type { Layer, ShapeData } from '../../../types/layer';

interface Props {
  cameraManager: CameraManager | null;
  viewportSize: { width: number; height: number };
}

interface Ghost {
  frame: number;
  layer: Layer;
  color: string;
  opacity: number;
}

function evaluateLayerAtFrame(layer: Layer, frame: number, engine: any): Layer {
  // Clone layer transform
  const clone: Layer = { ...layer, transform: { ...layer.transform } };
  const paths = engine.getAllAnimatedProperties(layer.id);
  for (const path of paths) {
    const result = engine.evaluate(layer.id, path, frame);
    const val = result.value;
    if (path === 'transform.position' && Array.isArray(val)) {
      clone.transform.position = { x: val[0], y: val[1] };
    } else if (path === 'transform.position.x' && typeof val === 'number') {
      clone.transform.position = { ...clone.transform.position, x: val };
    } else if (path === 'transform.position.y' && typeof val === 'number') {
      clone.transform.position = { ...clone.transform.position, y: val };
    } else if (path === 'transform.scale' && Array.isArray(val)) {
      clone.transform.scale = { x: val[0], y: val[1] };
    } else if (path === 'transform.rotation' && typeof val === 'number') {
      clone.transform.rotation = val;
    } else if (path === 'opacity' && typeof val === 'number') {
      clone.opacity = val;
    }
  }
  return clone;
}

function getShapeHalfSize(layer: Layer): { hw: number; hh: number } {
  const d = layer.data as ShapeData | undefined;
  let w = 100, h = 100;
  if (d) {
    if ('width' in d) { w = d.width; h = d.height; }
    else if ('radiusX' in d) { w = d.radiusX * 2; h = d.radiusY * 2; }
    else if ('radius' in d) { w = d.radius * 2; h = d.radius * 2; }
  }
  const sc = layer.transform.scale;
  return { hw: (w / 2) * (sc.x / 100), hh: (h / 2) * (sc.y / 100) };
}

export const OnionSkinOverlay: React.FC<Props> = ({ cameraManager, viewportSize }) => {
  const settings = useOnionSkinStore((s) => s.settings);
  const revision = useKeyframeStore((s) => s.revision);
  const [, forceUpdate] = React.useState(0);
  useCameraSubscribe(cameraManager, () => forceUpdate((n) => n + 1));
  void revision;

  const comp = useCompositionStore((s) => s.activeCompositionId
    ? s.compositions.find((c) => c.id === s.activeCompositionId) ?? null : null);
  const selectedIds = useSelectionStore((s) =>
    s.selected.filter((x) => x.type === 'layer').map((x) => x.id));
  const engine = useKeyframeStore((s) => s.engine);

  const ghosts = useMemo<Ghost[]>(() => {
    if (!settings.enabled || !comp || selectedIds.length === 0) return [];
    const currentFrame = Math.round(comp.currentTime * comp.fps);
    const result: Ghost[] = [];
    for (const layerId of selectedIds) {
      const layer = comp.layers.find((l) => l.id === layerId);
      if (!layer || layer.type !== 'shape') continue; // only shapes for now (SVG-friendly)
      // Past ghosts
      for (let i = 1; i <= settings.framesBefore; i++) {
        const f = currentFrame - i * settings.frameStep;
        if (f < 0) break;
        const fadeStep = 1 - (i - 1) / Math.max(1, settings.framesBefore);
        result.push({ frame: f, layer, color: settings.colorBefore, opacity: settings.opacity * fadeStep });
      }
      // Future ghosts
      for (let i = 1; i <= settings.framesAfter; i++) {
        const f = currentFrame + i * settings.frameStep;
        if (f > comp.duration * comp.fps) break;
        const fadeStep = 1 - (i - 1) / Math.max(1, settings.framesAfter);
        result.push({ frame: f, layer, color: settings.colorAfter, opacity: settings.opacity * fadeStep });
      }
    }
    return result;
  }, [settings, comp, selectedIds, revision]);

  if (!cameraManager || ghosts.length === 0 || viewportSize.width === 0) return null;

  return (
    <svg
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
        zIndex: 15,
      }}
      width={viewportSize.width} height={viewportSize.height}
    >
      {ghosts.map((g, i) => {
        const layerAtFrame = evaluateLayerAtFrame(g.layer, g.frame, engine);
        const { hw, hh } = getShapeHalfSize(layerAtFrame);
        const cx = layerAtFrame.transform.position.x;
        const cy = layerAtFrame.transform.position.y;
        const rot = layerAtFrame.transform.rotation;

        // Compute 4 corners in world space
        const rad = (rot * Math.PI) / 180;
        const cos = Math.cos(rad), sin = Math.sin(rad);
        const corners = [
          { x: -hw, y: -hh }, { x: hw, y: -hh }, { x: hw, y: hh }, { x: -hw, y: hh },
        ].map((p) => cameraManager.worldToScreen(
          cx + p.x * cos - p.y * sin,
          cy + p.x * sin + p.y * cos,
        ));

        const pts = corners.map((p) => `${p.x},${p.y}`).join(' ');
        return (
          <g key={`${g.layer.id}-${g.frame}-${i}`} opacity={g.opacity}>
            <polygon points={pts} fill="none" stroke={g.color} strokeWidth={1.5}
              strokeDasharray="4 3" />
            {/* Small dot at center for clarity */}
            {(() => {
              const c = cameraManager.worldToScreen(cx, cy);
              return <circle cx={c.x} cy={c.y} r={2} fill={g.color} />;
            })()}
          </g>
        );
      })}
    </svg>
  );
};