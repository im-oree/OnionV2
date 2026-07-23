import React, { useCallback, useRef, useEffect, useState } from 'react';
import type { Layer, LayerSegment } from '../../../types/layer';
import { getSegments } from '../../../types/layer';
import type { Keyframe } from '../../../types/keyframe';
import { useKeyframeStore } from '../../../state/keyframeStore';
import { useCompositionStore } from '../../../state/compositionStore';
import { useLayerBarDrag, useSegmentDrag } from './useLayerBarDrag';
import { useSelectionStore } from '../../../state/selectionStore';
import { useKeyframeDrag } from './useKeyframeDrag';
import { useStaggerDrag } from './useStaggerDrag';
import { useTimelineExpanded } from './useTimelineExpanded';
import { useContextMenu } from '../../common/useContextMenu';
import { ContextMenu } from '../../common/ContextMenu';
import { buildKeyframeContextMenu } from './keyframeContextMenu';
import { LAYER_COLORS } from './layerColors';
import { AudioWaveform } from './AudioWaveform';
import { VolumeAutomationTrack } from './VolumeAutomationTrack';

const CAMERA_ID = '__camera__';

interface Props {
  layers: Layer[];
  currentFrame: number;
  zoom: number;
  totalFrames: number;
  compId: string;
}

const LAYER_ROW_H = 32;
const PROP_ROW_H = 26;

// ── Frame grid + composition boundary background ────────────────
// Renders vertical guide lines dropping through the tracks area from
// every labeled frame in the ruler. Also darkens the out-of-comp region
// and draws a bright accent line at the composition end.
function niceStep(zoom: number, targetPx: number): number {
  const rawFrames = targetPx / zoom;
  const steps = [
    1, 2, 5, 10, 15, 20, 25, 30, 50, 60, 100,
    150, 200, 250, 500, 1000, 2000, 5000, 10000,
  ];
  for (const s of steps) if (s >= rawFrames) return s;
  return steps[steps.length - 1];
}

const FrameGridBackground: React.FC<{
  zoom: number;
  totalFrames: number;
  contentHeight: number;
}> = ({ zoom, totalFrames, contentHeight }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  // Track container width so we can render enough grid lines
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      setWidth(entries[0]?.contentRect.width ?? 0);
    });
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Match device pixel ratio for crisp lines
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.floor(width));
    const h = Math.max(1, Math.floor(contentHeight));
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    // Compute step matching ruler's labels
    const labelStep = niceStep(zoom, 60);
    const minorStep = Math.max(1, Math.round(labelStep / 5));

    const compEndPx = totalFrames * zoom;

    // Minor tick lines — very subtle
    ctx.strokeStyle = 'rgba(255,255,255,0.025)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const firstMinor = 0;
    const lastMinor = Math.ceil(w / zoom);
    for (let f = firstMinor; f <= lastMinor; f += minorStep) {
      if (f % labelStep === 0) continue; // skip — will draw as major
      const x = Math.floor(f * zoom) + 0.5;
      if (x < 0 || x > w) continue;
      const isPastComp = f > totalFrames;
      ctx.globalAlpha = isPastComp ? 0.4 : 1;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Major (labeled) tick lines — more visible
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let f = firstMinor; f <= lastMinor; f += labelStep) {
      const x = Math.floor(f * zoom) + 0.5;
      if (x < 0 || x > w) continue;
      const isPastComp = f > totalFrames;
      ctx.globalAlpha = isPastComp ? 0.4 : 1;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }, [zoom, totalFrames, width, contentHeight]);

  return (
    <div
      ref={wrapRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', position: 'absolute', top: 0, left: 0 }}
      />
      {/* Out-of-composition darken overlay */}
      <div
        className="absolute top-0 bottom-0 pointer-events-none"
        style={{
          left: totalFrames * zoom,
          right: 0,
          background: 'rgba(0,0,0,0.5)',
        }}
      />
      {/* Composition END border — red/orange (matches ruler END marker) */}
      <div
        className="absolute top-0 bottom-0 pointer-events-none"
        style={{
          left: totalFrames * zoom - 1,
          width: 3,
          background: '#ff5c5c',
          boxShadow: '0 0 6px rgba(255,92,92,0.5)',
          opacity: 0.85,
        }}
      />
    </div>
  );
};

