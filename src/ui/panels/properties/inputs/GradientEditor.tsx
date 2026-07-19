import React, { useState, useRef, useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import { ColorPicker } from './ColorPicker';
import type { GradientFill, GradientStop, LinearGradient, RadialGradient } from '../../../../types/layer';

interface Props {
  value: GradientFill;
  onChange: (v: GradientFill) => void;
}

const BAR_H = 24;

export const GradientEditor: React.FC<Props> = ({ value, onChange }) => {
  const barRef = useRef<HTMLDivElement>(null);
  const [selectedStop, setSelectedStop] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);

  const stops = value.stops;
  const selected = stops[selectedStop];

  const cssGradient = React.useMemo(() => {
    if (stops.length === 0) return '#000';
    const parts = stops.map((s) => `${s.color} ${s.offset * 100}%`);
    return `linear-gradient(90deg, ${parts.join(', ')})`;
  }, [stops]);

  const addStop = useCallback((e: React.MouseEvent) => {
    if (!barRef.current) return;
    const r = barRef.current.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const newStops = [...stops, { offset: t, color: sampleAtOffset(stops, t) }];
    newStops.sort((a, b) => a.offset - b.offset);
    onChange({ ...value, stops: newStops });
    setSelectedStop(newStops.findIndex((s) => s.offset === t));
  }, [stops, value, onChange]);

  const removeStop = useCallback((idx: number) => {
    if (stops.length <= 2) return;
    const newStops = stops.filter((_, i) => i !== idx);
    onChange({ ...value, stops: newStops });
    setSelectedStop(Math.max(0, Math.min(newStops.length - 1, selectedStop)));
  }, [stops, value, onChange, selectedStop]);

  const startDragStop = useCallback((idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedStop(idx);
    if (!barRef.current) return;
    const r = barRef.current.getBoundingClientRect();
    const mm = (ev: MouseEvent) => {
      const t = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
      const newStops = stops.map((s, i) => i === idx ? { ...s, offset: t } : s);
      onChange({ ...value, stops: newStops });
    };
    const mu = () => {
      document.removeEventListener('mousemove', mm);
      document.removeEventListener('mouseup', mu);
      const sorted = [...stops].sort((a, b) => a.offset - b.offset);
      onChange({ ...value, stops: sorted });
    };
    document.addEventListener('mousemove', mm);
    document.addEventListener('mouseup', mu);
  }, [stops, value, onChange]);

  const updateStopColor = useCallback((color: string) => {
    const newStops = stops.map((s, i) => i === selectedStop ? { ...s, color } : s);
    onChange({ ...value, stops: newStops });
  }, [stops, value, onChange, selectedStop]);

  return (
    <div className="w-full">
      {/* Gradient preview bar with stops */}
      <div
        ref={barRef}
        className="relative w-full cursor-copy"
        style={{
          height: BAR_H,
          background: cssGradient,
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--color-border)',
          backgroundImage: `${cssGradient}, url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Crect width='4' height='4' fill='%23444'/%3E%3Crect x='4' y='4' width='4' height='4' fill='%23444'/%3E%3Crect x='4' width='4' height='4' fill='%23222'/%3E%3Crect y='4' width='4' height='4' fill='%23222'/%3E%3C/svg%3E")`,
        }}
        onDoubleClick={addStop}
        title="Double-click to add stop"
      >
        {stops.map((s, i) => (
          <div
            key={i}
            onMouseDown={(e) => startDragStop(i, e)}
            onDoubleClick={(e) => { e.stopPropagation(); removeStop(i); }}
            className="absolute cursor-ew-resize"
            style={{
              left: `${s.offset * 100}%`,
              top: -4, bottom: -4,
              transform: 'translateX(-50%)',
              width: 14,
            }}
          >
            <div style={{
              width: 14, height: BAR_H + 8,
              background: s.color,
              border: `2px solid ${i === selectedStop ? 'var(--color-accent)' : '#fff'}`,
              borderRadius: 3,
              boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
            }} />
          </div>
        ))}
      </div>

      {/* Selected stop editor */}
      {selected && (
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => setPickerOpen(!pickerOpen)}
            style={{
              width: 26, height: 26, borderRadius: 'var(--radius-sm)',
              background: selected.color,
              border: '1px solid var(--color-border-strong)',
              cursor: 'pointer',
            }}
          />
          <input
            type="number"
            value={Math.round(selected.offset * 100)}
            min={0} max={100}
            onChange={(e) => {
              const t = Math.max(0, Math.min(1, parseFloat(e.target.value) / 100));
              const newStops = stops.map((s, i) => i === selectedStop ? { ...s, offset: t } : s);
              onChange({ ...value, stops: newStops });
            }}
            className="outline-none"
            style={{
              width: 60, height: 26, padding: '0 8px',
              background: 'var(--color-input-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text-primary)',
              fontSize: 'var(--font-size-sm)',
              fontFamily: 'var(--font-family-mono)',
            }}
          />
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>%</span>
          <div className="flex-1" />
          <button
            onClick={() => removeStop(selectedStop)}
            disabled={stops.length <= 2}
            className="border-0 bg-transparent cursor-pointer"
            style={{ color: stops.length <= 2 ? 'var(--color-text-disabled)' : 'var(--color-danger)' }}
            title="Delete stop"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>
      )}

      {/* Color picker for selected stop */}
      {pickerOpen && selected && (
        <div className="mt-2" style={{
          background: 'var(--color-panel-raised)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-dropdown)',
        }}>
          <ColorPicker value={selected.color} onChange={updateStopColor} />
        </div>
      )}
    </div>
  );
};

function sampleAtOffset(stops: GradientStop[], t: number): string {
  if (stops.length === 0) return '#ffffff';
  const sorted = [...stops].sort((a, b) => a.offset - b.offset);
  for (let i = 0; i < sorted.length - 1; i++) {
    if (t >= sorted[i].offset && t <= sorted[i + 1].offset) {
      return sorted[i].color; // simple: return left color
    }
  }
  return sorted[sorted.length - 1].color;
}