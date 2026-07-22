import React, { useCallback, useRef } from 'react';
import type { Layer } from '../../../types/layer';
import type { Keyframe } from '../../../types/keyframe';
import { useKeyframeStore } from '../../../state/keyframeStore';
import { useCompositionStore } from '../../../state/compositionStore';
import { useLayerBarDrag } from './useLayerBarDrag';
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

export const KeyframeArea: React.FC<Props> = ({ layers, zoom, totalFrames, compId }) => {
  const revision = useKeyframeStore(s => s.revision);
  const engine = useKeyframeStore(s => s.engine);
  const expandedSet = useTimelineExpanded(s => s.expanded);
  void revision;

  const kfDrag = useKeyframeDrag(zoom, totalFrames);
  const ctx = useContextMenu();
  const sortedLayers = [...layers].sort((a, b) => b.zIndex - a.zIndex);
  const boxRef = useRef<HTMLDivElement>(null);
  const staggerDrag = useStaggerDrag({ containerRef: boxRef, compId, zoom });
  const boxSelectState = useRef<{ startX: number; startY: number } | null>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // skip right-clicks (handled by onContextMenu)
    const t = e.target as HTMLElement;
    if (t.closest('[data-ctx-menu]')) return; // don't interfere with context menu clicks
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

  const workArea = useCompositionStore(s => {
    const c = s.compositions.find(c => c.id === compId);
    if (!c) return null;
    return {
      start: c.workAreaStart != null ? Math.floor(c.workAreaStart * (c.fps ?? 30)) : undefined,
      end: c.workAreaEnd != null ? Math.floor(c.workAreaEnd * (c.fps ?? 30)) : undefined,
    };
  });

  return (
    <div ref={boxRef} data-timeline-tracks="1" className="relative" onMouseDown={onMouseDown} onContextMenu={onContextMenu}>
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
      {compId && workArea && workArea.start !== undefined && workArea.end !== undefined && (
        <>
          {workArea.start > 0 && (
            <div className="absolute top-0 bottom-0 pointer-events-none"
              style={{ left: 0, width: workArea.start * zoom, background: 'rgba(0,0,0,0.25)' }} />
          )}
          <div className="absolute top-0 bottom-0 pointer-events-none"
            style={{ left: workArea.start * zoom, width: (workArea.end - workArea.start) * zoom, background: 'rgba(255,255,255,0.02)' }} />
          {workArea.end < totalFrames && (
            <div className="absolute top-0 bottom-0 pointer-events-none"
              style={{ left: workArea.end * zoom, width: (totalFrames - workArea.end) * zoom, background: 'rgba(0,0,0,0.25)' }} />
          )}
        </>
      )}

      {/* Camera pseudo-track keyframes */}
      <CameraKeyframeTrack zoom={zoom} kfDrag={kfDrag} />

      {sortedLayers.map((layer, li) => {
        const expanded = expandedSet.has(layer.id);
        const allKfs = engine.getAllKeyframesForLayer(layer.id);
        const props = engine.getAllAnimatedProperties(layer.id);
        const isAudio = layer.type === 'audio';
        // For audio layers, always show volume track when expanded (even if no keyframes yet)
        const volumeKeyframes = isAudio ? allKfs.filter(k => k.property === 'volume') : [];
        return (
          <div key={layer.id}>
            <LayerTrackBar layer={layer} zoom={zoom} compId={compId}
              totalFrames={totalFrames} summaryKfs={allKfs} colorIdx={li} />
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
      {ctx.menu && <ContextMenu items={ctx.menu.items} position={ctx.menu.position} onClose={ctx.close} />}
    </div>
  );
};

const LayerTrackBar: React.FC<{
  layer: Layer; zoom: number; compId: string; totalFrames: number;
  summaryKfs: Keyframe[]; colorIdx: number;
}> = ({ layer, zoom, compId, totalFrames, summaryKfs, colorIdx }) => {
  const { onMouseDown } = useLayerBarDrag(layer, compId, zoom, totalFrames);
  const left = layer.startFrame * zoom;
  const width = Math.max(8, (layer.endFrame - layer.startFrame) * zoom);
  const uniqueFrames = Array.from(new Set(summaryKfs.map(k => k.time))).sort((a, b) => a - b);
  const palette = LAYER_COLORS[colorIdx % LAYER_COLORS.length];
  const duration = layer.endFrame - layer.startFrame;

  // Modifier-aware trim handlers: Ctrl=ripple, Shift=roll, Alt=slip
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

  return (
    <div className="relative" style={{ height: LAYER_ROW_H, borderBottom: '1px solid var(--color-divider)' }}>
      <div
        data-layer-bar="1"
        className="absolute top-1/2 -translate-y-1/2 layer-bar-pill"
        style={{
          left, width, height: 22,
          cursor: 'grab',
          borderRadius: 11,
          background: `linear-gradient(135deg, ${palette.from}, ${palette.to})`,
          boxShadow: `0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.12)`,
        }}
        onMouseDown={handleMove}
        title={`${layer.name}: ${layer.startFrame}–${layer.endFrame} (${duration}f)\nDrag: move | Alt+drag: slip | Ctrl+drag: ripple | Shift+drag: roll`}
      >
        <div className="absolute left-0 top-0 bottom-0 w-[8px] rounded-l-full"
          style={{ cursor: 'ew-resize' }} onMouseDown={handleTrimStart} />
        <div className="absolute right-0 top-0 bottom-0 w-[8px] rounded-r-full"
          style={{ cursor: 'ew-resize' }} onMouseDown={handleTrimEnd} />
        {layer.type === 'audio' && (layer.data as any)?.assetId && (
          <AudioWaveform
            assetId={(layer.data as any).assetId}
            width={width}
            height={22}
            color={palette.accent}
          />
        )}
        <div className="absolute inset-0 flex items-center px-3 pointer-events-none overflow-hidden">
          <span className="truncate select-none"
            style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.92)', letterSpacing: '0.02em', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
            {layer.name}
          </span>
        </div>
        {uniqueFrames.map(f => {
          const x = (f - layer.startFrame) * zoom;
          if (x < 4 || x > width - 4) return null;
          return (
            <svg key={f} width="7" height="7" className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: x - 3 }}>
              <polygon points="3.5,0 7,3.5 3.5,7 0,3.5" fill="rgba(255,255,255,0.7)" />
            </svg>
          );
        })}
      </div>
    </div>
  );
};

/** Camera pseudo-track — renders keyframe diamonds for __camera__ properties */
const CameraKeyframeTrack: React.FC<{
  zoom: number;
  kfDrag: { onDown: (id: string, time: number) => (e: React.MouseEvent) => void };
}> = ({ zoom, kfDrag }) => {
  const revision = useKeyframeStore(s => s.revision);
  const engine = useKeyframeStore(s => s.engine);
  void revision;

  const camProps = engine.getAllAnimatedProperties(CAMERA_ID);
  if (camProps.length === 0) return null;

  // Get all camera keyframes, sorted by time
  const allKfs = engine.getAllKeyframesForLayer(CAMERA_ID);
  if (allKfs.length === 0) return null;

  return (
    <div>
      {/* Summary bar */}
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
      {/* Per-property keyframe tracks */}
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