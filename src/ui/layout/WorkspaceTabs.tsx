import React from 'react';
import { useUIStore } from '../../state/uiStore';

const TABS = [
  {id:'layout',label:'Layout'},{id:'animation',label:'Animation'},
  {id:'compositing',label:'Compositing'},{id:'editing',label:'Editing'},
  {id:'motionGraphics',label:'Motion'},
];

export const WorkspaceTabs:React.FC = ()=>{
  const active=useUIStore(s=>s.activeWorkspace);
  const set=useUIStore(s=>s.setActiveWorkspace);
  return(
    <div className="workspace-tabs">
      <div className="flex items-center h-full px-2 gap-0">
        {TABS.map(t=>(
          <button key={t.id}
            className={['workspace-tab',active===t.id?'active':''].join(' ')}
            onClick={()=>set(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
};
