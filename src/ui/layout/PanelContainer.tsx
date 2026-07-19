import React,{useState,useCallback} from 'react';
import {PanelHeader} from './PanelHeader';
import {ContextMenu,type ContextMenuItem} from '../common/ContextMenu';
import type {PanelType} from '../../state/uiStore';

interface Props{
  panelType:PanelType;
  onTypeChange:(t:PanelType)=>void;
  children:React.ReactNode;
  headerActions?:React.ReactNode;
  className?:string;
  panelId:string;
}

export const PanelContainer:React.FC<Props> = ({
  panelType,onTypeChange,children,headerActions,className='',panelId,
})=>{
  const [ctxMenu,setCtxMenu]=useState<{x:number;y:number}|null>(null);

  const handleContextMenu=useCallback((e:React.MouseEvent)=>{
    const rect=e.currentTarget.getBoundingClientRect();
    if(e.clientX>rect.right-40&&e.clientY<rect.top+40){
      e.preventDefault();
      setCtxMenu({x:e.clientX,y:e.clientY});
    }
  },[]);

  const ctxItems:ContextMenuItem[]=[
    {id:`${panelId}.splitH`,label:'Split Horizontal',onClick:()=>console.log('Split H:',panelId)},
    {id:`${panelId}.splitV`,label:'Split Vertical',onClick:()=>console.log('Split V:',panelId)},
    {id:`${panelId}.sep`,label:'',divider:true,onClick:()=>{}},
    {id:`${panelId}.join`,label:'Join',onClick:()=>console.log('Join:',panelId)},
  ];

  return(
    <div className={`panel ${className}`} onContextMenu={handleContextMenu}>
      <PanelHeader panelType={panelType} onTypeChange={onTypeChange}>
        {headerActions}
      </PanelHeader>
      <div className="panel-body">{children}</div>
      {ctxMenu&&<ContextMenu items={ctxItems} position={ctxMenu} onClose={()=>setCtxMenu(null)}/>}
    </div>
  );
};