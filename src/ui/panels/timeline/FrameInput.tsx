import React, { useState, useEffect, useRef, useCallback } from 'react';

interface Props {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label?: string;
  width?: number;
}

export const FrameInput: React.FC<Props> = ({ value, onChange, min = 0, max, label, width = 58 }) => {
  const [local, setLocal] = useState(String(value));
  const [editing, setEditing] = useState(false);
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!editing) setLocal(String(Math.round(value))); }, [value, editing]);

  const commit = useCallback((raw: string) => {
    const n = parseFloat(raw);
    if (isNaN(n)) { setLocal(String(Math.round(value))); return; }
    let v = Math.round(n);
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    onChange(v);
    setLocal(String(v));
  }, [value, min, max, onChange]);

  const valueRef = useRef(value);
  valueRef.current = value;

  const scrub = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const isInput = e.target === ref.current;
    const sx = e.clientX, sv = value;
    let dragging = false;
    const mm = (ev: MouseEvent) => {
      const dx = ev.clientX - sx;
      if (!dragging && Math.abs(dx) > 3) {
        dragging = true;
        if (isInput) ref.current?.blur();
        document.body.style.cursor = 'ew-resize';
      }
      if (!dragging) return;
      let v = Math.round(sv + dx);
      if (min !== undefined) v = Math.max(min, v);
      if (max !== undefined) v = Math.min(max, v);
      onChange(v);
    };
    const mu = () => {
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', mm);
      document.removeEventListener('mouseup', mu);
      if (!dragging) {
        if (isInput) { ref.current?.focus(); ref.current?.select(); }
      }
    };
    if (!isInput) e.preventDefault();
    document.addEventListener('mousemove', mm);
    document.addEventListener('mouseup', mu);
  }, [value, min, max, onChange]);

  // Scroll wheel scrub — stable listener via ref (avoids re-attach every frame)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 1 : -1;
      const multiplier = e.shiftKey ? 10 : 1;
      let v = Math.round(valueRef.current + delta * multiplier);
      if (min !== undefined) v = Math.max(min, v);
      if (max !== undefined) v = Math.min(max, v);
      onChange(v);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [min, max, onChange]);

  return (
    <div
      className="flex items-center overflow-hidden"
      style={{
        width,
        height: 26,
        borderRadius: 'var(--radius-sm)',
        background: 'var(--color-input-bg)',
        border: `1px solid ${focused ? 'var(--color-accent)' : 'var(--color-border)'}`,
        boxShadow: focused ? '0 0 0 3px var(--color-accent-muted)' : 'none',
        transition: 'border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)',
      }}
    >
      {label && (
        <span
          className="flex items-center h-full select-none cursor-ew-resize"
          style={{
            padding: '0 8px',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-tertiary)',
            borderRight: '1px solid var(--color-border)',
            fontWeight: 500,
          }}
          onMouseDown={scrub}
        >
          {label}
        </span>
      )}
      <input
        ref={ref}
        type="text"
        value={editing ? local : String(Math.round(value))}
        onChange={(e) => { setEditing(true); setLocal(e.target.value); }}
        onFocus={(e) => { setEditing(true); setFocused(true); e.target.select(); }}
        onBlur={() => { setEditing(false); setFocused(false); commit(local); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { commit(local); ref.current?.blur(); }
          if (e.key === 'Escape') { setLocal(String(Math.round(value))); setEditing(false); ref.current?.blur(); }
        }}
        className="flex-1 h-full min-w-0 bg-transparent text-center outline-none border-0"
        style={{
          color: 'var(--color-text-primary)',
          fontSize: 'var(--font-size-sm)',
          fontFamily: 'var(--font-family-mono)',
          fontVariantNumeric: 'tabular-nums',
        }}
      />
    </div>
  );
};