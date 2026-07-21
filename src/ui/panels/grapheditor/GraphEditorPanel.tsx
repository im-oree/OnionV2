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
import { useContextMenu } from '../../common/useContextMenu';
import { ContextMenu } from '../../common/ContextMenu';
import { buildGraphContextMenu } from './graphContextMenu';

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

  const selectedPropertyKeys = useSelectionStore((s) => s.selectedPropertyKeys);
  const [viewBox, setViewBox] = useState<ViewState>({ x: -5, y: -20, w: 100, h: 200 });
  const [propFilter, setPropFilter] = useState<Set<string>>(new Set());
  const [snapToFrame, setSnapToFrame] = useState(true);
  const [graphMode, setGraphMode] = useState<'value' | 'speed'>('value');
  const [autoTangent, setAutoTangent] = useState(true);
  const [easingPreview, setEasingPreview] = useState<{
    outTangent: { x: number; y: number };
    inTangent: { x: number; y: number };
    x: number; y: number;
  } | null>(null);
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

  // Also include camera keyframes when camera has animated properties
  const cameraProps = engine.getAllAnimatedProperties('__camera__');
  const hasCameraKeyframes = cameraProps.length > 0;
  const hasPropertySelection = selectedPropertyKeys.size > 0;

  const curves = useMemo<FlatCurve[]>(() => {
    const result: FlatCurve[] = [];

    // Helper to build curves from a layer ID + name
    const buildCurves = (lId: string, lName: string) => {
      const props = engine.getAllAnimatedProperties(lId);
      for (const prop of props) {
        const kfs = engine.getKeyframesForProperty(lId, prop);
        if (kfs.length === 0) continue;
        const first = kfs[0].value;
        const dims = Array.isArray(first) ? first.length : 1;
        const propKey = `${lId}::${prop}`;

        // Filter: if properties are selected, only show those
        if (hasPropertySelection && !selectedPropertyKeys.has(propKey)) continue;
        // Also respect the toolbar filter
        if (propFilter.size > 0 && !propFilter.has(propKey)) continue;

        const suffixes = ['X', 'Y', 'Z', 'W'];
        if (dims === 1) {
          const processKfs = graphMode === 'speed'
            ? computeVelocityKfs(kfs, comp.fps, 0) : kfs;
          result.push({
            layerId: lId, property: prop, dimension: 0,
            keyframes: processKfs, color: curveColor(prop, 0, 1),
            label: `${lName}: ${prop}${graphMode === 'speed' ? ' (speed)' : ''}`,
          });
        } else {
          for (let d = 0; d < dims; d++) {
            const processKfs = graphMode === 'speed'
              ? computeVelocityKfs(kfs, comp.fps, d) : kfs;
            result.push({
              layerId: lId, property: prop, dimension: d,
              keyframes: processKfs, color: curveColor(prop, d, dims),
              label: `${lName}: ${prop}.${suffixes[d] ?? d}`,
            });
          }
        }
      }
    };

    for (const layer of animatedLayers) {
      buildCurves(layer.id, layer.name);
    }

    // Include camera keyframes
    if (hasCameraKeyframes) {
      buildCurves('__camera__', 'Camera');
    }

    return result;
  }, [animatedLayers, engine, propFilter, selectedPropertyKeys, hasPropertySelection, revision, graphMode, comp.fps]);

  const propOptions = useMemo(() => {
    const opts: { key: string; label: string }[] = [];
    for (const layer of animatedLayers)
      for (const prop of engine.getAllAnimatedProperties(layer.id))
        opts.push({ key: `${layer.id}::${prop}`, label: `${layer.name}: ${prop}` });
    // Include camera props
    if (hasCameraKeyframes) {
      for (const prop of cameraProps)
        opts.push({ key: `__camera__::${prop}`, label: `Camera: ${prop}` });
    }
    return opts;
  }, [animatedLayers, engine, hasCameraKeyframes, cameraProps]);

  const toPx = useCallback((frame: number, value: number) => ({
    px: ((frame - viewBox.x) / viewBox.w) * width,
    py: height - ((value - viewBox.y) / viewBox.h) * height,
  }), [viewBox, width, height]);

  const { handleMouseDown, handleWheel, dragType, boxSelectRect } = useGraphInteraction({
    svgRef, viewBox, setViewBox, engine, curves, totalFrames, snapToFrame,
    svgWidth: width, svgHeight: height,
    autoTangent,
  });
  const ctx = useContextMenu();

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    const target = e.target as SVGElement;
    const kfEl = target.closest?.('[data-kf-id]') as SVGElement | null;
    const kfId = kfEl?.getAttribute('data-kf-id');
    // If right-clicked on a keyframe that isn't selected, select it first
    if (kfId && !useKeyframeStore.getState().selectedKeyframeIds.has(kfId)) {
      useKeyframeStore.getState().selectKeyframe(kfId, false);
    }
    e.preventDefault();
    e.stopPropagation();
    ctx.open(e, buildGraphContextMenu());
  }, [ctx]);

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
        autoTangent={autoTangent} setAutoTangent={setAutoTangent}
        easingPreview={easingPreview}
        onShowEasingPreview={() => {
          if (selectedKfIds.size === 0) { setEasingPreview(null); return; }
          const store = useKeyframeStore.getState();
          const kf = store.engine.getKeyframe(Array.from(selectedKfIds)[0]);
          if (!kf) { setEasingPreview(null); return; }
          const outTan = kf.outTangent ?? { x: 0.333, y: 0.333 };
          const inTan = kf.inTangent ?? { x: 0.333, y: 0.333 };
          setEasingPreview(easingPreview ? null : {
            outTangent: outTan,
            inTangent: inTan,
            x: 0, y: 0,
          });
        }}
        onCloseEasingPreview={() => setEasingPreview(null)}
      />
      <GraphRuler viewBox={viewBox} fps={comp.fps} currentFrame={currentFrame}
        workAreaStart={workAreaStart} workAreaEnd={workAreaEnd} compId={comp.id}
        svgWidth={width} />
      <div ref={containerRef} className="flex-1 overflow-hidden relative" data-graph-editor="1" tabIndex={0}>
        {curves.length === 0 ? (
          <div className="flex h-full items-center justify-center"
            style={{ fontSize: 'var(--font-size-sm)', color: 'rgba(160,180,210,0.4)' }}>
            {hasPropertySelection
              ? 'Selected properties have no keyframes'
              : 'Select a layer with keyframes to view curves'}
          </div>
        ) : (
          <svg ref={svgRef} width={width} height={height}
            onWheel={handleWheel} onMouseDown={handleMouseDown}
            onContextMenu={handleContextMenu}
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
      {ctx.menu && <ContextMenu items={ctx.menu.items} position={ctx.menu.position} onClose={ctx.close} />}
    </div>
  );
};

