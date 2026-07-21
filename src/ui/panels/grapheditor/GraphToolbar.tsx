import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Magnet, Maximize2, X } from 'lucide-react';
import type { EasingPresetName } from '../../../animation/EasingPresets';
import { PRESET_LABELS } from '../../../animation/EasingPresets';
import { PresetPicker } from './PresetPicker';

interface Props {
  curveCount: number;
  propOptions: { key: string; label: string }[];
  propFilter: Set<string>;
  setPropFilter: (s: Set<string>) => void;
  snapToFrame: boolean;
  setSnapToFrame: (v: boolean) => void;
  graphMode: 'value' | 'speed';
  setGraphMode: (m: 'value' | 'speed') => void;
  hasSelection: boolean;
  onFrameAll: () => void;
  onApplyPreset: (name: EasingPresetName) => void;
  presets: EasingPresetName[];
  autoTangent?: boolean;
  setAutoTangent?: (v: boolean) => void;
  onShowEasingPreview?: () => void;
  onCloseEasingPreview?: () => void;
  easingPreview?: { outTangent: { x: number; y: number }; inTangent: { x: number; y: number }; x: number; y: number } | null;
}

const LABELS: Record<string, string> = {
  linear: 'Linear', easyEase: 'Ease', easeIn: 'In',
  easeOut: 'Out', fastEase: 'Fast', slowEase: 'Slow',
  ...PRESET_LABELS,
};

interface PresetPickerProps {
  onApplyPreset: (name: EasingPresetName) => void;
  hasSelection: boolean;
}

