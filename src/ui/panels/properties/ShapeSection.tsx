import React from 'react';
import { Section, PropRow } from './Section';
import { NumberInput } from './inputs/NumberInput';
import { ColorInput } from './inputs/ColorInput';
import { CheckboxInput } from './inputs/CheckboxInput';
import { SelectInput } from './inputs/SelectInput';
import { GradientEditor } from './inputs/GradientEditor';
import type { Layer, ShapeData, ShapeFill, ShapeStroke, GradientFill } from '../../../types/layer';
import { defaultShapeFill, defaultShapeStroke } from '../../../types/layer';
import { useCompositionStore } from '../../../state/compositionStore';
import { getPresetById, defaultParamsFor, SHAPE_PRESETS } from '../../../shapes/presets';
import { PATH_BUILDERS } from '../../../shapes/ShapePathBuilder';

const CAP_OPTS = [{label:'Butt',value:'butt'},{label:'Round',value:'round'},{label:'Square',value:'square'}];
const JOIN_OPTS = [{label:'Miter',value:'miter'},{label:'Round',value:'round'},{label:'Bevel',value:'bevel'}];
const FILL_TYPE_OPTS = [
  {label:'Solid',value:'solid'},
  {label:'Linear Gradient',value:'linear-gradient'},
  {label:'Radial Gradient',value:'radial-gradient'},
  {label:'Conic Gradient',value:'conic-gradient'},
];
const CATEGORIES = ['basic','polygon','star','symbol','arrow','decorative','ui'] as const;

const PathEditToggle: React.FC<{layerId:string; layer:Layer; compId:string}> = ({ layerId, layer, compId }) => {
  const [inEdit, setInEdit] = React.useState(false);
  const data = layer.data as any;

  React.useEffect(() => {
    let unsub: (()=>void)|null = null;
    import('../../../state/penToolStore').then(({usePenToolStore}) => {
      const check = () => setInEdit(usePenToolStore.getState().mode === 'edit' && usePenToolStore.getState().editingLayerId === layerId);
      check(); unsub = usePenToolStore.subscribe(check);
    });
    return () => { unsub?.(); };
  }, [layerId]);

  // Convert parametric shape (rect/ellipse) to editable path commands
  const convertToPath = () => {
    const cs = useCompositionStore.getState();
    let commands: any[];
    if (data.type === 'ellipse') {
      const rx = data.radiusX ?? 100;
      const ry = data.radiusY ?? 100;
      const k = 0.5522847498;
      commands = [
        {type:'M',points:[-rx,0]},
        {type:'C',points:[-rx,-ry*k, -rx*k,-ry, 0,-ry]},
        {type:'C',points:[rx*k,-ry, rx,-ry*k, rx,0]},
        {type:'C',points:[rx,ry*k, rx*k,ry, 0,ry]},
        {type:'C',points:[-rx*k,ry, -rx,ry*k, -rx,0]},
        {type:'Z',points:[]},
      ];
    } else {
      const w = data.width ?? 200;
      const h = data.height ?? 150;
      commands = [
        {type:'M',points:[-w/2,-h/2]},
        {type:'L',points:[w/2,-h/2]},
        {type:'L',points:[w/2,h/2]},
        {type:'L',points:[-w/2,h/2]},
        {type:'Z',points:[]},
      ];
    }
    const bounds = {minX:-9999,minY:-9999,maxX:9999,maxY:9999};
    cs.updateLayer(compId, layerId, { data: { ...data, type: 'path', commands, bounds, fill: data.fill, stroke: data.stroke } });
  };

  const toggle = async () => {
    const {usePenToolStore} = await import('../../../state/penToolStore');
    const {useToolStore} = await import('../../../state/toolStore');

    // If shape is parametric (rect/ellipse), convert to path first
    if (data.type !== 'path') {
      convertToPath();
      // Small delay for store update, then start editing
      setTimeout(() => {
        useToolStore.getState().setActiveTool('pen' as any);
        usePenToolStore.getState().startEditing(layerId);
      }, 50);
      return;
    }

    if (inEdit) usePenToolStore.getState().stopEditing();
    else { useToolStore.getState().setActiveTool('pen' as any); usePenToolStore.getState().startEditing(layerId); }
  };

  return (
    <div style={{display:'flex',gap:4}}>
      <button onClick={toggle} style={{
        flex:1, padding:'3px 8px', fontSize:'var(--font-size-xs)', cursor:'pointer',
        background: inEdit ? 'var(--color-accent-muted)' : 'var(--color-input-bg)',
        color: inEdit ? 'var(--color-accent)' : 'var(--color-text-secondary)',
        border: `1px solid ${inEdit ? 'var(--color-accent)' : 'var(--color-border)'}`,
        borderRadius:'var(--radius-sm)',
      }}>{inEdit ? 'Editing...' : (data.type === 'path' ? 'Edit Points' : 'Convert & Edit')}</button>

      {/* Convert Corner ↔ Smooth button (only in edit mode) */}
      {inEdit && (
        <button onClick={async () => {
          const {usePenToolStore} = await import('../../../state/penToolStore');
          const sel = Array.from(usePenToolStore.getState().selectedAnchors);
          if (sel.length > 0) {
            sel.forEach(idx => usePenToolStore.getState().convertAnchor(layerId, idx, true));
          }
        }} style={{
          padding:'3px 6px', fontSize:'10px', cursor:'pointer',
          background:'var(--color-input-bg)',
          border:'1px solid var(--color-border)',
          borderRadius:'var(--radius-sm)',
          color:'var(--color-text-secondary)',
        }} title="Convert selected anchors to smooth">↺ Smooth</button>
      )}
    </div>
  );
};

