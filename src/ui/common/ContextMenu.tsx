import React,{useEffect,useRef} from 'react';

export interface ContextMenuItem{
  id:string; label:string; shortcut?:string;
  disabled?:boolean; checked?:boolean; icon?:React.ReactNode;
  children?:ContextMenuItem[]; divider?:boolean;
  onClick?:()=>void;
}

interface Props{items:ContextMenuItem[];position:{x:number;y:number};onClose:()=>void}

export const ContextMenu:React.FC<Props> = ({items,position,onClose})=>{
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const hc=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))onClose()};
    const hk=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose()};
    const t=setTimeout(()=>{document.addEventListener('mousedown',hc);document.addEventListener('keydown',hk)},0);
    return()=>{clearTimeout(t);document.removeEventListener('mousedown',hc);document.removeEventListener('keydown',hk)};
  },[onClose]);

  return(
    <div ref={ref}
      className="fixed z-menu min-w-[160px] py-1 shadow-dropdown bg-panel-raised border border-border rounded-sm"
      style={{left:position.x,top:position.y}}>
      {items.map((item,i)=>(
        <div key={item.id}>
          {item.divider&&i>0&&<div className="h-px bg-border my-0.5"/>}
          <button
            className={[
              'flex items-center w-full px-3 py-1 gap-2 text-left border-0',
              'text-ui-sm',
              item.disabled ? 'text-text-disabled' : 'text-text-primary',
              !item.disabled && 'hover:bg-panel-hover',
            ].join(' ')}
            style={{cursor:item.disabled?'default':'pointer'}}
            disabled={item.disabled}
            onClick={()=>{if(!item.disabled&&item.onClick){item.onClick();onClose()}}}>
            {item.icon&&<span className="w-4 flex items-center">{item.icon}</span>}
            <span className="flex-1">{item.label}</span>
            {item.shortcut&&<span className="text-text-disabled ml-3">{item.shortcut}</span>}
            {item.checked!==undefined&&<span className="w-4 text-center">{item.checked?'✓':''}</span>}
            {item.children&&<span className="text-text-disabled">▸</span>}
          </button>
        </div>
      ))}
    </div>
  );
};
