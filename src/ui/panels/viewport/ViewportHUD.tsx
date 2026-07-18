/**
 * ViewportHUD — information overlay at the bottom of the viewport.
 * Shows composition info, transform mode indicator, selected layer count,
 * FPS, zoom controls (+/- buttons and percentage), and optional stats.
 */
import React from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useViewportStore } from '../../../state/viewportStore';
import { useTimelineStore } from '../../../state/timelineStore';
import { formatTime } from '../../../utils/time';
import { VIEWPORT_CONFIG } from '../../../config/viewportConfig';

/** Always-visible color-coded FPS indicator */
const PlaybackFpsIndicator: React.FC<{ renderFps: number; targetFps: number }> = ({
  renderFps, targetFps,
}) => {
  const isPlaying = useTimelineStore(s => s.playbackState === 'playing');
  const ratio = targetFps > 0 ? renderFps / targetFps : 0;
  let color = 'var(--text-disabled)';
  let indicator = '○';
  if (isPlaying) {
    if (ratio >= 0.95) { color = '#4ade80'; indicator = '●'; }          /* green */
    else if (ratio >= 0.75) { color = '#facc15'; indicator = '●'; }     /* yellow */
    else { color = '#f87171'; indicator = '●'; }                         /* red */
  }
  return (
    <span
      className="inline-flex items-center gap-1 font-mono"
      style={{ color }}
      title={
        isPlaying
          ? `Rendering at ${renderFps} fps (target ${targetFps} fps)`
          : `Idle — target ${targetFps} fps`
      }
    >
      <span className="text-[8px] leading-none">{indicator}</span>
      <span>{renderFps} / {targetFps} fps</span>
    </span>
  );
};

interface ViewportHUDProps {
  fps: number;
  zoom: number;
  viewportSize: { width: number; height: number };
  selectedLayerIds?: string[];
  transformMode?: string | null;
  onZoomChange?: (zoom: number) => void;
  onFitToViewport?: () => void;
}

export const ViewportHUD: React.FC<ViewportHUDProps> = ({
  fps,
  zoom,
  viewportSize,
  selectedLayerIds,
  transformMode,
  onZoomChange,
  onFitToViewport,
}) => {
  const comp = useCompositionStore((s) => {
    const id = s.activeCompositionId;
    return id ? s.compositions.find((c) => c.id === id) ?? null : null;
  });

  if (!comp) return null;

  const zoomPercent = Math.round((1 / (zoom || 1)) * 100);
  const currentFrame = Math.floor(comp.currentTime * comp.fps);
  const totalFrames = Math.floor(comp.duration * comp.fps);
  const selCount = selectedLayerIds?.length ?? 0;

  const zoomIn = () => onZoomChange?.(zoom / VIEWPORT_CONFIG.ZOOM_FACTOR);
  const zoomOut = () => onZoomChange?.(zoom * VIEWPORT_CONFIG.ZOOM_FACTOR);

  return (
    <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-2 py-1 pointer-events-none z-20">
      {/* Top-left: Grid toggle button (M6) */}
      <div className="absolute top-0 left-0 -mt-8 flex items-center gap-1 pointer-events-auto">
        <button onClick={() => useViewportStore.getState().toggleGrid()}
          className={`w-5 h-5 flex items-center justify-center rounded-sm border-0 cursor-pointer text-[9px] ${useViewportStore.getState().settings.showGrid ? 'bg-accent text-white' : 'bg-panel-header text-text-secondary hover:bg-bg-hover'}`}
          title="Toggle Grid">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="0.8">
            <rect x="0.5" y="0.5" width="9" height="9" />
            <line x1="3.5" y1="0.5" x2="3.5" y2="9.5" /><line x1="6.5" y1="0.5" x2="6.5" y2="9.5" />
            <line x1="0.5" y1="3.5" x2="9.5" y2="3.5" /><line x1="0.5" y1="6.5" x2="9.5" y2="6.5" />
          </svg>
        </button>
        <button onClick={() => useViewportStore.getState().toggleSnapping()}
          className={`w-5 h-5 flex items-center justify-center rounded-sm border-0 cursor-pointer text-[9px] ${useViewportStore.getState().settings.snappingEnabled ? 'bg-accent text-white' : 'bg-panel-header text-text-secondary hover:bg-bg-hover'}`}
          title="Toggle Snapping">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="0.8">
            <circle cx="5" cy="5" r="4" /><circle cx="5" cy="5" r="1.5" fill="currentColor" />
          </svg>
        </button>
      </div>

      {/* Left: composition info */}
      <div className="flex items-center gap-3 text-ui-xs text-text-disabled font-mono">
        <span className="text-text-primary font-medium">{comp.name}</span>
        <span className="text-text-disabled">|</span>
        <span>{comp.width}×{comp.height}</span>
        <span className="text-text-disabled">|</span>
        <span>{comp.fps} fps</span>
        <span className="text-text-disabled">|</span>
        <span>{formatTime(comp.currentTime, comp.fps)} / {formatTime(comp.duration, comp.fps)}</span>
        <span className="text-text-disabled">|</span>
        <span>Frame {currentFrame}/{totalFrames}</span>
      </div>

      {/* Center: transform mode indicator + zoom controls */}
      <div className="flex items-center gap-2">
        {transformMode && (
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-accent text-white rounded-sm text-ui-xs font-mono font-semibold">
            <span>{transformMode}</span>
          </div>
        )}
        {selCount > 0 && (
          <span className="text-ui-xs text-text-secondary font-mono">
            {selCount} layer{selCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Right: zoom controls + viewport info */}
      <div className="flex items-center gap-1 text-ui-xs text-text-disabled font-mono">
        {/* Zoom controls — pointer-events re-enabled */}
        <div className="flex items-center gap-0.5 pointer-events-auto">
          <button
            onClick={zoomOut}
            className="w-4 h-4 flex items-center justify-center rounded-sm bg-panel-header hover:bg-bg-hover text-text-primary text-xs leading-none"
            title="Zoom Out"
          >−</button>
          <button
            onClick={onFitToViewport}
            className="px-1 h-4 flex items-center justify-center rounded-sm bg-panel-header hover:bg-bg-hover text-text-primary text-xs leading-none"
            title="Fit to Viewport (Home)"
          >{zoomPercent}%</button>
          <button
            onClick={zoomIn}
            className="w-4 h-4 flex items-center justify-center rounded-sm bg-panel-header hover:bg-bg-hover text-text-primary text-xs leading-none"
            title="Zoom In"
          >+</button>
        </div>
        <span className="text-text-disabled mx-1">|</span>
        <PlaybackFpsIndicator renderFps={fps} targetFps={comp.fps} />
        <span className="text-text-disabled mx-1">|</span>
        <span>{viewportSize.width}×{viewportSize.height}</span>
      </div>
    </div>
  );
};
