import React, { useState, useRef, useEffect } from 'react';

interface ColorInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export const ColorInput: React.FC<ColorInputProps> = ({ value, onChange, label }) => {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="flex items-center gap-2 min-w-0">
      {label && (
        <span className="text-ui-xs text-text-secondary w-8 text-right shrink-0 select-none">
          {label}
        </span>
      )}
      <div className="relative">
        <button
          className="w-5 h-5 border border-border rounded-sm cursor-pointer"
          style={{ background: value }}
          onClick={() => setOpen(!open)}
          title={value}
        />
        {open && (
          <div
            ref={popoverRef}
            className="absolute top-6 left-0 z-50 bg-panel border border-border rounded-md shadow-dropdown p-2"
          >
            <input
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-32 h-24 p-0 border-0 cursor-pointer"
            />
            <div className="flex items-center gap-1 mt-1">
              <input
                type="text"
                value={value}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
                }}
                className="w-full h-[18px] text-ui-xs px-1 bg-surface border border-border rounded-sm text-text-primary outline-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
