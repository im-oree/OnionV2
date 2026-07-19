/**
 * CacheIndicator — visual cache bar spanning the full timeline showing:
 * - Each cached frame as a thin colored bar (green shades by quality)
 * - Frames currently being built (yellow)
 * - RAM preview build progress (bright yellow stripe)
 * - Cache memory usage text
 * - Cache coverage percentage
 *
 * The bar spans the full timeline width and scrolls with the timeline.
 * Each frame gets its own bar (no sampling) — zoom handles visual density.
 */
import React, { useEffect, useRef, useState } from 'react';
import type { CacheQuality } from '../../../renderer/cache/FrameCache';

interface Props {
  compId: string;
  totalFrames: number;
  zoom: number;
  scrollX: number;
  /** If true, animate the build progress indicator (pulsing) */
  isBuilding?: boolean;
  /** Current build progress for showing yellow overlay */
  buildProgress?: { currentFrame: number; totalFrames: number } | null;
}

function getFrameCache() {
  return (window as any).__frameCache ?? null;
}

// Quality colors are handled inline in the draw loop

export const CacheIndicator: React.FC<Props> = ({
  compId, totalFrames, zoom, scrollX, isBuilding, buildProgress,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [statusText, setStatusText] = useState('');

  // Draw the cache indicator bar at ~10fps (100ms intervals)
  // 10fps is enough for smooth visual updates without being a perf hog
  useEffect(() => {
    const interval = setInterval(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const fc = getFrameCache();
      const width = Math.max(1, totalFrames * zoom);
      const barHeight = 5;
      canvas.width = width;
      canvas.height = barHeight;

      ctx.clearRect(0, 0, width, barHeight);

      // Background
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.fillRect(0, 0, width, barHeight);

      if (!fc || !compId || totalFrames <= 0) {
        setStatusText('');
        return;
      }

      const memBytes = fc.getMemoryUsage();
      const memMB = Math.round(memBytes / (1024 * 1024));

      // Get coverage data — iterate through ALL frames in one pass
      // Cache the map locally for the canvas drawing pass
      let cachedCount = 0;

      // Draw each cached frame as a thin vertical bar
      // For performance at high frame counts: draw up to 2000 bars max,
      // if more, merge adjacent frames into blocks
      const maxIndividualBars = 2000;
      if (totalFrames <= maxIndividualBars) {
        // Draw each frame individually
        for (let f = 0; f <= totalFrames; f++) {
          const entry = fc.get(compId, f);
          if (!entry) continue;
          cachedCount++;

          const x = f * zoom;
          const barW = Math.max(1, Math.ceil(zoom));
          ctx.fillStyle = (entry.quality === 'full') ? '#22c55e' : (entry.quality === 'half' ? '#4ade80' : '#86efac');
          ctx.fillRect(x, 0, barW, barHeight);
        }
      } else {
        // Merge adjacent frames into blocks for performance
        let blockStart = -1;
        let blockQuality: CacheQuality = 'full';
        for (let f = 0; f <= totalFrames; f++) {
          const entry = fc.get(compId, f);
          const isCached = !!entry;

          if (isCached) {
            cachedCount++;
            if (blockStart < 0) {
              blockStart = f;
              blockQuality = entry!.quality;
            }
          }

          // End of a cached block
          if ((!isCached || f === totalFrames) && blockStart >= 0) {
            const x = blockStart * zoom;
            const blockEnd = isCached ? f : f - 1;
            const w = Math.max(1, (blockEnd - blockStart + 1) * zoom);
            ctx.fillStyle = (blockQuality === 'full') ? '#22c55e' : (blockQuality === 'half' ? '#4ade80' : '#86efac');
            ctx.fillRect(x, 0, w, barHeight);
            blockStart = -1;
          }
        }
      }

      // Draw build progress (frames currently being built) — yellow overlay
      if (isBuilding && buildProgress && buildProgress.totalFrames > 0) {
        const current = buildProgress.currentFrame;
        const end = buildProgress.currentFrame + Math.min(10, buildProgress.totalFrames);
        for (let f = current; f <= end && f <= totalFrames; f++) {
          const x = f * zoom;
          ctx.fillStyle = 'rgba(234, 179, 8, 0.7)';
          ctx.fillRect(x, 0, Math.max(1, Math.ceil(zoom)), barHeight);
        }

        // Draw a bright progress line at the current build position
        const progressX = current * zoom;
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(progressX, 0, Math.max(2, Math.ceil(zoom)), barHeight);
      }

      // Draw build progress bar at bottom edge when manual preview is building
      if (buildProgress && buildProgress.totalFrames > 0) {
        const fraction = buildProgress.totalFrames > 0
          ? Math.min(1, buildProgress.currentFrame / (buildProgress.totalFrames + buildProgress.currentFrame))
          : 0;
        if (fraction > 0 && fraction < 1) {
          ctx.fillStyle = 'rgba(234, 179, 8, 0.3)';
          ctx.fillRect(0, 3, width * fraction, 2);
        }
      }

      // Update status text
      const pct = totalFrames > 0 ? Math.round((cachedCount / totalFrames) * 100) : 0;
      if (isBuilding) {
        setStatusText(`Caching... ${pct}% (${memMB} MB)`);
      } else if (cachedCount > 0) {
        setStatusText(`Cached: ${pct}% (${memMB} MB)`);
      } else {
        setStatusText('');
      }
    }, 100); // 10fps

    return () => clearInterval(interval);
  }, [compId, totalFrames, zoom]);

  return (
    <div
      className="absolute top-0 left-0 right-0 pointer-events-none z-10"
      style={{ height: 5 }}
    >
      {/* Status text label — top-right corner */}
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

      {/* Cache coverage bar — canvas spans the full timeline width */}
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
