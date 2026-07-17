import React,{useState,useRef,useEffect,useCallback} from 'react';

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
  const hc=useCallback((e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false)},[]);
  useEffect(()=>{if(open){document.addEventListener('mousedown',hc);return()=>document.removeEventListener('mousedown',hc)}},[open,hc]);

  return(
    <div ref={ref} className={`relative ${className}`}>
      <button className="panel-type-btn" onClick={()=>setOpen(!open)} aria-haspopup="listbox" aria-expanded={open}>
        {children||(<><span>{sel?.label??value}</span><span className="arrow">▼</span></>)}
      </button>
      {open&&(
        <div className="absolute z-dropdown min-w-[140px] py-1 shadow-dropdown bg-panel-raised border border-border rounded-sm top-full left-0 mt-0.5" role="listbox">
          {options.map((o,i)=>(
            <React.Fragment key={o.id}>
              {o.divider&&i>0&&<div className="h-px bg-border my-0.5"/>}
              <button
                className={[
                  'flex items-center w-full px-3 py-1 gap-2 text-left border-0 text-ui-sm',
                  o.disabled ? 'text-text-disabled' : 'text-text-primary',
                  value===o.id ? 'bg-panel-active text-white' : '',
                  !o.disabled && value!==o.id && 'hover:bg-panel-hover',
                ].join(' ')}
                disabled={o.disabled}
                onClick={()=>{if(!o.disabled){onChange(o);setOpen(false)}}}
                role="option" aria-selected={value===o.id}>
                {o.icon&&<span className="w-4 flex items-center">{o.icon}</span>}
                <span className="flex-1">{o.label}</span>
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};
