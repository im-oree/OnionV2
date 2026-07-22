import React from 'react';
import {Icon,type IconName} from '../common/Icon';
import {Tooltip} from '../common/Tooltip';

interface Props{toolId:string;icon:IconName;label:string;shortcut?:string;active:boolean;onClick:()=>void}

export const ToolButton:React.FC<Props> = React.memo(({icon,label,shortcut,active,onClick})=>(
  <Tooltip content={shortcut?`${label}  ${shortcut}`:label} position="right" delay={600}>
    <button
      className={`toolbar-btn ${active ? 'active' : ''}`}
      onClick={onClick}
      role="tab"
      aria-selected={active}
      title=""
    >
      <span className="toolbar-btn-icon">
        <Icon name={icon} size={20} strokeWidth={active ? 2.25 : 1.5} />
      </span>
      {active && <span className="toolbar-btn-indicator" />}
    </button>
  </Tooltip>
));
ToolButton.displayName='ToolButton';
