import React,{useRef,useEffect} from 'react';
import {MenuItem} from './MenuItem';

export interface MenuItemDefinition{
  id:string; label:string; shortcut?:string;
  disabled?:boolean; checked?:boolean; divider?:boolean;
  children?:MenuItemDefinition[]; onClick?:()=>void;
}

interface Props{items:MenuItemDefinition[];onClose:()=>void}

export const MenuDropdown:React.FC<Props> = ({items,onClose})=>{
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const hc=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))onClose()};
    const hk=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose()};
    const t=setTimeout(()=>{document.addEventListener('mousedown',hc);document.addEventListener('keydown',hk)},0);
    return()=>{clearTimeout(t);document.removeEventListener('mousedown',hc);document.removeEventListener('keydown',hk)};
  },[onClose]);

  return(
    <div
      ref={ref}
      className="absolute z-menu min-w-[240px] py-1.5"
      style={{
        top: 'calc(100% + 4px)',
        left: 0,
        background: 'var(--color-panel-raised)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-dropdown)',
        animation: 'dropdown-in 140ms var(--ease-out)',
      }}
    >
      {items.map(item=><MenuItem key={item.id} item={item} onClose={onClose} depth={0}/>)}
    </div>
  );
};