import React from 'react';

interface CheckboxInputProps {
  value: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export const CheckboxInput: React.FC<CheckboxInputProps> = ({
  value,
  onChange,
  label,
  disabled,
}) => {
  return (
    <div className="flex items-center gap-2 min-w-0">
      {label && (
        <span className="text-ui-xs text-text-secondary w-8 text-right shrink-0 select-none">
          {label}
        </span>
      )}
      <label className="flex items-center gap-1 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="w-3 h-3 accent-accent cursor-pointer"
        />
        <span className="text-ui-xs text-text-primary">{label}</span>
      </label>
    </div>
  );
};
