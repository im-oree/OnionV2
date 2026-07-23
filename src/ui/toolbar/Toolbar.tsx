import React, { useRef, useEffect, useState } from 'react';
import { useToolStore } from '../../state/toolStore';
import { ToolButton } from './ToolButton';
import { TOOL_GROUPS } from './tools';

export const Toolbar: React.FC = () => {
  const activeTool = useToolStore(s => s.activeTool);
  const setActiveTool = useToolStore(s => s.setActiveTool);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [vertical, setVertical] = useState(true);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      // Auto-orient: if wider than tall → horizontal, else vertical
      setVertical(rect.height >= rect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={wrapRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: vertical ? 'column' : 'row',
        alignItems: 'center',
        gap: 4,
        padding: 4,
        background: 'var(--color-panel, #1f2229)',
        overflow: 'auto',
      }}
    >
      {TOOL_GROUPS.map((group, gi) => (
        <React.Fragment key={gi}>
          {gi > 0 && (
            <div
              style={{
                background: 'var(--color-border, rgba(255,255,255,0.06))',
                ...(vertical
                  ? { width: '60%', height: 1, margin: '2px 0' }
                  : { height: '60%', width: 1, margin: '0 2px' }),
              }}
            />
          )}
          <div
            style={{
              display: 'flex',
              flexDirection: vertical ? 'column' : 'row',
              alignItems: 'center',
              gap: 2,
            }}
          >
            {group.map(t => (
              <ToolButton
                key={t.id} toolId={t.id} icon={t.icon} label={t.label}
                {...(t.shortcut != null ? { shortcut: t.shortcut } : {})}
                active={activeTool === t.id}
                onClick={() => setActiveTool(t.id)}
              />
            ))}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};
