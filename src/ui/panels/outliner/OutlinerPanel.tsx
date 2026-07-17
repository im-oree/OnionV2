import React from 'react';
import { Icon } from '../../common/Icon';

/** Static tree rows mimicking Blender's outliner */
const TREE_ROWS = [
  { depth:0, icon:'collection' as const, label:'Scene Collection', open:true },
  { depth:1, icon:'collection' as const, label:'Collection', open:true },
  { depth:2, icon:'diamond' as const, label:'Solid 1' },
  { depth:2, icon:'diamond' as const, label:'Text Layer' },
  { depth:2, icon:'diamond' as const, label:'Shape Layer' },
];

export const OutlinerPanel:React.FC = ()=>(
  <div className="flex flex-col h-full">
    {/* Search header */}
    <div className="flex items-center gap-1 px-2 py-1 border-b border-border-light bg-surface-alt flex-shrink-0">
      <input type="search" placeholder="Search layers..." className="flex-1 text-ui-xs h-[18px] px-1" readOnly/>
      <button className="flex items-center justify-center w-[18px] h-[18px] border-0 bg-transparent text-text-disabled rounded-sm cursor-pointer hover:bg-panel-hover" title="Add item">
        <Icon name="plus" size={12}/>
      </button>
    </div>
    {/* Tree */}
    <div className="flex-1 overflow-auto">
      {TREE_ROWS.map((row,i)=>(
        <div
          key={i}
          className="flex items-center h-row gap-1 px-2 cursor-pointer hover:bg-panel-hover text-text-secondary text-ui-sm tree-row"
          style={{'--tree-depth':row.depth} as React.CSSProperties}
        >
          {/* Collapse chevron */}
          <span className="w-3 flex items-center justify-center text-text-disabled text-ui-xs">
            {'open' in row && row.open ? '▼' : '▸'}
          </span>
          <Icon name={row.icon} size={14} className="text-text-disabled"/>
          <span className="flex-1 truncate">{row.label}</span>
          {/* Visibility toggle */}
          <button className="w-4 h-4 border-0 bg-transparent text-text-disabled cursor-pointer hover:text-text-secondary flex items-center justify-center" title="Toggle visibility">
            <Icon name="eye" size={12}/>
          </button>
        </div>
      ))}
    </div>
  </div>
);
export default OutlinerPanel;
