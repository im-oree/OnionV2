import React from 'react';
import { Section, PropRow } from './Section';
import { NumberInput } from './inputs/NumberInput';
import { SelectInput } from './inputs/SelectInput';
import { CheckboxInput } from './inputs/CheckboxInput';
import { useMaskStore, type VectorMask } from '../../../state/maskStore';
import { Plus, Trash2, Copy, ChevronDown, ChevronRight, Eye, EyeOff, Lock } from 'lucide-react';

interface Props { layerId: string; }

const MODE_OPTS=[
  {label:'Add',value:'add'},{label:'Subtract',value:'subtract'},
  {label:'Intersect',value:'intersect'},{label:'Difference',value:'difference'},
];

const MaskRow: React.FC<{mask:VectorMask;layerId:string}> = ({mask,layerId}) => {
  const store = useMaskStore.getState();
  const selected = useMaskStore(s=>s.selectedMaskId===mask.id);
  const [open,setOpen] = React.useState(true);
  const upd = (patch: Partial<VectorMask>) => store.updateMask(layerId,mask.id,patch);

  return (
    <div style={{border:`1px solid ${selected?'var(--color-accent)':'var(--color-border)'}`,
      borderRadius:'var(--radius-md)',marginBottom:4,overflow:'hidden',
      background:'var(--color-panel-raised)'}}>
      <div style={{display:'flex',alignItems:'center',gap:4,padding:'4px 6px',cursor:'pointer',
        borderBottom:open?'1px solid var(--color-border)':'none'}}
        onClick={()=>store.selectMask(selected?null:mask.id)}>
        <div style={{width:10,height:10,borderRadius:'50%',background:mask.color,flexShrink:0}}/>
        <button onClick={e=>{e.stopPropagation();setOpen(o=>!o);}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--color-text-tertiary)',padding:0,fontSize:10}}>
          {open?<ChevronDown size={11}/>:<ChevronRight size={11}/>}
        </button>
        <input value={mask.name} onChange={e=>upd({name:e.target.value})}
          onClick={e=>e.stopPropagation()}
          style={{flex:1,background:'none',border:'none',color:'var(--color-text-primary)',fontSize:'var(--font-size-xs)',fontFamily:'var(--font-family-mono)',outline:'none'}}/>
        <button onClick={e=>{e.stopPropagation();upd({enabled:!mask.enabled});}}
          style={{background:'none',border:'none',cursor:'pointer',color:mask.enabled?'var(--color-accent)':'var(--color-text-disabled)',padding:0}}>
          {mask.enabled?<Eye size={11}/>:<EyeOff size={11}/>}
        </button>
        <button onClick={e=>{e.stopPropagation();upd({locked:!mask.locked});}}
          style={{background:'none',border:'none',cursor:'pointer',color:mask.locked?'var(--color-accent)':'var(--color-text-disabled)',padding:0}}>
          <Lock size={11}/>
        </button>
        <button onClick={e=>{e.stopPropagation();store.duplicateMask(layerId,mask.id);}}
          style={{background:'none',border:'none',cursor:'pointer',color:'var(--color-text-tertiary)',padding:0}}>
          <Copy size={11}/>
        </button>
        <button onClick={e=>{e.stopPropagation();store.removeMask(layerId,mask.id);}}
          style={{background:'none',border:'none',cursor:'pointer',color:'var(--color-danger)',padding:0}}>
          <Trash2 size={11}/>
        </button>
      </div>

      {open&&(
        <div style={{padding:'6px 8px'}}>
          <PropRow label="Mode">
            <SelectInput value={mask.mode} onChange={v=>upd({mode:v as any})} options={MODE_OPTS}/>
          </PropRow>
          <PropRow label="Inverted">
            <CheckboxInput value={mask.inverted} onChange={v=>upd({inverted:v})}/>
          </PropRow>
          <PropRow label="Opacity">
            <NumberInput value={mask.opacity} onChange={v=>upd({opacity:v})} min={0} max={100} step={1} precision={0} label="%"/>
          </PropRow>
          <PropRow label="Feather">
            <NumberInput value={mask.feather} onChange={v=>upd({feather:v})} min={0} max={200} step={1} precision={0} label="px"/>
          </PropRow>
          <PropRow label="Expansion">
            <NumberInput value={mask.expansion} onChange={v=>upd({expansion:v})} min={-200} max={200} step={1} precision={0} label="px"/>
          </PropRow>
          <PropRow label="Shape">
            <span style={{fontSize:'var(--font-size-xs)',color:'var(--color-text-tertiary)',fontFamily:'var(--font-family-mono)'}}>
              {mask.shapeType} · {mask.commands.length} cmds
            </span>
          </PropRow>
        </div>
      )}
    </div>
  );
};

export const MaskSection: React.FC<Props> = ({ layerId }) => {
  const masks = useMaskStore(s=>s.getMasksForLayer(layerId));
  const store = useMaskStore.getState();

  const btnStyle: React.CSSProperties = {
    padding:'2px 8px',fontSize:'var(--font-size-xs)',cursor:'pointer',display:'flex',alignItems:'center',gap:4,
    background:'var(--color-input-bg)',border:'1px solid var(--color-border)',
    borderRadius:'var(--radius-sm)',color:'var(--color-text-secondary)',
  };

  return (
    <Section label="Masks">
      <div style={{display:'flex',gap:6,marginBottom:6,flexWrap:'wrap'}}>
        <button style={btnStyle} onClick={()=>store.addRectMask(layerId)}>
          <Plus size={11}/> Rect
        </button>
        <button style={btnStyle} onClick={()=>store.addEllipseMask(layerId)}>
          <Plus size={11}/> Ellipse
        </button>
        <button style={btnStyle} onClick={async () => {
          const { useToolStore } = await import('../../../state/toolStore');
          const { usePenToolStore } = await import('../../../state/penToolStore');
          // Switch to pen tool, set a flag that the result goes into a mask
          useToolStore.getState().setActiveTool('pen' as any);
          // Store which layer will receive the mask
          (window as any).__maskTargetLayerId = layerId;
          usePenToolStore.getState().startDrawing();
        }}>
          <Plus size={11}/> Path Mask
        </button>
      </div>
      {masks.length===0&&(
        <div style={{fontSize:'var(--font-size-xs)',color:'var(--color-text-disabled)',textAlign:'center',padding:'8px 0',fontStyle:'italic'}}>
          No masks
        </div>
      )}
      {masks.map(m=>(
        <MaskRow key={m.id} mask={m} layerId={layerId}/>
      ))}
    </Section>
  );
};