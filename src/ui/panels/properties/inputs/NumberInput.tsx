import React, { useRef, useCallback, useState, useEffect } from 'react';
import { debouncedCapture, flushDebouncedSnapshot } from '../../../../state/historyStore';
import { userEditGuard } from '../../../../animation/UserEditGuard';

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  label?: string;
  disabled?: boolean;
  hardClamp?: boolean;
  onKeyframe?: () => void;
  locked?: boolean;
  /** Optional user-edit guard identifiers. When provided, dragging/typing
   *  marks this property as user-edited so PropertyBinder won't overwrite
   *  the value on the next RAF tick. */
  guardLayerId?: string;
  guardPropertyPath?: string;
}

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
  guardLayerId, guardPropertyPath,
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

  useEffect(() => {
    if (editing || focused) return;
    if (justCommitted.current) {
      justCommitted.current = false;
      return;
    }
    setLocalValue(String(roundTo(value, precision)));
  }, [value, precision, editing, focused]);

  const beginGuard = useCallback(() => {
    if (guardLayerId && guardPropertyPath) {
      userEditGuard.begin(guardLayerId, guardPropertyPath);
    }
  }, [guardLayerId, guardPropertyPath]);
  const endGuard = useCallback(() => {
    if (guardLayerId && guardPropertyPath) {
      userEditGuard.end(guardLayerId, guardPropertyPath);
    }
  }, [guardLayerId, guardPropertyPath]);

  // Cleanup guard on unmount
  useEffect(() => {
    return () => {
      if (guardLayerId && guardPropertyPath) {
        userEditGuard.end(guardLayerId, guardPropertyPath);
      }
    };
  }, [guardLayerId, guardPropertyPath]);

  const commitInteractive = useCallback((v: number) => {
    const clamped = softClamp(v, min, max);
    onChange(clamped);
    setLocalValue(String(roundTo(clamped, precision)));
  }, [onChange, min, max, precision]);

  const commitTyped = useCallback((v: number) => {
    const finalV = hardClamp ? softClamp(v, min, max) : v;
    onChange(finalV);
    setLocalValue(String(roundTo(finalV, precision)));
    justCommitted.current = true;
  }, [onChange, min, max, precision, hardClamp]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled || locked) return;
    const isLabelClick = e.target !== inputRef.current;

    if (isLabelClick) {
      e.preventDefault();
      document.body.style.cursor = 'ew-resize';
      isScrubbing.current = true;
      scrubStart.current = { x: e.clientX, val: value };
      beginGuard();
      debouncedCapture('Change Value');
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
        endGuard();
        flushDebouncedSnapshot();
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      return;
    }

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
        beginGuard();
        debouncedCapture('Change Value');
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
        endGuard();
        flushDebouncedSnapshot();
      } else {
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [value, step, commitInteractive, disabled, locked]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el || disabled || locked) return;
    let wheelGuardTimeout: ReturnType<typeof setTimeout> | null = null;
    const onWheel = (e: WheelEvent) => {
      if (document.activeElement !== el) return;
      e.preventDefault();
      beginGuard();
      const delta = e.deltaY < 0 ? step : -step;
      const multiplier = e.shiftKey ? 10 : 1;
      commitInteractive(valueRef.current + delta * multiplier);
      // Release guard after wheel idle
      if (wheelGuardTimeout) clearTimeout(wheelGuardTimeout);
      wheelGuardTimeout = setTimeout(() => { endGuard(); wheelGuardTimeout = null; }, 250);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      if (wheelGuardTimeout) clearTimeout(wheelGuardTimeout);
    };
  }, [step, commitInteractive, disabled, locked, beginGuard, endGuard]);

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
          beginGuard();
        }}
        onBlur={() => {
          setEditing(false); setFocused(false);
          const parsed = parseFloat(localValue);
          if (!isNaN(parsed)) commitTyped(parsed);
          else setLocalValue(String(roundTo(value, precision)));
          endGuard();
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