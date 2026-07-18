import React, { useState, useEffect, useRef, useCallback } from 'react';

interface Props {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label?: string;
  width?: number;
}

export const FrameInput: React.FC<Props> = ({ value, onChange, min = 0, max, label, width = 52 }) => {
  const [local, setLocal] = useState(String(value));
  const [editing, setEditing] = useState(false);
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

  const scrub = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const sx = e.clientX;
    const sv = value;
    let moved = false;
    document.body.style.cursor = 'ew-resize';
    const mm = (ev: MouseEvent) => {
      const dx = ev.clientX - sx;
      if (Math.abs(dx) > 2) moved = true;
      let v = Math.round(sv + dx);
      if (min !== undefined) v = Math.max(min, v);
      if (max !== undefined) v = Math.min(max, v);
      onChange(v);
    };
    const mu = () => {
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', mm);
      document.removeEventListener('mouseup', mu);
      if (!moved) ref.current?.focus();
    };
    document.addEventListener('mousemove', mm);
    document.addEventListener('mouseup', mu);
  }, [value, min, max, onChange]);

  return (
    <div
      className="flex items-center h-[20px] bg-panel-input border border-border rounded-sm overflow-hidden"
      style={{ width }}
    >
      {label && (
        <span
          className="px-1.5 text-[10px] text-text-secondary select-none cursor-ew-resize h-full flex items-center bg-panel-header/60 border-r border-border"
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
        onFocus={(e) => { setEditing(true); e.target.select(); }}
        onBlur={() => { setEditing(false); commit(local); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { commit(local); ref.current?.blur(); }
          if (e.key === 'Escape') { setLocal(String(Math.round(value))); setEditing(false); ref.current?.blur(); }
        }}
        className="flex-1 h-full min-w-0 bg-transparent text-ui-xs text-text-primary text-center outline-none border-0 font-mono"
      />
    </div>
  );
};