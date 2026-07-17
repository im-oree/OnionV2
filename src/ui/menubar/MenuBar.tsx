import React,{useState,useCallback,useEffect} from 'react';
import {MenuDropdown,type MenuItemDefinition} from './MenuDropdown';
import {fileMenu} from './menus/fileMenu';
import {editMenu} from './menus/editMenu';
import {renderMenu} from './menus/renderMenu';
import {windowMenu} from './menus/windowMenu';
import {helpMenu} from './menus/helpMenu';

interface MenuDef{label:string;items:MenuItemDefinition[]}
const MENUS:MenuDef[]=[
  {label:'File',items:fileMenu},{label:'Edit',items:editMenu},
  {label:'Render',items:renderMenu},{label:'Window',items:windowMenu},
  {label:'Help',items:helpMenu},
];

export const MenuBar:React.FC = ()=>{
  const [openMenu,setOpenMenu]=useState<string|null>(null);
  const close=useCallback(()=>setOpenMenu(null),[]);
  useEffect(()=>{const hk=(e:KeyboardEvent)=>{if(e.key==='Escape')close()};document.addEventListener('keydown',hk);return()=>document.removeEventListener('keydown',hk)},[close]);

  return(
    <div className="flex items-center h-menubar bg-menubar border-b border-border">
      {MENUS.map(m=>(
        <div key={m.label} className="relative h-full">
          <button
            className={[
              'h-full px-3 border-0 cursor-pointer text-ui-sm transition-colors duration-fast',
              openMenu===m.label ? 'bg-panel-active text-white' : 'bg-transparent text-menubar hover:bg-menubar-item-hover',
            ].join(' ')}
            onClick={()=>setOpenMenu(p=>p===m.label?null:m.label)}
            onMouseEnter={()=>{if(openMenu)setOpenMenu(m.label)}}>
            {m.label}
          </button>
          {openMenu===m.label&&<MenuDropdown items={m.items} onClose={close}/>}
        </div>
      ))}
      <div className="flex-1"/>
      <span className="px-3 text-ui-xs text-text-disabled">OnionV2 v0.1.0</span>
    </div>
  );
};