const PresetPickerWrapper: React.FC<PresetPickerProps> = ({ onApplyPreset, hasSelection }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} disabled={!hasSelection}
        title="Visual Easing Presets"
        className="border-0 transition-colors"
        style={{
          padding: '0 10px', height: 26, fontSize: 'var(--font-size-xs)', fontWeight: 500,
          background: 'var(--color-accent-muted)', borderRadius: 'var(--radius-sm)',
          color: hasSelection ? 'var(--color-accent)' : 'var(--color-text-disabled)',
          cursor: hasSelection ? 'pointer' : 'not-allowed',
        }}
        onMouseEnter={(e)=>{ if(hasSelection)(e.currentTarget as HTMLElement).style.background='var(--color-panel-hover)'; }}
        onMouseLeave={(e)=>{ (e.currentTarget as HTMLElement).style.background='var(--color-accent-muted)'; }}
      >Presets</button>
      {open && (
        <PresetPicker
          onSelect={(name) => { onApplyPreset(name as EasingPresetName); setOpen(false); }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
};

const IconBtn: React.FC<{ onClick: (e:any)=>void; active?: boolean; title?: string; children: React.ReactNode }> =
  ({ onClick, active, title, children }) => (
  <button onClick={onClick} title={title}
    className="flex items-center justify-center border-0 cursor-pointer transition-colors shrink-0"
    style={{
      width: 26, height: 26, borderRadius: 'var(--radius-sm)',
      background: active ? 'var(--color-accent-muted)' : 'transparent',
      color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
    }}
    onMouseEnter={(e)=>{ if(!active) (e.currentTarget as HTMLElement).style.background='var(--color-panel-hover)'; }}
    onMouseLeave={(e)=>{ if(!active) (e.currentTarget as HTMLElement).style.background='transparent'; }}
  >{children}</button>
);

export const GraphToolbar: React.FC<Props> = ({
  curveCount, propOptions, propFilter, setPropFilter,
  snapToFrame, setSnapToFrame, graphMode, setGraphMode,
  hasSelection, onFrameAll, onApplyPreset, presets,
  autoTangent, setAutoTangent, onShowEasingPreview,
  easingPreview, onCloseEasingPreview,
}) => {
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!filterOpen) return;
    const h = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [filterOpen]);

  const toggleProp = (key: string) => {
    const next = new Set(propFilter);
    if (next.has(key)) next.delete(key); else next.add(key);
    setPropFilter(next);
  };

  return (
    <div className="flex items-center px-3 gap-1.5 flex-shrink-0"
      style={{ height: 40, borderBottom: '1px solid var(--color-border)' }}>
      <span style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
        Graph
      </span>
      <span style={{
        fontSize: 10, color: 'var(--color-accent)',
        background: 'var(--color-accent-muted)', padding: '2px 7px',
        borderRadius: 999, fontFamily: 'var(--font-family-mono)', fontWeight: 600,
      }}>
        {curveCount}
      </span>

      <div style={{ width: 1, height: 18, background: 'var(--color-border)', margin: '0 4px' }} />

      {propOptions.length > 0 && (
        <div ref={filterRef} className="relative">
          <button onClick={() => setFilterOpen(!filterOpen)}
            className="flex items-center gap-1.5 border-0 cursor-pointer transition-colors"
            style={{
              padding: '0 10px', height: 26, borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)',
              background: propFilter.size > 0 ? 'var(--color-accent-muted)' : 'transparent',
            }}
            onMouseEnter={(e)=>{ if(propFilter.size===0)(e.currentTarget as HTMLElement).style.background='var(--color-panel-hover)'; }}
            onMouseLeave={(e)=>{ if(propFilter.size===0)(e.currentTarget as HTMLElement).style.background='transparent'; }}
          >
            <span>{propFilter.size === 0 ? 'All Properties' : `${propFilter.size} shown`}</span>
            <ChevronDown size={11} strokeWidth={2} />
          </button>
          {filterOpen && (
            <div className="absolute z-50 min-w-[240px] py-1.5"
              style={{
                top: 'calc(100% + 6px)', left: 0,
                background: 'var(--color-panel-raised)', borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-dropdown)', animation: 'dropdown-in 140ms var(--ease-out)',
              }}>
              <button onClick={() => setPropFilter(new Set())}
                className="flex items-center w-full text-left border-0 bg-transparent cursor-pointer"
                style={{ height: 28, padding: '0 12px', fontSize: 'var(--font-size-sm)', color: 'var(--color-accent)', gap: 8 }}
                onMouseEnter={(e)=>(e.currentTarget as HTMLElement).style.background='var(--color-panel-hover)'}
                onMouseLeave={(e)=>(e.currentTarget as HTMLElement).style.background='transparent'}
              >Show All</button>
              <div className="h-px my-1 mx-2" style={{ background: 'var(--color-divider)' }} />
              {propOptions.map(opt => (
                <button key={opt.key} onClick={() => toggleProp(opt.key)}
                  className="flex items-center w-full text-left border-0 bg-transparent cursor-pointer"
                  style={{ height: 28, padding: '0 12px', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', gap: 8 }}
                  onMouseEnter={(e)=>(e.currentTarget as HTMLElement).style.background='var(--color-panel-hover)'}
                  onMouseLeave={(e)=>(e.currentTarget as HTMLElement).style.background='transparent'}
                >
                  <span className="w-4 flex items-center justify-center" style={{ color: 'var(--color-accent)' }}>
                    {propFilter.has(opt.key) && <Check size={12} strokeWidth={2.5} />}
                  </span>
                  <span className="flex-1 truncate">{opt.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <IconBtn onClick={() => setSnapToFrame(!snapToFrame)} active={snapToFrame}
        title={snapToFrame ? 'Snap to Frame: ON' : 'Snap to Frame: OFF'}>
        <Magnet size={13} strokeWidth={1.75} />
      </IconBtn>

      <div className="flex overflow-hidden"
        style={{ borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', height: 26 }}>
        {(['value', 'speed'] as const).map((m) => (
          <button key={m} onClick={() => setGraphMode(m)}
            className="border-0 cursor-pointer transition-colors"
            style={{
              padding: '0 10px', fontSize: 'var(--font-size-xs)', fontWeight: 500,
              background: graphMode === m ? 'var(--color-accent-muted)' : 'transparent',
              color: graphMode === m ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            }}
          >{m === 'value' ? 'Value' : 'Speed'}</button>
        ))}
      </div>

      <div className="flex-1" />

      {/* Visual Preset Picker */}
      <PresetPickerWrapper onApplyPreset={onApplyPreset} hasSelection={hasSelection} />

      {/* Quick preset buttons (first 6) */}
      {presets.slice(0, 6).map(name => (
        <button key={name} onClick={() => onApplyPreset(name)} disabled={!hasSelection}
          title={`Apply ${LABELS[name]}`}
          className="border-0 transition-colors"
          style={{
            padding: '0 10px', height: 26, fontSize: 'var(--font-size-xs)', fontWeight: 500,
            background: 'transparent', borderRadius: 'var(--radius-sm)',
            color: hasSelection ? 'var(--color-text-secondary)' : 'var(--color-text-disabled)',
            cursor: hasSelection ? 'pointer' : 'not-allowed',
          }}
          onMouseEnter={(e)=>{ if(hasSelection)(e.currentTarget as HTMLElement).style.background='var(--color-panel-hover)'; }}
          onMouseLeave={(e)=>(e.currentTarget as HTMLElement).style.background='transparent'}
        >{LABELS[name] ?? name}</button>
      ))}

      <div style={{ width: 1, height: 18, background: 'var(--color-border)', margin: '0 4px' }} />

      {/* Auto/Manual tangent toggle */}
      {autoTangent !== undefined && setAutoTangent && (
        <IconBtn onClick={() => setAutoTangent(!autoTangent)} active={autoTangent}
          title={autoTangent ? 'Auto Tangent: ON (handles mirror)' : 'Auto Tangent: OFF (independent handles)'}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l-4 7h8z" />
          </svg>
        </IconBtn>
      )}

      <IconBtn onClick={onFrameAll} title="Frame All (A)">
        <Maximize2 size={12} strokeWidth={1.75} />
      </IconBtn>

      {/* Easing preview */}
      {onShowEasingPreview && (
        <div className="relative">
          <IconBtn onClick={onShowEasingPreview}
            title={easingPreview ? 'Close Easing Preview' : 'Show Easing Preview'}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 20c5-8 10-16 18-16" />
              <circle cx="21" cy="4" r="1.5" />
            </svg>
          </IconBtn>
          {easingPreview && (
            <div className="absolute z-50 p-3"
              style={{
                top: 'calc(100% + 6px)', right: 0,
                background: 'var(--color-panel-raised)', borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-dropdown)', width: 180,
              }}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  Easing Preview
                </span>
                <button onClick={e => { e.stopPropagation(); onCloseEasingPreview?.(); }}
                  className="flex items-center justify-center border-0 bg-transparent cursor-pointer"
                  style={{ width: 18, height: 18, borderRadius: 999, color: 'var(--color-text-secondary)' }}>
                  <X size={11} strokeWidth={2} />
                </button>
              </div>
              <svg width="156" height="80" viewBox="0 0 156 80">
                {/* Background grid */}
                <rect x="0" y="0" width="156" height="80" fill="rgba(0,0,0,0.3)" rx="4" />
                {/* Diagonal reference line */}
                <line x1="8" y1="72" x2="148" y2="8" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                {/* Easing curve: cubic bezier from (0,0) to (1,1) */}
                <path d={`M8,72 C${8 + 140 * easingPreview.outTangent.x},${72 - 64 * easingPreview.outTangent.y} ${148 - 140 * easingPreview.inTangent.x},${8 + 64 * easingPreview.inTangent.y} 148,8`}
                  fill="none" stroke="#4a8eff" strokeWidth="2.5" strokeLinecap="round" />
                {/* Tangent handle lines */}
                <line x1="8" y1="72" x2={8 + 140 * easingPreview.outTangent.x} y2={72 - 64 * easingPreview.outTangent.y}
                  stroke="rgba(107,164,255,0.5)" strokeWidth="1" strokeDasharray="3 2" />
                <line x1="148" y1="8" x2={148 - 140 * easingPreview.inTangent.x} y2={8 + 64 * easingPreview.inTangent.y}
                  stroke="rgba(107,164,255,0.5)" strokeWidth="1" strokeDasharray="3 2" />
                {/* Labels */}
                <text x="8" y="86" fill="rgba(255,255,255,0.4)" fontSize="8">0</text>
                <text x="144" y="86" fill="rgba(255,255,255,0.4)" fontSize="8">1</text>
                <text x="3" y="76" fill="rgba(255,255,255,0.4)" fontSize="8">0</text>
                <text x="3" y="12" fill="rgba(255,255,255,0.4)" fontSize="8">1</text>
              </svg>
            </div>
          )}
        </div>
      )}
    </div>
  );
};