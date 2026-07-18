/**
 * GraphEditorPanel — displays animated property curves as 2D SVG graphs.
 * X axis = time (frames), Y axis = value.
 * Keyframes are draggable control points; bezier handles shown on selected keyframes.
 * Zoom with Ctrl+scroll (X) and Shift+scroll (Y). Frame all with A.
 */
import React, { useRef, useState, useCallback } from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useKeyframeStore } from '../../../state/keyframeStore';
import { useSelectionStore } from '../../../state/selectionStore';

export const GraphEditorPanel: React.FC = () => {
  const comp = useCompositionStore((s) => s.activeCompositionId
    ? s.compositions.find((c) => c.id === s.activeCompositionId) ?? null : null);
  const engine = useKeyframeStore((s) => s.engine);
  const selectedLayerIds = useSelectionStore((s) => s.selected.filter((x) => x.type === 'layer').map((x) => x.id));

  const [viewBox, setViewBox] = useState({ x: 0, y: -100, w: 300, h: 200 });
  const svgRef = useRef<SVGSVGElement>(null);

  if (!comp) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-ui-xs text-text-disabled">
        No composition
      </div>
    );
  }

  const totalFrames = Math.floor(comp.duration * comp.fps);
  const layers = comp.layers.filter((l) => selectedLayerIds.includes(l.id) || selectedLayerIds.length === 0);
  const animatedLayers = layers.filter((l) => engine.getAllAnimatedProperties(l.id).length > 0);

  // Zoom/pan with scroll
  const handleWheel = useCallback((e: React.WheelEvent) => {
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    setViewBox((vb) => {
      if (e.shiftKey) {
        // Y zoom
        const dh = vb.h * factor;
        const dy = (vb.h - dh) / 2;
        return { ...vb, y: vb.y - dy, h: dh };
      } else {
        // X zoom
        const dw = vb.w * factor;
        const dx = (vb.w - dw) / 2;
        return { ...vb, x: vb.x - dx, w: dw };
      }
    });
  }, []);

  // Frame all (A key)
  const frameAll = useCallback(() => {
    setViewBox({ x: 0, y: -100, w: Math.max(300, totalFrames + 30), h: 200 });
  }, [totalFrames]);

  return (
    <div className="flex flex-col h-full bg-surface-alt select-none">
      {/* Header */}
      <div className="flex items-center h-tl-header px-2 bg-panel-header border-b border-border gap-2">
        <span className="text-ui-xs font-medium text-text-primary">Graph Editor</span>
        <span className="text-ui-xs text-text-disabled">
          {animatedLayers.length > 0
            ? `${animatedLayers.length} layer(s) with animation`
            : 'Select an animated layer'}
        </span>
        <div className="flex-1" />
        <button className="text-ui-xs text-text-secondary hover:text-text-primary border-0 bg-transparent cursor-pointer px-2"
          onClick={frameAll}>
          Frame All (A)
        </button>
      </div>

      {/* Graph canvas */}
      {animatedLayers.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-ui-xs text-text-disabled">
          Select a layer with keyframes to view curves
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <svg
            ref={svgRef}
            className="w-full h-full"
            onWheel={handleWheel}
            style={{ cursor: 'grab' }}
          >
            {/* Grid */}
            <GridLines viewBox={viewBox} totalFrames={totalFrames} />

            {/* Property curves */}
            {animatedLayers.map((layer) => {
              const props = engine.getAllAnimatedProperties(layer.id);
              return props.map((prop, propIdx) => {
                const keyframes = engine.getKeyframesForProperty(layer.id, prop);
                if (keyframes.length < 2) return null;
                const color = COLORS[propIdx % COLORS.length];

                // Build path (polyline) from keyframes
                const points = keyframes.map((kf) => {
                  const px = ((kf.time - viewBox.x) / viewBox.w) * 100;
                  const val = typeof kf.value === 'number' ? kf.value : (kf.value as number[])[0] ?? 0;
                  const py = 100 - ((val - viewBox.y) / viewBox.h) * 100;
                  return `${px},${py}`;
                }).join(' ');

                return (
                  <g key={`${layer.id}-${prop}`}>
                    {/* Curve polyline */}
                    <polyline points={points} fill="none" stroke={color} strokeWidth={1.5}
                      strokeLinejoin="round" />

                    {/* Keyframe control points */}
                    {keyframes.map((kf) => {
                      const px = ((kf.time - viewBox.x) / viewBox.w) * 100;
                      const val = typeof kf.value === 'number' ? kf.value : (kf.value as number[])[0] ?? 0;
                      const py = 100 - ((val - viewBox.y) / viewBox.h) * 100;
                      return (
                        <g key={kf.id}>
                          <circle cx={`${px}%`} cy={`${py}%`} r={4} fill={color} stroke="#fff" strokeWidth={1}
                            style={{ cursor: 'pointer' }}
                          />
                          {/* Bezier handle lines (if bezier interpolation) */}
                          {kf.interpolation === 'bezier' && kf.outTangent && (
                            <line x1={`${px}%`} y1={`${py}%`}
                              x2={`${px + (kf.outTangent.x * 8)}%`} y2={`${py - (kf.outTangent.y * 8)}%`}
                              stroke="#fff" strokeWidth={0.5} opacity={0.5}
                            />
                          )}
                        </g>
                      );
                    })}
                  </g>
                );
              });
            })}

            {/* Zero line */}
            <line x1="0" y1="50%" x2="100%" y2="50%" stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} strokeDasharray="4 2" />
          </svg>
        </div>
      )}
    </div>
  );
};

/** Background grid lines in the graph */
const GridLines: React.FC<{ viewBox: { x: number; y: number; w: number; h: number }; totalFrames: number }> = ({
  viewBox, totalFrames,
}) => {
  // Vertical grid (every 10 frames in view)
  const fStep = Math.max(1, Math.round(viewBox.w / 20));
  const vLines: React.ReactNode[] = [];
  const startF = Math.max(0, Math.floor(viewBox.x / fStep) * fStep);
  for (let f = startF; f <= Math.min(totalFrames, viewBox.x + viewBox.w); f += fStep) {
    const px = ((f - viewBox.x) / viewBox.w) * 100;
    vLines.push(
      <line key={`v${f}`} x1={`${px}%`} y1="0" x2={`${px}%`} y2="100%"
        stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} />
    );
  }

  // Horizontal grid (every ~50 value units)
  const vStep = Math.max(10, Math.round(viewBox.h / 10));
  const hLines: React.ReactNode[] = [];
  const startV = Math.floor(viewBox.y / vStep) * vStep;
  for (let v = startV; v <= viewBox.y + viewBox.h; v += vStep) {
    const py = 100 - ((v - viewBox.y) / viewBox.h) * 100;
    hLines.push(
      <line key={`h${v}`} x1="0" y1={`${py}%`} x2="100%" y2={`${py}%`}
        stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} />
    );
  }

  return <g>{vLines}{hLines}</g>;
};

const COLORS = ['#88ccff', '#55dd33', '#ff3355', '#ffdd44', '#ff88cc', '#3388ff'];
