import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useMarkerStore } from '../../../state/markerStore';
import { useTimelineStore } from '../../../state/timelineStore';
import { useRamPreviewStore } from '../../../state/ramPreviewStore';
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
  workAreaEnabled?: boolean;
}

function niceStep(zoom: number, targetPx: number): number {
  const rawFrames = targetPx / zoom;
  const steps = [
    1, 2, 5, 10, 15, 20, 25, 30, 50, 60, 100,
    150, 200, 250, 500, 1000, 2000, 5000, 10000,
  ];
  for (const s of steps) if (s >= rawFrames) return s;
  return steps[steps.length - 1];
}

// ── Green cache bar (unchanged) ─────────────────────────────────
const CacheBar: React.FC<{
  compId: string;
  totalFrames: number;
  zoom: number;
  scrollX: number;
  width: number;
}> = ({ compId, totalFrames, zoom, scrollX, width }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cachedFrames = useRamPreviewStore(s => s.cachedFramesByComp.get(compId));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!cachedFrames || cachedFrames.size === 0) return;

    const h = canvas.height;
    ctx.fillStyle = '#4ade80';

    let runStart: number | null = null;
    let runEnd: number | null = null;

    const flush = () => {
      if (runStart === null || runEnd === null) return;
      const x = Math.floor(runStart * zoom - scrollX);
      const w = Math.max(1, Math.ceil((runEnd - runStart + 1) * zoom));
      if (x + w < 0 || x > canvas.width) { runStart = null; runEnd = null; return; }
      ctx.fillRect(
        Math.max(0, x),
        0,
        Math.min(w, canvas.width - Math.max(0, x)),
        h,
      );
      runStart = null;
      runEnd = null;
    };

    const sorted = Array.from(cachedFrames).sort((a, b) => a - b);
    for (const frame of sorted) {
      if (frame < 0 || frame >= totalFrames) continue;
      if (runStart === null) {
        runStart = frame;
        runEnd = frame;
      } else if (frame === runEnd! + 1) {
        runEnd = frame;
      } else {
        flush();
        runStart = frame;
        runEnd = frame;
      }
    }
    flush();
  }, [cachedFrames, zoom, scrollX, width, totalFrames]);

  if (!cachedFrames || cachedFrames.size === 0) return null;

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={3}
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: 3,
        pointerEvents: 'none',
        opacity: 0.85,
      }}
    />
  );
};

