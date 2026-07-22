import React,{useState,useRef,useCallback,useEffect} from 'react';
import {createPortal} from 'react-dom';

type Pos = 'top'|'bottom'|'left'|'right';

interface Props{content:string;position?:Pos;delay?:number;children:React.ReactElement}

/** Gap between the trigger element and the tooltip popup. */
const GAP = 8;

/** Read tooltip preferences from localStorage (cached once per session). */
let _prefsCached: {enabled: boolean; delay: number} | null = null;
function getTooltipPrefs() {
  if (_prefsCached) return _prefsCached;
  _prefsCached = {
    enabled: localStorage.getItem('pref_showTooltips') !== 'false',
    delay: Number(localStorage.getItem('pref_tooltipDelay') ?? 600),
  };
  return _prefsCached;
}
/** Call this when preferences change so the cache refreshes. */
export function invalidateTooltipPrefs() { _prefsCached = null; }

export const Tooltip:React.FC<Props> = ({content,position='top',delay,children})=>{
  const [visible,setVisible]=useState(false);
  const [coords,setCoords]=useState<{top:number;left:number}>({top:0,left:0});
  const timer=useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef=useRef<HTMLSpanElement>(null);

  // Merge user preference delay with the component-level delay prop.
  // The component prop (from ToolButton etc.) takes precedence if explicitly provided,
  // otherwise the user preference is used.
  const prefs = getTooltipPrefs();
  const effectiveDelay = delay !== undefined ? delay : prefs.delay;

  const show=useCallback(()=>{
    if(timer.current)clearTimeout(timer.current);
    if (!prefs.enabled) return;
    timer.current=setTimeout(()=>{
      if(!wrapperRef.current)return;
      const rect=wrapperRef.current.getBoundingClientRect();
      const cx=rect.left+rect.width/2;
      const cy=rect.top+rect.height/2;

      switch(position){
        case 'top':
          setCoords({top:rect.top-GAP,left:cx});
          break;
        case 'bottom':
          setCoords({top:rect.bottom+GAP,left:cx});
          break;
        case 'left':
          setCoords({top:cy,left:rect.left-GAP});
          break;
        case 'right':
          setCoords({top:cy,left:rect.right+GAP});
          break;
      }
      setVisible(true);
    },delay);
  },[effectiveDelay, position, prefs.enabled]);

  const hide=useCallback(()=>{
    if(timer.current)clearTimeout(timer.current);
    setVisible(false);
  },[]);

  // Cleanup on unmount
  useEffect(()=>()=>{
    if(timer.current)clearTimeout(timer.current);
  },[]);

  // Position offsets for centering
  const offsetX=position==='top'||position==='bottom'?'-50%':'0';
  const offsetY=position==='left'||position==='right'?'-50%':'0';
  const translateMap:Record<Pos,string> = {
    top:    `translate(${offsetX}, 0)`,
    bottom: `translate(${offsetX}, 0)`,
    left:   `translate(0, ${offsetY})`,
    right:  `translate(0, ${offsetY})`,
  };

  return(
    <span
      ref={wrapperRef}
      className="tooltip-wrapper"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && createPortal(
        <span
          className="tooltip-popup portal"
          style={{
            top: coords.top,
            left: coords.left,
            transform: translateMap[position],
          }}
        >
          <span className="tooltip-content">{content}</span>
        </span>,
        document.body,
      )}
    </span>
  );
};
