import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useNavigationStore } from '../../../state/navigationStore';

export const Breadcrumb: React.FC = () => {
  const stack = useNavigationStore(s => s.stack);
  const popTo = useNavigationStore(s => s.popTo);
  const comps = useCompositionStore(s => s.compositions);
  const setActive = useCompositionStore(s => s.setActiveComposition);

  if (stack.length === 0) return null;

  const onCrumbClick = (index: number) => { popTo(index); setActive(stack[index].compId); };

  return (
    <div
      className="absolute top-3 left-14 z-30 flex items-center gap-1.5 pointer-events-auto"
      style={{
        padding: '4px 12px',
        background: 'var(--color-panel-raised)',
        borderRadius: 'var(--radius-sm)',
        fontSize: 11,
      }}
    >
      {stack.map((entry, i) => {
        const comp = comps.find(c => c.id === entry.compId);
        const name = comp?.name ?? 'Unknown';
        const isLast = i === stack.length - 1;
        return (
          <React.Fragment key={`${entry.compId}-${i}`}>
            <button
              onClick={() => onCrumbClick(i)}
              disabled={isLast}
              className="border-0 bg-transparent cursor-pointer transition-colors"
              style={{
                fontSize: 'var(--font-size-sm)',
                color: isLast ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                fontWeight: isLast ? 500 : 400,
              }}
              onMouseEnter={(e)=>{ if(!isLast)(e.currentTarget as HTMLElement).style.color='var(--color-accent)'; }}
              onMouseLeave={(e)=>{ if(!isLast)(e.currentTarget as HTMLElement).style.color='var(--color-text-secondary)'; }}
            >{name}</button>
            {!isLast && <ChevronRight size={11} strokeWidth={2} style={{ color: 'var(--color-text-tertiary)' }} />}
          </React.Fragment>
        );
      })}
    </div>
  );
};