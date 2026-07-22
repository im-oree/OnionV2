import React, { useState } from 'react';
import { useToolStore } from '../../../state/toolStore';
import { useSelectionStore } from '../../../state/selectionStore';
import { useCompositionStore } from '../../../state/compositionStore';
import { TOOLS } from '../../../config/constants';
import { NumberInput } from '../properties/inputs/NumberInput';
import { ColorInput } from '../properties/inputs/ColorInput';
import type { ShapeData, ShapeFill, ShapeStroke, TextData } from '../../../types/layer';
import { defaultShapeFill, defaultShapeStroke } from '../../../types/layer';
import { SHAPE_PRESETS, getPresetById } from '../../../shapes/presets';
import { PATH_BUILDERS } from '../../../shapes/ShapePathBuilder';
import { defaultParamsFor } from '../../../shapes/presets';
import { ChevronDown } from 'lucide-react';

const CATEGORIES = ['basic','polygon','star','symbol','arrow','decorative','ui'] as const;

const ShapeThumb: React.FC<{presetId: string; selected: boolean; onClick: ()=>void; label: string}> = ({presetId, selected, onClick, label}) => {
  const preset = getPresetById(presetId);
  const builder = preset ? PATH_BUILDERS[preset.id] : null;
  const d = (preset && builder) ? (()=>{ try{return builder({width:56,height:56,params:defaultParamsFor(preset)});}catch{return '';}})() : '';
  return (
    <button onClick={onClick} title={label} style={{
      width: 48, height: 48, padding: 2, cursor: 'pointer',
      background: selected ? 'var(--color-accent-muted)' : 'var(--color-input-bg)',
      border: `1.5px solid ${selected ? 'var(--color-accent)' : 'var(--color-border)'}`,
      borderRadius: 'var(--radius-md)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg width={32} height={32} viewBox="-40 -40 80 80">
        {d && <path d={d} fill={selected ? 'var(--color-accent)' : 'var(--color-text-secondary)'} fillRule="evenodd"/>}
      </svg>
    </button>
  );
};

const ShapePickerPopover: React.FC<{currentId: string; onPick: (id: string)=>void; onClose: ()=>void}> = ({currentId, onPick, onClose}) => {
  const [cat, setCat] = useState<string>('basic');
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    setTimeout(() => document.addEventListener('mousedown', onDoc), 0);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [onClose]);

  return (
    <div ref={ref} style={{
      position: 'absolute', top: 'calc(100% + 6px)', left: 0, width: 340,
      background: 'var(--color-panel-raised)',
      border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-dropdown)', zIndex: 100, overflow: 'hidden',
    }}>
      <div style={{display:'flex',borderBottom:'1px solid var(--color-border)',overflowX:'auto'}}>
        {CATEGORIES.map(c=>(
          <button key={c} onClick={()=>setCat(c)} style={{
            padding: '5px 10px', fontSize: 'var(--font-size-xs)', cursor: 'pointer',
            background: cat===c ? 'var(--color-accent-muted)' : 'transparent',
            color: cat===c ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            border: 'none', borderBottom: cat===c ? '2px solid var(--color-accent)' : '2px solid transparent',
            textTransform: 'capitalize', whiteSpace: 'nowrap',
          }}>{c}</button>
        ))}
      </div>
      <div style={{display:'flex',flexWrap:'wrap',gap:4,padding:8,maxHeight:280,overflowY:'auto'}}>
        {SHAPE_PRESETS.filter(p=>p.category===cat).map(p=>(
          <div key={p.id} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,width:52}}>
            <ShapeThumb presetId={p.id} selected={currentId===p.id} onClick={()=>{onPick(p.id);onClose();}} label={p.label}/>
            <span style={{fontSize:8,color:currentId===p.id?'var(--color-accent)':'var(--color-text-tertiary)',lineHeight:1.1,textAlign:'center',maxWidth:52,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              {p.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ShapeContextToolbar: React.FC = () => {
  const tool = useToolStore(s => s.activeTool);
  const currentPresetId = useToolStore(s => s.toolSettings.currentShapePresetId);
  const setShapePreset = useToolStore(s => s.setShapePreset);
  const [pickerOpen, setPickerOpen] = useState(false);

  const isShapeTool = tool === TOOLS.SHAPE;
  const isPenTool = tool === TOOLS.PEN;
  const isTextTool = tool === TOOLS.TEXT;

  const selIds = useSelectionStore(s => s.selected.filter(x => x.type === 'layer').map(x => x.id));
  const comp = useCompositionStore(s => s.activeCompositionId ? s.compositions.find(c => c.id === s.activeCompositionId) ?? null : null);
  const layer = comp && selIds.length === 1 ? comp.layers.find(l => l.id === selIds[0]) ?? null : null;

  const showToolbar = isShapeTool || isPenTool || isTextTool || (layer && (layer.type === 'shape' || layer.type === 'text'));
  if (!showToolbar) return null;

  const data = layer?.data as ShapeData | TextData | undefined;
  const isShape = layer?.type === 'shape';
  const isText = layer?.type === 'text';

  const shapeFill: ShapeFill = isShape ? ((data as ShapeData) as any).fill ?? defaultShapeFill() : defaultShapeFill();
  const shapeStroke: ShapeStroke = isShape ? ((data as ShapeData) as any).stroke ?? defaultShapeStroke() : defaultShapeStroke();

  const updShape = (patch: any) => {
    if (!layer || !comp) return;
    useCompositionStore.getState().updateLayer(comp.id, layer.id, { data: { ...(data as any), ...patch } });
  };

  const preset = getPresetById(currentPresetId);
  const presetBuilder = preset ? PATH_BUILDERS[preset.id] : null;
  const presetIconD = (preset && presetBuilder) ? (()=>{ try{return presetBuilder({width:24,height:24,params:defaultParamsFor(preset)});}catch{return '';}})() : '';

  const toolbarStyle: React.CSSProperties = {
    position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
    zIndex: 40, display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px',
    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    pointerEvents: 'all',
  };

  const sep = <div style={{width:1,height:20,background:'var(--color-border)',margin:'0 4px'}}/>;

  return (
    <div style={toolbarStyle}>
      {/* Shape picker for shape tools */}
      {isShapeTool && (
        <div style={{position:'relative'}}>
          <button onClick={()=>setPickerOpen(o=>!o)} style={{
            display:'flex',alignItems:'center',gap:6,padding:'3px 8px',cursor:'pointer',
            background: pickerOpen ? 'var(--color-accent-muted)' : 'var(--color-input-bg)',
            border: `1px solid ${pickerOpen ? 'var(--color-accent)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-sm)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-xs)',
          }}>
            <svg width={16} height={16} viewBox="-14 -14 28 28">
              {presetIconD && <path d={presetIconD} fill="var(--color-text-primary)" fillRule="evenodd"/>}
            </svg>
            <span>{preset?.label ?? 'Shape'}</span>
            <ChevronDown size={10}/>
          </button>
          {pickerOpen && (
            <ShapePickerPopover currentId={currentPresetId} onPick={(id) => {
              setShapePreset(id);
              const p = getPresetById(id);
              if (p?.category === 'basic' && id === 'ellipse') {
                useToolStore.getState().setActiveTool(TOOLS.SHAPE as any);
              } else {
                useToolStore.getState().setActiveTool(TOOLS.SHAPE as any);
              }
            }} onClose={()=>setPickerOpen(false)}/>
          )}
        </div>
      )}

      {/* Info hint when tools active but nothing selected */}
      {(isShapeTool || isPenTool || isTextTool) && !layer && (
        <>
          {(isShapeTool) && sep}
          <span style={{fontSize:'var(--font-size-xs)',color:'var(--color-text-tertiary)',fontStyle:'italic'}}>
            {isPenTool ? 'Click to add points · Enter to finish' :
             isTextTool ? 'Click to add text' :
             'Click & drag to draw'}
          </span>
        </>
      )}

      {/* Selected shape properties */}
      {isShape && (
        <>
          {isShapeTool && sep}
          <span style={{fontSize:'var(--font-size-xs)',color:'var(--color-text-tertiary)'}}>Fill</span>
          <ColorInput value={shapeFill.color} onChange={c => updShape({ fill: { ...shapeFill, color: c, type: 'solid' } })}/>
          <div style={{width:56}}>
            <NumberInput value={shapeFill.opacity} onChange={v => updShape({ fill: { ...shapeFill, opacity: v } })} min={0} max={100} step={1} precision={0} label="%"/>
          </div>
          {sep}
          <span style={{fontSize:'var(--font-size-xs)',color:'var(--color-text-tertiary)'}}>Stroke</span>
          <ColorInput value={shapeStroke.color} onChange={c => updShape({ stroke: { ...shapeStroke, color: c, enabled: true } })}/>
          <div style={{width:56}}>
            <NumberInput value={shapeStroke.width} onChange={v => updShape({ stroke: { ...shapeStroke, width: v, enabled: v>0 } })} min={0} max={100} step={0.5} precision={1} label="px"/>
          </div>
          {(data as ShapeData).type === 'rectangle' && <>
            {sep}
            <span style={{fontSize:'var(--font-size-xs)',color:'var(--color-text-tertiary)'}}>Radius</span>
            <div style={{width:56}}>
              <NumberInput value={(data as any).borderRadius ?? 0} onChange={v => updShape({ borderRadius: v })} min={0} step={1} precision={0}/>
            </div>
          </>}
        </>
      )}

      {/* Selected text properties */}
      {isText && (() => {
        const td = data as TextData;
        return (<>
          {sep}
          <input value={td.fontFamily} onChange={e => updShape({ fontFamily: e.target.value })} style={{
            width: 110, padding: '3px 6px',
            background: 'var(--color-input-bg)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)', color: 'var(--color-text-primary)',
            fontSize: 'var(--font-size-xs)', outline: 'none',
          }}/>
          <div style={{width:56}}>
            <NumberInput value={td.fontSize} onChange={v => updShape({ fontSize: v })} min={1} step={1} precision={0} label="px"/>
          </div>
          <ColorInput value={td.color} onChange={c => updShape({ color: c })}/>
        </>);
      })()}
    </div>
  );
};