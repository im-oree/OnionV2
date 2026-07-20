import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ColorPicker } from './ColorPicker';

interface ColorInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

/** Portal-rendered color picker that positions itself relative to the swatch
 *  and flips to stay inside the viewport. Solves the "picker clipped by panel"
 *  problem when the swatch is near the right/bottom edge of a scrollable panel. */
export const ColorInput: React.FC<ColorInputProps> = ({ value, onChange, label }) => {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const swatchRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popRef.current?.contains(target)) return;
      if (swatchRef.current?.contains(target)) return;
      setOpen(false);
    };
    // Delay one tick so the click that opens the picker doesn't immediately close it.
    const t = setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handleClick); };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Compute position after the picker mounts so we know its true size, then
  // clamp it inside the viewport with a small margin.
  const computePosition = useCallback(() => {
    const swatch = swatchRef.current;
    const pop = popRef.current;
    if (!swatch || !pop) return;

    const swR = swatch.getBoundingClientRect();
    const popR = pop.getBoundingClientRect();
    const margin = 8;

    // Prefer: below the swatch, aligned to its left edge.
    let left = swR.left;
    let top = swR.bottom + 6;

    // Flip left if it would overflow right edge
    if (left + popR.width + margin > window.innerWidth) {
      left = Math.max(margin, window.innerWidth - popR.width - margin);
    }
    // Flip up if it would overflow bottom edge
    if (top + popR.height + margin > window.innerHeight) {
      top = swR.top - popR.height - 6;
      // If also overflows top, pin to viewport top
      if (top < margin) top = margin;
    }
    // Guard against negatives
    if (left < margin) left = margin;
    if (top < margin) top = margin;

    setPos({ left, top });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    computePosition();
  }, [open, computePosition]);

  // Reposition on window resize / scroll while open
  useEffect(() => {
    if (!open) return;
    const onReflow = () => computePosition();
    window.addEventListener('resize', onReflow);
    // Capture-phase scroll listener catches ALL scrolls (including inside panels).
    window.addEventListener('scroll', onReflow, true);
    return () => {
      window.removeEventListener('resize', onReflow);
      window.removeEventListener('scroll', onReflow, true);
    };
  }, [open, computePosition]);

  return (
    <div className="flex items-center gap-2 min-w-0">
      {label && (
        <span className="text-ui-xs w-9 text-right shrink-0 select-none"
          style={{ color: 'var(--color-text-secondary)' }}>
          {label}
        </span>
      )}
      <button
        ref={swatchRef}
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title={value}
        style={{
          width: 24, height: 24,
          borderRadius: 'var(--radius-sm)',
          background: value,
          border: '1px solid var(--color-border-strong)',
          cursor: 'pointer',
          boxShadow: hovered ? '0 0 0 3px var(--color-accent-muted)' : 'none',
          transition:
            'box-shadow var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out)',
          transform: open ? 'scale(0.94)' : 'scale(1)',
          flexShrink: 0,
        }}
      />
      {open && createPortal(
        <div
          ref={popRef}
          style={{
            position: 'fixed',
            left: pos.left,
            top: pos.top,
            zIndex: 10000,
            background: 'var(--color-panel-raised)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-dropdown)',
            animation: 'dropdown-in 140ms var(--ease-out)',
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <ColorPicker value={value} onChange={onChange} />
        </div>,
        document.body,
      )}
    </div>
  );
};