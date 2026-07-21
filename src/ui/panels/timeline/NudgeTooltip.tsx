/**
 * NudgeTooltip — floating label near the playhead when nudging keyframes.
 * Shows the cumulative offset (e.g. "+3 frames") and fades out after
 * the user stops pressing Alt+Arrow.
 *
 * Listens to custom events dispatched by useKeyframeShortcuts.
 */
import React, { useEffect, useState, useRef } from 'react';

/**
 * NudgeTooltip — floating label near the playhead when nudging keyframes.
 * Uses position:fixed so it stays on screen regardless of timeline scroll.
 * The parent (TimelinePanel) passes a containerRef so we can compute the
 * tooltip's viewport-relative position from the playhead's pixel offset.
 */
export const NudgeTooltip: React.FC<{
  containerRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
  scrollX: number;
}> = ({ containerRef, zoom, scrollX }) => {
  const [visible, setVisible] = useState(false);
  const [offset, setOffset] = useState(0);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onNudge = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      const delta = detail.delta as number;
      const frame = detail.frame as number;
      setOffset(prev => prev + delta);

      // Compute viewport-relative position from the playhead pixel offset
      const el = containerRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        setPos({
          x: rect.left + frame * zoom - scrollX + 10,
          y: rect.top + 28,
        });
      }
      setVisible(true);

      // Reset fade timer — tooltip stays visible while user holds Alt+Arrow
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
      fadeTimer.current = setTimeout(() => {
        setVisible(false);
        setOffset(0);
      }, 800);
    };

    const onNudgeEnd = () => {
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
      fadeTimer.current = setTimeout(() => {
        setVisible(false);
        setOffset(0);
      }, 300);
    };

    document.addEventListener('timeline:nudgeKeyframe', onNudge);
    document.addEventListener('timeline:nudgeKeyframeEnd', onNudgeEnd);
    return () => {
      document.removeEventListener('timeline:nudgeKeyframe', onNudge);
      document.removeEventListener('timeline:nudgeKeyframeEnd', onNudgeEnd);
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    };
  }, [containerRef, zoom, scrollX]);

  if (!visible || offset === 0) return null;

  const sign = offset > 0 ? '+' : '';
  const label = `${sign}${offset} frame${Math.abs(offset) === 1 ? '' : 's'}`;

  return (
    <div
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 10000,
        pointerEvents: 'none',
        padding: '3px 8px',
        borderRadius: 'var(--radius-sm)',
        background: 'rgba(20,22,32,0.92)',
        border: '1px solid var(--color-accent)',
        color: 'var(--color-text-primary)',
        fontSize: 11,
        fontFamily: 'var(--font-family-mono)',
        fontWeight: 600,
        letterSpacing: '0.02em',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        whiteSpace: 'nowrap',
        transition: 'opacity 150ms ease-out',
        opacity: visible ? 1 : 0,
      }}
    >
      <span style={{ color: 'var(--color-accent)' }}>{label}</span>
    </div>
  );
};
