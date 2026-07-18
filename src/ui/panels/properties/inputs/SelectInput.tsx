import React from 'react';

interface SelectInputProps {
  value: string | number;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  label?: string;
  disabled?: boolean;
}

export const SelectInput: React.FC<SelectInputProps> = ({
  value,
  onChange,
  options,
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
      <select
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="flex-1 h-[18px] text-ui-xs px-1 bg-surface border border-border rounded-sm text-text-primary outline-none focus:border-accent cursor-pointer disabled:opacity-40"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};