export const KeyframeArea: React.FC<Props> = React.memo(({ layers, zoom, totalFrames, compId }) => {
  const revision = useKeyframeStore(s => s.revision);
  const engine = useKeyframeStore(s => s.engine);
  const expandedSet = useTimelineExpanded(s => s.expanded);
  const fps = useCompositionStore(s => {
    const c = s.compositions.find(cc => cc.id === compId);
    return c?.fps ?? 30;
  });
  void revision;

  const kfDrag = useKeyframeDrag(zoom, totalFrames);
  const ctx = useContextMenu();
  const sortedLayers = [...layers].sort((a, b) => b.zIndex - a.zIndex);
  const boxRef = useRef<HTMLDivElement>(null);
  const staggerDrag = useStaggerDrag({ containerRef: boxRef, compId, zoom });
  const boxSelectState = useRef<{ startX: number; startY: number } | null>(null);
  const [contentHeight, setContentHeight] = useState(0);

  // Track total content height so the frame grid canvas matches
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      setContentHeight(entries[0]?.contentRect.height ?? 0);
    });
    ro.observe(el);
    setContentHeight(el.clientHeight);
    return () => ro.disconnect();
  }, [layers, expandedSet]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const t = e.target as HTMLElement;
    if (t.closest('[data-ctx-menu]')) return;
    if (t.closest('[data-kf-diamond]') || t.closest('[data-layer-bar]')) return;
    if (!e.shiftKey && !e.ctrlKey && !e.metaKey) useKeyframeStore.getState().clearKeyframeSelection();
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    boxSelectState.current = { startX: e.clientX, startY: e.clientY };

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;pointer-events:none;border:1px dashed var(--color-accent);background:rgba(88,101,255,0.10);z-index:9999;border-radius:3px';
    document.body.appendChild(overlay);

    const onMove = (ev: MouseEvent) => {
      const s = boxSelectState.current; if (!s) return;
      const x1 = Math.min(s.startX, ev.clientX), y1 = Math.min(s.startY, ev.clientY);
      const x2 = Math.max(s.startX, ev.clientX), y2 = Math.max(s.startY, ev.clientY);
      overlay.style.left = `${x1}px`; overlay.style.top = `${y1}px`;
      overlay.style.width = `${x2 - x1}px`; overlay.style.height = `${y2 - y1}px`;
      const diamonds = boxRef.current?.querySelectorAll<HTMLElement>('[data-kf-diamond]') ?? [];
      const newSel = new Set<string>();
      const store = useKeyframeStore.getState();
      if (ev.shiftKey || ev.ctrlKey || ev.metaKey) for (const id of store.selectedKeyframeIds) newSel.add(id);
      for (const d of diamonds) {
        const r = d.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        if (cx >= x1 && cx <= x2 && cy >= y1 && cy <= y2) {
          const id = d.getAttribute('data-kf-id'); if (id) newSel.add(id);
        }
      }
      useKeyframeStore.setState({ selectedKeyframeIds: newSel });
    };
    const onUp = () => {
      boxSelectState.current = null; overlay.remove();
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    const diamond = t.closest('[data-kf-diamond]');
    if (!diamond) return;
    const id = diamond.getAttribute('data-kf-id');
    if (id && !useKeyframeStore.getState().selectedKeyframeIds.has(id))
      useKeyframeStore.getState().selectKeyframe(id, false);
    e.preventDefault(); e.stopPropagation();
    ctx.open(e, buildKeyframeContextMenu());
  }, [ctx]);

  // Listen for segment context menu events dispatched from SegmentPill
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      ctx.open(
        { clientX: detail.clientX, clientY: detail.clientY } as any,
        detail.items,
      );
    };
    document.addEventListener('segment:contextmenu', handler);
    return () => document.removeEventListener('segment:contextmenu', handler);
  }, [ctx]);

  const workArea = useCompositionStore(s => {
    const c = s.compositions.find(c => c.id === compId);
    if (!c) return null;
    if (!c.workAreaEnabled) return null; // hidden when disabled
    return {
      start: c.workAreaStart != null ? Math.floor(c.workAreaStart * (c.fps ?? 30)) : undefined,
      end: c.workAreaEnd != null ? Math.floor(c.workAreaEnd * (c.fps ?? 30)) : undefined,
    };
  });

  return (
    <div
      ref={boxRef}
      data-timeline-tracks="1"
      className="relative"
      onMouseDown={onMouseDown}
      onContextMenu={onContextMenu}
      style={{ minHeight: '100%' }}
    >
      {/* ── Frame grid + comp end (behind everything) ── */}
      <FrameGridBackground
        zoom={zoom}
        totalFrames={totalFrames}
        contentHeight={Math.max(contentHeight, 200)}
      />

      {/* Stagger drag HUD chip */}
      {staggerDrag.hud.visible && (
        <div className="fixed z-50 pointer-events-none px-2 py-1 rounded text-xs font-mono"
          style={{
            left: staggerDrag.hud.x + 16,
            top: staggerDrag.hud.y - 12,
            background: 'rgba(0,0,0,0.8)',
            color: '#fff',
            border: '1px solid var(--color-accent)',
          }}>
          {staggerDrag.hud.target === 'keyframes' ? 'Keyframes' : 'Layers'}: {'±'}{Math.abs(staggerDrag.hud.step)}f ×{staggerDrag.hud.count}
        </div>
      )}

      {/* Work area shading (overlays grid but under content) */}
      {compId && workArea && workArea.start !== undefined && workArea.end !== undefined && (
        <>
          {workArea.start > 0 && (
            <div className="absolute top-0 bottom-0 pointer-events-none"
              style={{ left: 0, width: workArea.start * zoom, background: 'rgba(0,0,0,0.2)', zIndex: 1 }} />
          )}
          <div className="absolute top-0 bottom-0 pointer-events-none"
            style={{ left: workArea.start * zoom, width: (workArea.end - workArea.start) * zoom, background: 'rgba(255,255,255,0.015)', zIndex: 1 }} />
          {workArea.end < totalFrames && (
            <div className="absolute top-0 bottom-0 pointer-events-none"
              style={{ left: workArea.end * zoom, width: (totalFrames - workArea.end) * zoom, background: 'rgba(0,0,0,0.2)', zIndex: 1 }} />
          )}
        </>
      )}

      {/* Camera pseudo-track keyframes */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <CameraKeyframeTrack zoom={zoom} kfDrag={kfDrag} />

        {sortedLayers.map((layer, li) => {
          const expanded = expandedSet.has(layer.id);
          const allKfs = engine.getAllKeyframesForLayer(layer.id);
          const props = engine.getAllAnimatedProperties(layer.id);
          const isAudio = layer.type === 'audio';
          const volumeKeyframes = isAudio ? allKfs.filter(k => k.property === 'volume') : [];
          return (
            <div key={layer.id}>
              <LayerTrackBar layer={layer} zoom={zoom} compId={compId}
                totalFrames={totalFrames} fps={fps} summaryKfs={allKfs} colorIdx={li} />
              {expanded && isAudio && (
                <VolumeAutomationTrack
                  layerId={layer.id}
                  keyframes={volumeKeyframes}
                  zoom={zoom}
                  colorIdx={li}
                />
              )}
              {expanded && props.filter(p => p !== 'volume').map(propPath => {
                const propKfs = allKfs.filter(k => k.property === propPath);
                return <PropertyKeyframeTrack key={propPath} keyframes={propKfs}
                  zoom={zoom} onKfDown={kfDrag.onDown} />;
              })}
            </div>
          );
        })}
      </div>

      {ctx.menu && <ContextMenu items={ctx.menu.items} position={ctx.menu.position} onClose={ctx.close} />}
    </div>
  );
}, (prev, next) => {
  return prev.layers === next.layers &&
         prev.zoom === next.zoom &&
         prev.totalFrames === next.totalFrames &&
         prev.compId === next.compId;
  // currentFrame intentionally omitted — playhead is drawn by TimelinePanel
});

