import React from 'react';
import {Icon,type IconName} from '../common/Icon';
import {Tooltip} from '../common/Tooltip';

interface Props{toolId:string;icon:IconName;label:string;shortcut?:string;active:boolean;onClick:()=>void}

export const ToolButton:React.FC<Props> = React.memo(({icon,label,shortcut,active,onClick})=>(
  <Tooltip content={shortcut?`${label} (${shortcut})`:label} position="right" delay={400}>
    <button
      className={[
        'flex items-center justify-center w-full h-9 border-0 cursor-pointer',
        'transition-colors duration-fast',
        'focus-visible:outline focus-visible:outline-1 focus-visible:outline-border-focus',
        active ? 'bg-panel-active text-white border-l-2 border-l-accent' : 'bg-transparent text-text-secondary border-l-2 border-l-transparent hover:bg-panel-hover',
      ].join(' ')}
      onClick={onClick}
      role="tab"
      aria-selected={active}
    >
      <Icon name={icon} size={20}/>
    </button>
  </Tooltip>
));
ToolButton.displayName='ToolButton';