export const TimelineRuler: React.FC<Props> = React.memo(({
  totalFrames,
  zoom,
  scrollX,
  compId,
  fps,
  workAreaStart,
  workAreaEnd,
  workAreaEnabled,
}) => {
  const rulerRef = useRef<HTMLDivElement>(null);
  const scrubbing = useRef(false);
  const timeDisplay = useTimelineStore(s => s.timeDisplay);
  const [rulerWidth, setRulerWidth] = useState(0);

  useEffect(() => {
    const el = rulerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      setRulerWidth(entries[0]?.contentRect.width ?? 0);
    });
    ro.observe(el);
    setRulerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const frameFromX = useCallback((clientX: number): number => {
    if (!rulerRef.current) return 0;
    const rect = rulerRef.current.getBoundingClientRect();
    const x = clientX - rect.left + scrollX;
    // Allow scrubbing past comp end — no upper clamp here
    return Math.max(0, Math.round(x / zoom));
  }, [zoom, scrollX]);

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
  const viewportWidthPx = rulerWidth || 2000;
  const firstFrame = Math.max(0, Math.floor(scrollX / zoom) - minorStep);
  // Show ticks BEYOND totalFrames so out-of-comp region also has visual guides
  const rulerRangeEnd = Math.ceil((scrollX + viewportWidthPx) / zoom) + minorStep;
  const startTick = Math.floor(firstFrame / minorStep) * minorStep;

  const ticks: React.ReactNode[] = [];
  for (let f = startTick; f <= rulerRangeEnd; f += minorStep) {
    if (f < 0) continue;
    const isLabel = f % labelStep === 0;
    const isPastComp = f > totalFrames;

    ticks.push(
      <div key={f} className="absolute top-0" style={{ left: f * zoom, pointerEvents: 'none' }}>
        <div
          style={{
            width: 1,
            height: isLabel ? 12 : 5,
            background: isPastComp
              ? 'rgba(150,160,180,0.3)'
              : 'var(--color-text-secondary, rgba(200,205,220,0.7))',
            opacity: isLabel ? (isPastComp ? 0.5 : 1) : (isPastComp ? 0.3 : 0.5),
          }}
        />
        {isLabel && (
          <span
            className="absolute font-mono leading-none whitespace-nowrap"
            style={{
              top: 14,
              left: 4,
              fontSize: 10,
              color: isPastComp
                ? 'rgba(150,160,180,0.5)'
                : 'var(--color-text-tertiary, rgba(180,190,210,0.75))',
              letterSpacing: '0.02em',
              fontWeight: 500,
            }}
          >
            {formatTime(f / fps, fps, timeDisplay)}
          </span>
        )}
      </div>,
    );
  }

  const markers = useMarkerStore(s => s.markersByComposition[compId]);

  const handleMarkerMouseDown = useCallback(
    (e: React.MouseEvent, markerId: string) => {
      e.stopPropagation();
      const s = useMarkerStore.getState();
      const existing = s.markersByComposition[compId] ?? [];
      const marker = existing.find(m => m.id === markerId);
      if (!marker) return;
      animationClock.seekToFrame(marker.frame);
      useCompositionStore.getState().setCurrentTime(compId, marker.time);
    },
    [compId],
  );

  return (
    <div
      className="relative flex-shrink-0 overflow-hidden"
      style={{
        height: 32,
        background: 'transparent',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <div
        ref={rulerRef}
        className="absolute inset-0 cursor-ew-resize"
        onMouseDown={handleDown}
      >
        <div
          style={{
            width: (rulerRangeEnd + 100) * zoom,
            height: '100%',
            position: 'relative',
            transform: `translateX(${-scrollX}px)`,
          }}
        >
          {/* ── Out-of-composition darkened region ── */}
          {rulerRangeEnd > totalFrames && (
            <div
              className="absolute top-0 bottom-0 pointer-events-none"
              style={{
                left: totalFrames * zoom,
                width: (rulerRangeEnd - totalFrames + 100) * zoom,
                background: 'rgba(0,0,0,0.55)',
              }}
            />
          )}

          {/* ── Composition END marker — red/orange (unmistakable end-of-comp) ── */}
          <div
            className="absolute top-0 bottom-0 pointer-events-none"
            style={{
              left: totalFrames * zoom - 1,
              width: 3,
              background: '#ff5c5c',
              boxShadow: '0 0 6px rgba(255,92,92,0.7)',
              opacity: 0.95,
              zIndex: 5,
            }}
          />
          {/* Small "END" flag on top of the comp-end line for extra clarity */}
          <div
            className="absolute pointer-events-none"
            style={{
              left: totalFrames * zoom - 1,
              top: 2,
              background: '#ff5c5c',
              color: '#fff',
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: '0.05em',
              padding: '1px 4px',
              borderRadius: '0 3px 3px 0',
              lineHeight: '10px',
              fontFamily: 'system-ui, sans-serif',
              zIndex: 6,
              boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
            }}
          >
            END
          </div>

          {/* ── Work area shading — only when explicitly enabled ── */}
          {workAreaEnabled && workAreaStart !== undefined && workAreaEnd !== undefined && (
            <>
              {workAreaStart > 0 && (
                <div
                  className="absolute top-0 bottom-0 pointer-events-none"
                  style={{
                    left: 0,
                    width: workAreaStart * zoom,
                    background: 'rgba(0,0,0,0.25)',
                  }}
                />
              )}
              <div
                className="absolute top-0 bottom-0 pointer-events-none"
                style={{
                  left: workAreaStart * zoom,
                  width: (workAreaEnd - workAreaStart) * zoom,
                  background: 'rgba(255,255,255,0.02)',
                  borderTop: '2px solid rgba(88,101,255,0.5)',  // dimmer, translucent
                }}
              />
              {workAreaEnd < totalFrames && (
                <div
                  className="absolute top-0 bottom-0 pointer-events-none"
                  style={{
                    left: workAreaEnd * zoom,
                    width: (totalFrames - workAreaEnd) * zoom,
                    background: 'rgba(0,0,0,0.25)',
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
              style={{ left: marker.frame * zoom, zIndex: 6 }}
              onMouseDown={e => handleMarkerMouseDown(e, marker.id)}
              title={marker.label || `Marker at frame ${marker.frame}`}
            >
              <svg width="10" height="14" viewBox="0 0 10 14">
                <polygon
                  points="0,0 10,0 10,10 5,14 0,10"
                  fill={marker.color}
                  stroke="rgba(0,0,0,0.4)"
                  strokeWidth="0.5"
                />
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

        <CacheBar
          compId={compId}
          totalFrames={totalFrames}
          zoom={zoom}
          scrollX={scrollX}
          width={rulerWidth}
        />
      </div>
    </div>
  );
}, (prev, next) => {
  return prev.totalFrames === next.totalFrames &&
         prev.zoom === next.zoom &&
         prev.scrollX === next.scrollX &&
         prev.compId === next.compId &&
         prev.fps === next.fps &&
         prev.workAreaStart === next.workAreaStart &&
         prev.workAreaEnd === next.workAreaEnd &&
         prev.workAreaEnabled === next.workAreaEnabled;
  // Ignore currentFrame — playhead is external
});