const LayerTrackBar: React.FC<{
  layer: Layer; zoom: number; compId: string; totalFrames: number; fps: number;
  summaryKfs: Keyframe[]; colorIdx: number;
}> = ({ layer, zoom, compId, totalFrames, fps, summaryKfs, colorIdx }) => {
  const palette = LAYER_COLORS[colorIdx % LAYER_COLORS.length];
  const uniqueFrames = Array.from(new Set(summaryKfs.map(k => k.time))).sort((a, b) => a - b);
  const segments = getSegments(layer);
  const isMultiSegment = segments.length > 1;

  return (
    <div
      className="relative"
      style={{
        height: LAYER_ROW_H,
        borderBottom: '1px solid var(--color-divider)',
      }}
    >
      {segments.map((seg, segIdx) => (
        <SegmentPill
          key={seg.id}
          layer={layer}
          segment={seg}
          segmentIndex={segIdx}
          totalSegments={segments.length}
          zoom={zoom}
          compId={compId}
          totalFrames={totalFrames}
          fps={fps}
          palette={palette}
          uniqueFrames={uniqueFrames}
          isMultiSegment={isMultiSegment}
        />
      ))}

      {/* Cut indicators — small vertical marks between adjacent segments */}
      {isMultiSegment && segments.map((seg, idx) => {
        if (idx === segments.length - 1) return null;
        const next = segments[idx + 1];
        const gap = next.startFrame - seg.endFrame;
        if (gap > 5) return null;
        const x = seg.endFrame * zoom;
        return (
          <div
            key={`cut_${seg.id}`}
            className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              left: x - 1,
              width: 2,
              height: 26,
              background: 'rgba(255,255,255,0.4)',
              borderRadius: 1,
              boxShadow: '0 0 3px rgba(0,0,0,0.5)',
              zIndex: 3,
            }}
          />
        );
      })}
    </div>
  );
};

