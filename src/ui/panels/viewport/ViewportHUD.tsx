/**
 * ViewportHUD — information overlay at the bottom of the viewport.
 * Shows composition resolution, FPS, zoom percentage, and current time.
 */
import React from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { formatTime } from '../../../utils/time';

interface ViewportHUDProps {
  fps: number;
  zoom: number;
}

export const ViewportHUD: React.FC<ViewportHUDProps> = ({ fps, zoom }) => {
  const comp = useCompositionStore((s) => {
    const id = s.activeCompositionId;
    return id ? s.compositions.find((c) => c.id === id) ?? null : null;
  });

  if (!comp) return null;

  const zoomPercent = Math.round((1 / (zoom || 1)) * 100);

  return (
    <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-2 py-1 pointer-events-none z-20">
      {/* Left: composition info */}
      <div className="flex items-center gap-3 text-ui-xs text-text-disabled font-mono">
        <span>
          {comp.width}×{comp.height}
        </span>
        <span>{comp.fps} fps</span>
        <span>Time: {formatTime(comp.currentTime, comp.fps)}</span>
      </div>

      {/* Right: viewport info */}
      <div className="flex items-center gap-3 text-ui-xs text-text-disabled font-mono">
        <span>{fps} FPS</span>
        <span>{zoomPercent}%</span>
      </div>
    </div>
  );
};
