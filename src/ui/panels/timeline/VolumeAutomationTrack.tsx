/**
 * VolumeAutomationTrack — renders a volume automation lane inside an expanded audio layer.
 * Shows a horizontal line at the current volume level (0-100%), with keyframe diamonds
 * and a draggable envelope line. Click on the line to add a new keyframe.
 */
import React, { useCallback, useRef, useState } from 'react';
import type { Keyframe } from '../../../types/keyframe';
import { useKeyframeStore } from '../../../state/keyframeStore';
import { LAYER_COLORS } from './layerColors';

interface Props {
  layerId: string;
  keyframes: Keyframe[];
  zoom: number;
  colorIdx: number;
}

const TRACK_HEIGHT = 36;
const VOLUME_MIN = 0;
const VOLUME_MAX = 100;

/** Convert volume value (0-100) to Y position within the track */
function volumeToY(volume: number): number {
  const normalized = Math.max(VOLUME_MIN, Math.min(VOLUME_MAX, volume));
  return TRACK_HEIGHT - (normalized / VOLUME_MAX) * TRACK_HEIGHT;
}

/** Convert Y position to volume value */
function yToVolume(y: number): number {
  const volume = ((TRACK_HEIGHT - y) / TRACK_HEIGHT) * VOLUME_MAX;
  return Math.round(Math.max(VOLUME_MIN, Math.min(VOLUME_MAX, volume)));
}

export const VolumeAutomationTrack: React.FC<Props> = ({
  layerId, keyframes, zoom, colorIdx,
}) => {
  const engine = useKeyframeStore(s => s.engine);
  const palette = LAYER_COLORS[colorIdx % LAYER_COLORS.length];
  const [hovered, setHovered] = useState(false);
  const [draggingKfId, setDraggingKfId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Sort keyframes by time
  const sortedKfs = [...keyframes].sort((a, b) => a.time - b.time);

  // Build the polyline points for the volume envelope
  const buildEnvelopePath = useCallback((): string => {
    if (sortedKfs.length === 0) {
      // No keyframes — flat line at 100%
      return `M 0 ${volumeToY(100)} L 10000 ${volumeToY(100)}`;
    }

    const points: string[] = [];
    // Start from left edge at first keyframe value
    const firstVal = typeof sortedKfs[0].value === 'number' ? sortedKfs[0].value : 100;
    points.push(`M 0 ${volumeToY(firstVal)}`);

    for (const kf of sortedKfs) {
      const x = kf.time * zoom;
      const val = typeof kf.value === 'number' ? kf.value : 100;
      points.push(`L ${x} ${volumeToY(val)}`);
    }

    // Extend to right edge at last keyframe value
    const lastVal = typeof sortedKfs[sortedKfs.length - 1].value === 'number'
      ? sortedKfs[sortedKfs.length - 1].value : 100;
    const maxX = sortedKfs[sortedKfs.length - 1].time * zoom + 5000;
    points.push(`L ${maxX} ${volumeToY(lastVal)}`);

    return points.join(' ');
  }, [sortedKfs, zoom]);

  // Handle click on the track to add a new keyframe
  const handleTrackClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Don't add keyframe if clicking on an existing one
    const target = e.target as SVGElement;
    if (target.closest('[data-vol-kf]')) return;

    // Calculate frame and volume from click position
    const frame = Math.max(0, Math.round(x / zoom));
    const volume = yToVolume(y);

    // Add keyframe via engine
    const id = `vol_${layerId}_${frame}_${Date.now()}`;
    engine.addKeyframe(layerId, {
      id,
      property: 'volume',
      time: frame,
      value: volume,
      interpolation: 'linear',
    });
    useKeyframeStore.setState(s => ({ revision: s.revision + 1 }));
  }, [layerId, zoom, engine]);

  // Handle dragging a volume keyframe
  const handleKfMouseDown = useCallback((kfId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggingKfId(kfId);

    const svg = svgRef.current;
    if (!svg) return;

    const onMove = (ev: MouseEvent) => {
      const rect = svg.getBoundingClientRect();
      const y = ev.clientY - rect.top;
      const volume = yToVolume(y);
      engine.updateKeyframe(kfId, { value: volume });
      useKeyframeStore.setState(s => ({ revision: s.revision + 1 }));
    };

    const onUp = () => {
      setDraggingKfId(null);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [engine]);

  return (
    <div
      className="relative"
      style={{
        height: TRACK_HEIGHT,
        borderBottom: '1px solid var(--color-divider)',
        background: 'rgba(0,0,0,0.08)',
        cursor: 'crosshair',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Volume scale labels */}
      <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between px-1 pointer-events-none"
        style={{ width: 24, fontSize: 8, color: 'var(--color-text-disabled)' }}>
        <span>100</span>
        <span>50</span>
        <span>0</span>
      </div>

      <svg
        ref={svgRef}
        className="absolute inset-0"
        style={{ left: 24, width: 'calc(100% - 24px)' }}
        onClick={handleTrackClick}
      >
        {/* Grid lines at 25%, 50%, 75% */}
        {[25, 50, 75].map(v => (
          <line key={v} x1={0} y1={volumeToY(v)} x2={99999} y2={volumeToY(v)}
            stroke="var(--color-divider)" strokeWidth={0.5} strokeDasharray="2,4" />
        ))}

        {/* Volume envelope line */}
        <path
          d={buildEnvelopePath()}
          fill="none"
          stroke={palette.accent}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />

        {/* Fill under the envelope */}
        <path
          d={buildEnvelopePath() + ` L 99999 ${TRACK_HEIGHT} L 0 ${TRACK_HEIGHT} Z`}
          fill={palette.accent}
          opacity={0.08}
        />

        {/* Keyframe diamonds */}
        {sortedKfs.map(kf => {
          const x = kf.time * zoom;
          const val = typeof kf.value === 'number' ? kf.value : 100;
          const y = volumeToY(val);
          const isSelected = useKeyframeStore.getState().selectedKeyframeIds.has(kf.id);
          const size = 8;
          const isDragging = draggingKfId === kf.id;

          return (
            <g key={kf.id}
              data-vol-kf="1"
              onMouseDown={(e) => handleKfMouseDown(kf.id, e)}
              style={{ cursor: 'ns-resize' }}
            >
              {/* Selection ring */}
              {isSelected && (
                <circle cx={x} cy={y} r={size / 2 + 3}
                  fill="var(--color-accent)" opacity={0.2} />
              )}
              {/* Diamond shape */}
              <polygon
                points={`${x},${y - size / 2} ${x + size / 2},${y} ${x},${y + size / 2} ${x - size / 2},${y}`}
                fill={isDragging ? '#ffffff' : isSelected ? '#ffffff' : palette.accent}
                stroke={isSelected ? 'var(--color-accent)' : 'rgba(0,0,0,0.3)'}
                strokeWidth={isSelected ? 1.5 : 0.5}
              />
            </g>
          );
        })}
      </svg>

      {/* Volume label */}
      <div className="absolute top-0.5 right-1 pointer-events-none"
        style={{ fontSize: 8, color: 'var(--color-text-disabled)' }}>
        Volume
      </div>
    </div>
  );
};
