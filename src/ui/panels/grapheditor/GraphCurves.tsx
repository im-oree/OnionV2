import React from 'react';
import { useKeyframeStore } from '../../../state/keyframeStore';
import type { Keyframe } from '../../../types/keyframe';
import type { ViewState } from './useGraphInteraction';

export interface FlatCurve {
  layerId: string;
  property: string;
  dimension: number;
  keyframes: Keyframe[];
  color: string;
  label: string;
}

interface Props {
  curves: FlatCurve[];
  toPercent: (frame: number, value: number) => { px: number; py: number };
  viewBox: ViewState;
  selectedKfIds: Set<string>;
}

function getVal(kf: Keyframe, dim: number): number {
  return Array.isArray(kf.value) ? (kf.value[dim] ?? 0) : (kf.value as number);
}

function buildPath(curve: FlatCurve, toPercent: (f: number, v: number) => { px: number; py: number }): string {
  const { keyframes, dimension } = curve;
  if (keyframes.length < 2) return '';
  const pts = keyframes.map(kf => toPercent(kf.time, getVal(kf, dimension)));
  let d = `M${pts[0].px},${pts[0].py}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const curr = keyframes[i], next = keyframes[i + 1];
    const p0 = pts[i], p1 = pts[i + 1];
    if (curr.interpolation === 'hold') {
      d += ` L${p1.px},${p0.py} L${p1.px},${p1.py}`;
    } else if (curr.interpolation === 'bezier') {
      const out = curr.outTangent ?? { x: 0.333, y: 0.333 };
      const inn = next.inTangent ?? { x: 0.333, y: 0.333 };
      const dx = p1.px - p0.px;
      const c1x = p0.px + out.x * dx;
      const c1y = p0.py + out.y * (p1.py - p0.py);
      const c2x = p1.px - inn.x * dx;
      const c2y = p1.py - inn.y * (p1.py - p0.py);
      d += ` C${c1x},${c1y} ${c2x},${c2y} ${p1.px},${p1.py}`;
    } else {
      d += ` L${p1.px},${p1.py}`;
    }
  }
  return d;
}

export const GraphCurves: React.FC<Props> = ({ curves, toPercent, selectedKfIds }) => {
  return (
    <>
      {curves.map(curve => (
        <g key={`${curve.layerId}-${curve.property}-${curve.dimension}`}>
          {curve.keyframes.length >= 2 && (
            <path d={buildPath(curve, toPercent)} fill="none" stroke={curve.color}
              strokeWidth={1.5} strokeLinejoin="round" opacity={0.9} />
          )}
          {curve.keyframes.map(kf => {
            const v = getVal(kf, curve.dimension);
            const p = toPercent(kf.time, v);
            const sel = selectedKfIds.has(kf.id);
            return <KfPoint key={kf.id} kf={kf} p={p} val={v} color={curve.color}
              selected={sel} toPercent={toPercent} />;
          })}
        </g>
      ))}
    </>
  );
};

const KfPoint: React.FC<{
  kf: Keyframe; p: { px: number; py: number }; val: number;
  color: string; selected: boolean;
  toPercent: (f: number, v: number) => { px: number; py: number };
}> = ({ kf, p, val, color, selected, toPercent }) => {
  const r = selected ? 6 : 4;
  return (
    <g>
      {selected && kf.interpolation === 'bezier' && (
        <>
          {kf.outTangent && (() => {
            const hp = toPercent(kf.time + 10 * kf.outTangent.x, val + 10 * kf.outTangent.y);
            return <React.Fragment key="out">
              <line x1={`${p.px}%`} y1={`${p.py}%`} x2={`${hp.px}%`} y2={`${hp.py}%`}
                stroke="#fff" strokeWidth={1} opacity={0.6}
                data-kf-id={kf.id} data-handle="out" style={{ cursor: 'pointer' }} />
              <circle cx={`${hp.px}%`} cy={`${hp.py}%`} r={4}
                fill={color} stroke="#fff" strokeWidth={1}
                data-kf-id={kf.id} data-handle="out" style={{ cursor: 'move' }} />
            </React.Fragment>;
          })()}
          {kf.inTangent && (() => {
            const hp = toPercent(kf.time - 10 * kf.inTangent.x, val - 10 * kf.inTangent.y);
            return <React.Fragment key="in">
              <line x1={`${p.px}%`} y1={`${p.py}%`} x2={`${hp.px}%`} y2={`${hp.py}%`}
                stroke="#fff" strokeWidth={1} opacity={0.6}
                data-kf-id={kf.id} data-handle="in" style={{ cursor: 'pointer' }} />
              <circle cx={`${hp.px}%`} cy={`${hp.py}%`} r={4}
                fill={color} stroke="#fff" strokeWidth={1}
                data-kf-id={kf.id} data-handle="in" style={{ cursor: 'move' }} />
            </React.Fragment>;
          })()}
        </>
      )}
      <g transform={`translate(${p.px}%, ${p.py}%)`}>
        <polygon
          points={`0,${-r} ${r},0 0,${r} ${-r},0`}
          fill={selected ? '#fff' : color}
          stroke={selected ? color : 'rgba(0,0,0,0.5)'}
          strokeWidth={selected ? 2 : 1}
          data-kf-id={kf.id}
          style={{ cursor: 'pointer' }}
        />
      </g>
    </g>
  );
};