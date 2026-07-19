import React from 'react';
import { Check } from 'lucide-react';

interface CheckboxInputProps {
  value: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export const CheckboxInput: React.FC<CheckboxInputProps> = ({
  value, onChange, label, disabled,
}) => {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <label
        className="flex items-center gap-2 select-none"
        style={{
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.4 : 1,
        }}
      >
        <span
          role="checkbox"
          aria-checked={value}
          onClick={(e) => {
            if (disabled) return;
            e.preventDefault();
            onChange(!value);
          }}
          style={{
            width: 14, height: 14,
            display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
            background: value ? 'var(--color-accent)' : 'var(--color-input-bg)',
            border: `1px solid ${value ? 'var(--color-accent)' : 'var(--color-border-strong)'}`,
            borderRadius: 'var(--radius-xs)',
            transition: 'background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out)',
            flexShrink: 0,
          }}
        >
          {value && <Check size={10} strokeWidth={3} color="#fff" />}
        </span>
        {label && (
          <span
            className="text-ui-xs"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {label}
          </span>
        )}
      </label>
    </div>
  );
};