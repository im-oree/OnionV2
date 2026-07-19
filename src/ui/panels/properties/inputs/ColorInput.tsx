import React, { useState, useRef, useEffect } from 'react';
import { ColorPicker } from './ColorPicker';

interface ColorInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export const ColorInput: React.FC<ColorInputProps> = ({ value, onChange, label }) => {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="flex items-center gap-2 min-w-0">
      {label && (
        <span className="text-ui-xs w-9 text-right shrink-0 select-none"
          style={{ color: 'var(--color-text-secondary)' }}>
          {label}
        </span>
      )}
      <div className="relative">
        <button
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
            transition: 'box-shadow var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out)',
            transform: open ? 'scale(0.94)' : 'scale(1)',
          }}
        />
        {open && (
          <div
            ref={popoverRef}
            className="absolute z-50"
            style={{
              top: 'calc(100% + 8px)', left: -8,
              background: 'var(--color-panel-raised)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-dropdown)',
              animation: 'dropdown-in 140ms var(--ease-out)',
            }}
          >
            <ColorPicker value={value} onChange={onChange} />
          </div>
        )}
      </div>
    </div>
  );
};