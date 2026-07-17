import React,{useState,useRef,useEffect} from 'react';
import type {MenuItemDefinition} from './MenuDropdown';

interface Props{item:MenuItemDefinition;onClose:()=>void;depth:number}

export const MenuItem:React.FC<Props> = ({item,onClose,depth})=>{
  const [subOpen,setSubOpen]=useState(false);
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(!subOpen)return;const h=()=>setSubOpen(false);const el=ref.current;el?.addEventListener('mouseleave',h);return()=>el?.removeEventListener('mouseleave',h)},[subOpen]);

  if(item.divider) return <div className="h-px bg-border my-0.5"/>;

  return(
    <div ref={ref} className="relative" onMouseEnter={()=>item.children&&setSubOpen(true)}>
      <button
        className={[
          'flex items-center w-full px-3 py-1 gap-2 text-left border-0 text-ui-sm',
          item.disabled ? 'text-text-disabled' : 'text-text-primary hover:bg-panel-hover',
        ].join(' ')}
        style={{paddingLeft:8+depth*12,cursor:item.disabled?'default':'pointer'}}
        disabled={item.disabled}
        onClick={()=>{if(!item.disabled&&item.onClick&&!item.children){item.onClick();onClose()}}}>
        <span className="flex-1 whitespace-nowrap">{item.label}</span>
        {item.shortcut&&<span className="text-text-disabled ml-4 text-ui-xs">{item.shortcut}</span>}
        {item.checked!==undefined&&<span className="w-4 text-center">{item.checked?'✓':''}</span>}
        {item.children&&<span className="text-text-disabled">▸</span>}
      </button>
      {subOpen&&item.children&&(
        <div className="absolute z-menu min-w-[160px] py-1 shadow-dropdown bg-panel-raised border border-border rounded-sm"
          style={{top:-4,left:'100%'}}>
          {item.children.map(c=><MenuItem key={c.id} item={c} onClose={onClose} depth={depth+1}/>)}
        </div>
      )}
    </div>
  );
};
