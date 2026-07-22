/**
 * PlayheadOverlay â€” draws the vertical playhead line + top handle.
 *
 * Reads position directly from animationClock via its own RAF loop so it
 * stays smooth during playback even when the composition store's currentTime
 * is being written silently (bypassing React re-renders for performance).
 */
import React, { useEffect, useRef, useState } from 'react';
import { animationClock } from './PlaybackControls';
import { useTimelineStore } from '../../../state/timelineStore';

interface Props {
  zoom: number;
  scrollX: number;
  /** Fallback frame when clock isn't playing (from parent's stored state). */
  currentFrame: number;
  /** Height of the ruler area at the top (the handle sits there). */
  rulerHeight?: number;
}

export const PlayheadOverlay: React.FC<Props> = ({
  zoom,
  scrollX,
  currentFrame,
  rulerHeight = 30,
}) => {
  const [liveFrame, setLiveFrame] = useState(currentFrame);
  const rafRef = useRef(0);
  const playbackState = useTimelineStore((s) => s.playbackState);

  useEffect(() => {
    // Only poll while playing â€” otherwise trust the prop
    if (playbackState !== 'playing') {
      setLiveFrame(currentFrame);
      cancelAnimationFrame(rafRef.current);
      return;
    }

    const tick = () => {
      setLiveFrame(animationClock.currentFrame);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [playbackState, currentFrame]);

  const xPos = liveFrame * zoom - scrollX;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: xPos,
        top: 0,
        bottom: 0,
        width: 1,
        zIndex: 30,
        willChange: 'transform',
      }}
    >
      {/* Vertical line */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: rulerHeight,
          bottom: 0,
          width: 1,
          background: 'var(--timeline-playhead, #5865ff)',
          boxShadow: '0 0 4px rgba(88,101,255,0.6)',
        }}
      />
      {/* Top handle */}
      <div
        style={{
          position: 'absolute',
          left: -5,
          top: 0,
          width: 11,
          height: rulerHeight,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
        }}
      >
        <svg width="11" height={rulerHeight} viewBox={`0 0 11 ${rulerHeight}`}>
          <polygon
            points={`0,2 11,2 11,${rulerHeight - 8} 5.5,${rulerHeight} 0,${rulerHeight - 8}`}
            fill="var(--timeline-playhead, #5865ff)"
            stroke="rgba(0,0,0,0.4)"
            strokeWidth="0.5"
          />
        </svg>
      </div>
    </div>
  );
};