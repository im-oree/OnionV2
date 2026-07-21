import React, { useRef, useCallback, useState, useEffect } from 'react';

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  label?: string;
  disabled?: boolean;
  /** Hard clamp typed input to [min,max]. Default: false (soft — only
   *  drag/wheel/arrow-keys respect min/max as hints; keyboard entry is free). */
  hardClamp?: boolean;
  /** Keyframe button (diamond). Pass a function to show the button. */
  onKeyframe?: () => void;
  /** Lock the value — prevents all editing (drag, type, wheel, arrows) when locked */
  locked?: boolean;
}

/** Clamp during interactive change (drag/wheel/arrows). Keyboard entry
 *  bypasses this so users can type any value including negatives. */
const softClamp = (v: number, min?: number, max?: number): number => {
  if (min !== undefined && v < min) return min;
  if (max !== undefined && v > max) return max;
  return v;
};

const roundTo = (v: number, p: number): number => {
  const f = Math.pow(10, p);
  return Math.round(v * f) / f;
};

export const NumberInput: React.FC<NumberInputProps> = ({
  value, onChange, min, max, step = 1, precision = 2, label,
  disabled = false, hardClamp = false, onKeyframe, locked = false,
}) => {
  const [localValue, setLocalValue] = useState(String(value));
  const [editing, setEditing] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isScrubbing = useRef(false);
  const scrubStart = useRef({ x: 0, val: 0 });
  const valueRef = useRef(value);
  valueRef.current = value;
  const justCommitted = useRef(false);

  /* DEBUG: trace render count & value prop */
  const renderCount = useRef(0);
  renderCount.current++;
  const prevValue = useRef(value);
  if (prevValue.current !== value) {
    console.log(`[NumberInput DEBUG] render #${renderCount.current} | label=${label} | value PROP changed: ${prevValue.current} → ${value}`);
    prevValue.current = value;
  } else if (renderCount.current <= 5) {
    console.log(`[NumberInput DEBUG] render #${renderCount.current} | label=${label} | value prop = ${value} (same)`);
  }

  useEffect(() => {
    // While the user is actively editing (input focused OR editing flag on),
    // NEVER overwrite the local value from props. This prevents parent
    // re-renders (e.g. from debounced history captures) from resetting the
    // input's text while the user is mid-typing.
    if (editing || focused) return;
    if (justCommitted.current) {
      justCommitted.current = false;
      return;
    }
    const newLocal = String(roundTo(value, precision));
    setLocalValue(newLocal);
  }, [value, precision, editing, focused]);

  /** Commit from interactive input (drag / wheel / arrow keys).
   *  Applies soft clamp so drag hints don't runaway. */
  const commitInteractive = useCallback((v: number) => {
    const clamped = softClamp(v, min, max);
    onChange(clamped);
    setLocalValue(String(roundTo(clamped, precision)));
  }, [onChange, min, max, precision]);

  /** Commit from a typed / pasted value.
   *  Passes through as-is unless hardClamp is on. Users can type any
   *  number including negatives and values past min/max. */
  const commitTyped = useCallback((v: number) => {
    const finalV = hardClamp ? softClamp(v, min, max) : v;
    onChange(finalV);
    setLocalValue(String(roundTo(finalV, precision)));
    justCommitted.current = true;
  }, [onChange, min, max, precision, hardClamp]);

  /**
   * Scrub-to-change with drag detection:
   * - Label click → always scrub immediately
   * - Input click (no drag) → focus input for manual typing
   * - Input click + drag (>3px) → scrub value
   */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled || locked) return;
    const isLabelClick = e.target !== inputRef.current;

    // Label clicks always start scrub immediately
    if (isLabelClick) {
      e.preventDefault();
      document.body.style.cursor = 'ew-resize';
      isScrubbing.current = true;
      scrubStart.current = { x: e.clientX, val: value };
      const onMove = (ev: MouseEvent) => {
        const delta = ev.clientX - scrubStart.current.x;
        const multiplier = ev.shiftKey ? 0.05 : 0.5;
        commitInteractive(scrubStart.current.val + delta * step * multiplier);
      };
      const onUp = () => {
        isScrubbing.current = false;
        document.body.style.cursor = '';
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      return;
    }

    // Input clicks: drag-detect (click=type, drag=scrub)
    const startX = e.clientX;
    const startVal = value;
    let dragging = false;

    const handleMouseMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      if (!dragging && Math.abs(delta) > 3) {
        dragging = true;
        inputRef.current?.blur();
        document.body.style.cursor = 'ew-resize';
        isScrubbing.current = true;
        scrubStart.current = { x: startX, val: startVal };
      }
      if (!dragging) return;
      const multiplier = ev.shiftKey ? 0.05 : 0.5;
      commitInteractive(startVal + delta * step * multiplier);
    };
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (dragging) {
        isScrubbing.current = false;
        document.body.style.cursor = '';
      } else {
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [value, step, commitInteractive, disabled]);

  // Non-passive wheel listener via useEffect to allow preventDefault()
  useEffect(() => {
    const el = inputRef.current;
    if (!el || disabled || locked) return;
    const onWheel = (e: WheelEvent) => {
      // Only scrub with wheel while focused, so page scrolling isn't hijacked.
      if (document.activeElement !== el) return;
      e.preventDefault();
      const delta = e.deltaY < 0 ? step : -step;
      const multiplier = e.shiftKey ? 10 : 1;
      commitInteractive(valueRef.current + delta * multiplier);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [step, commitInteractive, disabled]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { inputRef.current?.blur(); return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); commitInteractive(value + step * (e.shiftKey ? 10 : 1)); }
    if (e.key === 'ArrowDown') { e.preventDefault(); commitInteractive(value - step * (e.shiftKey ? 10 : 1)); }
    if (e.key === 'Escape')    { setLocalValue(String(roundTo(value, precision))); inputRef.current?.blur(); }
  }, [value, step, commitInteractive, precision]);

  return (
    <div className="flex items-center gap-1 min-w-0">
      {label && (
        <span
          className="text-ui-xs w-9 text-right shrink-0 cursor-ew-resize select-none"
          style={{
            color: 'var(--color-text-secondary)',
            borderBottom: '1px dashed transparent',
            transition: 'border-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)',
          }}
          onMouseEnter={(e)=>{
            (e.currentTarget as HTMLElement).style.color='var(--color-accent)';
            (e.currentTarget as HTMLElement).style.borderColor='var(--color-accent)';
          }}
          onMouseLeave={(e)=>{
            (e.currentTarget as HTMLElement).style.color='var(--color-text-secondary)';
            (e.currentTarget as HTMLElement).style.borderColor='transparent';
          }}
          onMouseDown={handleMouseDown}
        >
          {label}
        </span>
      )}
      <input
        ref={inputRef}
        type="text"
        value={(editing || focused) ? localValue : String(roundTo(value, precision))}
        onChange={(e) => {
          setEditing(true); setLocalValue(e.target.value);
        }}
        onFocus={() => {
          setEditing(true); setFocused(true);
        }}
        onBlur={() => {
          setEditing(false); setFocused(false);
          const parsed = parseFloat(localValue);
          if (!isNaN(parsed)) commitTyped(parsed);
          else setLocalValue(String(roundTo(value, precision)));
        }}
        onKeyDown={handleKeyDown}
        onMouseDown={handleMouseDown}
        disabled={disabled || locked}
        className="w-full text-right outline-none"
        style={{
          height: 24,
          fontSize: 'var(--font-size-md)',
          padding: '0 8px',
          background: 'var(--color-input-bg)',
          border: `1px solid ${focused ? 'var(--color-accent)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-sm)',
          color: locked ? 'var(--color-text-disabled)' : 'var(--color-text-primary)',
          fontVariantNumeric: 'tabular-nums',
          cursor: locked ? 'not-allowed' : focused ? 'text' : 'ew-resize',
          transition: 'border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)',
          boxShadow: focused ? '0 0 0 3px var(--color-accent-muted)' : 'none',
          opacity: disabled || locked ? 0.4 : 1,
        }}
      />
      {/* Keyframe diamond button */}
      {onKeyframe && (
        <button
          onClick={onKeyframe}
          title="Add keyframe"
          className="flex items-center justify-center shrink-0 border-0 cursor-pointer"
          style={{
            width: 18, height: 18,
            borderRadius: '50%',
            background: 'transparent',
            color: 'var(--color-accent)',
            opacity: 0.6,
            fontSize: 10,
            transition: 'opacity 0.15s, background 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.background = 'var(--color-accent-muted)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.opacity = '0.6';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          ◆
        </button>
      )}
    </div>
  );
};