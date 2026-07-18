/**
 * TimelinePanel — AE-style timeline with Outliner embedded on the left.
 * Layout: header (playback controls) → flex row containing [Outliner | Ruler+Tracks].
 * The Outliner (left sidebar) shows layer names aligned with timeline track rows.
 * Playhead updates via direct DOM manipulation for smooth playback.
 */
import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useTimelineStore } from '../../../state/timelineStore';
import { PlaybackControls } from './PlaybackControls';
import { TimelineRuler } from './TimelineRuler';
import { TrackLabels } from './TrackLabels';
import { KeyframeArea } from './KeyframeArea';
import { Playhead } from './Playhead';

const OutlinerPanel = React.lazy(() => import('../outliner/OutlinerPanel'));

export const TimelinePanel: React.FC = () => {
  const comp = useCompositionStore((s) => s.activeCompositionId
    ? s.compositions.find((c) => c.id === s.activeCompositionId) ?? null : null);
  const zoom = useTimelineStore((s) => s.zoom);
  const scrollX = useTimelineStore((s) => s.scrollX);
  const setScrollX = useTimelineStore((s) => s.setScrollX);

  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set());
  const [trackLabelWidth, setTrackLabelWidth] = useState(200);
  const [outlinerWidth, setOutlinerWidth] = useState(250);
  const tracksRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);

  const layers = comp?.layers ?? [];
  const totalFrames = comp ? Math.floor(comp.duration * comp.fps) : 250;
  const currentFrame = comp ? Math.floor(comp.currentTime * comp.fps) : 0;

  // Update playhead DOM position directly during playback
  useEffect(() => {
    if (playheadRef.current) {
      playheadRef.current.style.left = `${currentFrame * zoom}px`;
    }
  }, [currentFrame, zoom]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollX(e.currentTarget.scrollLeft);
  }, [setScrollX]);

  const toggleExpand = useCallback((layerId: string) => {
    setExpandedLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layerId)) next.delete(layerId);
      else next.add(layerId);
      return next;
    });
  }, []);

  if (!comp) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-ui-xs text-text-disabled">
        No composition
      </div>
    );
  }

  const propertyPaths = [
    { path: 'transform.position', label: 'Position' },
    { path: 'transform.rotation', label: 'Rotation' },
    { path: 'transform.scale', label: 'Scale' },
    { path: 'opacity', label: 'Opacity' },
  ];

  return (
    <div className="flex flex-col h-full bg-surface-alt select-none">
      {/* ── Header: Playback controls + time display + zoom ── */}
      <PlaybackControls comp={comp} totalFrames={totalFrames} currentFrame={currentFrame} />

      {/* ── Flex row: Outliner (left) + Timeline content (right) ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* K5: Outliner embedded on left side of timeline (AE-style) */}
        <div
          className="flex-shrink-0 overflow-hidden border-r border-border bg-surface flex flex-col"
          style={{ width: outlinerWidth }}
        >
          <React.Suspense fallback={<div className="flex-1 flex items-center justify-center text-ui-xs">Loading...</div>}>
            <OutlinerPanel />
          </React.Suspense>
        </div>

        {/* Resize handle for Outliner width */}
        <div
          className="w-1 cursor-col-resize flex-shrink-0 hover:bg-accent bg-border transition-colors"
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startW = outlinerWidth;
            const mm = (ev: MouseEvent) => setOutlinerWidth(Math.max(120, Math.min(500, startW + ev.clientX - startX)));
            const mu = () => { document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu); };
            document.addEventListener('mousemove', mm);
            document.addEventListener('mouseup', mu);
          }}
        />

        {/* Timeline content (ruler + track labels + keyframe area) */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* ── Ruler ── */}
          <TimelineRuler
            totalFrames={totalFrames}
            currentFrame={currentFrame}
            zoom={zoom}
            scrollX={scrollX}
            compId={comp.id}
            workAreaStart={comp.workAreaStart != null ? Math.floor(comp.workAreaStart * comp.fps) : undefined}
            workAreaEnd={comp.workAreaEnd != null ? Math.floor(comp.workAreaEnd * comp.fps) : undefined}
          />

          {/* ── Tracks area (labels + keyframes) ── */}
          <div className="flex flex-1 overflow-hidden">
            {/* Track labels */}
            <div
              className="flex-shrink-0 overflow-hidden border-r border-border bg-surface"
              style={{ width: trackLabelWidth }}
            >
              <TrackLabels
                layers={layers}
                expandedLayers={expandedLayers}
                onToggleExpand={toggleExpand}
                propertyPaths={propertyPaths}
                currentFrame={currentFrame}
                compId={comp.id}
              />
            </div>

            {/* Resize handle for track labels */}
            <div
              className="w-1 cursor-col-resize flex-shrink-0 hover:bg-accent bg-border transition-colors"
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startW = trackLabelWidth;
                const mm = (ev: MouseEvent) => setTrackLabelWidth(Math.max(100, Math.min(400, startW + ev.clientX - startX)));
                const mu = () => { document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu); };
                document.addEventListener('mousemove', mm);
                document.addEventListener('mouseup', mu);
              }}
            />

            {/* Keyframe area */}
            <div
              ref={tracksRef}
              className="flex-1 overflow-auto relative"
              onScroll={handleScroll}
            >
              <div style={{ width: totalFrames * zoom + 100, minHeight: '100%', position: 'relative' }}>
                <KeyframeArea
                  layers={layers}
                  expandedLayers={expandedLayers}
                  propertyPaths={propertyPaths}
                  currentFrame={currentFrame}
                  zoom={zoom}
                  totalFrames={totalFrames}
                  compId={comp.id}
                />
              </div>
              <Playhead ref={playheadRef} currentFrame={currentFrame} zoom={zoom} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelinePanel;
