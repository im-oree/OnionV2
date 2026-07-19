import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useKeyframeStore } from '../../../state/keyframeStore';
import { useSelectionStore } from '../../../state/selectionStore';
import { EASING_PRESETS, type EasingPresetName } from '../../../animation/EasingPresets';
import { GraphToolbar } from './GraphToolbar';
import { GraphCurves, type FlatCurve } from './GraphCurves';
import { GraphGrid } from './GraphGrid';
import { GraphRuler } from './GraphRuler';
import { useGraphInteraction, type ViewState } from './useGraphInteraction';
import { useGraphModalTransform } from './useGraphModalTransform';

function curveColor(prop: string, dim: number, totalDims: number): string {
  if (totalDims > 1) {
    const rgb = ['#ff5c5c', '#7fd858', '#5b8fff', '#f0d060'];
    return rgb[dim] ?? '#c880ff';
  }
  const p = prop.toLowerCase();
  if (p.includes('opacity')) return '#f0d060';
  if (p.includes('rotation')) return '#5b8fff';
  if (p.includes('scale')) return '#7fd858';
  if (p.includes('position')) return '#ff5c5c';
  if (p.includes('color')) return '#ff6ba3';
  return '#ff7a5c';
}

function useContainerSize(ref: React.RefObject<HTMLDivElement | null>): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const { width: w, height: h } = el.getBoundingClientRect();
      setSize(s => (s.width === Math.round(w) && s.height === Math.round(h)) ? s : { width: Math.round(w), height: Math.round(h) });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return size;
}

