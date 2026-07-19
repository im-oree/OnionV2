import React, { useRef, useCallback } from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useMarkerStore } from '../../../state/markerStore';
import { useTimelineStore } from '../../../state/timelineStore';
import { animationClock } from './PlaybackControls';
import { formatTime } from '../../../utils/time';

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
  const timeDisplay = useTimelineStore(s => s.timeDisplay);

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

  const labelStep = niceStep(zoom, 60);
  const minorStep = Math.max(1, Math.round(labelStep / 5));
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
          style={{
            width: 1,
            height: isLabel ? 10 : 4,
            background: 'var(--color-border-strong)',
            opacity: isLabel ? 0.9 : 0.4,
          }}
        />
        {isLabel && (
          <span
            className="absolute font-mono leading-none whitespace-nowrap"
            style={{
              top: 12, left: 4,
              fontSize: 10,
              color: 'var(--color-text-tertiary)',
              letterSpacing: '0.02em',
            }}
          >
            {formatTime(f / fps, fps, timeDisplay)}
          </span>
        )}
      </div>,
    );
  }

  const markers = useMarkerStore(s => s.markersByComposition[compId]);

  const handleMarkerMouseDown = useCallback((e: React.MouseEvent, markerId: string) => {
    e.stopPropagation();
    const s = useMarkerStore.getState();
    const existing = s.markersByComposition[compId] ?? [];
    const marker = (existing ?? []).find(m => m.id === markerId);
    if (!marker) return;
    animationClock.seekToFrame(marker.frame);
    useCompositionStore.getState().setCurrentTime(compId, marker.time);
  }, [compId]);

  return (
    <div
      className="relative flex-shrink-0 overflow-hidden"
      style={{
        height: 30,
        background: 'transparent',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <div ref={rulerRef} className="absolute inset-0 cursor-ew-resize" onMouseDown={handleDown}>
        <div
          style={{
            width: totalFrames * zoom + 100,
            height: '100%', position: 'relative',
            transform: `translateX(${-scrollX}px)`,
          }}
        >
          {workAreaStart !== undefined && workAreaEnd !== undefined && (
            <>
              {/* Dark outside left */}
              {workAreaStart > 0 && (
                <div
                  className="absolute top-0 bottom-0 pointer-events-none"
                  style={{
                    left: 0,
                    width: workAreaStart * zoom,
                    background: 'rgba(0,0,0,0.35)',
                  }}
                />
              )}

              {/* Active work area highlight */}
              <div
                className="absolute top-0 bottom-0 pointer-events-none"
                style={{
                  left: workAreaStart * zoom,
                  width: (workAreaEnd - workAreaStart) * zoom,
                  background: 'rgba(255,255,255,0.04)',
                  borderTop: '2px solid var(--color-accent)',
                }}
              />

              {/* Dark outside right */}
              {workAreaEnd < totalFrames && (
                <div
                  className="absolute top-0 bottom-0 pointer-events-none"
                  style={{
                    left: workAreaEnd * zoom,
                    width: (totalFrames - workAreaEnd) * zoom,
                    background: 'rgba(0,0,0,0.35)',
                  }}
                />
              )}
            </>
          )}
          {ticks}

          {(markers ?? []).map(marker => (
            <div
              key={marker.id}
              className="absolute top-0 cursor-pointer group"
              style={{ left: marker.frame * zoom }}
              onMouseDown={(e) => handleMarkerMouseDown(e, marker.id)}
              title={marker.label || `Marker at frame ${marker.frame}`}
            >
              <svg width="10" height="14" viewBox="0 0 10 14">
                <polygon points="0,0 10,0 10,10 5,14 0,10" fill={marker.color} stroke="rgba(0,0,0,0.4)" strokeWidth="0.5" />
              </svg>
              {marker.label && (
                <span
                  className="absolute left-[12px] top-0 whitespace-nowrap hidden group-hover:block"
                  style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}
                >
                  {marker.label}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};