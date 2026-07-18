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
}

const clamp = (v: number, min?: number, max?: number): number => {
  if (min !== undefined && v < min) return min;
  if (max !== undefined && v > max) return max;
  return v;
};

const roundTo = (v: number, p: number): number => {
  const f = Math.pow(10, p);
  return Math.round(v * f) / f;
};

export const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  min,
  max,
  step = 1,
  precision = 2,
  label,
  disabled = false,
}) => {
  const [localValue, setLocalValue] = useState(String(value));
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isScrubbing = useRef(false);
  const scrubStart = useRef({ x: 0, val: 0 });

  // Sync external value
  useEffect(() => {
    if (!editing) setLocalValue(String(roundTo(value, precision)));
  }, [value, precision, editing]);

  const commitValue = useCallback(
    (v: number) => {
      const clamped = clamp(v, min, max);
      onChange(clamped);
      setLocalValue(String(roundTo(clamped, precision)));
    },
    [onChange, min, max, precision],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      e.preventDefault();
      document.body.style.cursor = 'ew-resize';
      isScrubbing.current = true;
      scrubStart.current = { x: e.clientX, val: value };
      const handleMouseMove = (ev: MouseEvent) => {
        if (!isScrubbing.current) return;
        const delta = ev.clientX - scrubStart.current.x;
        const newVal = scrubStart.current.val + delta * step * 0.5;
        commitValue(newVal);
      };
      const handleMouseUp = () => {
        isScrubbing.current = false;
        document.body.style.cursor = '';
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [value, step, commitValue, disabled],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        inputRef.current?.blur();
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const mult = e.shiftKey ? 10 : 1;
        commitValue(value + step * mult);
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const mult = e.shiftKey ? 10 : 1;
        commitValue(value - step * mult);
      }
      if (e.key === 'Escape') {
        setLocalValue(String(roundTo(value, precision)));
        inputRef.current?.blur();
      }
    },
    [value, step, commitValue, precision],
  );

  return (
    <div className="flex items-center gap-1 min-w-0">
      {label && (
        <span
          className="text-ui-xs text-text-secondary w-8 text-right shrink-0 cursor-ew-resize select-none"
          onMouseDown={handleMouseDown}
        >
          {label}
        </span>
      )}
      <input
        ref={inputRef}
        type="text"
        value={editing ? localValue : String(roundTo(value, precision))}
        onChange={(e) => {
          setEditing(true);
          setLocalValue(e.target.value);
        }}
        onFocus={() => setEditing(true)}
        onBlur={() => {
          setEditing(false);
          const parsed = parseFloat(localValue);
          if (!isNaN(parsed)) commitValue(parsed);
          else setLocalValue(String(roundTo(value, precision)));
        }}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="w-full h-[18px] text-ui-xs px-1 text-right bg-surface border border-border rounded-sm text-text-primary outline-none focus:border-accent disabled:opacity-40"
      />
    </div>
  );
};
