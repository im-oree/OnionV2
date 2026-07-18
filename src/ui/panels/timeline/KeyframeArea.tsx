import React, { useCallback, useRef } from 'react';
import type { Layer } from '../../../types/layer';
import type { Keyframe } from '../../../types/keyframe';
import { useKeyframeStore } from '../../../state/keyframeStore';
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

const LAYER_ROW_H = 24;
const PROP_ROW_H = 20;

export const KeyframeArea: React.FC<Props> = ({ layers, zoom, totalFrames, compId }) => {
  // Subscribe to revision so we re-render on any keyframe change
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
    if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
      useKeyframeStore.getState().clearKeyframeSelection();
    }
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    boxSelectState.current = { startX: e.clientX, startY: e.clientY };

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;pointer-events:none;border:1px dashed var(--color-accent);background:rgba(71,114,179,0.15);z-index:9999';
    document.body.appendChild(overlay);

    const onMove = (ev: MouseEvent) => {
      const s = boxSelectState.current; if (!s) return;
      const x1 = Math.min(s.startX, ev.clientX);
      const y1 = Math.min(s.startY, ev.clientY);
      const x2 = Math.max(s.startX, ev.clientX);
      const y2 = Math.max(s.startY, ev.clientY);
      overlay.style.left = `${x1}px`; overlay.style.top = `${y1}px`;
      overlay.style.width = `${x2 - x1}px`; overlay.style.height = `${y2 - y1}px`;

      const diamonds = boxRef.current?.querySelectorAll<HTMLElement>('[data-kf-diamond]') ?? [];
      const newSel = new Set<string>();
      const store = useKeyframeStore.getState();
      if (ev.shiftKey || ev.ctrlKey || ev.metaKey) {
        for (const id of store.selectedKeyframeIds) newSel.add(id);
      }
      for (const d of diamonds) {
        const r = d.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        if (cx >= x1 && cx <= x2 && cy >= y1 && cy <= y2) {
          const id = d.getAttribute('data-kf-id');
          if (id) newSel.add(id);
        }
      }
      useKeyframeStore.setState({ selectedKeyframeIds: newSel });
    };
    const onUp = () => {
      boxSelectState.current = null;
      overlay.remove();
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
    if (id && !useKeyframeStore.getState().selectedKeyframeIds.has(id)) {
      useKeyframeStore.getState().selectKeyframe(id, false);
    }
    e.preventDefault();
    e.stopPropagation();
    ctx.open(e, buildKeyframeContextMenu());
  }, [ctx]);

  return (
    <div
      ref={boxRef}
      data-timeline-tracks="1"
      className="relative"
      onMouseDown={onMouseDown}
      onContextMenu={onContextMenu}
    >
      {sortedLayers.map(layer => {
        const expanded = expandedSet.has(layer.id);
        const allKfs = engine.getAllKeyframesForLayer(layer.id);
        const props = engine.getAllAnimatedProperties(layer.id);
        return (
          <div key={layer.id}>
            <LayerTrackBar
              layer={layer} zoom={zoom} compId={compId}
              totalFrames={totalFrames} summaryKfs={allKfs}
            />
            {expanded && props.map(propPath => {
              const propKfs = allKfs.filter(k => k.property === propPath);
              return (
                <PropertyKeyframeTrack
                  key={propPath} keyframes={propKfs} zoom={zoom}
                  onKfDown={kfDrag.onDown}
                />
              );
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
    <div className="relative border-b border-border/20 hover:bg-panel-hover" style={{ height: LAYER_ROW_H }}>
      <div
        data-layer-bar="1"
        className="absolute top-1/2 -translate-y-1/2 h-[16px] rounded-sm bg-accent/50 border border-accent"
        style={{ left, width, cursor: 'grab' }}
        onMouseDown={onMouseDown('move')}
        title={`${layer.name}: ${layer.startFrame}–${layer.endFrame}`}
      >
        <div className="absolute left-0 top-0 bottom-0 w-[6px] bg-accent rounded-l-sm"
          style={{ cursor: 'ew-resize' }} onMouseDown={onMouseDown('trimStart')} />
        <div className="absolute right-0 top-0 bottom-0 w-[6px] bg-accent rounded-r-sm"
          style={{ cursor: 'ew-resize' }} onMouseDown={onMouseDown('trimEnd')} />
        <div className="absolute inset-0 flex items-center px-2 pointer-events-none">
          <span className="text-[9px] text-white/80 truncate select-none">{layer.name}</span>
        </div>
      </div>
      {uniqueFrames.map(f => (
        <SummaryDiamond key={f} time={f} zoom={zoom} />
      ))}
    </div>
  );
};

const SummaryDiamond: React.FC<{ time: number; zoom: number }> = ({ time, zoom }) => {
  const size = 5;
  return (
    <svg
      width={size + 2} height={size + 2}
      className="absolute top-1 pointer-events-none"
      style={{ left: time * zoom - size / 2 - 1 }}
    >
      <polygon
        points={`${size / 2 + 1},1 ${size + 1},${size / 2 + 1} ${size / 2 + 1},${size + 1} 1,${size / 2 + 1}`}
        fill="#e8b84b" opacity="0.75"
      />
    </svg>
  );
};

const PropertyKeyframeTrack: React.FC<{
  keyframes: Keyframe[];
  zoom: number;
  onKfDown: (id: string, time: number) => (e: React.MouseEvent) => void;
}> = ({ keyframes, zoom, onKfDown }) => (
  <div className="relative border-b border-border/10 bg-black/20" style={{ height: PROP_ROW_H }}>
    {keyframes.map(kf => (
      <KeyframeDiamond
        key={kf.id} kf={kf} zoom={zoom} onMouseDown={onKfDown(kf.id, kf.time)}
      />
    ))}
  </div>
);

const KeyframeDiamond: React.FC<{
  kf: Keyframe; zoom: number; onMouseDown: (e: React.MouseEvent) => void;
}> = ({ kf, zoom, onMouseDown }) => {
  const isSelected = useKeyframeStore(s => s.selectedKeyframeIds.has(kf.id));
  const size = 9;
  const x = kf.time * zoom;
  let fill = '#e8b84b';
  if (kf.interpolation === 'hold') fill = '#e04040';
  else if (kf.interpolation === 'bezier') fill = '#4bd0e8';
  if (isSelected) fill = '#ffffff';
  const stroke = isSelected ? '#ff8a00' : '#000';
  const strokeW = isSelected ? '1.5' : '0.5';

  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      useKeyframeStore.getState().toggleKeyframeSelection(kf.id);
    } else if (!isSelected) {
      useKeyframeStore.getState().selectKeyframe(kf.id, false);
    }
  };

  return (
    <svg
      width={size + 4} height={size + 4}
      data-kf-diamond="1"
      data-kf-id={kf.id}
      className="absolute top-1/2 -translate-y-1/2 z-10 hover:scale-125 transition-transform"
      style={{ left: x - size / 2 - 2, cursor: 'ew-resize' }}
      onMouseDown={(e) => { onMouseDown(e); onClick(e); }}
    >
      {kf.interpolation === 'hold' ? (
        <rect x={2} y={2} width={size} height={size} fill={fill} rx={1} stroke={stroke} strokeWidth={strokeW} />
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