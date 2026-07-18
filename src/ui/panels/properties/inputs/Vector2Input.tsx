import React from 'react';
import { NumberInput } from './NumberInput';

interface Vector2InputProps {
  x: number;
  y: number;
  onChange: (x: number, y: number) => void;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  disabled?: boolean;
}

export const Vector2Input: React.FC<Vector2InputProps> = ({
  x,
  y,
  onChange,
  label,
  min,
  max,
  step,
  precision,
  disabled,
}) => {
  return (
    <div className="flex items-center gap-2 min-w-0">
      {label && (
        <span className="text-ui-xs text-text-secondary w-8 text-right shrink-0 select-none">
          {label}
        </span>
      )}
      <div className="flex items-center gap-0.5 flex-1">
        <NumberInput
          value={x}
          onChange={(v) => onChange(v, y)}
          min={min}
          max={max}
          step={step}
          precision={precision}
          label="X"
          disabled={disabled}
        />
        <NumberInput
          value={y}
          onChange={(v) => onChange(x, v)}
          min={min}
          max={max}
          step={step}
          precision={precision}
          label="Y"
          disabled={disabled}
        />
      </div>
    </div>
  );
};
