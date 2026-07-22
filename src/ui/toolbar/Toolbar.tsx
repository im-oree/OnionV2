import React from 'react';
import { useToolStore } from '../../state/toolStore';
import { ToolButton } from './ToolButton';
import { TOOL_GROUPS } from './tools';

export const Toolbar: React.FC = () => {
  const activeTool = useToolStore(s => s.activeTool);
  const setActiveTool = useToolStore(s => s.setActiveTool);
  return (
    <div
      className="toolbar-root"
      style={{ width: 48 }}
    >
      <div className="toolbar-groups">
        {TOOL_GROUPS.map((group, gi) => (
          <React.Fragment key={gi}>
            {gi > 0 && <div className="toolbar-divider" />}
            <div className="toolbar-group">
              {group.map(t => (
                <ToolButton
                  key={t.id} toolId={t.id} icon={t.icon} label={t.label}
                  shortcut={t.shortcut} active={activeTool === t.id}
                  onClick={() => setActiveTool(t.id)}
                />
              ))}
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
