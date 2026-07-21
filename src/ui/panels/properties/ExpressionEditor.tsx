import React, { useState, useEffect, useRef } from 'react';
import { Code2, Trash2, Power } from 'lucide-react';
import { useExpressionStore } from '../../../state/expressionStore';
import { EXPRESSION_SNIPPETS } from '../../../expressions/library/snippets';

interface Props {
  layerId: string;
  property: string;
  onClose?: () => void;
}

const PRESETS = [
  { label: 'wiggle(2, 30)',        expr: 'wiggle(2, 30)' },
  { label: 'wiggle(5, 10)',        expr: 'wiggle(5, 10)' },
  { label: 'loopOut()',            expr: 'loopOut()' },
  { label: 'linear(time, 0, 1, 0, 100)', expr: 'linear(time, 0, 1, 0, 100)' },
  { label: 'time * 100',           expr: 'time * 100' },
  { label: 'Math.sin(time * 2) * 50', expr: 'Math.sin(time * 2) * 50' },
];

export const ExpressionEditor: React.FC<Props> = ({ layerId, property, onClose }) => {
  const expr = useExpressionStore((s) => s.getExpression(layerId, property));
  const setExpression = useExpressionStore((s) => s.setExpression);
  const toggleExpression = useExpressionStore((s) => s.toggleExpression);
  const removeExpression = useExpressionStore((s) => s.removeExpression);

  const [source, setSource] = useState(expr?.source ?? '');
  const [error, setError] = useState<string | null>(expr?.compiled.error ?? null);
  const [showPresets, setShowPresets] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (expr) {
      setSource(expr.source);
      setError(expr.compiled.error);
    }
  }, [expr]);

  const commit = () => {
    setExpression(layerId, property, source);
    // Immediately reflect any compile error
    const fresh = useExpressionStore.getState().getExpression(layerId, property);
    setError(fresh?.compiled.error ?? null);
  };

  const enabled = expr?.enabled ?? true;

  return (
    <div style={{
      background: 'var(--color-panel-raised)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      padding: 10,
    }}>
      <div className="flex items-center gap-2 mb-2">
        <Code2 size={13} strokeWidth={1.75} style={{ color: 'var(--color-accent)' }} />
        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--color-text-primary)' }}>
          Expression
        </span>
        <span style={{
          fontSize: 10, color: 'var(--color-text-tertiary)',
          fontFamily: 'var(--font-family-mono)',
        }}>
          {property}
        </span>
        <div className="flex-1" />
        <button onClick={() => toggleExpression(layerId, property)}
          title={enabled ? 'Disable' : 'Enable'}
          className="border-0 bg-transparent cursor-pointer"
          style={{ color: enabled ? 'var(--color-accent)' : 'var(--color-text-disabled)' }}
        >
          <Power size={13} strokeWidth={1.75} />
        </button>
        <button onClick={() => { removeExpression(layerId, property); onClose?.(); }}
          title="Remove Expression"
          className="border-0 bg-transparent cursor-pointer"
          style={{ color: 'var(--color-text-disabled)' }}
          onMouseEnter={(e)=>(e.currentTarget as HTMLElement).style.color='var(--color-danger)'}
          onMouseLeave={(e)=>(e.currentTarget as HTMLElement).style.color='var(--color-text-disabled)'}
        >
          <Trash2 size={13} strokeWidth={1.75} />
        </button>
      </div>

      <textarea
        ref={taRef}
        value={source}
        onChange={(e) => setSource(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); commit(); }
        }}
        rows={3}
        placeholder="e.g. wiggle(2, 30)"
        className="w-full outline-none resize-y"
        style={{
          padding: 8,
          background: 'var(--color-input-bg)',
          border: `1px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-sm)',
          color: 'var(--color-text-primary)',
          fontSize: 'var(--font-size-sm)',
          fontFamily: 'var(--font-family-mono)',
          minHeight: 60,
        }}
      />

      {error && (
        <div style={{
          marginTop: 6, padding: '4px 8px',
          background: 'rgba(255,80,80,0.1)',
          borderRadius: 'var(--radius-xs)',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-danger)',
          fontFamily: 'var(--font-family-mono)',
        }}>
          {error}
        </div>
      )}

      <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
        {EXPRESSION_SNIPPETS.map(s => (
          <button
            key={s.label}
            className="text-[9px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded whitespace-nowrap"
            onClick={() => { setSource(s.code); setExpression(layerId, property, s.code); }}
            title={s.description}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button onClick={() => setShowPresets(!showPresets)}
          className="border-0 bg-transparent cursor-pointer"
          style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-accent)' }}
        >
          {showPresets ? 'Hide' : 'Show'} Presets
        </button>
        <div className="flex-1" />
        <span style={{ fontSize: 10, color: 'var(--color-text-disabled)' }}>
          Ctrl+Enter to apply
        </span>
      </div>

      {showPresets && (
        <div className="mt-2 flex flex-wrap gap-1">
          {PRESETS.map((p, i) => (
            <button key={i}
              onClick={() => { setSource(p.expr); setExpression(layerId, property, p.expr); }}
              className="border-0 cursor-pointer transition-colors"
              style={{
                padding: '4px 8px',
                background: 'var(--color-input-bg)',
                borderRadius: 'var(--radius-xs)',
                fontSize: 10,
                fontFamily: 'var(--font-family-mono)',
                color: 'var(--color-text-secondary)',
              }}
              onMouseEnter={(e)=>{ (e.currentTarget as HTMLElement).style.background='var(--color-panel-hover)'; (e.currentTarget as HTMLElement).style.color='var(--color-text-primary)'; }}
              onMouseLeave={(e)=>{ (e.currentTarget as HTMLElement).style.background='var(--color-input-bg)'; (e.currentTarget as HTMLElement).style.color='var(--color-text-secondary)'; }}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};