// ── Individual segment pill ─────────────────────────────────────

const SegmentPill: React.FC<{
  layer: Layer;
  segment: LayerSegment;
  segmentIndex: number;
  totalSegments: number;
  zoom: number;
  compId: string;
  totalFrames: number;
  fps: number;
  palette: typeof LAYER_COLORS[number];
  uniqueFrames: number[];
  isMultiSegment: boolean;
}> = ({
  layer, segment, segmentIndex, totalSegments,
  zoom, compId, totalFrames, fps, palette, uniqueFrames, isMultiSegment,
}) => {
  // For multi-segment layers, drag each segment independently.
  // For single-segment layers, use the legacy whole-layer drag.
  const segmentDrag = useSegmentDrag(layer, segment.id, compId, zoom, totalFrames);
  const layerDrag = useLayerBarDrag(layer, compId, zoom, totalFrames);
  const { onMouseDown } = isMultiSegment ? segmentDrag : layerDrag;

  const left = segment.startFrame * zoom;
  const width = Math.max(8, (segment.endFrame - segment.startFrame) * zoom);
  const duration = segment.endFrame - segment.startFrame;

  const handleTrimStart = useCallback((e: React.MouseEvent) => {
    if (e.altKey) return onMouseDown('slip')(e);
    if (e.shiftKey) return onMouseDown('roll')(e);
    if (e.ctrlKey || e.metaKey) return onMouseDown('rippleStart')(e);
    return onMouseDown('trimStart')(e);
  }, [onMouseDown]);

  const handleTrimEnd = useCallback((e: React.MouseEvent) => {
    if (e.altKey) return onMouseDown('slip')(e);
    if (e.shiftKey) return onMouseDown('roll')(e);
    if (e.ctrlKey || e.metaKey) return onMouseDown('rippleEnd')(e);
    return onMouseDown('trimEnd')(e);
  }, [onMouseDown]);

  const handleMove = useCallback((e: React.MouseEvent) => {
    if (e.altKey) return onMouseDown('slip')(e);
    return onMouseDown('move')(e);
  }, [onMouseDown]);

  const isFirst = segmentIndex === 0;
  const isLast = segmentIndex === totalSegments - 1;

  // Segment selection
  const isSelected = useSelectionStore(s => s.isSegmentSelected(layer.id, segment.id));

  const handleClick = useCallback((e: React.MouseEvent) => {
    const sel = useSelectionStore.getState();
    if (e.ctrlKey || e.metaKey) {
      sel.toggleSegmentSelection(layer.id, segment.id);
    } else {
      sel.selectSegment(layer.id, segment.id, false);
    }
  }, [layer.id, segment.id]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const sel = useSelectionStore.getState();
    if (!sel.isSegmentSelected(layer.id, segment.id)) {
      sel.selectSegment(layer.id, segment.id, false);
    }
    import('./segmentContextMenu').then(m => {
      const items = m.buildSegmentContextMenu(layer.id, segment.id);
      document.dispatchEvent(new CustomEvent('segment:contextmenu', {
        detail: { clientX: e.clientX, clientY: e.clientY, items },
      }));
    });
  }, [layer.id, segment.id]);

  const segmentBrightness = isMultiSegment
    ? (segmentIndex % 2 === 0 ? 1 : 0.85)
    : 1;

  const borderLeftRadius = isFirst ? 11 : 4;
  const borderRightRadius = isLast ? 11 : 4;

  return (
    <div
      data-layer-bar="1"
      data-segment-id={segment.id}
      className="absolute top-1/2 -translate-y-1/2 layer-bar-pill"
      style={{
        left, width, height: 22,
        cursor: 'grab',
        borderTopLeftRadius: borderLeftRadius,
        borderBottomLeftRadius: borderLeftRadius,
        borderTopRightRadius: borderRightRadius,
        borderBottomRightRadius: borderRightRadius,
        background: `linear-gradient(135deg, ${palette.from}, ${palette.to})`,
        filter: `brightness(${segmentBrightness})`,
        outline: isSelected ? '2px solid var(--color-accent, #5865ff)' : 'none',
        outlineOffset: isSelected ? '1px' : 0,
        boxShadow: isSelected
          ? '0 0 12px rgba(88,101,255,0.55), 0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.12)'
          : '0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.12)',
        transition: 'filter 120ms ease, outline 120ms ease',
      }}
      onMouseDown={(e) => { handleClick(e); handleMove(e); }}
      onContextMenu={handleContextMenu}
      title={
        isMultiSegment
          ? `${layer.name} — segment ${segmentIndex + 1}/${totalSegments}\n` +
            `Frames: ${segment.startFrame}–${segment.endFrame} (${duration}f)\n` +
            `Source offset: ${segment.sourceOffset}f\n` +
            `Drag: move | Alt: slip | Ctrl: ripple | Shift: roll`
          : `${layer.name}: ${segment.startFrame}–${segment.endFrame} (${duration}f)\n` +
            `Drag: move | Alt: slip | Ctrl: ripple | Shift: roll`
      }
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-[8px]"
        style={{
          cursor: 'ew-resize',
          borderTopLeftRadius: borderLeftRadius,
          borderBottomLeftRadius: borderLeftRadius,
        }}
        onMouseDown={handleTrimStart}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-[8px]"
        style={{
          cursor: 'ew-resize',
          borderTopRightRadius: borderRightRadius,
          borderBottomRightRadius: borderRightRadius,
        }}
        onMouseDown={handleTrimEnd}
      />

      {/* Audio waveform — each segment shows its own slice of the source */}
      {(layer.type === 'audio' || layer.type === 'video') &&
        (layer.data as any)?.assetId && (() => {
          const sourceDurationSec = (layer.data as any)?.duration ?? 0;
          if (sourceDurationSec <= 0) return null;
          const totalSourceFrames = sourceDurationSec * fps;
          const segLenFrames = segment.endFrame - segment.startFrame;
          const sourceStart = totalSourceFrames > 0 ? segment.sourceOffset / totalSourceFrames : 0;
          const sourceEnd = totalSourceFrames > 0 ? (segment.sourceOffset + segLenFrames) / totalSourceFrames : 1;
          return (
            <AudioWaveform
              assetId={(layer.data as any).assetId}
              width={width}
              height={22}
              color={palette.accent}
              sourceStart={Math.max(0, Math.min(1, sourceStart))}
              sourceEnd={Math.max(0, Math.min(1, sourceEnd))}
            />
          );
        })()
      }

      {/* Layer name label — shown on every segment (with segment badge for multi) */}
      {width > 30 && (
        <div className="absolute inset-0 flex items-center px-3 pointer-events-none overflow-hidden gap-1.5">
          {isMultiSegment && (
            <span
              style={{
                flexShrink: 0,
                fontSize: 8,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.55)',
                background: 'rgba(0,0,0,0.35)',
                padding: '1px 4px',
                borderRadius: 3,
                letterSpacing: '0.05em',
              }}
            >
              {segmentIndex + 1}
            </span>
          )}
          <span
            className="truncate select-none"
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.92)',
              letterSpacing: '0.02em',
              textShadow: '0 1px 2px rgba(0,0,0,0.4)',
              minWidth: 0,
            }}
          >
            {layer.name}
          </span>
        </div>
      )}

      {/* Keyframe diamonds — only inside this segment's frame range */}
      {uniqueFrames.map(f => {
        if (f < segment.startFrame || f > segment.endFrame) return null;
        const x = (f - segment.startFrame) * zoom;
        if (x < 4 || x > width - 4) return null;
        return (
          <svg
            key={f}
            width="7" height="7"
            className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: x - 3 }}
          >
            <polygon points="3.5,0 7,3.5 3.5,7 0,3.5" fill="rgba(255,255,255,0.7)" />
          </svg>
        );
      })}
    </div>
  );
};

