import React from 'react';
import type { Keyframe } from '../../../types/keyframe';

export interface FlatCurve {
  layerId: string;
  property: string;
  dimension: number;
  keyframes: Keyframe[];
  color: string;
  label: string;
  /** For speed graph: pre-computed (time, velocity) sample points */
  speedSamples?: { time: number; value: number }[];
}

interface Props {
  curves: FlatCurve[];
  toPx: (frame: number, value: number) => { px: number; py: number };
  selectedKfIds: Set<string>;
  /**
   * Dimension-aware graph selection keys (format: "kfId::d{dim}").
   * When provided, used instead of selectedKfIds for rendering so
   * each dimension's keyframes can be selected independently.
   */
  graphSelectedKeys?: Set<string>;
}

function getVal(kf: Keyframe, dim: number): number {
  return Array.isArray(kf.value) ? (kf.value[dim] ?? 0) : (kf.value as number);
}

function buildPath(curve: FlatCurve, toPx: (f: number, v: number) => { px: number; py: number }): string {
  const { keyframes, dimension } = curve;
  // Speed graph: render from sampled polyline data
  if (curve.speedSamples && curve.speedSamples.length > 0) {
    const pts = curve.speedSamples.map(s => toPx(s.time, s.value));
    let d = `M${pts[0].px.toFixed(1)},${pts[0].py.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      d += ` L${pts[i].px.toFixed(1)},${pts[i].py.toFixed(1)}`;
    }
    return d;
  }
  // Value graph: render using keyframe interpolation
  if (keyframes.length < 2) return '';
  const pts = keyframes.map(kf => toPx(kf.time, getVal(kf, dimension)));
  let d = `M${pts[0].px.toFixed(1)},${pts[0].py.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const curr = keyframes[i], next = keyframes[i + 1];
    const p0 = pts[i], p1 = pts[i + 1];
    if (curr.interpolation === 'hold') {
      d += ` L${p1.px.toFixed(1)},${p0.py.toFixed(1)} L${p1.px.toFixed(1)},${p1.py.toFixed(1)}`;
    } else if (curr.interpolation === 'bezier') {
      // Convert normalized tangents (0-1 range) to pixel-space control points
      const out = curr.outTangent ?? { x: 0.333, y: 0.333 };
      const inn = next.inTangent ?? { x: 0.333, y: 0.333 };
      const dx = p1.px - p0.px;
      const dy = p1.py - p0.py;
      const c1x = p0.px + out.x * dx;
      const c1y = p0.py + out.y * dy;
      const c2x = p1.px - inn.x * dx;
      const c2y = p1.py - inn.y * dy;
      d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p1.px.toFixed(1)},${p1.py.toFixed(1)}`;
    } else {
      d += ` L${p1.px.toFixed(1)},${p1.py.toFixed(1)}`;
    }
  }
  return d;
}

const HANDLE_COLOR = '#6ba4ff';
const HANDLE_LINE_COLOR = 'rgba(107,164,255,0.7)';

/** Build a compound selection key: "kfId::d{dim}" for dimension-aware graph selection. */
function selKey(kfId: string, dim: number): string {
  return `${kfId}::d${dim}`;
}

export const GraphCurves: React.FC<Props> = ({ curves, toPx, selectedKfIds, graphSelectedKeys }) => {
  return (
    <>
      {curves.map(curve => {
        const path = buildPath(curve, toPx);
        return (
          <g key={`${curve.layerId}-${curve.property}-${curve.dimension}`}>
            {path && (
              <>
                {/* Outer glow */}
                <path d={path} fill="none" stroke={curve.color}
                  strokeOpacity={0.12} strokeWidth={12}
                  strokeLinejoin="round" strokeLinecap="round"
                  style={{ filter: 'blur(4px)' }} />
                {/* Inner glow */}
                <path d={path} fill="none" stroke={curve.color}
                  strokeOpacity={0.3} strokeWidth={5}
                  strokeLinejoin="round" strokeLinecap="round"
                  style={{ filter: 'blur(2px)' }} />
                {/* Main curve */}
                <path d={path} fill="none" stroke={curve.color}
                  strokeWidth={2.8} strokeLinejoin="round" strokeLinecap="round" />
              </>
            )}
            {curve.keyframes.map(kf => {
              const v = getVal(kf, curve.dimension);
              const p = toPx(kf.time, v);
              // Use dimension-aware selection check when graphSelectedKeys is provided
              // so X and Y keyframes on the same frame can be selected independently.
              const sel = graphSelectedKeys
                ? graphSelectedKeys.has(selKey(kf.id, curve.dimension))
                : selectedKfIds.has(kf.id);
              const hasSamples = !!(curve.speedSamples && curve.speedSamples.length > 0);
              return <KfPoint key={`${kf.id}::d${curve.dimension}`} kf={kf} p={p}
                color={curve.color} selected={sel}
                hideHandles={hasSamples}
                dataDim={curve.dimension} />;
            })}
          </g>
        );
      })}
    </>
  );
};

const KfPoint: React.FC<{
  kf: Keyframe; p: { px: number; py: number };
  color: string; selected: boolean;
  /** Speed graph keyframes don't show tangent handles */
  hideHandles?: boolean;
  /** Dimension index for multi-dim properties — used to build a compound data-kf-id */
  dataDim?: number;
}> = ({ kf, p, color, selected, hideHandles, dataDim }) => {
  const r = selected ? 7 : 5.5;
  const showHandles = !hideHandles && selected && kf.interpolation === 'bezier';

  // Convert normalized tangents to pixel-space handle positions
  // Tangent.x = influence (0-1), tangent.y = speed/bias (-1 to 1)
  const getHandlePoint = (tangent: { x: number; y: number }, isOut: boolean): { px: number; py: number } => {
    const dir = isOut ? 1 : -1;
    // Handle length proportional to influence, height proportional to value bias
    const handleScale = 120; // Larger for better visibility
    const hx = p.px + dir * tangent.x * handleScale;
    const hy = p.py - tangent.y * handleScale;
    return { px: hx, py: hy };
  };

  return (
    <g>
      {/* Handle lines and circles */}
      {showHandles && kf.outTangent && (() => {
        const hp = getHandlePoint(kf.outTangent, true);
        return (
          <g key="out">
            <line x1={p.px} y1={p.py} x2={hp.px} y2={hp.py}
              stroke={HANDLE_LINE_COLOR} strokeWidth={2} strokeLinecap="round"
              data-kf-id={kf.id} data-handle="out" style={{ cursor: 'pointer', pointerEvents: 'stroke' }} />
            <circle cx={hp.px} cy={hp.py} r={5.5}
              fill={HANDLE_COLOR} stroke="#fff" strokeWidth={2}
              data-kf-id={kf.id} data-handle="out" style={{ cursor: 'move', pointerEvents: 'all' }} />
          </g>
        );
      })()}
      {showHandles && kf.inTangent && (() => {
        const hp = getHandlePoint(kf.inTangent, false);
        return (
          <g key="in">
            <line x1={p.px} y1={p.py} x2={hp.px} y2={hp.py}
              stroke={HANDLE_LINE_COLOR} strokeWidth={2} strokeLinecap="round"
              data-kf-id={kf.id} data-handle="in" style={{ cursor: 'pointer', pointerEvents: 'stroke' }} />
            <circle cx={hp.px} cy={hp.py} r={5.5}
              fill={HANDLE_COLOR} stroke="#fff" strokeWidth={2}
              data-kf-id={kf.id} data-handle="in" style={{ cursor: 'move', pointerEvents: 'all' }} />
          </g>
        );
      })()}

      {/* Selection glow ring */}
      {selected && (
        <circle cx={p.px} cy={p.py} r={r + 5}
          fill={color} fillOpacity={0.25}
          pointerEvents="none" />
      )}

      {/* Keyframe point — use compound kf-id when dimension-specific so multi-dim
          properties (e.g. Position X/Y) can be selected independently. */}
      <g transform={`translate(${p.px}, ${p.py})`}
        data-kf-id={dataDim != null ? `${kf.id}::d${dataDim}` : kf.id}
        data-dim={dataDim}
        style={{ cursor: 'pointer', pointerEvents: 'all' }}>
        {kf.interpolation === 'hold' ? (
          <>
            <rect x={-r} y={-r} width={r * 2} height={r * 2} rx={2}
              fill="#fff" stroke={color} strokeWidth={2.5} />
            <rect x={-r + 2} y={-r + 2} width={r * 2 - 4} height={r * 2 - 4} rx={1}
              fill={color} fillOpacity={0.3} pointerEvents="none" />
          </>
        ) : kf.interpolation === 'linear' ? (
          <polygon points={`0,${-r - 1} ${r + 1},0 0,${r + 1} ${-r - 1},0`}
            fill="#fff" stroke={color} strokeWidth={2.5} />
        ) : (
          <>
            {/* Outer ring for selected */}
            {selected && (
              <circle cx={0} cy={0} r={r + 2}
                fill="none" stroke={color} strokeWidth={1.5} strokeOpacity={0.5} />
            )}
            {/* Main dot */}
            <circle cx={0} cy={0} r={r}
              fill="#fff" stroke={color} strokeWidth={2.5} />
            {/* Inner highlight */}
            <circle cx={-1} cy={-1} r={r * 0.35}
              fill="rgba(255,255,255,0.6)" pointerEvents="none" />
          </>
        )}
      </g>
    </g>
  );
};
