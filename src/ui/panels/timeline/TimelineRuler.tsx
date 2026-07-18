import React, { useRef, useCallback } from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { animationClock } from './PlaybackControls';

interface Props {
  totalFrames: number;
  currentFrame: number;
  zoom: number;
  scrollX: number;
  compId: string;
  fps: number;
  workAreaStart?: number;
  workAreaEnd?: number;
}

/** Pick a "nice" frame step so labels are roughly `targetPx` px apart. */
function niceStep(zoom: number, targetPx: number): number {
  const rawFrames = targetPx / zoom;
  const steps = [1, 2, 5, 10, 15, 20, 25, 30, 50, 60, 100, 150, 200, 250, 500, 1000, 2000, 5000, 10000];
  for (const s of steps) if (s >= rawFrames) return s;
  return steps[steps.length - 1];
}

export const TimelineRuler: React.FC<Props> = ({
  totalFrames, zoom, scrollX, compId, fps,
  workAreaStart, workAreaEnd,
}) => {
  const rulerRef = useRef<HTMLDivElement>(null);
  const scrubbing = useRef(false);

  const frameFromX = useCallback((clientX: number): number => {
    if (!rulerRef.current) return 0;
    const rect = rulerRef.current.getBoundingClientRect();
    const x = clientX - rect.left + scrollX;
    return Math.max(0, Math.min(totalFrames, Math.round(x / zoom)));
  }, [zoom, totalFrames, scrollX]);

  const handleDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    scrubbing.current = true;
    const f = frameFromX(e.clientX);
    animationClock.seekToFrame(f);
    useCompositionStore.getState().setCurrentTime(compId, f / fps);

    const onMove = (ev: MouseEvent) => {
      if (!scrubbing.current) return;
      const fr = frameFromX(ev.clientX);
      animationClock.seekToFrame(fr);
      useCompositionStore.getState().setCurrentTime(compId, fr / fps);
    };
    const onUp = () => {
      scrubbing.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [frameFromX, compId, fps]);

  // Density: aim for a labeled tick every ~55px, minor tick every ~11px
  const labelStep = niceStep(zoom, 55);
  const minorStep = Math.max(1, Math.round(labelStep / 5));

  // Only render ticks within the visible window (+ margin) for perf
  const viewportWidthPx = rulerRef.current?.clientWidth ?? 2000;
  const firstFrame = Math.max(0, Math.floor(scrollX / zoom) - minorStep);
  const lastFrame = Math.min(totalFrames, Math.ceil((scrollX + viewportWidthPx) / zoom) + minorStep);

  const startTick = Math.floor(firstFrame / minorStep) * minorStep;
  const ticks: React.ReactNode[] = [];
  for (let f = startTick; f <= lastFrame; f += minorStep) {
    if (f < 0) continue;
    const isLabel = f % labelStep === 0;
    ticks.push(
      <div key={f} className="absolute top-0" style={{ left: f * zoom }}>
        <div
          className="bg-border-light"
          style={{ width: 1, height: isLabel ? 12 : 5, opacity: isLabel ? 1 : 0.55 }}
        />
        {isLabel && (
          <span
            className="absolute top-[12px] text-[9px] text-text-secondary font-mono leading-none whitespace-nowrap"
            style={{ left: 3 }}
          >
            {f}
          </span>
        )}
      </div>,
    );
  }

  return (
    <div className="relative flex-shrink-0 bg-surface border-b border-border overflow-hidden" style={{ height: 28 }}>
      <div
        ref={rulerRef}
        className="absolute inset-0 cursor-ew-resize"
        onMouseDown={handleDown}
      >
        <div
          style={{
            width: totalFrames * zoom + 100,
            height: '100%',
            position: 'relative',
            transform: `translateX(${-scrollX}px)`,
          }}
        >
          {workAreaStart !== undefined && workAreaEnd !== undefined && (
            <>
              {workAreaStart > 0 && (
                <div className="absolute top-0 bottom-0 bg-black/25" style={{ left: 0, width: workAreaStart * zoom }} />
              )}
              {workAreaEnd < totalFrames && (
                <div className="absolute top-0 bottom-0 bg-black/25" style={{ left: workAreaEnd * zoom, width: (totalFrames - workAreaEnd) * zoom }} />
              )}
            </>
          )}
          {ticks}
        </div>
      </div>
    </div>
  );
};