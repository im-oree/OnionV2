/**
 * AudioSceneMap — top-down 2D visualization of all spatial audio sources
 * in the composition. Listener sits at the center, sources are draggable
 * dots with range circles showing their audible falloff area.
 *
 * Dragging a source updates its spatialX/spatialY (Shift+drag = Z).
 * When auto-key is on, dragging creates position keyframes.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCompositionStore } from '../../../../state/compositionStore';
import { useSelectionStore } from '../../../../state/selectionStore';
import { useTimelineStore } from '../../../../state/timelineStore';
import { useKeyframeStore } from '../../../../state/keyframeStore';
import { animationClock } from '../../timeline/PlaybackControls';
import { debouncedCapture, flushDebouncedSnapshot } from '../../../../state/historyStore';
import type { Layer } from '../../../../types/layer';

interface SpatialSource {
  layerId: string;
  layerName: string;
  layerType: string;
  x: number;
  y: number;
  z: number;
  refDistance: number;
  maxDistance: number;
  isLinked: boolean;
  isSelected: boolean;
  enabled: boolean;
}

// ── Helpers ─────────────────────────────────────────────────

/** Auto-key a spatial position field when auto-key is on. */
function autoKeySpatial(
  layerId: string,
  field: 'positionX' | 'positionY' | 'positionZ',
  value: number,
): void {
  const autoKey = useTimelineStore.getState().autoKey;
  if (!autoKey) return;

  const path = `spatial.${field}`;
  const store = useKeyframeStore.getState();
  const engine = store.engine;

  // Compute layer-local frame
  const cs = useCompositionStore.getState();
  const comp = cs.activeCompositionId
    ? cs.compositions.find(c => c.id === cs.activeCompositionId)
    : null;
  if (!comp) return;
  const layer = comp.layers.find(l => l.id === layerId);
  if (!layer) return;
  const globalFrame = Math.round(animationClock.currentFrame);
  const localFrame = Math.max(0, globalFrame - layer.startFrame);

  if (!store.isPropertyAnimated(layerId, path)) {
    store.toggleAnimatedProperty(layerId, path);
  }
  const existing = engine.getKeyframesForProperty(layerId, path)
    .find(k => k.time === localFrame);
  if (existing) {
    store.updateKeyframe(existing.id, { value });
  } else {
    store.addKeyframe(layerId, {
      id: `kf_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      property: path,
      layerId,
      time: localFrame,
      value,
      interpolation: 'linear',
    });
  }
}

// ── Main component ─────────────────────────────────────────

export const AudioSceneMap: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showZ, setShowZ] = useState(false);

  // Track container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const r = entries[0]?.contentRect;
      if (r) setSize({ w: Math.floor(r.width), h: Math.floor(r.height) });
    });
    ro.observe(el);
    const r = el.getBoundingClientRect();
    setSize({ w: Math.floor(r.width), h: Math.floor(r.height) });
    return () => ro.disconnect();
  }, []);

  // Watch composition + keyframe revisions to redraw on animation
  const revision = useKeyframeStore(s => s.revision);
  void revision;

  const comp = useCompositionStore(s =>
    s.activeCompositionId
      ? s.compositions.find(c => c.id === s.activeCompositionId) ?? null
      : null,
  );

  const selectedIds = useSelectionStore(s =>
    s.selected.filter(x => x.type === 'layer').map(x => x.id),
  );

  // Collect all spatial sources across the comp
  const sources = useMemo<SpatialSource[]>(() => {
    if (!comp) return [];
    const list: SpatialSource[] = [];
    for (const layer of comp.layers) {
      if (layer.type !== 'audio' && layer.type !== 'video') continue;
      const d: any = layer.data;
      if (!d?.spatialEnabled) continue;

      // Resolve position — either directly or from linked layer
      let x = d.spatialX ?? 0;
      let y = d.spatialY ?? 0;
      let z = d.spatialZ ?? 0;
      const linkedId = d.spatialLinkedLayerId ?? null;
      if (linkedId) {
        const linked = comp.layers.find(l => l.id === linkedId);
        if (linked) {
          const t3d = (linked as any).transform3D;
          x = t3d ? t3d.position.x : linked.transform.position.x;
          y = t3d ? t3d.position.y : linked.transform.position.y;
          z = t3d ? t3d.position.z : 0;
        }
      }

      list.push({
        layerId: layer.id,
        layerName: layer.name,
        layerType: layer.type,
        x, y, z,
        refDistance: d.spatialRefDistance ?? 200,
        maxDistance: d.spatialMaxDistance ?? 2000,
        isLinked: !!linkedId,
        isSelected: selectedIds.includes(layer.id),
        enabled: true,
      });
    }
    return list;
  }, [comp, selectedIds]);

  // ── Coordinate math: world (comp) space → screen (SVG) space ──

  const viewBounds = useMemo(() => {
    if (!comp) return { minX: -960, maxX: 960, minY: -540, maxY: 540 };
    // Show ~2× comp bounds so sources can live outside frame
    const hx = comp.width;
    const hy = comp.height;
    return { minX: -hx, maxX: hx, minY: -hy, maxY: hy };
  }, [comp]);

  const worldToScreen = useCallback((wx: number, wy: number) => {
    const w = size.w || 1;
    const h = size.h || 1;
    const rangeX = viewBounds.maxX - viewBounds.minX;
    const rangeY = viewBounds.maxY - viewBounds.minY;
    // Fit to smallest dimension so map is square-ish
    const scale = Math.min(w / rangeX, h / rangeY);
    const cx = w / 2;
    const cy = h / 2;
    return {
      x: cx + wx * scale,
      y: cy + wy * scale,   // Y grows downward on screen = grows downward in world
      scale,
    };
  }, [size, viewBounds]);

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const w = size.w || 1;
    const h = size.h || 1;
    const rangeX = viewBounds.maxX - viewBounds.minX;
    const rangeY = viewBounds.maxY - viewBounds.minY;
    const scale = Math.min(w / rangeX, h / rangeY);
    const cx = w / 2;
    const cy = h / 2;
    return {
      x: (sx - cx) / scale,
      y: (sy - cy) / scale,
      scale,
    };
  }, [size, viewBounds]);

  // ── Drag handler ─────────────────────────────────────────

  const dragRef = useRef<null | {
    layerId: string;
    startClient: { x: number; y: number };
    startWorld: { x: number; y: number; z: number };
    isLinked: boolean;
    zMode: boolean;
  }>(null);

  const onDotMouseDown = useCallback((e: React.MouseEvent, src: SpatialSource) => {
    e.preventDefault();
    e.stopPropagation();

    // Select the layer
    useSelectionStore.getState().select({
      type: 'layer',
      id: src.layerId,
      compositionId: comp!.id,
    });

    // Don't allow dragging linked sources
    if (src.isLinked) return;

    dragRef.current = {
      layerId: src.layerId,
      startClient: { x: e.clientX, y: e.clientY },
      startWorld: { x: src.x, y: src.y, z: src.z },
      isLinked: src.isLinked,
      zMode: e.shiftKey,
    };
    debouncedCapture('Move Audio Source');
  }, [comp]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d || !comp) return;

      const dxPx = e.clientX - d.startClient.x;
      const dyPx = e.clientY - d.startClient.y;
      const scale = worldToScreen(0, 0).scale || 1;
      const dxWorld = dxPx / scale;
      const dyWorld = dyPx / scale;

      let newX = d.startWorld.x;
      let newY = d.startWorld.y;
      let newZ = d.startWorld.z;

      if (e.shiftKey || d.zMode) {
        // Shift-drag: modify Z instead of X (vertical drag = Z)
        newZ = d.startWorld.z + dyWorld;
        d.zMode = true;
      } else {
        newX = d.startWorld.x + dxWorld;
        newY = d.startWorld.y + dyWorld;
      }

      // Update the layer's data
      const cs = useCompositionStore.getState();
      const layer = cs.compositions.find(c => c.id === comp.id)?.layers.find(l => l.id === d.layerId);
      if (!layer) return;
      const newData = {
        ...(layer.data ?? {}),
        spatialX: newX,
        spatialY: newY,
        spatialZ: newZ,
      };
      cs.updateLayer(comp.id, d.layerId, { data: newData }, true);

      // Auto-key when enabled
      autoKeySpatial(d.layerId, 'positionX', newX);
      autoKeySpatial(d.layerId, 'positionY', newY);
      if (d.zMode) autoKeySpatial(d.layerId, 'positionZ', newZ);
    };

    const onUp = () => {
      if (dragRef.current) {
        flushDebouncedSnapshot();
        dragRef.current = null;
      }
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [comp, worldToScreen]);

  // ── Grid rendering ───────────────────────────────────────

  const gridLines = useMemo(() => {
    if (!comp) return null;
    const w = size.w;
    const h = size.h;
    if (w === 0 || h === 0) return null;

    const step = 200; // world units between grid lines
    const lines: React.ReactNode[] = [];
    const range = viewBounds.maxX - viewBounds.minX;
    const startX = Math.floor(viewBounds.minX / step) * step;
    const endX = Math.ceil(viewBounds.maxX / step) * step;
    const startY = Math.floor(viewBounds.minY / step) * step;
    const endY = Math.ceil(viewBounds.maxY / step) * step;

    for (let x = startX; x <= endX; x += step) {
      const s = worldToScreen(x, 0);
      lines.push(
        <line
          key={`vx${x}`}
          x1={s.x} y1={0} x2={s.x} y2={h}
          stroke={x === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.04)'}
          strokeWidth={x === 0 ? 1 : 0.5}
        />,
      );
    }
    for (let y = startY; y <= endY; y += step) {
      const s = worldToScreen(0, y);
      lines.push(
        <line
          key={`hy${y}`}
          x1={0} y1={s.y} x2={w} y2={s.y}
          stroke={y === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.04)'}
          strokeWidth={y === 0 ? 1 : 0.5}
        />,
      );
    }
    return lines;
  }, [comp, size, viewBounds, worldToScreen]);

  // ── Comp bounds rectangle ────────────────────────────────

  const compRect = useMemo(() => {
    if (!comp) return null;
    const tl = worldToScreen(-comp.width / 2, -comp.height / 2);
    const br = worldToScreen(comp.width / 2, comp.height / 2);
    return {
      x: tl.x, y: tl.y,
      w: br.x - tl.x, h: br.y - tl.y,
    };
  }, [comp, worldToScreen]);

  // ── Empty state ──────────────────────────────────────────

  if (!comp) {
    return (
      <div style={{
        padding: 20, textAlign: 'center', color: 'var(--color-text-disabled)',
        fontSize: 11, fontStyle: 'italic',
      }}>
        No composition
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <div style={{
        padding: 30, textAlign: 'center', color: 'var(--color-text-disabled)',
        fontSize: 11, lineHeight: 1.5,
      }}>
        <div style={{ fontSize: 22, marginBottom: 8, opacity: 0.5 }}>🔊</div>
        No spatial audio sources yet.
        <br />
        Select an audio or video layer, open the <b>Audio → Spatial</b> tab,
        and enable "3D Spatial Audio".
      </div>
    );
  }

  const listenerScreen = worldToScreen(0, 0);
  const listenerScale = listenerScreen.scale || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 10px',
        borderBottom: '1px solid var(--color-border)',
        fontSize: 10, color: 'var(--color-text-secondary)',
      }}>
        <span style={{ fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          Scene Map
        </span>
        <span style={{ color: 'var(--color-text-tertiary)' }}>
          · {sources.length} source{sources.length === 1 ? '' : 's'}
        </span>
        <div style={{ flex: 1 }} />
        <label style={{
          display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
          userSelect: 'none',
        }}>
          <input
            type="checkbox"
            checked={showZ}
            onChange={(e) => setShowZ(e.target.checked)}
          />
          Show Z
        </label>
        <span style={{
          color: 'var(--color-text-tertiary)', fontSize: 9,
          fontStyle: 'italic', marginLeft: 4,
        }}>
          Shift+drag = Z
        </span>
      </div>

      {/* Map SVG */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          background: '#0a0d14',
          position: 'relative',
          overflow: 'hidden',
          cursor: 'default',
        }}
      >
        {size.w > 0 && size.h > 0 && (
          <svg width={size.w} height={size.h}
            style={{ display: 'block', position: 'absolute', inset: 0 }}>

            {/* Grid */}
            <g>{gridLines}</g>

            {/* Comp bounds */}
            {compRect && (
              <rect
                x={compRect.x} y={compRect.y}
                width={compRect.w} height={compRect.h}
                fill="none"
                stroke="rgba(120,140,255,0.35)"
                strokeWidth={1}
                strokeDasharray="4 3"
              />
            )}

            {/* Range circles for each source (drawn first, behind dots) */}
            {sources.map(src => {
              const s = worldToScreen(src.x, src.y);
              const rRef = src.refDistance * listenerScale;
              const rMax = src.maxDistance * listenerScale;
              const color = src.isSelected ? '#4ade80' : '#4a90e2';
              return (
                <g key={`range_${src.layerId}`}>
                  <circle
                    cx={s.x} cy={s.y} r={rMax}
                    fill={`${color}08`}
                    stroke={`${color}30`}
                    strokeWidth={0.8}
                    strokeDasharray="2 4"
                    style={{ pointerEvents: 'none' }}
                  />
                  <circle
                    cx={s.x} cy={s.y} r={rRef}
                    fill={`${color}18`}
                    stroke={`${color}70`}
                    strokeWidth={1}
                    style={{ pointerEvents: 'none' }}
                  />
                </g>
              );
            })}

            {/* Listener icon (center) */}
            <g>
              <circle
                cx={listenerScreen.x} cy={listenerScreen.y}
                r={9}
                fill="rgba(255,220,120,0.15)"
                stroke="rgba(255,220,120,0.9)"
                strokeWidth={1.5}
              />
              <circle
                cx={listenerScreen.x} cy={listenerScreen.y}
                r={3}
                fill="rgba(255,220,120,1)"
              />
              <text
                x={listenerScreen.x}
                y={listenerScreen.y + 22}
                textAnchor="middle"
                fill="rgba(255,220,120,0.8)"
                fontSize={9}
                fontFamily="var(--font-family-mono)"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                LISTENER
              </text>
            </g>

            {/* Source dots */}
            {sources.map(src => {
              const s = worldToScreen(src.x, src.y);
              const color = src.isSelected ? '#4ade80' : '#4a90e2';
              const isHovered = hoveredId === src.layerId;
              const radius = isHovered ? 8 : 6;
              return (
                <g
                  key={src.layerId}
                  style={{
                    cursor: src.isLinked ? 'not-allowed' : 'grab',
                    pointerEvents: 'all',
                  }}
                  onMouseDown={(e) => onDotMouseDown(e, src)}
                  onMouseEnter={() => setHoveredId(src.layerId)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {/* Hover ring */}
                  {isHovered && (
                    <circle
                      cx={s.x} cy={s.y} r={radius + 4}
                      fill="none"
                      stroke={color}
                      strokeWidth={1}
                      opacity={0.5}
                    />
                  )}
                  {/* Dot */}
                  <circle
                    cx={s.x} cy={s.y} r={radius}
                    fill={color}
                    stroke={src.isSelected ? '#fff' : 'rgba(0,0,0,0.4)'}
                    strokeWidth={src.isSelected ? 1.5 : 1}
                  />
                  {/* Linked indicator */}
                  {src.isLinked && (
                    <text
                      x={s.x} y={s.y + 1}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="rgba(0,0,0,0.7)"
                      fontSize={7}
                      fontWeight="bold"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      L
                    </text>
                  )}
                  {/* Label */}
                  <text
                    x={s.x + radius + 6}
                    y={s.y + 3}
                    fill={src.isSelected ? '#fff' : 'rgba(220,230,255,0.7)'}
                    fontSize={9}
                    fontFamily="system-ui, sans-serif"
                    fontWeight={src.isSelected ? 600 : 400}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {src.layerName}
                  </text>
                  {/* Z indicator (small text below dot) */}
                  {showZ && Math.abs(src.z) > 1 && (
                    <text
                      x={s.x}
                      y={s.y - radius - 4}
                      textAnchor="middle"
                      fill="rgba(180,200,240,0.7)"
                      fontSize={8}
                      fontFamily="var(--font-family-mono)"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      Z:{Math.round(src.z)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}

        {/* Corner legend */}
        <div style={{
          position: 'absolute',
          bottom: 8, left: 8,
          fontSize: 9,
          fontFamily: 'var(--font-family-mono)',
          color: 'rgba(255,255,255,0.4)',
          lineHeight: 1.5,
          pointerEvents: 'none',
        }}>
          <div>Bounds: ±{Math.round(viewBounds.maxX)}, ±{Math.round(viewBounds.maxY)}</div>
          <div style={{ marginTop: 2 }}>Drag dot = X/Y · Shift+drag = Z</div>
        </div>
      </div>
    </div>
  );
};

export default AudioSceneMap;