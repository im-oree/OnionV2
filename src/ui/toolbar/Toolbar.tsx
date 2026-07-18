import React from 'react';
import {useToolStore} from '../../state/toolStore';
import {ToolButton} from './ToolButton';
import {TOOL_GROUPS} from './tools';

export const Toolbar:React.FC = ()=>{
  const activeTool=useToolStore(s=>s.activeTool);
  const setActiveTool=useToolStore(s=>s.setActiveTool);
  return(
    <div className="flex flex-col items-center pt-1 pb-1 overflow-y-auto no-select h-full bg-surface border-r border-border"
      style={{width:40}}>
      {TOOL_GROUPS.map((group,gi)=>(
        <React.Fragment key={gi}>
          {gi>0&&<div className="w-full" style={{height:6}}/>}
          {group.map(t=><ToolButton key={t.id} toolId={t.id} icon={t.icon} label={t.label} shortcut={t.shortcut} active={activeTool===t.id} onClick={()=>setActiveTool(t.id)}/>)}
        </React.Fragment>
      ))}
    </div>
  );
};