const CameraKeyframeTrack: React.FC<{
  zoom: number;
  kfDrag: { onDown: (id: string, time: number) => (e: React.MouseEvent) => void };
}> = ({ zoom, kfDrag }) => {
  const revision = useKeyframeStore(s => s.revision);
  const engine = useKeyframeStore(s => s.engine);
  void revision;

  const camProps = engine.getAllAnimatedProperties(CAMERA_ID);
  if (camProps.length === 0) return null;

  const allKfs = engine.getAllKeyframesForLayer(CAMERA_ID);
  if (allKfs.length === 0) return null;

  return (
    <div>
      <div className="relative" style={{ height: LAYER_ROW_H, borderBottom: '1px solid var(--color-divider)' }}>
        <div
          className="absolute top-1/2 -translate-y-1/2"
          style={{
            left: 0, right: 0, height: 22,
            borderRadius: 11,
            background: 'linear-gradient(135deg, #4a9eff, #2d7ad6)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', paddingLeft: 12,
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.92)', letterSpacing: '0.02em' }}>
            🎬 Camera
          </span>
          {Array.from(new Set(allKfs.map(k => k.time))).sort((a, b) => a - b).map(f => {
            const x = f * zoom;
            return (
              <svg key={f} width="7" height="7" className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ left: x - 3 }}>
                <polygon points="3.5,0 7,3.5 3.5,7 0,3.5" fill="rgba(255,255,255,0.7)" />
              </svg>
            );
          })}
        </div>
      </div>
      {camProps.map(propPath => {
        const propKfs = allKfs.filter(k => k.property === propPath);
        return <PropertyKeyframeTrack key={propPath} keyframes={propKfs}
          zoom={zoom} onKfDown={kfDrag.onDown} />;
      })}
    </div>
  );
};

