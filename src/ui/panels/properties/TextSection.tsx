import React, { useRef, useReducer, useState } from 'react';
import { Section, PropRow } from './Section';
import { NumberInput } from './inputs/NumberInput';
import { ColorInput } from './inputs/ColorInput';
import { SelectInput } from './inputs/SelectInput';
import { CheckboxInput } from './inputs/CheckboxInput';
import { GradientEditor } from './inputs/GradientEditor';
import type { Layer, TextData, GradientFill } from '../../../types/layer';
import { useCompositionStore } from '../../../state/compositionStore';
import { useTextAnimatorStore } from '../../../state/textAnimatorStore';
import { fontManager } from '../../../storage/FontManager';
import { TextAnimatorSection } from './TextAnimatorSection';
import { Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify, Plus, Upload } from 'lucide-react';

interface Props { layer: Layer; compId: string; }

const WEIGHT_OPTS = [
  {label:'Thin 100',value:'100'},{label:'ExtraLight 200',value:'200'},
  {label:'Light 300',value:'300'},{label:'Regular 400',value:'400'},
  {label:'Medium 500',value:'500'},{label:'SemiBold 600',value:'600'},
  {label:'Bold 700',value:'700'},{label:'ExtraBold 800',value:'800'},
  {label:'Black 900',value:'900'},
];

const FILL_OPTS = [
  {label:'Solid',value:'solid'},
  {label:'Linear Gradient',value:'linear-gradient'},
  {label:'Radial Gradient',value:'radial-gradient'},
];

const btn = (active?: boolean): React.CSSProperties => ({
  padding:'3px 7px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
  background: active?'var(--color-accent-muted)':'var(--color-input-bg)',
  border:`1px solid ${active?'var(--color-accent)':'var(--color-border)'}`,
  borderRadius:'var(--radius-sm)',
  color: active?'var(--color-accent)':'var(--color-text-secondary)',
  minWidth:26, minHeight:22,
});

