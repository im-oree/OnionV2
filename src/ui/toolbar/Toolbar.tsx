import React from 'react';
import { useToolStore } from '../../state/toolStore';
import { ToolButton } from './ToolButton';
import { TOOL_GROUPS } from './tools';

export const Toolbar: React.FC = () => {
  const activeTool = useToolStore(s => s.activeTool);
  const setActiveTool = useToolStore(s => s.setActiveTool);
  return (
    <div
      className="panel flex flex-col items-center py-3 overflow-y-auto no-select h-full"
      style={{ width: 44 }}
    >
      {TOOL_GROUPS.map((group, gi) => (
        <React.Fragment key={gi}>
          {gi > 0 && (
            <div className="my-1.5" style={{ width: 18, height: 1, background: 'var(--color-border)' }} />
          )}
          {group.map(t => (
            <ToolButton
              key={t.id} toolId={t.id} icon={t.icon} label={t.label}
              shortcut={t.shortcut} active={activeTool === t.id}
              onClick={() => setActiveTool(t.id)}
            />
          ))}
        </React.Fragment>
      ))}
    </div>
  );
};