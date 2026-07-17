import React,{useEffect,useCallback,useRef} from 'react';
import {useUIStore} from '../../state/uiStore';
import {MenuBar} from '../menubar/MenuBar';
import {WorkspaceTabs} from './WorkspaceTabs';
import {Toolbar} from '../toolbar/Toolbar';
import {Splitter} from './Splitter';

const ViewportPanel = React.lazy(()=>import('../panels/viewport/ViewportPanel'));
const OutlinerPanel = React.lazy(()=>import('../panels/outliner/OutlinerPanel'));
const PropertiesPanel = React.lazy(()=>import('../panels/properties/PropertiesPanel'));
const TimelinePanel = React.lazy(()=>import('../panels/timeline/TimelinePanel'));
const Fallback = ()=><div className="panel-empty h-full">Loading...</div>;

/**
 * CSS Grid layout matching Blender's structure:
 *
 * ┌─menubar──┬─menubar──┬─menubar──┬─menubar──┐
 * ├─tabs─────┼─tabs─────┼─tabs─────┼─tabs─────┤
 * ├─toolbar──┼─viewport─┼─vsplit───┼─rightcol─┤
 * ├─toolbar──┼─hsplit───┼─hsplit───┼─hsplit───┤
 * └─toolbar──┴─timeline─┴─timeline─┴─timeline─┘
 *
 * Columns: toolbar(44) | viewport(flex) | vsplit(4) | rightcol(320)
 * Rows: menubar(28) | tabs(28) | main(flex) | hsplit(4) | timeline(200)
 */
export const AppShell:React.FC = ()=>{
  const rpw=useUIStore(s=>s.rightPanelWidth);
  const th=useUIStore(s=>s.timelineHeight);
  const or=useUIStore(s=>s.outlinerRatio);
  const setOr=useUIStore(s=>s.setOutlinerRatio);
  const setWs=useUIStore(s=>s.setWindowSize);

  // Drag state using refs for performance (no re-render during drag)
  const dState=useRef({rightPanelWidth:rpw,timelineHeight:th,outlinerRatio:or});

  // Update refs when store values change
  useEffect(()=>{dState.current.rightPanelWidth=rpw},[rpw]);
  useEffect(()=>{dState.current.timelineHeight=th},[th]);
  useEffect(()=>{dState.current.outlinerRatio=or},[or]);

  const handleResize=useCallback(()=>setWs({width:window.innerWidth,height:window.innerHeight}),[setWs]);
  useEffect(()=>{window.addEventListener('resize',handleResize);return()=>window.removeEventListener('resize',handleResize)},[handleResize]);

  return(
    <div className="h-full w-full overflow-hidden bg-app"
      style={{
        display:'grid',
        gridTemplateColumns:`${44}px 1fr 4px ${rpw}px`,
        gridTemplateRows:`${28}px ${28}px 1fr 4px ${th}px`,
        gridTemplateAreas:'"menubar menubar menubar menubar" "tabs tabs tabs tabs" "toolbar viewport vsplit rightcol" "toolbar hsplit hsplit hsplit" "toolbar timeline timeline timeline"',
      }}>

      {/* Menubar */}
      <div className="min-h-0 min-w-0 overflow-hidden" style={{gridArea:'menubar'}}><MenuBar/></div>
      {/* Workspace tabs */}
      <div className="min-h-0 min-w-0 overflow-hidden" style={{gridArea:'tabs'}}><WorkspaceTabs/></div>
      {/* Toolbar */}
      <div className="min-h-0 min-w-0 overflow-hidden bg-surface border-r border-border" style={{gridArea:'toolbar'}}><Toolbar/></div>
      {/* Viewport */}
      <div className="min-h-0 min-w-0 overflow-hidden relative" style={{gridArea:'viewport'}}>
        <React.Suspense fallback={<Fallback/>}><ViewportPanel/></React.Suspense>
      </div>
      {/* Vertical splitter (viewport | rightcol) */}
      <div className="min-h-0 bg-surface hover:bg-accent transition-colors duration-fast" style={{gridArea:'vsplit'}}>
        <VSplitDrag/>
      </div>
      {/* Right column */}
      <div className="min-h-0 min-w-0 overflow-hidden flex flex-col bg-app" style={{gridArea:'rightcol'}}>
        <div className="flex-1 min-h-0 overflow-hidden" style={{flex:or}}>
          <React.Suspense fallback={<Fallback/>}><OutlinerPanel/></React.Suspense>
        </div>
        <Splitter direction="horizontal" onDrag={(d)=>{
          const newR=dState.current.outlinerRatio+(d/(dState.current.rightPanelWidth||320));
          if(newR>0.15&&newR<0.85){dState.current.outlinerRatio=newR;setOr(newR);}
        }}/>
        <div className="flex-1 min-h-0 overflow-hidden" style={{flex:1-or}}>
          <React.Suspense fallback={<Fallback/>}><PropertiesPanel/></React.Suspense>
        </div>
      </div>
      {/* Horizontal splitter (viewport | timeline) */}
      <div className="min-w-0 bg-surface hover:bg-accent transition-colors duration-fast" style={{gridArea:'hsplit'}}>
        <HSplitDrag/>
      </div>
      {/* Timeline */}
      <div className="min-h-0 min-w-0 overflow-hidden" style={{gridArea:'timeline'}}>
        <React.Suspense fallback={<Fallback/>}><TimelinePanel/></React.Suspense>
      </div>
    </div>
  );
};

/** Drag handler for vertical splitter (viewport | rightcol) */
const VSplitDrag:React.FC = ()=>{
  const setRpw=useUIStore(s=>s.setRightPanelWidth);
  const dragging=useRef(false);
  const currentW=useRef(0);
  const handleDown=(e:React.MouseEvent)=>{
    e.preventDefault();dragging.current=true;
    const startX=e.clientX;
    const startW=useUIStore.getState().rightPanelWidth;
    currentW.current=startW;
    const mm=(ev:MouseEvent)=>{if(!dragging.current)return;currentW.current=Math.max(180,startW+ev.clientX-startX)};
    const mu=()=>{dragging.current=false;setRpw(currentW.current);document.removeEventListener('mousemove',mm);document.removeEventListener('mouseup',mu);document.body.style.cursor=''};
    document.body.style.cursor='col-resize';document.addEventListener('mousemove',mm);document.addEventListener('mouseup',mu);
  };
  return <div onMouseDown={handleDown} className="w-full h-full cursor-col-resize"/>;
};

/** Drag handler for horizontal splitter (viewport | timeline) */
const HSplitDrag:React.FC = ()=>{
  const setTh=useUIStore(s=>s.setTimelineHeight);
  const dragging=useRef(false);
  const currentH=useRef(0);
  const handleDown=(e:React.MouseEvent)=>{
    e.preventDefault();dragging.current=true;
    const startY=e.clientY;
    const startH=useUIStore.getState().timelineHeight;
    currentH.current=startH;
    const mm=(ev:MouseEvent)=>{if(!dragging.current)return;currentH.current=Math.max(80,startH+startY-ev.clientY)};
    const mu=()=>{dragging.current=false;setTh(currentH.current);document.removeEventListener('mousemove',mm);document.removeEventListener('mouseup',mu);document.body.style.cursor=''};
    document.body.style.cursor='row-resize';document.addEventListener('mousemove',mm);document.addEventListener('mouseup',mu);
  };
  return <div onMouseDown={handleDown} className="w-full h-full cursor-row-resize"/>;
};

// Attach drag handlers to the splitter cells
// These are placed via grid-area matching the splitters
// We use a separate effect approach: the Splitter wrapper renders the drag components