const PropertyKeyframeTrack: React.FC<{
  keyframes: Keyframe[]; zoom: number;
  onKfDown: (id: string, time: number) => (e: React.MouseEvent) => void;
}> = ({ keyframes, zoom, onKfDown }) => (
  <div className="relative" style={{ height: PROP_ROW_H, borderBottom: '1px solid var(--color-divider)', background: 'rgba(0,0,0,0.08)' }}>
    {keyframes.map(kf => <KeyframeDiamond key={kf.id} kf={kf} zoom={zoom} onMouseDown={onKfDown(kf.id, kf.time)} />)}
  </div>
);

const KeyframeDiamond: React.FC<{
  kf: Keyframe; zoom: number; onMouseDown: (e: React.MouseEvent) => void;
}> = ({ kf, zoom, onMouseDown }) => {
  const isSelected = useKeyframeStore(s => s.selectedKeyframeIds.has(kf.id));
  const size = 10;
  const x = kf.time * zoom;
  let fill = '#5865ff';
  if (kf.interpolation === 'hold') fill = '#e04040';
  else if (kf.interpolation === 'bezier') fill = '#4bd0e8';
  if (isSelected) fill = '#ffffff';
  const stroke = isSelected ? '#5865ff' : 'rgba(0,0,0,0.5)';
  const strokeW = isSelected ? 2 : 0.8;

  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.shiftKey || e.ctrlKey || e.metaKey) useKeyframeStore.getState().toggleKeyframeSelection(kf.id);
    else useKeyframeStore.getState().selectKeyframe(kf.id, false);
  };

  return (
    <svg
      width={size + 6} height={size + 6}
      data-kf-diamond="1" data-kf-id={kf.id}
      className="absolute top-1/2 -translate-y-1/2 z-10 hover:scale-[1.3] transition-transform"
      style={{ left: x - size / 2 - 3, cursor: 'ew-resize' }}
      onMouseDown={(e) => { onMouseDown(e); onClick(e); }}
    >
      {isSelected && (
        <circle cx={size / 2 + 3} cy={size / 2 + 3} r={size / 2 + 4}
          fill="var(--color-accent)" opacity={0.18} />
      )}
      {kf.interpolation === 'hold' ? (
        <rect x={3} y={3} width={size} height={size} fill={fill} rx={2}
          stroke={stroke} strokeWidth={strokeW} />
      ) : kf.interpolation === 'bezier' ? (
        <circle cx={size / 2 + 3} cy={size / 2 + 3} r={size / 2}
          fill={fill} stroke={stroke} strokeWidth={strokeW} />
      ) : (
        <polygon
          points={`${size / 2 + 3},3 ${size + 3},${size / 2 + 3} ${size / 2 + 3},${size + 3} 3,${size / 2 + 3}`}
          fill={fill} stroke={stroke} strokeWidth={strokeW} />
      )}
    </svg>
  );
};