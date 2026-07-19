import React,{useState,useRef,useEffect} from 'react';
import { Check, ChevronRight } from 'lucide-react';
import type {MenuItemDefinition} from './MenuDropdown';

interface Props{item:MenuItemDefinition;onClose:()=>void;depth:number}

export const MenuItem:React.FC<Props> = ({item,onClose,depth})=>{
  const [subOpen,setSubOpen]=useState(false);
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!subOpen)return;
    const h=()=>setSubOpen(false);
    const el=ref.current;
    el?.addEventListener('mouseleave',h);
    return()=>el?.removeEventListener('mouseleave',h);
  },[subOpen]);

  if(item.divider) return <div className="h-px my-1.5 mx-2" style={{ background: 'var(--color-divider)' }} />;

  return(
    <div ref={ref} className="relative" onMouseEnter={()=>item.children&&setSubOpen(true)}>
      <button
        className="flex items-center w-full text-left border-0 transition-colors"
        disabled={item.disabled}
        style={{
          height: 30,
          padding: `0 14px 0 ${14+depth*12}px`,
          gap: 10,
          fontSize: 'var(--font-size-md)',
          color: item.disabled ? 'var(--color-text-disabled)' : 'var(--color-text-primary)',
          cursor: item.disabled ? 'default' : 'pointer',
          background: 'transparent',
        }}
        onMouseEnter={(e)=>{
          if (!item.disabled) (e.currentTarget as HTMLElement).style.background = 'var(--color-panel-hover)';
        }}
        onMouseLeave={(e)=>{ (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        onClick={()=>{if(!item.disabled&&item.onClick&&!item.children){item.onClick();onClose()}}}
      >
        <span className="w-4 flex items-center justify-center shrink-0" style={{ color: 'var(--color-accent)' }}>
          {item.checked ? <Check size={12} strokeWidth={2.5} /> : null}
        </span>
        <span className="flex-1 whitespace-nowrap">{item.label}</span>
        {item.shortcut && (
          <span className="ml-6 font-mono"
            style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>
            {item.shortcut}
          </span>
        )}
        {item.children && <ChevronRight size={12} strokeWidth={2} style={{ color: 'var(--color-text-tertiary)' }} />}
      </button>
      {subOpen&&item.children&&(
        <div
          className="absolute z-menu min-w-[200px] py-1.5"
          style={{
            top: -6,
            left: '100%',
            background: 'var(--color-panel-raised)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-dropdown)',
          }}
        >
          {item.children.map(c=><MenuItem key={c.id} item={c} onClose={onClose} depth={depth+1}/>)}
        </div>
      )}
    </div>
  );
};