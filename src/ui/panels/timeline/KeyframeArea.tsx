import React, { useCallback, useRef } from 'react';
import type { Layer } from '../../../types/layer';
import type { Keyframe } from '../../../types/keyframe';
import { useKeyframeStore } from '../../../state/keyframeStore';
import { useCompositionStore } from '../../../state/compositionStore';
import { useLayerBarDrag } from './useLayerBarDrag';
import { useKeyframeDrag } from './useKeyframeDrag';
import { useTimelineExpanded } from './useTimelineExpanded';
import { useContextMenu } from '../../common/useContextMenu';
import { ContextMenu } from '../../common/ContextMenu';
import { buildKeyframeContextMenu } from './keyframeContextMenu';

interface Props {
  layers: Layer[];
  currentFrame: number;
  zoom: number;
  totalFrames: number;
  compId: string;
}

const LAYER_ROW_H = 30;
const PROP_ROW_H = 24;

export const KeyframeArea: React.FC<Props> = ({ layers, zoom, totalFrames, compId }) => {
  const revision = useKeyframeStore(s => s.revision);
  const engine = useKeyframeStore(s => s.engine);
  const expandedSet = useTimelineExpanded(s => s.expanded);
  void revision;

  const kfDrag = useKeyframeDrag(zoom, totalFrames);
  const ctx = useContextMenu();
  const sortedLayers = [...layers].sort((a, b) => b.zIndex - a.zIndex);
  const boxRef = useRef<HTMLDivElement>(null);
  const boxSelectState = useRef<{ startX: number; startY: number } | null>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const t = e.target as HTMLElement;
    if (t.closest('[data-kf-diamond]') || t.closest('[data-layer-bar]')) return;
    if (!e.shiftKey && !e.ctrlKey && !e.metaKey) useKeyframeStore.getState().clearKeyframeSelection();
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    boxSelectState.current = { startX: e.clientX, startY: e.clientY };

    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;pointer-events:none;border:1px dashed var(--color-accent);background:rgba(88,101,255,0.12);z-index:9999;border-radius:var(--radius-xs)`;
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
        if (cx >= x1 && cx <= x2 && cy >= y1 && cy <= y2) { const id = d.getAttribute('data-kf-id'); if (id) newSel.add(id); }
      }
      useKeyframeStore.setState({ selectedKeyframeIds: newSel });
    };
    const onUp = () => { boxSelectState.current = null; overlay.remove(); document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    const diamond = t.closest('[data-kf-diamond]');
    if (!diamond) return;
    const id = diamond.getAttribute('data-kf-id');
    if (id && !useKeyframeStore.getState().selectedKeyframeIds.has(id)) useKeyframeStore.getState().selectKeyframe(id, false);
    e.preventDefault(); e.stopPropagation();
    ctx.open(e, buildKeyframeContextMenu());
  }, [ctx]);

  // Work area bounds (from composition store, in frames)
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
      {/* Work area overlay */}
      {compId && workArea && (
        <>
          {workArea.start !== undefined && workArea.end !== undefined && (
            <>
              {workArea.start > 0 && (
                <div
                  className="absolute top-0 bottom-0 pointer-events-none"
                  style={{
                    left: 0,
                    width: workArea.start * zoom,
                    background: 'rgba(0,0,0,0.25)',
                  }}
                />
              )}

              <div
                className="absolute top-0 bottom-0 pointer-events-none"
                style={{
                  left: workArea.start * zoom,
                  width: (workArea.end - workArea.start) * zoom,
                  background: 'rgba(255,255,255,0.02)',
                }}
              />

              {workArea.end < totalFrames && (
                <div
                  className="absolute top-0 bottom-0 pointer-events-none"
                  style={{
                    left: workArea.end * zoom,
                    width: (totalFrames - workArea.end) * zoom,
                    background: 'rgba(0,0,0,0.25)',
                  }}
                />
              )}
            </>
          )}
        </>
      )}

      {sortedLayers.map(layer => {
        const expanded = expandedSet.has(layer.id);
        const allKfs = engine.getAllKeyframesForLayer(layer.id);
        const props = engine.getAllAnimatedProperties(layer.id);
        return (
          <div key={layer.id}>
            <LayerTrackBar layer={layer} zoom={zoom} compId={compId} totalFrames={totalFrames} summaryKfs={allKfs} />
            {expanded && props.map(propPath => {
              const propKfs = allKfs.filter(k => k.property === propPath);
              return <PropertyKeyframeTrack key={propPath} keyframes={propKfs} zoom={zoom} onKfDown={kfDrag.onDown} />;
            })}
          </div>
        );
      })}
      {ctx.menu && <ContextMenu items={ctx.menu.items} position={ctx.menu.position} onClose={ctx.close} />}
    </div>
  );
};

const LayerTrackBar: React.FC<{
  layer: Layer; zoom: number; compId: string; totalFrames: number; summaryKfs: Keyframe[];
}> = ({ layer, zoom, compId, totalFrames, summaryKfs }) => {
  const { onMouseDown } = useLayerBarDrag(layer, compId, zoom, totalFrames);
  const left = layer.startFrame * zoom;
  const width = Math.max(4, (layer.endFrame - layer.startFrame) * zoom);
  const uniqueFrames = Array.from(new Set(summaryKfs.map(k => k.time))).sort((a, b) => a - b);
  return (
    <div className="relative" style={{ height: LAYER_ROW_H, borderBottom: '1px solid var(--color-divider)' }}>
      <div
        data-layer-bar="1"
        className="absolute top-1/2 -translate-y-1/2"
        style={{
          left, width, height: 20,
          cursor: 'grab',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--color-accent-muted)',
          border: '1px solid var(--color-accent)',
        }}
        onMouseDown={onMouseDown('move')}
        title={`${layer.name}: ${layer.startFrame}–${layer.endFrame}`}
      >
        <div className="absolute left-0 top-0 bottom-0 w-[6px] rounded-l-md" style={{ cursor: 'ew-resize', background: 'var(--color-accent)' }} onMouseDown={onMouseDown('trimStart')} />
        <div className="absolute right-0 top-0 bottom-0 w-[6px] rounded-r-md" style={{ cursor: 'ew-resize', background: 'var(--color-accent)' }} onMouseDown={onMouseDown('trimEnd')} />
        <div className="absolute inset-0 flex items-center px-2 pointer-events-none">
          <span className="truncate select-none" style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>{layer.name}</span>
        </div>
      </div>
      {uniqueFrames.map(f => <SummaryDiamond key={f} time={f} zoom={zoom} />)}
    </div>
  );
};

const SummaryDiamond: React.FC<{ time: number; zoom: number }> = ({ time, zoom }) => (
  <svg width="8" height="8" className="absolute top-1 pointer-events-none" style={{ left: time * zoom - 3 }}>
    <polygon points="4,0 8,4 4,8 0,4" fill="var(--color-accent)" opacity="0.7" />
  </svg>
);

const PropertyKeyframeTrack: React.FC<{
  keyframes: Keyframe[]; zoom: number;
  onKfDown: (id: string, time: number) => (e: React.MouseEvent) => void;
}> = ({ keyframes, zoom, onKfDown }) => (
  <div className="relative" style={{ height: PROP_ROW_H, borderBottom: '1px solid var(--color-divider)', background: 'rgba(0,0,0,0.1)' }}>
    {keyframes.map(kf => <KeyframeDiamond key={kf.id} kf={kf} zoom={zoom} onMouseDown={onKfDown(kf.id, kf.time)} />)}
  </div>
);

const KeyframeDiamond: React.FC<{
  kf: Keyframe; zoom: number; onMouseDown: (e: React.MouseEvent) => void;
}> = ({ kf, zoom, onMouseDown }) => {
  const isSelected = useKeyframeStore(s => s.selectedKeyframeIds.has(kf.id));
  const size = 10;
  const x = kf.time * zoom;
  let fill = 'var(--color-accent)';
  if (kf.interpolation === 'hold') fill = '#e04040';
  else if (kf.interpolation === 'bezier') fill = '#4bd0e8';
  if (isSelected) fill = '#ffffff';
  const stroke = isSelected ? 'var(--color-accent)' : 'rgba(0,0,0,0.4)';
  const strokeW = isSelected ? '1.5' : '0.5';

  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.shiftKey || e.ctrlKey || e.metaKey) useKeyframeStore.getState().toggleKeyframeSelection(kf.id);
    else if (!isSelected) useKeyframeStore.getState().selectKeyframe(kf.id, false);
  };

  return (
    <svg
      width={size + 4} height={size + 4}
      data-kf-diamond="1" data-kf-id={kf.id}
      className="absolute top-1/2 -translate-y-1/2 z-10 hover:scale-125 transition-transform"
      style={{ left: x - size / 2 - 2, cursor: 'ew-resize' }}
      onMouseDown={(e) => { onMouseDown(e); onClick(e); }}
    >
      {kf.interpolation === 'hold' ? (
        <rect x={2} y={2} width={size} height={size} fill={fill} rx={2} stroke={stroke} strokeWidth={strokeW} />
      ) : kf.interpolation === 'bezier' ? (
        <circle cx={size / 2 + 2} cy={size / 2 + 2} r={size / 2} fill={fill} stroke={stroke} strokeWidth={strokeW} />
      ) : (
        <polygon
          points={`${size / 2 + 2},2 ${size + 2},${size / 2 + 2} ${size / 2 + 2},${size + 2} 2,${size / 2 + 2}`}
          fill={fill} stroke={stroke} strokeWidth={strokeW}
        />
      )}
    </svg>
  );
};