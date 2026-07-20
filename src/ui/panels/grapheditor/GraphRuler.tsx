import React, { useCallback } from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { animationClock } from '../timeline/PlaybackControls';
import type { ViewState } from './useGraphInteraction';

interface Props {
  viewBox: ViewState;
  fps: number;
  currentFrame: number;
  workAreaStart: number;
  workAreaEnd: number;
  compId: string;
  svgWidth: number;
}

function fmtSec(frame: number, fps: number): string {
  const s = frame / fps;
  return `${String(Math.floor(s)).padStart(2, '0')}s`;
}

function niceStep(rangeSec: number): number {
  const steps = [0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60, 120, 300];
  for (const s of steps) if (rangeSec / s <= 12) return s;
  return steps[steps.length - 1];
}

export const GraphRuler: React.FC<Props> = ({ viewBox, fps, currentFrame, workAreaStart, workAreaEnd, compId, svgWidth }) => {
  const startSec = viewBox.x / fps;
  const endSec = (viewBox.x + viewBox.w) / fps;
  const step = niceStep(endSec - startSec);
  const firstTick = Math.ceil(startSec / step) * step;

  const ticks: React.ReactNode[] = [];
  for (let s = firstTick; s <= endSec; s += step) {
    const f = s * fps;
    const px = ((f - viewBox.x) / viewBox.w) * svgWidth;
    if (px < -20 || px > svgWidth + 20) continue;
    ticks.push(
      <div key={s.toFixed(3)} className="absolute top-0"
        style={{ left: px, transform: 'translateX(-50%)' }}>
        <span style={{
          fontSize: 10, color: 'rgba(180,195,220,0.55)',
          fontFamily: 'var(--font-family-mono)', letterSpacing: '0.02em',
        }}>{fmtSec(Math.round(f), fps)}</span>
      </div>
    );
  }

  const playPx = svgWidth > 0 ? ((currentFrame - viewBox.x) / viewBox.w) * svgWidth : 0;
  const waStartPx = svgWidth > 0 ? ((workAreaStart - viewBox.x) / viewBox.w) * svgWidth : 0;
  const waEndPx = svgWidth > 0 ? ((workAreaEnd - viewBox.x) / viewBox.w) * svgWidth : svgWidth;

  const onPlayheadDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const el = (e.currentTarget as HTMLElement).parentElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const seek = (clientX: number) => {
      const frac = (clientX - rect.left) / rect.width;
      const f = Math.max(0, Math.round(viewBox.x + frac * viewBox.w));
      animationClock.seekToFrame(f);
      useCompositionStore.getState().setCurrentTime(compId, f / fps);
    };
    seek(e.clientX);
    const mm = (ev: MouseEvent) => seek(ev.clientX);
    const mu = () => { document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu); };
    document.addEventListener('mousemove', mm); document.addEventListener('mouseup', mu);
  }, [viewBox, fps, compId]);

  const onWorkAreaDown = useCallback((which: 'start' | 'end') => (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const el = (e.currentTarget as HTMLElement).parentElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mm = (ev: MouseEvent) => {
      const frac = (ev.clientX - rect.left) / rect.width;
      const f = Math.max(0, Math.round(viewBox.x + frac * viewBox.w));
      const cs = useCompositionStore.getState();
      const comp = cs.compositions.find(c => c.id === compId); if (!comp) return;
      if (which === 'start') cs.updateComposition(compId, { workAreaStart: Math.min(f / fps, (comp.workAreaEnd ?? comp.duration) - 0.1) });
      else cs.updateComposition(compId, { workAreaEnd: Math.max(f / fps, (comp.workAreaStart ?? 0) + 0.1) });
    };
    const mu = () => { document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu); };
    document.addEventListener('mousemove', mm); document.addEventListener('mouseup', mu);
  }, [viewBox, fps, compId]);

  const onRulerClick = useCallback((e: React.MouseEvent) => {
    // Don't interfere with playhead drag, work area drag, or tick labels
    const target = e.target as HTMLElement;
    if (target.closest('[data-playhead-dot]') || target.closest('[data-work-area]')) return;
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    const f = Math.max(0, Math.round(viewBox.x + frac * viewBox.w));
    animationClock.seekToFrame(f);
    useCompositionStore.getState().setCurrentTime(compId, f / fps);
  }, [viewBox, fps, compId]);

  return (
    <div className="relative flex-shrink-0"
      style={{ height: 28, borderBottom: '1px solid rgba(120,140,180,0.15)', background: '#141926', cursor: 'crosshair' }}
      onClick={onRulerClick}>
      {workAreaStart >= 0 && waEndPx > waStartPx && (
        <div className="absolute pointer-events-none"
          style={{ left: waStartPx, width: waEndPx - waStartPx, top: 22, height: 3, background: '#4a8eff', borderRadius: 2, opacity: 0.85 }} />
      )}
      {workAreaStart >= 0 && (
        <div className="absolute cursor-ew-resize" data-work-area="1"
          onMouseDown={onWorkAreaDown('start')}
          style={{ left: waStartPx, top: 18, width: 8, height: 10, transform: 'translateX(-50%)', background: '#4a8eff', borderRadius: 2, boxShadow: '0 0 0 1.5px rgba(255,255,255,0.9)' }} />
      )}
      {workAreaEnd >= 0 && (
        <div className="absolute cursor-ew-resize" data-work-area="1"
          onMouseDown={onWorkAreaDown('end')}
          style={{ left: waEndPx, top: 18, width: 8, height: 10, transform: 'translateX(-50%)', background: '#4a8eff', borderRadius: 2, boxShadow: '0 0 0 1.5px rgba(255,255,255,0.9)' }} />
      )}
      <div className="absolute inset-0 px-0" style={{ paddingTop: 4 }}>{ticks}</div>
      {playPx >= -20 && playPx <= svgWidth + 20 && (
        <div className="absolute cursor-ew-resize" data-playhead-dot="1"
          onMouseDown={onPlayheadDown}
          style={{ left: playPx, top: 4, width: 10, height: 10, transform: 'translateX(-50%)', borderRadius: '50%', background: '#4a8eff', boxShadow: '0 0 0 1.5px rgba(255,255,255,0.95)' }} />
      )}
    </div>
  );
};
