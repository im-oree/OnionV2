import React from 'react';
import { PropRow } from './Section';
import { NumberInput } from './inputs/NumberInput';
import { SelectInput } from './inputs/SelectInput';
import { CheckboxInput } from './inputs/CheckboxInput';
import type { TextAnimator } from '../../../types/layer';
import { useTextAnimatorStore } from '../../../state/textAnimatorStore';
import { Trash2 } from 'lucide-react';

interface Props { anim: TextAnimator; compId: string; layerId: string; }

const SEL_OPTS=[{label:'Characters',value:'characters'},{label:'Words',value:'words'},{label:'Lines',value:'lines'}];
const SHAPE_OPTS=[
  {label:'Square',value:'square'},{label:'Ramp Up',value:'ramp up'},
  {label:'Ramp Down',value:'ramp down'},{label:'Triangle',value:'triangle'},
  {label:'Round',value:'round'},{label:'Smooth',value:'smooth'},
];

export const TextAnimatorSection: React.FC<Props> = ({ anim, compId, layerId }) => {
  const [open,setOpen] = React.useState(true);
  const store = useTextAnimatorStore.getState();
  const upd = (patch: Partial<TextAnimator>) => store.updateAnimator(compId,layerId,anim.id,patch);
  const updP = (props: any) => store.updateAnimatorProps(compId,layerId,anim.id,props);

  return (
    <div style={{background:'var(--color-panel-raised)',border:'1px solid var(--color-border)',borderRadius:'var(--radius-md)',marginBottom:6,overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',gap:6,padding:'5px 8px',borderBottom:open?'1px solid var(--color-border)':'none'}}>
        <button onClick={()=>setOpen(o=>!o)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--color-text-tertiary)',fontSize:10,padding:0,lineHeight:1}}>
          {open?'▾':'▸'}
        </button>
        <CheckboxInput value={anim.enabled} onChange={v=>upd({enabled:v})}/>
        <input value={anim.name} onChange={e=>upd({name:e.target.value})}
          style={{flex:1,background:'none',border:'none',color:'var(--color-text-primary)',fontSize:'var(--font-size-xs)',fontFamily:'var(--font-family-mono)',outline:'none'}}/>
        <button onClick={()=>store.removeAnimator(compId,layerId,anim.id)}
          style={{background:'none',border:'none',cursor:'pointer',color:'var(--color-danger)',padding:0}}>
          <Trash2 size={11}/>
        </button>
      </div>

      {open&&(
        <div style={{padding:'6px 8px'}}>
          <div style={{fontSize:'var(--font-size-xs)',color:'var(--color-text-tertiary)',marginBottom:4,fontWeight:600}}>Range Selector</div>
          <PropRow label="By"><SelectInput value={anim.selector} onChange={v=>upd({selector:v as any})} options={SEL_OPTS}/></PropRow>
          <PropRow label="Start"><NumberInput value={anim.rangeStart} onChange={v=>upd({rangeStart:v})} min={0} max={100} step={1} precision={0} label="%"/></PropRow>
          <PropRow label="End"><NumberInput value={anim.rangeEnd} onChange={v=>upd({rangeEnd:v})} min={0} max={100} step={1} precision={0} label="%"/></PropRow>
          <PropRow label="Shape"><SelectInput value={anim.rangeShape} onChange={v=>upd({rangeShape:v as any})} options={SHAPE_OPTS}/></PropRow>
          <PropRow label="Randomize"><CheckboxInput value={anim.randomize} onChange={v=>upd({randomize:v})}/></PropRow>
          {anim.randomize&&(
            <PropRow label="Seed"><NumberInput value={anim.randomSeed} onChange={v=>upd({randomSeed:v})} min={0} max={9999} step={1} precision={0}/></PropRow>
          )}
          <div style={{fontSize:'var(--font-size-xs)',color:'var(--color-text-tertiary)',margin:'8px 0 4px',fontWeight:600,borderTop:'1px solid var(--color-border)',paddingTop:6}}>
            Properties
          </div>
          <PropRow label="Opacity"><NumberInput value={anim.properties.opacity??100} onChange={v=>updP({opacity:v})} min={0} max={100} step={1} precision={0} label="%"/></PropRow>
          <PropRow label="Pos X"><NumberInput value={anim.properties.positionX??0} onChange={v=>updP({positionX:v})} min={-2000} max={2000} step={1} precision={0} label="px"/></PropRow>
          <PropRow label="Pos Y"><NumberInput value={anim.properties.positionY??0} onChange={v=>updP({positionY:v})} min={-2000} max={2000} step={1} precision={0} label="px"/></PropRow>
          <PropRow label="Rotation"><NumberInput value={anim.properties.rotation??0} onChange={v=>updP({rotation:v})} min={-360} max={360} step={1} precision={0} label="°"/></PropRow>
          <PropRow label="Scale"><NumberInput value={anim.properties.scale??100} onChange={v=>updP({scale:v})} min={0} max={500} step={1} precision={0} label="%"/></PropRow>
          <PropRow label="Blur"><NumberInput value={anim.properties.blur??0} onChange={v=>updP({blur:v})} min={0} max={100} step={1} precision={0} label="px"/></PropRow>
          <PropRow label="Skew X"><NumberInput value={anim.properties.skewX??0} onChange={v=>updP({skewX:v})} min={-90} max={90} step={1} precision={0} label="°"/></PropRow>
          <PropRow label="Skew Y"><NumberInput value={anim.properties.skewY??0} onChange={v=>updP({skewY:v})} min={-90} max={90} step={1} precision={0} label="°"/></PropRow>
        </div>
      )}
    </div>
  );
};