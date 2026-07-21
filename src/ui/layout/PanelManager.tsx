import React,{useCallback} from 'react';
import {useUIStore,type PanelNode,type PanelType} from '../../state/uiStore';
import {PanelContainer} from './PanelContainer';
import {Splitter} from './Splitter';
import {PANEL_TYPES} from '../../config/constants';

const PANEL_CONTENT:Record<string,React.LazyExoticComponent<React.ComponentType<{}>>> = {
  [PANEL_TYPES.VIEWPORT]: React.lazy(()=>import('../panels/viewport/ViewportPanel')),
  [PANEL_TYPES.OUTLINER]: React.lazy(()=>import('../panels/outliner/OutlinerPanel')),
  [PANEL_TYPES.PROPERTIES]: React.lazy(()=>import('../panels/properties/PropertiesPanel')),
  [PANEL_TYPES.TIMELINE]: React.lazy(()=>import('../panels/timeline/TimelinePanel')),
  [PANEL_TYPES.GRAPH_EDITOR]: React.lazy(()=>import('../panels/grapheditor/GraphEditorPanel')),
  [PANEL_TYPES.CAMERA]: React.lazy(()=>import('../panels/camera/CameraPanel').then(m=>({default:m.CameraPanel}))),
};

const EmptyPanel:React.FC<{label:string}> = ({label})=><div className="panel-empty">{label}</div>;

interface Props{node:PanelNode}

export const PanelManager:React.FC<Props> = ({node})=>{
  const setLayoutTree=useUIStore(s=>s.setLayoutTree);

  const handleTypeChange=useCallback((panelId:string,newType:PanelType)=>{
    const updateNode=(n:PanelNode):PanelNode=>{
      if(n.type==='leaf'&&n.id===panelId){
        const label=newType.charAt(0).toUpperCase()+newType.slice(1).replace(/([A-Z])/g,' $1').trim();
        return{...n,panel:{...n.panel,type:newType,label}};
      }
      if(n.type==='split')return{...n,children:[updateNode(n.children[0]),updateNode(n.children[1])]};
      return n;
    };
    setLayoutTree(updateNode(node));
  },[node,setLayoutTree]);

  if(node.type==='leaf'){
    const{panel}=node;
    const PC=PANEL_CONTENT[panel.type];
    return(
      <PanelContainer panelType={panel.type as PanelType} onTypeChange={(nt)=>handleTypeChange(node.id,nt)} panelId={node.id}>
        <React.Suspense fallback={<div className="panel-empty h-full">Loading...</div>}>
          {PC?<PC/>:<EmptyPanel label={panel.label}/>}
        </React.Suspense>
      </PanelContainer>
    );
  }

  if(node.type==='split'){
    const[first,second]=node.children;
    const isV=node.direction==='vertical';
    const updateSizes=(idx:number,delta:number)=>{
      const ns=[...node.sizes];
      ns[idx]+=delta;
      if(ns[0]<50)ns[0]=50;
      if(ns[1]<50)ns[1]=50;
      const updateNode=(n:PanelNode):PanelNode=>{
        if(n.type==='split'&&n.id===node.id)return{...n,sizes:ns};
        if(n.type==='split')return{...n,children:[updateNode(n.children[0]),updateNode(n.children[1])]};
        return n;
      };
      setLayoutTree(updateNode(node));
    };

    const getFlex=(size:number)=>typeof size==='number'&&size>1?'none':'1 1 0%';

    return(
      <div className={`flex ${isV?'flex-col':'flex-row'} min-h-0 min-w-0 flex-1`}>
        <div className="flex min-h-0 min-w-0" style={{flex:getFlex(node.sizes[0]),[isV?'height':'width']:node.sizes[0]>1?node.sizes[0]:`${node.sizes[0]*100}%`}}>
          <PanelManager node={first}/>
        </div>
        <Splitter direction={isV?'horizontal':'vertical'} onDrag={(d)=>updateSizes(0,d)}/>
        <div className="flex min-h-0 min-w-0" style={{flex:getFlex(node.sizes[1]),[isV?'height':'width']:node.sizes[1]>1?node.sizes[1]:`${node.sizes[1]*100}%`}}>
          <PanelManager node={second}/>
        </div>
      </div>
    );
  }
  return null;
};
