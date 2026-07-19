import React,{useState,useCallback,useEffect} from 'react';
import {MenuDropdown,type MenuItemDefinition} from './MenuDropdown';
import {fileMenu} from './menus/fileMenu';
import {editMenu} from './menus/editMenu';
import {addMenu} from './menus/addMenu';
import {animationMenu} from './menus/animationMenu';
import {renderMenu} from './menus/renderMenu';
import {viewMenu} from './menus/viewMenu';
import {windowMenu} from './menus/windowMenu';
import {helpMenu} from './menus/helpMenu';

interface MenuDef{label:string;items:MenuItemDefinition[]}
const MENUS:MenuDef[]=[
  {label:'File',items:fileMenu},
  {label:'Edit',items:editMenu},
  {label:'Add',items:addMenu},
  {label:'Animation',items:animationMenu},
  {label:'Render',items:renderMenu},
  {label:'View',items:viewMenu},
  {label:'Window',items:windowMenu},
  {label:'Help',items:helpMenu},
];

export const MenuBar:React.FC = ()=>{
  const [openMenu,setOpenMenu]=useState<string|null>(null);
  const close=useCallback(()=>setOpenMenu(null),[]);
  useEffect(()=>{
    const hk=(e:KeyboardEvent)=>{if(e.key==='Escape')close()};
    document.addEventListener('keydown',hk);
    return()=>document.removeEventListener('keydown',hk);
  },[close]);

  return(
    <div
      className="flex items-center h-full px-2"
      style={{ background: 'transparent' }}
    >
      {MENUS.map(m=>(
        <div key={m.label} className="relative h-full flex items-center">
          <button
            className="h-[24px] px-3 rounded-md cursor-pointer transition-colors duration-fast"
            style={{
              fontSize: 'var(--font-size-sm)',
              fontWeight: 500,
              color: openMenu===m.label ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              background: openMenu===m.label ? 'var(--color-panel-hover)' : 'transparent',
            }}
            onMouseEnter={(e)=>{
              if(openMenu) setOpenMenu(m.label);
              else (e.currentTarget as HTMLElement).style.color='var(--color-text-primary)';
            }}
            onMouseLeave={(e)=>{
              if(openMenu!==m.label)
                (e.currentTarget as HTMLElement).style.color='var(--color-text-secondary)';
            }}
            onClick={()=>setOpenMenu(p=>p===m.label?null:m.label)}
          >
            {m.label}
          </button>
          {openMenu===m.label&&<MenuDropdown items={m.items} onClose={close}/>}
        </div>
      ))}
      <div className="flex-1"/>
      <span
        className="px-3"
        style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-disabled)', letterSpacing: '0.03em' }}
      >
        OnionV2 v0.1.0
      </span>
    </div>
  );
};