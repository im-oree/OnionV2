import React, { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectInputProps {
  value: string | number;
  onChange: (value: string | number) => void;
  options: Array<{ label: string; value: string | number }>;
  label?: string;
  disabled?: boolean;
}

export const SelectInput: React.FC<SelectInputProps> = ({
  value, onChange, options, label, disabled,
}) => {
  const [focused, setFocused] = useState(false);

  // Detect if this select uses numeric values. If ALL options have
  // numeric values, coerce the emitted change back to a number so the
  // consumer receives the same type it registered.
  const allNumeric = useMemo(
    () => options.length > 0 && options.every(o =>
      typeof o.value === 'number' ||
      (typeof o.value === 'string' && o.value !== '' && !isNaN(Number(o.value))),
    ),
    [options],
  );

  return (
    <div className="flex items-center gap-2 min-w-0">
      {label && (
        <span
          className="text-ui-xs w-9 text-right shrink-0 select-none"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {label}
        </span>
      )}
      <div className="relative flex-1 min-w-0">
        <select
          value={String(value)}
          onChange={(e) => {
            const raw = e.target.value;
            onChange(allNumeric ? Number(raw) : raw);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          className="w-full outline-none appearance-none cursor-pointer"
          style={{
            height: 24,
            padding: '0 26px 0 10px',
            background: 'var(--color-input-bg)',
            border: `1px solid ${focused ? 'var(--color-accent)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--font-size-md)',
            boxShadow: focused ? '0 0 0 3px var(--color-accent-muted)' : 'none',
            transition: 'border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)',
            opacity: disabled ? 0.4 : 1,
          }}
        >
          {options.map((opt) => (
            <option key={String(opt.value)} value={String(opt.value)} style={{ background: 'var(--color-panel-raised)' }}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={12}
          strokeWidth={2}
          style={{
            position: 'absolute', right: 8, top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--color-text-secondary)',
            pointerEvents: 'none',
            opacity: 0.7,
          }}
        />
      </div>
    </div>
  );
};