import React from 'react';
import { Dropdown, type DropdownOption } from '../common/Dropdown';
import { PANEL_TYPES } from '../../config/constants';
import type { PanelType } from '../../state/uiStore';

const PANEL_OPTIONS:DropdownOption[]=[
  {id:PANEL_TYPES.VIEWPORT,label:'Viewport'},{id:PANEL_TYPES.OUTLINER,label:'Outliner'},
  {id:PANEL_TYPES.PROPERTIES,label:'Properties'},{id:PANEL_TYPES.TIMELINE,label:'Timeline'},
  {id:PANEL_TYPES.GRAPH_EDITOR,label:'Graph Editor'},{id:PANEL_TYPES.FILE_BROWSER,label:'File Browser'},
  {id:PANEL_TYPES.NODE_EDITOR,label:'Node Editor'},{id:PANEL_TYPES.TEXT_EDITOR,label:'Text Editor'},
  {id:PANEL_TYPES.CONSOLE,label:'Console'},
];

interface Props{panelType:PanelType;onTypeChange:(t:PanelType)=>void;children?:React.ReactNode}

export const PanelHeader:React.FC<Props> = ({panelType,onTypeChange,children})=>(
  <div className="panel-header">
    <Dropdown value={panelType} options={PANEL_OPTIONS} onChange={o=>onTypeChange(o.id as PanelType)}/>
    <div className="flex-1"/>
    {children}
  </div>
);
