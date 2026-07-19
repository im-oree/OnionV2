import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Magnet } from 'lucide-react';
import type { EasingPresetName } from '../../../animation/EasingPresets';

interface Props {
  curveCount: number;
  propOptions: { key: string; label: string }[];
  propFilter: Set<string>;
  setPropFilter: (s: Set<string>) => void;
  snapToFrame: boolean;
  setSnapToFrame: (v: boolean) => void;
  hasSelection: boolean;
  onFrameAll: () => void;
  onApplyPreset: (name: EasingPresetName) => void;
  presets: EasingPresetName[];
}

const LABELS: Record<EasingPresetName, string> = {
  linear: 'Linear', easyEase: 'Ease', easeIn: 'In',
  easeOut: 'Out', fastEase: 'Fast', slowEase: 'Slow',
};

export const GraphToolbar: React.FC<Props> = ({
  curveCount, propOptions, propFilter, setPropFilter,
  snapToFrame, setSnapToFrame, hasSelection,
  onFrameAll, onApplyPreset, presets,
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
    <div className="flex items-center px-3 gap-2 flex-shrink-0"
      style={{ height: 36, borderBottom: '1px solid var(--color-border)' }}>
      <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--color-text-primary)' }}>
        Graph
      </span>
      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-disabled)' }}>
        {curveCount > 0 ? `${curveCount} curve${curveCount === 1 ? '' : 's'}` : 'no animation'}
      </span>

      {/* Property filter */}
      {propOptions.length > 0 && (
        <div ref={filterRef} className="relative">
          <button onClick={() => setFilterOpen(!filterOpen)}
            className="flex items-center gap-1 border-0 bg-transparent cursor-pointer transition-colors"
            style={{
              padding: '4px 8px', height: 24, borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)',
              background: propFilter.size > 0 ? 'var(--color-accent-muted)' : 'transparent',
            }}
            onMouseEnter={(e)=>{ if(propFilter.size===0)(e.currentTarget as HTMLElement).style.background='var(--color-panel-hover)'; }}
            onMouseLeave={(e)=>{ if(propFilter.size===0)(e.currentTarget as HTMLElement).style.background='transparent'; }}
          >
            <span>{propFilter.size === 0 ? 'All Properties' : `${propFilter.size} filtered`}</span>
            <ChevronDown size={11} strokeWidth={2} />
          </button>
          {filterOpen && (
            <div className="absolute z-50 min-w-[220px] py-1.5"
              style={{
                top: 'calc(100% + 4px)', left: 0,
                background: 'var(--color-panel-raised)', borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-dropdown)',
                animation: 'dropdown-in 140ms var(--ease-out)',
              }}
            >
              <button onClick={() => setPropFilter(new Set())}
                className="flex items-center w-full text-left border-0 bg-transparent cursor-pointer transition-colors"
                style={{ height: 28, padding: '0 12px', fontSize: 'var(--font-size-sm)', color: 'var(--color-accent)', gap: 8 }}
                onMouseEnter={(e)=>(e.currentTarget as HTMLElement).style.background='var(--color-panel-hover)'}
                onMouseLeave={(e)=>(e.currentTarget as HTMLElement).style.background='transparent'}
              >
                Show All
              </button>
              <div className="h-px my-1 mx-2" style={{ background: 'var(--color-divider)' }} />
              {propOptions.map(opt => (
                <button key={opt.key} onClick={() => toggleProp(opt.key)}
                  className="flex items-center w-full text-left border-0 bg-transparent cursor-pointer transition-colors"
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

      {/* Snap toggle */}
      <button onClick={() => setSnapToFrame(!snapToFrame)}
        title={snapToFrame ? 'Snap to Frame ON' : 'Snap to Frame OFF'}
        className="flex items-center justify-center border-0 cursor-pointer transition-colors"
        style={{
          width: 24, height: 24, borderRadius: 'var(--radius-sm)',
          background: snapToFrame ? 'var(--color-accent-muted)' : 'transparent',
          color: snapToFrame ? 'var(--color-accent)' : 'var(--color-text-disabled)',
        }}
      >
        <Magnet size={13} strokeWidth={1.75} />
      </button>

      <div className="flex-1" />

      {/* Easing preset buttons */}
      {presets.map(name => (
        <button key={name}
          onClick={() => onApplyPreset(name)}
          disabled={!hasSelection}
          title={LABELS[name]}
          className="border-0 transition-colors"
          style={{
            padding: '4px 8px', fontSize: 'var(--font-size-xs)',
            background: 'transparent', borderRadius: 'var(--radius-sm)',
            color: hasSelection ? 'var(--color-text-secondary)' : 'var(--color-text-disabled)',
            cursor: hasSelection ? 'pointer' : 'not-allowed',
          }}
          onMouseEnter={(e)=>{ if(hasSelection)(e.currentTarget as HTMLElement).style.background='var(--color-panel-hover)'; }}
          onMouseLeave={(e)=>{ (e.currentTarget as HTMLElement).style.background='transparent'; }}
        >
          {LABELS[name]}
        </button>
      ))}
      <div style={{ width: 1, height: 18, background: 'var(--color-border)', margin: '0 4px' }} />
      <button onClick={onFrameAll}
        className="border-0 bg-transparent cursor-pointer"
        style={{
          padding: '4px 8px', fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-secondary)', borderRadius: 'var(--radius-sm)',
        }}
      >Frame All (A)</button>
    </div>
  );
};