export default GraphEditorPanel;

function computeVelocityKfs(kfs: any[], fps: number, dim: number = 0): any[] {
  if (kfs.length < 2) return kfs.map(kf => ({ ...kf, value: 0 }));
  const result: any[] = [];
  for (let i = 0; i < kfs.length; i++) {
    const kf = kfs[i];
    // Compute forward velocity (value change per second)
    if (i < kfs.length - 1) {
      const next = kfs[i + 1];
      const v1 = Array.isArray(kf.value) ? (kf.value[dim] ?? 0) : kf.value;
      const v2 = Array.isArray(next.value) ? (next.value[dim] ?? 0) : next.value;
      const dt = (next.time - kf.time) / fps;
      const velocity = dt > 0 ? (v2 - v1) / dt : 0;
      // Compute acceleration for tangent handles (derivative of velocity)
      let accel = 0;
      if (i > 0) {
        const prev = kfs[i - 1];
        const v0 = Array.isArray(prev.value) ? (prev.value[dim] ?? 0) : prev.value;
        const dtPrev = (kf.time - prev.time) / fps;
        const prevVel = dtPrev > 0 ? (v1 - v0) / dtPrev : 0;
        accel = dt > 0 ? (velocity - prevVel) / ((dt + (dtPrev || dt)) / 2) : 0;
      }
      // Tangent handles: x = influence (0-1), y = velocity scaled
      const handleScale = 0.003; // Scale velocity to tangent range
      const outTangent = { x: 0.333, y: Math.max(-2, Math.min(2, velocity * handleScale + accel * 0.1)) };
      const inTangent = { x: 0.333, y: Math.max(-2, Math.min(2, velocity * handleScale - accel * 0.1)) };
      result.push({ ...kf, value: velocity, outTangent, inTangent, interpolation: 'bezier' as const });
    } else {
      // Last keyframe: velocity is 0 (animation ends)
      result.push({ ...kf, value: 0 });
    }
  }
  return result;
}
