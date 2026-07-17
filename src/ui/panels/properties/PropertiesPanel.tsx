import React from 'react';

/** Collapsible section mimicking Blender's properties panel */
interface Section{id:string;label:string;icon:string;children?:React.ReactNode}

const SECTIONS:Section[]=[
  {id:'render',label:'Render',icon:''},
  {id:'output',label:'Output',icon:''},
  {id:'viewLayer',label:'View Layer',icon:''},
  {id:'scene',label:'Scene',icon:''},
  {id:'world',label:'World',icon:''},
  {id:'object',label:'Object',icon:''},
];

const SectionGroup:React.FC<{section:Section;defaultOpen?:boolean}> = ({section,defaultOpen=true})=>{
  const [open,setOpen]=React.useState(defaultOpen);
  return(
    <div className="mb-0.5">
      <button
        className="flex items-center w-full h-panel-header px-2 gap-1 border-0 cursor-pointer text-ui-xs font-medium text-text-secondary uppercase tracking-wider bg-panel-header hover:bg-panel-hover"
        onClick={()=>setOpen(!open)}
      >
        <span className="text-text-disabled text-[8px] w-3">{open?'▼':'▸'}</span>
        <span>{section.label}</span>
      </button>
      {open&&(
        <div className="py-1 text-ui-xs text-text-disabled text-center">
          {section.label} properties — Phase 3
        </div>
      )}
    </div>
  );
};

export const PropertiesPanel:React.FC = ()=>(
  <div className="flex flex-col h-full">
    <div className="flex-1 overflow-auto">
      {SECTIONS.map(s=><SectionGroup key={s.id} section={s}/>)}
    </div>
  </div>
);
export default PropertiesPanel;
