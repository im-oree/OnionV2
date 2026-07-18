import React,{useState,useRef,useCallback,useEffect} from 'react';

type Pos = 'top'|'bottom'|'left'|'right';

interface Props{content:string;position?:Pos;delay?:number;children:React.ReactElement}

export const Tooltip:React.FC<Props> = ({content,position='top',delay=600,children})=>{
  const [visible,setVisible]=useState(false);
  const timer=useRef<ReturnType<typeof setTimeout> | null>(null);
  const show=useCallback(()=>{timer.current=setTimeout(()=>setVisible(true),delay)},[delay]);
  const hide=useCallback(()=>{if(timer.current)clearTimeout(timer.current);setVisible(false)},[]);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[]);

  const posClass:Record<Pos,string> = {
    top:    'bottom-full left-1/2 -translate-x-1/2 mb-1',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1',
    left:   'right-full top-1/2 -translate-y-1/2 mr-1',
    right:  'left-full top-1/2 -translate-y-1/2 ml-1',
  };

  return(
    <span className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      <span>{children}</span>
      {visible&&(
        <span className={[
          'absolute z-tooltip pointer-events-none whitespace-nowrap',
          'bg-panel-raised text-text-primary text-ui-xs px-1.5 py-0.5',
          'rounded-sm shadow-tooltip border border-border',
          posClass[position],
        ].join(' ')}>
          {content}
        </span>
      )}
    </span>
  );
};