const InlineShapeLibrary: React.FC<{currentId: string; onSelect: (id: string) => void}> = ({ currentId, onSelect }) => {
  const [cat, setCat] = React.useState<string>(() => {
    const cur = getPresetById(currentId);
    return cur?.category ?? 'basic';
  });
  return (
    <div style={{
      background:'var(--color-panel-raised)', border:'1px solid var(--color-border)',
      borderRadius:'var(--radius-md)', overflow:'hidden', marginTop: 4,
    }}>
      <div style={{display:'flex',borderBottom:'1px solid var(--color-border)',overflowX:'auto'}}>
        {CATEGORIES.map(c => (
          <button key={c} onClick={()=>setCat(c)} style={{
            padding:'4px 8px', fontSize:'var(--font-size-xs)', cursor:'pointer',
            background: cat===c ? 'var(--color-accent-muted)' : 'transparent',
            color: cat===c ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            border:'none', borderBottom: cat===c ? '2px solid var(--color-accent)' : '2px solid transparent',
            textTransform:'capitalize', whiteSpace:'nowrap', flexShrink:0,
          }}>{c}</button>
        ))}
      </div>
      <div style={{display:'flex',flexWrap:'wrap',gap:4,padding:6,maxHeight:180,overflowY:'auto'}}>
        {SHAPE_PRESETS.filter(p => p.category === cat).map(p => {
          const b = PATH_BUILDERS[p.id];
          let d = '';
          try { d = b ? b({width:44,height:44,params:defaultParamsFor(p)}) : ''; } catch {}
          const sel = currentId === p.id;
          return (
            <button key={p.id} onClick={()=>onSelect(p.id)} title={p.label} style={{
              width:46, height:46, padding:0, cursor:'pointer',
              background: sel ? 'var(--color-accent-muted)' : 'var(--color-input-bg)',
              border: `1.5px solid ${sel ? 'var(--color-accent)' : 'var(--color-border)'}`,
              borderRadius:'var(--radius-md)',
              display:'flex',alignItems:'center',justifyContent:'center',
            }}>
              <svg width={28} height={28} viewBox="-30 -30 60 60">
                {d && <path d={d} fill={sel?'var(--color-accent)':'var(--color-text-secondary)'} fillRule="evenodd"/>}
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface Props { layer: Layer; compId: string; }

export const ShapeSection: React.FC<Props> = ({ layer, compId }) => {
  const data = layer.data as ShapeData | undefined;
  const [showLib, setShowLib] = React.useState(false);
  if (!data) return null;

  const fill: ShapeFill = (data as any).fill ?? defaultShapeFill();
  const stroke: ShapeStroke = (data as any).stroke ?? defaultShapeStroke();
  const currentPresetId = (data as any).presetId ?? data.type;
  const presetDef = getPresetById(currentPresetId);
  const presetParams: Record<string, number> = (data as any).presetParams ?? (presetDef ? defaultParamsFor(presetDef) : {});

  const upd = (patch: any) =>
    useCompositionStore.getState().updateLayer(compId, layer.id, { data: { ...data, ...patch } });
  const updFill = (patch: Partial<ShapeFill>) => upd({ fill: { ...fill, ...patch } });
  const updStroke = (patch: Partial<ShapeStroke>) => upd({ stroke: { ...stroke, ...patch } });

  const setFillType = (type: string) => {
    if (type === 'solid') updFill({ type: 'solid', gradient: undefined });
    else if (type === 'linear-gradient') updFill({ type: 'linear-gradient', gradient: { type: 'linear-gradient', angle: 0, stops: [{offset:0,color:'#ffffff'},{offset:1,color:'#000000'}] } });
    else if (type === 'radial-gradient') updFill({ type: 'radial-gradient', gradient: { type: 'radial-gradient', centerX: 0.5, centerY: 0.5, radius: 0.5, stops: [{offset:0,color:'#ffffff'},{offset:1,color:'#000000'}] } });
    else if (type === 'conic-gradient') updFill({ type: 'conic-gradient', gradient: { type: 'conic-gradient', angle: 0, centerX: 0.5, centerY: 0.5, stops: [{offset:0,color:'#ffffff'},{offset:1,color:'#000000'}] } });
  };

  const applyPreset = (presetId: string) => {
    const preset = getPresetById(presetId);
    if (!preset) return;
    const params = defaultParamsFor(preset);
    let newData: any = { ...data, presetId, presetParams: params };
    if (presetId === 'ellipse' || presetId === 'circle') {
      newData.type = 'ellipse';
      const cw = 'radiusX' in data ? data.radiusX * 2 : ('width' in data ? data.width : 200);
      const ch = 'radiusY' in data ? data.radiusY * 2 : ('height' in data ? data.height : 200);
      newData.radiusX = cw/2; newData.radiusY = ch/2;
    } else {
      newData.type = 'rectangle';
      const cw = 'width' in data ? data.width : ('radiusX' in data ? data.radiusX * 2 : 200);
      const ch = 'height' in data ? data.height : ('radiusY' in data ? data.radiusY * 2 : 200);
      newData.width = cw; newData.height = ch;
      newData.borderRadius = params.roundness ?? 0;
    }
    useCompositionStore.getState().updateLayer(compId, layer.id, { data: newData, name: preset.label });
    setShowLib(false);
  };

  return (
    <>
      <Section label="Shape">
        <PropRow label="Preset">
          <div style={{display:'flex',gap:6,alignItems:'center',width:'100%'}}>
            <span style={{fontSize:'var(--font-size-xs)',color:'var(--color-text-secondary)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              {presetDef?.label ?? data.type}
            </span>
            <button onClick={()=>setShowLib(v=>!v)} style={{
              padding:'2px 8px', fontSize:'var(--font-size-xs)', cursor:'pointer',
              background: showLib ? 'var(--color-accent-muted)' : 'var(--color-input-bg)',
              border:`1px solid ${showLib?'var(--color-accent)':'var(--color-border)'}`,
              borderRadius:'var(--radius-sm)',
              color: showLib ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            }}>{showLib ? 'Close' : 'Browse'}</button>
          </div>
        </PropRow>

        {showLib && <InlineShapeLibrary currentId={currentPresetId} onSelect={applyPreset}/>}

        {data.type === 'rectangle' && !presetDef?.params.length && <>
          <PropRow label="Width" animatable="data.width" layer={layer} compId={compId}><NumberInput value={data.width} onChange={v=>upd({width:v})} step={1} precision={0}/></PropRow>
          <PropRow label="Height" animatable="data.height" layer={layer} compId={compId}><NumberInput value={data.height} onChange={v=>upd({height:v})} step={1} precision={0}/></PropRow>
          <PropRow label="Corner" animatable="data.borderRadius" layer={layer} compId={compId}><NumberInput value={data.borderRadius} onChange={v=>upd({borderRadius:v})} step={1} precision={0}/></PropRow>
        </>}
        {data.type === 'rectangle' && presetDef?.params.length && <>
          <PropRow label="Width" animatable="data.width" layer={layer} compId={compId}><NumberInput value={data.width} onChange={v=>upd({width:v})} step={1} precision={0}/></PropRow>
          <PropRow label="Height" animatable="data.height" layer={layer} compId={compId}><NumberInput value={data.height} onChange={v=>upd({height:v})} step={1} precision={0}/></PropRow>
        </>}
        {data.type === 'ellipse' && <>
          <PropRow label="Radius X" animatable="data.radiusX" layer={layer} compId={compId}><NumberInput value={data.radiusX} onChange={v=>upd({radiusX:v})} step={1} precision={0}/></PropRow>
          <PropRow label="Radius Y" animatable="data.radiusY" layer={layer} compId={compId}><NumberInput value={data.radiusY} onChange={v=>upd({radiusY:v})} step={1} precision={0}/></PropRow>
        </>}

        {presetDef && presetDef.params.map(p => (
          <PropRow key={p.id} label={p.label} animatable={`data.presetParams.${p.id}`} layer={layer} compId={compId}>
            <NumberInput
              value={presetParams[p.id] ?? p.default}
              onChange={v => upd({ presetParams: { ...presetParams, [p.id]: v } })}
              min={p.min} max={p.max} step={p.step} precision={p.precision ?? 0}
              label={p.unit}
            />
          </PropRow>
        ))}

        <PropRow label="Edit Path">
          <PathEditToggle layerId={layer.id} layer={layer} compId={compId}/>
        </PropRow>

        {data.type === 'path' && <>
          <PropRow label="Commands">
            <span style={{fontSize:'var(--font-size-xs)',color:'var(--color-text-tertiary)',fontFamily:'var(--font-family-mono)'}}>
              {data.commands.length} cmds
            </span>
          </PropRow>
        </>}
      </Section>

      <Section label="Fill">
        <PropRow label="Type"><SelectInput value={fill.type} onChange={setFillType} options={FILL_TYPE_OPTS}/></PropRow>
        {fill.type === 'solid' && (
          <PropRow label="Color" animatable="data.fill.color" layer={layer} compId={compId}><ColorInput value={fill.color} onChange={c => updFill({ color: c })}/></PropRow>
        )}
        {fill.type !== 'solid' && fill.gradient && (
          <div style={{padding:'4px 0'}}>
            <GradientEditor value={fill.gradient} onChange={g => updFill({ gradient: g, type: g.type })}/>
          </div>
        )}
        {fill.type === 'linear-gradient' && fill.gradient && (
          <PropRow label="Angle">
            <NumberInput value={(fill.gradient as any).angle ?? 0} onChange={v => updFill({ gradient: { ...(fill.gradient as any), angle: v } })} min={-360} max={360} step={1} precision={0} label="°"/>
          </PropRow>
        )}
        {fill.type === 'radial-gradient' && fill.gradient && <>
          <PropRow label="Cx"><NumberInput value={(fill.gradient as any).centerX ?? 0.5} onChange={v => updFill({ gradient: { ...(fill.gradient as any), centerX: v } })} min={0} max={1} step={0.05} precision={2}/></PropRow>
          <PropRow label="Cy"><NumberInput value={(fill.gradient as any).centerY ?? 0.5} onChange={v => updFill({ gradient: { ...(fill.gradient as any), centerY: v } })} min={0} max={1} step={0.05} precision={2}/></PropRow>
          <PropRow label="Radius"><NumberInput value={(fill.gradient as any).radius ?? 0.5} onChange={v => updFill({ gradient: { ...(fill.gradient as any), radius: v } })} min={0.05} max={2} step={0.05} precision={2}/></PropRow>
        </>}
        <PropRow label="Opacity" animatable="data.fill.opacity" layer={layer} compId={compId}>
          <NumberInput value={fill.opacity} onChange={v => updFill({ opacity: v })} step={1} precision={0} label="%"/>
        </PropRow>
      </Section>

      <Section label="Stroke" defaultOpen={stroke.enabled}>
        <PropRow label="Enabled"><CheckboxInput value={stroke.enabled} onChange={v => updStroke({ enabled: v })}/></PropRow>
        {stroke.enabled && <>
          <PropRow label="Color" animatable="data.stroke.color" layer={layer} compId={compId}><ColorInput value={stroke.color} onChange={c => updStroke({ color: c })}/></PropRow>
          <PropRow label="Width" animatable="data.stroke.width" layer={layer} compId={compId}><NumberInput value={stroke.width} onChange={v => updStroke({ width: v })} step={0.5} precision={1} label="px"/></PropRow>
          <PropRow label="Opacity" animatable="data.stroke.opacity" layer={layer} compId={compId}><NumberInput value={stroke.opacity} onChange={v => updStroke({ opacity: v })} step={1} precision={0} label="%"/></PropRow>
          <PropRow label="Cap"><SelectInput value={stroke.cap ?? 'butt'} onChange={v => updStroke({ cap: v as any })} options={CAP_OPTS}/></PropRow>
          <PropRow label="Join"><SelectInput value={stroke.join ?? 'miter'} onChange={v => updStroke({ join: v as any })} options={JOIN_OPTS}/></PropRow>
        </>}
      </Section>
    </>
  );
};