import React,{useState,useRef,useEffect,useCallback} from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface DropdownOption{
  id:string; label:string; icon?:React.ReactNode;
  disabled?:boolean; divider?:boolean;
}

interface Props{
  value:string; options:DropdownOption[];
  onChange:(o:DropdownOption)=>void;
  className?:string; children?:React.ReactNode;
}

export const Dropdown:React.FC<Props> = ({value,options,onChange,className='',children})=>{
  const [open,setOpen]=useState(false);
  const ref=useRef<HTMLDivElement>(null);
  const sel=options.find(o=>o.id===value);
  const hc=useCallback((e:MouseEvent)=>{
    if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false);
  },[]);
  useEffect(()=>{
    if(open){document.addEventListener('mousedown',hc);return()=>document.removeEventListener('mousedown',hc);}
  },[open,hc]);

  return(
    <div ref={ref} className={`relative ${className}`}>
      <button
        className="panel-type-btn"
        onClick={()=>setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {children||(
          <>
            <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
              {sel?.label??value}
            </span>
            <ChevronDown size={12} strokeWidth={2} style={{ opacity: 0.55 }} />
          </>
        )}
      </button>
      {open&&(
        <div
          className="absolute z-dropdown min-w-[180px] py-1.5 top-full left-0 mt-1.5"
          role="listbox"
          style={{
            background: 'var(--color-panel-raised)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-dropdown)',
            animation:'dropdown-in 140ms var(--ease-out)',
          }}
        >
          {options.map((o,i)=>{
            const isSel = value===o.id;
            return (
              <React.Fragment key={o.id}>
                {o.divider&&i>0&&(
                  <div className="h-px my-1 mx-2" style={{ background: 'var(--color-divider)' }}/>
                )}
                <button
                  className="flex items-center w-full h-[28px] px-3 gap-2 text-left border-0 bg-transparent cursor-pointer transition-colors"
                  style={{
                    fontSize: 'var(--font-size-md)',
                    color: o.disabled
                      ? 'var(--color-text-disabled)'
                      : isSel ? 'var(--color-accent)' : 'var(--color-text-primary)',
                  }}
                  onMouseEnter={(e)=>{
                    if(!o.disabled && !isSel)
                      (e.currentTarget as HTMLElement).style.background='var(--color-panel-hover)';
                  }}
                  onMouseLeave={(e)=>{
                    (e.currentTarget as HTMLElement).style.background='transparent';
                  }}
                  disabled={o.disabled}
                  onClick={()=>{if(!o.disabled){onChange(o);setOpen(false);}}}
                  role="option" aria-selected={isSel}
                >
                  {o.icon&&<span className="w-4 flex items-center">{o.icon}</span>}
                  <span className="flex-1">{o.label}</span>
                  {isSel && <Check size={12} strokeWidth={2.5} />}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};