import React from 'react';
import {Icon,type IconName} from '../common/Icon';
import {Tooltip} from '../common/Tooltip';

interface Props{toolId:string;icon:IconName;label:string;shortcut?:string;active:boolean;onClick:()=>void}

export const ToolButton:React.FC<Props> = React.memo(({icon,label,shortcut,active,onClick})=>(
  <Tooltip content={shortcut?`${label} (${shortcut})`:label} position="right" delay={400}>
    <button
      className={`toolbar-btn ${active ? 'active' : ''}`}
      onClick={onClick}
      role="tab"
      aria-selected={active}
    >
      <Icon name={icon} size={20} strokeWidth={active ? 2 : 1.5} />
    </button>
  </Tooltip>
));
ToolButton.displayName='ToolButton';