export const GraphEditorPanel: React.FC = () => {
  const comp = useCompositionStore((s) => s.activeCompositionId
    ? s.compositions.find((c) => c.id === s.activeCompositionId) ?? null : null);
  const engine = useKeyframeStore((s) => s.engine);
  const revision = useKeyframeStore((s) => s.revision);
  const selectedLayerIds = useSelectionStore((s) =>
    s.selected.filter((x) => x.type === 'layer').map((x) => x.id));
  const selectedKfIds = useKeyframeStore((s) => s.selectedKeyframeIds);
  const currentFrame = comp ? Math.round(comp.currentTime * comp.fps) : 0;

  const [viewBox, setViewBox] = useState<ViewState>({ x: -5, y: -20, w: 100, h: 200 });
  const [propFilter, setPropFilter] = useState<Set<string>>(new Set());
  const [snapToFrame, setSnapToFrame] = useState(true);
  const [graphMode, setGraphMode] = useState<'value' | 'speed'>('value');
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useContainerSize(containerRef);
  void revision;

  if (!comp) {
    return <div className="flex h-full items-center justify-center"
      style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-disabled)' }}>
      No composition
    </div>;
  }

  const totalFrames = Math.floor(comp.duration * comp.fps);
  const layers = comp.layers.filter((l) =>
    selectedLayerIds.includes(l.id) || selectedLayerIds.length === 0);
  const animatedLayers = layers.filter((l) => engine.getAllAnimatedProperties(l.id).length > 0);

  const curves = useMemo<FlatCurve[]>(() => {
    const result: FlatCurve[] = [];
    for (const layer of animatedLayers) {
      const props = engine.getAllAnimatedProperties(layer.id);
      for (const prop of props) {
        const kfs = engine.getKeyframesForProperty(layer.id, prop);
        if (kfs.length === 0) continue;
        const first = kfs[0].value;
        const dims = Array.isArray(first) ? first.length : 1;
        const propKey = `${layer.id}::${prop}`;
        if (propFilter.size > 0 && !propFilter.has(propKey)) continue;
        const processKfs = graphMode === 'speed'
          ? computeVelocityKfs(kfs, comp.fps) : kfs;
        const suffixes = ['X', 'Y', 'Z', 'W'];
        if (dims === 1) {
          result.push({
            layerId: layer.id, property: prop, dimension: 0,
            keyframes: processKfs, color: curveColor(prop, 0, 1),
            label: `${layer.name}: ${prop}${graphMode === 'speed' ? ' (speed)' : ''}`,
          });
        } else {
          for (let d = 0; d < dims; d++) {
            result.push({
              layerId: layer.id, property: prop, dimension: d,
              keyframes: processKfs, color: curveColor(prop, d, dims),
              label: `${layer.name}: ${prop}.${suffixes[d] ?? d}`,
            });
          }
        }
      }
    }
    return result;
  }, [animatedLayers, engine, propFilter, revision, graphMode, comp.fps]);

  const propOptions = useMemo(() => {
    const opts: { key: string; label: string }[] = [];
    for (const layer of animatedLayers)
      for (const prop of engine.getAllAnimatedProperties(layer.id))
        opts.push({ key: `${layer.id}::${prop}`, label: `${layer.name}: ${prop}` });
    return opts;
  }, [animatedLayers, engine]);

  const toPx = useCallback((frame: number, value: number) => ({
    px: ((frame - viewBox.x) / viewBox.w) * width,
    py: height - ((value - viewBox.y) / viewBox.h) * height,
  }), [viewBox, width, height]);

  const { handleMouseDown, handleWheel, dragType, boxSelectRect } = useGraphInteraction({
    svgRef, viewBox, setViewBox, engine, curves, totalFrames, snapToFrame,
    svgWidth: width, svgHeight: height,
  });

  const frameAll = useCallback(() => {
    let minV = Infinity, maxV = -Infinity;
    let minF = Infinity, maxF = -Infinity;
    let has = false;
    for (const c of curves) {
      for (const k of c.keyframes) {
        const v = Array.isArray(k.value) ? k.value[c.dimension] : k.value;
        if (typeof v === 'number' && isFinite(v)) {
          has = true;
          if (v < minV) minV = v;
          if (v > maxV) maxV = v;
        }
        if (k.time < minF) minF = k.time;
        if (k.time > maxF) maxF = k.time;
      }
    }
    if (!has) {
      setViewBox(() => ({ x: -5, y: -20, w: Math.max(60, totalFrames + 10), h: 200 }));
      return;
    }
    let vRange = maxV - minV;
    // Ensure minimum Y spread so curves aren't squished
    if (vRange < 20) {
      const pad = (20 - vRange) / 2 + 10;
      minV -= pad; maxV += pad;
      vRange = maxV - minV;
    }
    let fRange = maxF - minF;
    if (fRange < 5) {
      const pad = Math.max(30, totalFrames * 0.2);
      minF -= pad; maxF += pad;
      fRange = maxF - minF;
    }
    // Generous padding for comfortable viewing
    const padV = Math.max(vRange * 0.3, 15);
    const padF = Math.max(fRange * 0.15, 5);
    setViewBox(() => ({
      x: Math.max(-padF, minF - padF),
      y: minV - padV,
      w: fRange + padF * 2,
      h: vRange + padV * 2,
    }));
  }, [curves, totalFrames]);

  const prevCurveKey = useRef<string>('');
  useEffect(() => {
    const key = curves.map(c => `${c.layerId}:${c.property}:${c.dimension}:${c.keyframes.length}`).join('|');
    if (key !== prevCurveKey.current && curves.length > 0) {
      prevCurveKey.current = key;
      requestAnimationFrame(() => frameAll());
    }
    if (curves.length === 0) prevCurveKey.current = '';
  }, [curves, frameAll]);

  // Also auto-fit when container size changes (initial mount / resize)
  useEffect(() => {
    if (width > 0 && height > 0 && curves.length > 0) {
      requestAnimationFrame(() => frameAll());
    }
  }, [width, height]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest?.('[data-graph-editor="1"]')) return;
      if (e.key === 'a' && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); frameAll(); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && useKeyframeStore.getState().selectedKeyframeIds.size > 0) {
        e.preventDefault(); useKeyframeStore.getState().deleteSelectedKeyframes();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [frameAll]);

  useGraphModalTransform({ svgRef, viewBox, snapToFrame, totalFrames });

  const applyPreset = (name: EasingPresetName) =>
    useKeyframeStore.getState().applyEasingPreset(name);

  const playheadPx = width > 0 ? ((currentFrame - viewBox.x) / viewBox.w) * width : 0;
  const cursor = dragType === 'pan' ? 'grabbing'
    : dragType === 'box-select' ? 'crosshair'
    : dragType === 'keyframe' || dragType === 'handleIn' || dragType === 'handleOut' ? 'grabbing'
    : 'default';

  const workAreaStart = comp.workAreaStart != null ? Math.floor(comp.workAreaStart * comp.fps) : 0;
  const workAreaEnd = comp.workAreaEnd != null ? Math.floor(comp.workAreaEnd * comp.fps) : totalFrames;

  return (
    <div className="flex flex-col h-full select-none" style={{ background: '#111822', borderRadius: 'var(--radius-panel)', overflow: 'hidden' }}>
      <GraphToolbar
        curveCount={curves.length}
        propOptions={propOptions}
        propFilter={propFilter} setPropFilter={setPropFilter}
        snapToFrame={snapToFrame} setSnapToFrame={setSnapToFrame}
        graphMode={graphMode} setGraphMode={setGraphMode}
        hasSelection={selectedKfIds.size > 0}
        onFrameAll={frameAll} onApplyPreset={applyPreset}
        presets={Object.keys(EASING_PRESETS) as EasingPresetName[]}
      />
      <GraphRuler viewBox={viewBox} fps={comp.fps} currentFrame={currentFrame}
        workAreaStart={workAreaStart} workAreaEnd={workAreaEnd} compId={comp.id}
        svgWidth={width} />
      <div ref={containerRef} className="flex-1 overflow-hidden relative" data-graph-editor="1" tabIndex={0}>
        {curves.length === 0 ? (
          <div className="flex h-full items-center justify-center"
            style={{ fontSize: 'var(--font-size-sm)', color: 'rgba(160,180,210,0.4)' }}>
            Select a layer with keyframes to view curves
          </div>
        ) : (
          <svg ref={svgRef} width={width} height={height}
            onWheel={handleWheel} onMouseDown={handleMouseDown}
            style={{ cursor, display: 'block', shapeRendering: 'geometricPrecision' }}>
            <GraphGrid viewBox={viewBox} width={width} height={height} fps={comp.fps} />
            {width > 0 && (
              <line x1={playheadPx} y1={0} x2={playheadPx} y2={height}
                stroke="#4a8eff" strokeWidth={1.5} opacity={0.9} />
            )}
            {width > 0 && (() => {
              const zp = toPx(0, 0);
              return zp.py >= 0 && zp.py <= height ? (
                <line x1={0} y1={zp.py} x2={width} y2={zp.py}
                  stroke="rgba(255,255,255,0.1)" strokeWidth={0.8} strokeDasharray="4 4" />
              ) : null;
            })()}
            <GraphCurves curves={curves} toPx={toPx} selectedKfIds={selectedKfIds} />
            {boxSelectRect && (
              <rect x={boxSelectRect.x} y={boxSelectRect.y}
                width={boxSelectRect.w} height={boxSelectRect.h}
                fill="rgba(74,142,255,0.08)" stroke="#4a8eff"
                strokeWidth={1} strokeDasharray="4 3" rx={2} />
            )}
          </svg>
        )}
      </div>
    </div>
  );
};

export default GraphEditorPanel;

function computeVelocityKfs(kfs: any[], fps: number): any[] {
  if (kfs.length < 2) return kfs;
  const result: any[] = [];
  for (let i = 0; i < kfs.length; i++) {
    const kf = kfs[i], next = kfs[i + 1];
    if (!next) { result.push({ ...kf, value: 0 }); continue; }
    const v1 = Array.isArray(kf.value) ? kf.value[0] : kf.value;
    const v2 = Array.isArray(next.value) ? next.value[0] : next.value;
    const dt = (next.time - kf.time) / fps;
    result.push({ ...kf, value: dt > 0 ? (v2 - v1) / dt : 0 });
  }
  return result;
}
