import { forwardRef } from 'react';

interface PlayheadProps {
  currentFrame: number;
  zoom: number;
}

/**
 * Playhead — renders the vertical playhead line and triangle indicator.
 * Uses a ref for direct DOM manipulation during playback (no React re-render).
 */
export const Playhead = forwardRef<HTMLDivElement, PlayheadProps>(
  ({ currentFrame, zoom }, ref) => {
    return (
      <div
        ref={ref}
        className="absolute top-0 z-20 pointer-events-none"
        style={{
          left: currentFrame * zoom,
          width: 2,
          height: '100%',
          transition: 'none',
        }}
      >
        {/* Triangle at top */}
        <svg width="10" height="8" style={{ position: 'absolute', top: -1, left: -4 }}>
          <polygon points="0,0 10,0 5,8" fill="var(--timeline-playhead)" />
        </svg>

        {/* Line */}
        <div
          style={{
            width: 2,
            height: 'calc(100% - 6px)',
            background: 'var(--timeline-playhead)',
            opacity: 0.8,
          }}
        />
      </div>
    );
  },
);

Playhead.displayName = 'Playhead';
