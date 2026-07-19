/**
 * GraphEditorPanel — pro-level curve editor with:
 * - Box selection (drag empty space)
 * - Snap keyframes to whole frames
 * - Property filter dropdown (show only selected properties)
 * - Vector separation (position → posX + posY curves)
 * - Ctrl+click handle for "break" (unlink in/out tangents)
 */
import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useKeyframeStore } from '../../../state/keyframeStore';
import { useSelectionStore } from '../../../state/selectionStore';
import { EASING_PRESETS, type EasingPresetName } from '../../../animation/EasingPresets';
import { GraphToolbar } from './GraphToolbar';
import { GraphCurves, type FlatCurve } from './GraphCurves';
import { GraphGrid } from './GraphGrid';
import { useGraphInteraction, type ViewState } from './useGraphInteraction';

const COLORS = ['#88ccff', '#55dd33', '#ff3355', '#ffdd44', '#ff88cc', '#3388ff', '#ffaa44', '#aaff44'];

export const GraphEditorPanel: React.FC = () => {
  const comp = useCompositionStore((s) => s.activeCompositionId
    ? s.compositions.find((c) => c.id === s.activeCompositionId) ?? null : null);
  const engine = useKeyframeStore((s) => s.engine);
  const revision = useKeyframeStore((s) => s.revision);
  const selectedLayerIds = useSelectionStore((s) =>
    s.selected.filter((x) => x.type === 'layer').map((x) => x.id));
  const selectedKfIds = useKeyframeStore((s) => s.selectedKeyframeIds);
  const currentFrame = comp ? Math.round(comp.currentTime * comp.fps) : 0;

  const [viewBox, setViewBox] = useState<ViewState>({ x: -5, y: -50, w: 100, h: 300 });
  const [propFilter, setPropFilter] = useState<Set<string>>(new Set()); // empty = show all
  const [snapToFrame, setSnapToFrame] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);
  void revision;

  if (!comp) {
    return <div className="flex flex-col h-full items-center justify-center"
      style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-disabled)' }}>
      No composition
    </div>;
  }

  const totalFrames = Math.floor(comp.duration * comp.fps);
  const layers = comp.layers.filter((l) =>
    selectedLayerIds.includes(l.id) || selectedLayerIds.length === 0);
  const animatedLayers = layers.filter((l) => engine.getAllAnimatedProperties(l.id).length > 0);

  // Build flat list of curves — one per (layer, property, dimension)
  const curves = useMemo<FlatCurve[]>(() => {
    const result: FlatCurve[] = [];
    let colorIdx = 0;
    for (const layer of animatedLayers) {
      const props = engine.getAllAnimatedProperties(layer.id);
      for (const prop of props) {
        const kfs = engine.getKeyframesForProperty(layer.id, prop);
        if (kfs.length === 0) continue;
        const first = kfs[0].value;
        const dims = Array.isArray(first) ? first.length : 1;
        // Filter: show only if included (or filter empty)
        const propKey = `${layer.id}::${prop}`;
        if (propFilter.size > 0 && !propFilter.has(propKey)) continue;
        if (dims === 1) {
          result.push({
            layerId: layer.id, property: prop, dimension: 0,
            keyframes: kfs, color: COLORS[colorIdx++ % COLORS.length],
            label: `${layer.name}: ${prop}`,
          });
        } else {
          // Vector separation: create one curve per dimension
          const suffixes = ['X', 'Y', 'Z', 'W'];
          for (let d = 0; d < dims; d++) {
            result.push({
              layerId: layer.id, property: prop, dimension: d,
              keyframes: kfs, color: COLORS[colorIdx++ % COLORS.length],
              label: `${layer.name}: ${prop}.${suffixes[d] ?? d}`,
            });
          }
        }
      }
    }
    return result;
  }, [animatedLayers, engine, propFilter, revision]);

  // All property options for filter
  const propOptions = useMemo(() => {
    const opts: { key: string; label: string }[] = [];
    for (const layer of animatedLayers) {
      for (const prop of engine.getAllAnimatedProperties(layer.id)) {
        opts.push({ key: `${layer.id}::${prop}`, label: `${layer.name}: ${prop}` });
      }
    }
    return opts;
  }, [animatedLayers, engine]);

  const toPercent = useCallback((frame: number, value: number) => ({
    px: ((frame - viewBox.x) / viewBox.w) * 100,
    py: 100 - ((value - viewBox.y) / viewBox.h) * 100,
  }), [viewBox]);

  const { handleMouseDown, handleWheel, dragType, boxSelectRect } = useGraphInteraction({
    svgRef, viewBox, setViewBox, engine, curves, totalFrames, snapToFrame,
  });

  const frameAll = useCallback(() => {
    let minV = -50, maxV = 50, maxF = totalFrames;
    for (const c of curves) {
      for (const k of c.keyframes) {
        const v = Array.isArray(k.value) ? k.value[c.dimension] : k.value;
        if (typeof v === 'number') {
          if (v < minV) minV = v;
          if (v > maxV) maxV = v;
        }
        if (k.time > maxF) maxF = k.time;
      }
    }
    const vRange = Math.max(20, maxV - minV);
    setViewBox({ x: -5, y: minV - vRange * 0.15, w: Math.max(50, maxF + 10), h: vRange * 1.3 });
  }, [curves, totalFrames]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'a' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const t = e.target as HTMLElement;
        if (t.closest?.('[data-graph-editor="1"]')) { e.preventDefault(); frameAll(); }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const t = e.target as HTMLElement;
        if (t.closest?.('[data-graph-editor="1"]') && useKeyframeStore.getState().selectedKeyframeIds.size > 0) {
          e.preventDefault();
          useKeyframeStore.getState().deleteSelectedKeyframes();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [frameAll]);

  const applyPreset = (name: EasingPresetName) =>
    useKeyframeStore.getState().applyEasingPreset(name);

  const playheadPct = ((currentFrame - viewBox.x) / viewBox.w) * 100;

  return (
    <div className="flex flex-col h-full select-none" style={{ background: 'var(--color-panel)' }}>
      <GraphToolbar
        curveCount={curves.length}
        propOptions={propOptions}
        propFilter={propFilter}
        setPropFilter={setPropFilter}
        snapToFrame={snapToFrame}
        setSnapToFrame={setSnapToFrame}
        hasSelection={selectedKfIds.size > 0}
        onFrameAll={frameAll}
        onApplyPreset={applyPreset}
        presets={Object.keys(EASING_PRESETS) as EasingPresetName[]}
      />

      {curves.length === 0 ? (
        <div className="flex-1 flex items-center justify-center"
          style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-disabled)' }}>
          Select a layer with keyframes to view curves
        </div>
      ) : (
        <div className="flex-1 overflow-hidden relative" data-graph-editor="1">
          <svg ref={svgRef} className="w-full h-full"
            onWheel={handleWheel} onMouseDown={handleMouseDown}
            style={{ cursor: dragType === 'pan' ? 'grabbing' : dragType === 'box-select' ? 'crosshair' : 'default' }}
          >
            <GraphGrid viewBox={viewBox} totalFrames={totalFrames} />

            {/* Playhead */}
            <line x1={`${playheadPct}%`} y1="0" x2={`${playheadPct}%`} y2="100%"
              stroke="var(--timeline-playhead)" strokeWidth={1} opacity={0.7} />

            {/* Zero line */}
            {(() => {
              const zp = toPercent(0, 0);
              return zp.py >= 0 && zp.py <= 100 ? (
                <line x1="0" y1={`${zp.py}%`} x2="100%" y2={`${zp.py}%`}
                  stroke="rgba(255,255,255,0.15)" strokeWidth={0.5} strokeDasharray="4 2" />
              ) : null;
            })()}

            <GraphCurves
              curves={curves}
              toPercent={toPercent}
              viewBox={viewBox}
              selectedKfIds={selectedKfIds}
            />

            {/* Box select rectangle */}
            {boxSelectRect && (
              <rect
                x={boxSelectRect.x} y={boxSelectRect.y}
                width={boxSelectRect.w} height={boxSelectRect.h}
                fill="rgba(88,101,255,0.12)"
                stroke="var(--color-accent)"
                strokeWidth={1}
                strokeDasharray="4 2"
              />
            )}
          </svg>
        </div>
      )}
    </div>
  );
};

export default GraphEditorPanel;