/**
 * CacheIndicator — visual cache bar spanning the full timeline.
 *
 * FIX: Uses frameCache.peek() instead of .get() so the UI poll
 * does not reset LRU timestamps for every cached frame every 100ms.
 * The old code called .get() which updates lastAccessed, effectively
 * defeating LRU eviction and keeping all frames "fresh" forever.
 */
import React, { useEffect, useRef, useState } from 'react';
import type { CacheQuality } from '../../../renderer/cache/FrameCache';

interface Props {
  compId: string;
  totalFrames: number;
  zoom: number;
  scrollX: number;
  isBuilding?: boolean;
  buildProgress?: { currentFrame: number; totalFrames: number } | null;
}

function getFrameCache() {
  return (window as any).__frameCache ?? null;
}

export const CacheIndicator: React.FC<Props> = ({
  compId,
  totalFrames,
  zoom,
  scrollX,
  isBuilding,
  buildProgress,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [statusText, setStatusText] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const fc = getFrameCache();
      const width = Math.max(1, totalFrames * zoom);
      const barHeight = 5;

      if (canvas.width !== Math.ceil(width) || canvas.height !== barHeight) {
        canvas.width = Math.ceil(width);
        canvas.height = barHeight;
      }

      ctx.clearRect(0, 0, canvas.width, barHeight);
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.fillRect(0, 0, canvas.width, barHeight);

      if (!fc || !compId || totalFrames <= 0) {
        setStatusText('');
        return;
      }

      const memBytes = fc.getMemoryUsage();
      const memMB = Math.round(memBytes / (1024 * 1024));
      let cachedCount = 0;

      const maxIndividualBars = 2000;

      if (totalFrames <= maxIndividualBars) {
        for (let f = 0; f <= totalFrames; f++) {
          // FIX: peek() does not touch lastAccessed
          const entry = fc.peek(compId, f);
          if (!entry) continue;
          cachedCount++;
          const x = f * zoom;
          const barW = Math.max(1, Math.ceil(zoom));
          ctx.fillStyle =
            entry.quality === 'full'
              ? '#22c55e'
              : entry.quality === 'half'
              ? '#4ade80'
              : '#86efac';
          ctx.fillRect(x, 0, barW, barHeight);
        }
      } else {
        let blockStart = -1;
        let blockQuality: CacheQuality = 'full';
        for (let f = 0; f <= totalFrames; f++) {
          // FIX: peek() does not touch lastAccessed
          const entry = fc.peek(compId, f);
          const isCached = !!entry;

          if (isCached) {
            cachedCount++;
            if (blockStart < 0) {
              blockStart = f;
              blockQuality = entry!.quality;
            }
          }

          if ((!isCached || f === totalFrames) && blockStart >= 0) {
            const x = blockStart * zoom;
            const blockEnd = isCached ? f : f - 1;
            const w = Math.max(
              1,
              (blockEnd - blockStart + 1) * zoom,
            );
            ctx.fillStyle =
              blockQuality === 'full'
                ? '#22c55e'
                : blockQuality === 'half'
                ? '#4ade80'
                : '#86efac';
            ctx.fillRect(x, 0, w, barHeight);
            blockStart = -1;
          }
        }
      }

      // Build progress overlay
      if (isBuilding && buildProgress && buildProgress.totalFrames > 0) {
        const current = buildProgress.currentFrame;
        const lookAhead = Math.min(10, buildProgress.totalFrames);
        for (
          let f = current;
          f <= current + lookAhead && f <= totalFrames;
          f++
        ) {
          const x = f * zoom;
          ctx.fillStyle = 'rgba(234, 179, 8, 0.7)';
          ctx.fillRect(x, 0, Math.max(1, Math.ceil(zoom)), barHeight);
        }
        const progressX = current * zoom;
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(progressX, 0, Math.max(2, Math.ceil(zoom)), barHeight);
      }

      if (buildProgress && buildProgress.totalFrames > 0) {
        const fraction = Math.min(
          1,
          buildProgress.currentFrame /
            (buildProgress.totalFrames + buildProgress.currentFrame),
        );
        if (fraction > 0 && fraction < 1) {
          ctx.fillStyle = 'rgba(234, 179, 8, 0.3)';
          ctx.fillRect(0, 3, canvas.width * fraction, 2);
        }
      }

      const pct =
        totalFrames > 0
          ? Math.round((cachedCount / totalFrames) * 100)
          : 0;
      if (isBuilding) {
        setStatusText(`Caching... ${pct}% (${memMB} MB)`);
      } else if (cachedCount > 0) {
        setStatusText(`Cached: ${pct}% (${memMB} MB)`);
      } else {
        setStatusText('');
      }
    }, 100);

    return () => clearInterval(interval);
  }, [compId, totalFrames, zoom, isBuilding, buildProgress]);

  return (
    <div
      className="absolute top-0 left-0 right-0 pointer-events-none z-10"
      style={{ height: 5 }}
    >
      {statusText && (
        <div
          className="absolute top-0 right-1 text-[8px] font-mono leading-none"
          style={{
            color: isBuilding ? '#fbbf24' : 'rgba(255,255,255,0.35)',
            textShadow: '0 0 2px rgba(0,0,0,0.8)',
            pointerEvents: 'none',
            zIndex: 11,
          }}
        >
          {statusText}
        </div>
      )}

      <div className="relative w-full h-full overflow-hidden">
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: -scrollX,
            width: totalFrames * zoom,
            height: 5,
            imageRendering: 'pixelated',
          }}
        />
      </div>
    </div>
  );
};

export default CacheIndicator;