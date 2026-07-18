import React, { useRef, useCallback } from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { animationClock } from './PlaybackControls';

interface TimelineRulerProps {
  totalFrames: number;
  currentFrame: number;
  zoom: number;
  scrollX: number;
  compId: string;
  workAreaStart?: number;
  workAreaEnd?: number;
}

export const TimelineRuler: React.FC<TimelineRulerProps> = ({
  totalFrames, currentFrame, zoom, scrollX, compId,
  workAreaStart, workAreaEnd,
}) => {
  const rulerRef = useRef<HTMLDivElement>(null);
  const isScrubbing = useRef(false);

  const calcFrameFromX = useCallback((clientX: number): number => {
    if (!rulerRef.current) return 0;
    const rect = rulerRef.current.getBoundingClientRect();
    const x = clientX - rect.left + scrollX;
    return Math.max(0, Math.min(totalFrames, Math.round(x / zoom)));
  }, [zoom, totalFrames, scrollX]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isScrubbing.current = true;
    const frame = calcFrameFromX(e.clientX);
    animationClock.seekToFrame(frame);
    useCompositionStore.getState().setCurrentTime(compId, frame / (totalFrames / (compId ? 30 : 30)));

    const onMove = (ev: MouseEvent) => {
      if (!isScrubbing.current) return;
      const f = calcFrameFromX(ev.clientX);
      animationClock.seekToFrame(f);
      useCompositionStore.getState().setCurrentTime(compId, f / (totalFrames / 30));
    };
    const onUp = () => {
      isScrubbing.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [calcFrameFromX, compId, totalFrames]);

  // Generate tick marks — show major tick every ~100px
  const frameStep = Math.max(1, Math.round(100 / zoom));
  const majorStep = Math.max(frameStep, Math.round(500 / zoom));

  const ticks: React.ReactNode[] = [];
  for (let f = 0; f <= totalFrames; f += frameStep) {
    const isMajor = f % majorStep === 0 || f === 0 || f === totalFrames;
    ticks.push(
      <div key={f} className="absolute top-0" style={{ left: f * zoom, width: 1 }}>
        <div className="bg-border-light" style={{ height: isMajor ? 14 : 8 }} />
        {isMajor && (
          <span className="absolute left-[3px] top-[14px] text-[8px] text-text-disabled whitespace-nowrap font-mono leading-none">
            {f}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex-shrink-0 bg-surface border-b border-border"
      style={{ height: 28 }}
    >
      <div
        ref={rulerRef}
        className="absolute inset-0 cursor-pointer overflow-hidden"
        onMouseDown={handleMouseDown}
        style={{ paddingLeft: 0 }}
      >
        <div style={{ width: totalFrames * zoom + 100, height: '100%', position: 'relative' }}>
          {/* Work area dimmed overlays */}
          {workAreaStart !== undefined && workAreaEnd !== undefined && (
            <>
              {workAreaStart > 0 && (
                <div className="absolute top-0 bottom-0 bg-black/20" style={{ left: 0, width: workAreaStart * zoom }} />
              )}
              {workAreaEnd < totalFrames && (
                <div className="absolute top-0 bottom-0 bg-black/20" style={{ left: workAreaEnd * zoom, width: (totalFrames - workAreaEnd) * zoom }} />
              )}
            </>
          )}
          {ticks}
          {/* Playhead line in ruler */}
          <div className="absolute top-0" style={{ left: currentFrame * zoom, width: 2, height: '100%' }}>
            <svg width="10" height="8" style={{ position: 'absolute', top: 0, left: -4 }}>
              <polygon points="0,0 10,0 5,8" fill="var(--timeline-playhead)" />
            </svg>
            <div style={{ width: 2, height: '100%', background: 'var(--timeline-playhead)' }} />
          </div>
        </div>
      </div>
    </div>
  );
};