export const TextSection: React.FC<Props> = ({ layer, compId }) => {
  const data = layer.data as TextData|undefined;
  const fileRef = useRef<HTMLInputElement>(null);
  const [fonts, setFonts] = useState(()=>fontManager.getFontFamilies());
  const [,rerender] = useReducer(x=>x+1,0);
  if (!data) return null;

  const upd = (patch: Partial<TextData>) =>
    useCompositionStore.getState().updateLayer(compId, layer.id, { data:{...data,...patch} });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file=e.target.files?.[0]; if(!file)return;
    try { const ent=await fontManager.importFont(file); setFonts(fontManager.getFontFamilies()); upd({fontFamily:ent.family}); }
    catch(err){console.error('[TextSection]',err);}
    e.target.value='';
  };

  const fontOpts = fonts.map(f=>({label:f,value:f}));
  const animators = data.animators??[];
  const animStore = useTextAnimatorStore.getState();

  const defaultLinearGrad = (): GradientFill => ({type:'linear-gradient',angle:0,stops:[{offset:0,color:'#ffffff'},{offset:1,color:'#000000'}]});

  return (
    <>
      <Section label="Text Content">
        <PropRow label="Content">
          <textarea value={data.text} onChange={e=>upd({text:e.target.value})} rows={3}
            style={{width:'100%',minHeight:56,fontFamily:'var(--font-family-mono)',fontSize:'var(--font-size-xs)',
              padding:4,background:'var(--color-input-bg)',border:'1px solid var(--color-border)',
              borderRadius:'var(--radius-sm)',color:'var(--color-text-primary)',outline:'none',resize:'vertical'}} />
        </PropRow>
      </Section>

      <Section label="Font">
        <PropRow label="Family">
          <div style={{display:'flex',gap:4,width:'100%'}}>
            <div style={{flex:1}}><SelectInput value={data.fontFamily} onChange={v=>upd({fontFamily:v})} options={fontOpts} /></div>
            <button style={btn()} onClick={()=>fileRef.current?.click()} title="Upload .ttf/.otf/.woff">
              <Upload size={11}/>
            </button>
            <input ref={fileRef} type="file" accept=".ttf,.otf,.woff,.woff2" style={{display:'none'}} onChange={handleUpload}/>
          </div>
        </PropRow>
        <PropRow label="Size">
          <NumberInput value={data.fontSize} onChange={v=>upd({fontSize:v})} min={1} step={1} precision={0} label="px"/>
        </PropRow>
        <PropRow label="Weight">
          <SelectInput value={String(data.fontWeight??400)} onChange={v=>upd({fontWeight:Number(v)})} options={WEIGHT_OPTS}/>
        </PropRow>
        <PropRow label="Style">
          <div style={{display:'flex',gap:4}}>
            <button style={btn(data.fontStyle==='italic')} onClick={()=>upd({fontStyle:data.fontStyle==='italic'?'normal':'italic'})}>
              <Italic size={12}/>
            </button>
            <button style={btn(data.underline)} onClick={()=>upd({underline:!data.underline})}>
              <Underline size={12}/>
            </button>
            <button style={btn(data.strikethrough)} onClick={()=>upd({strikethrough:!data.strikethrough})}>
              <Strikethrough size={12}/>
            </button>
            <button style={btn(data.allCaps)} onClick={()=>upd({allCaps:!data.allCaps})} title="ALL CAPS">
              <span style={{fontSize:9,fontWeight:700,letterSpacing:0.5}}>AA</span>
            </button>
          </div>
        </PropRow>
        <PropRow label="Align">
          <div style={{display:'flex',gap:4}}>
            {(['left','center','right','justify'] as const).map(a=>(
              <button key={a} style={btn(data.alignment===a)} onClick={()=>upd({alignment:a})}>
                {a==='left'&&<AlignLeft size={12}/>}
                {a==='center'&&<AlignCenter size={12}/>}
                {a==='right'&&<AlignRight size={12}/>}
                {a==='justify'&&<AlignJustify size={12}/>}
              </button>
            ))}
          </div>
        </PropRow>
        <PropRow label="Tracking">
          <NumberInput value={data.tracking??0} onChange={v=>upd({tracking:v,letterSpacing:v})} min={-500} max={2000} step={1} precision={0}/>
        </PropRow>
        <PropRow label="Leading">
          <NumberInput value={data.lineHeight??1.2} onChange={v=>upd({lineHeight:v,leading:v})} min={0.5} max={10} step={0.05} precision={2}/>
        </PropRow>
        <PropRow label="Baseline Shift">
          <NumberInput value={data.baselineShift??0} onChange={v=>upd({baselineShift:v})} min={-500} max={500} step={1} precision={0} label="px"/>
        </PropRow>
      </Section>

      <Section label="Fill">
        <PropRow label="Type">
          <SelectInput value={data.fillType??'solid'} onChange={v=>upd({fillType:v as any})} options={FILL_OPTS}/>
        </PropRow>
        {(data.fillType??'solid')==='solid'&&(
          <PropRow label="Color"><ColorInput value={data.color} onChange={v=>upd({color:v})}/></PropRow>
        )}
        {(data.fillType??'solid')!=='solid'&&(
          <div style={{padding:'4px 0'}}>
            <GradientEditor
              value={data.fillGradient??defaultLinearGrad()}
              onChange={g=>upd({fillGradient:g})}
            />
          </div>
        )}
      </Section>

      <Section label="Stroke" defaultOpen={data.stroke?.enabled}>
        <PropRow label="Enabled">
          <CheckboxInput value={data.stroke?.enabled??false} onChange={v=>upd({stroke:{...data.stroke!,enabled:v}})}/>
        </PropRow>
        {data.stroke?.enabled&&<>
          <PropRow label="Color"><ColorInput value={data.stroke.color} onChange={v=>upd({stroke:{...data.stroke!,color:v}})}/></PropRow>
          <PropRow label="Width">
            <NumberInput value={data.stroke.width} onChange={v=>upd({stroke:{...data.stroke!,width:v}})} min={0} step={0.5} precision={1} label="px"/>
          </PropRow>
        </>}
      </Section>

      <Section label="Shadow" defaultOpen={data.shadow?.enabled}>
        <PropRow label="Enabled">
          <CheckboxInput value={data.shadow?.enabled??false} onChange={v=>upd({shadow:{...data.shadow!,enabled:v}})}/>
        </PropRow>
        {data.shadow?.enabled&&<>
          <PropRow label="Color"><ColorInput value={data.shadow.color??'#000000'} onChange={v=>upd({shadow:{...data.shadow!,color:v}})}/></PropRow>
          <PropRow label="Blur">
            <NumberInput value={data.shadow.blur??0} onChange={v=>upd({shadow:{...data.shadow!,blur:v}})} min={0} max={100} step={1} precision={0} label="px"/>
          </PropRow>
          <PropRow label="Offset X">
            <NumberInput value={data.shadow.offsetX??0} onChange={v=>upd({shadow:{...data.shadow!,offsetX:v}})} min={-200} max={200} step={1} precision={0} label="px"/>
          </PropRow>
          <PropRow label="Offset Y">
            <NumberInput value={data.shadow.offsetY??0} onChange={v=>upd({shadow:{...data.shadow!,offsetY:v}})} min={-200} max={200} step={1} precision={0} label="px"/>
          </PropRow>
        </>}
      </Section>

      <Section label="Text Animators">
        <div style={{display:'flex',justifyContent:'flex-end',padding:'0 0 6px'}}>
          <button style={{...btn(),gap:4}} onClick={()=>{animStore.addAnimator(compId,layer.id);rerender();}}>
            <Plus size={11}/> Add Animator
          </button>
        </div>
        {animators.map(anim=>(
          <TextAnimatorSection key={anim.id} anim={anim} compId={compId} layerId={layer.id}/>
        ))}
      </Section>
    </>
  );
};