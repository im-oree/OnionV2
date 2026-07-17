import React,{useCallback,useRef} from 'react';

type Dir = 'horizontal'|'vertical';
interface Props{direction:Dir;onDrag:(d:number)=>void;onDragStart?:()=>void;onDragEnd?:()=>void}

export const Splitter:React.FC<Props> = ({direction,onDrag,onDragStart,onDragEnd})=>{
  const dragging=useRef(false);
  const lastPos=useRef(0);

  const handleMouseDown=useCallback((e:React.MouseEvent)=>{
    e.preventDefault();
    dragging.current=true;
    lastPos.current=direction==='horizontal'?e.clientY:e.clientX;
    onDragStart?.();
    const mm=(e:MouseEvent)=>{if(!dragging.current)return;const cp=direction==='horizontal'?e.clientY:e.clientX;const d=cp-lastPos.current;lastPos.current=cp;onDrag(d)};
    const mu=()=>{dragging.current=false;onDragEnd?.();document.removeEventListener('mousemove',mm);document.removeEventListener('mouseup',mu);document.body.style.cursor=''};
    document.body.style.cursor=direction==='horizontal'?'row-resize':'col-resize';
    document.addEventListener('mousemove',mm);document.addEventListener('mouseup',mu);
  },[direction,onDrag,onDragStart,onDragEnd]);

  return(
    <div
      className={[
        'splitter shrink-0 bg-surface relative z-panel',
        'transition-colors duration-fast hover:bg-accent active:bg-accent',
        direction==='horizontal' ? 'w-full h-splitter cursor-row-resize' : 'w-splitter h-full cursor-col-resize',
      ].join(' ')}
      onMouseDown={handleMouseDown}
    />
  );
};
