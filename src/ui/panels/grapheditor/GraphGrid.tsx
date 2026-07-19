import React from 'react';
import type { ViewState } from './useGraphInteraction';

interface Props { viewBox: ViewState; totalFrames: number; }

export const GraphGrid: React.FC<Props> = ({ viewBox, totalFrames }) => {
  const fStep = Math.max(1, Math.round(viewBox.w / 20));
  const vLines: React.ReactNode[] = [];
  const startF = Math.max(0, Math.floor(viewBox.x / fStep) * fStep);
  for (let f = startF; f <= Math.min(totalFrames + 100, viewBox.x + viewBox.w); f += fStep) {
    const px = ((f - viewBox.x) / viewBox.w) * 100;
    const isMajor = f % (fStep * 5) === 0;
    vLines.push(
      <line key={`v${f}`} x1={`${px}%`} y1="0" x2={`${px}%`} y2="100%"
        stroke={`rgba(255,255,255,${isMajor ? 0.08 : 0.04})`} strokeWidth={0.5} />
    );
    if (isMajor) {
      vLines.push(
        <text key={`vl${f}`} x={`${px}%`} y="12" fill="rgba(255,255,255,0.35)"
          fontSize={9} fontFamily="var(--font-family-mono)" dx={2}>
          {f}
        </text>
      );
    }
  }
  const vStep = Math.max(10, Math.round(viewBox.h / 10));
  const hLines: React.ReactNode[] = [];
  const startV = Math.floor(viewBox.y / vStep) * vStep;
  for (let v = startV; v <= viewBox.y + viewBox.h; v += vStep) {
    const py = 100 - ((v - viewBox.y) / viewBox.h) * 100;
    const isMajor = v % (vStep * 5) === 0;
    hLines.push(
      <line key={`h${v}`} x1="0" y1={`${py}%`} x2="100%" y2={`${py}%`}
        stroke={`rgba(255,255,255,${isMajor ? 0.08 : 0.04})`} strokeWidth={0.5} />
    );
    if (isMajor) {
      hLines.push(
        <text key={`hl${v}`} x="4" y={`${py}%`} fill="rgba(255,255,255,0.35)"
          fontSize={9} fontFamily="var(--font-family-mono)" dy={-2}>
          {v}
        </text>
      );
    }
  }
  return <g>{vLines}{hLines}</g>;
};