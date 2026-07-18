import React from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useNavigationStore } from '../../../state/navigationStore';

export const Breadcrumb: React.FC = () => {
  const stack = useNavigationStore(s => s.stack);
  const popTo = useNavigationStore(s => s.popTo);
  const comps = useCompositionStore(s => s.compositions);
  const setActive = useCompositionStore(s => s.setActiveComposition);

  if (stack.length === 0) return null;

  const onCrumbClick = (index: number) => {
    popTo(index);
    setActive(stack[index].compId);
  };

  return (
    <div
      className="absolute top-2 left-2 z-30 flex items-center gap-1 px-2 h-[24px] rounded-sm bg-panel/90 border border-border pointer-events-auto"
      style={{ fontSize: 11 }}
    >
      {stack.map((entry, i) => {
        const comp = comps.find(c => c.id === entry.compId);
        const name = comp?.name ?? 'Unknown';
        const isLast = i === stack.length - 1;
        return (
          <React.Fragment key={`${entry.compId}-${i}`}>
            <button
              onClick={() => onCrumbClick(i)}
              className={`border-0 bg-transparent cursor-pointer text-ui-xs ${
                isLast ? 'text-text-primary' : 'text-text-secondary hover:text-accent'
              }`}
              disabled={isLast}
            >
              {name}
            </button>
            {!isLast && <span className="text-text-disabled">›</span>}
          </React.Fragment>
        );
      })}
    </div>
  );
};