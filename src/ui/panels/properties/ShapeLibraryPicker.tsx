import React, { useState } from 'react';
import { SHAPE_PRESETS, type ShapePresetDef } from '../../../shapes/presets';
import { PATH_BUILDERS } from '../../../shapes/ShapePathBuilder';
import { defaultParamsFor } from '../../../shapes/presets';

interface Props { onSelect: (presetId: string) => void; currentId?: string; }

const CATEGORIES = ['basic','polygon','star','symbol','decorative'] as const;

function buildSvgPath(preset: ShapePresetDef): string {
  const builder = PATH_BUILDERS[preset.id];
  if (!builder) return '';
  const params = defaultParamsFor(preset);
  const s = Math.min(preset.defaultSize.width, preset.defaultSize.height);
  const w = s, h = s;
  try { return builder({width:w*0.7,height:h*0.7,params}); } catch { return ''; }
}

const ShapeThumb: React.FC<{preset: ShapePresetDef; selected: boolean; onClick: ()=>void}> = ({preset,selected,onClick}) => {
  const d = buildSvgPath(preset);
  return (
    <button onClick={onClick} title={preset.label}
      style={{
        width:52, height:52, padding:2, cursor:'pointer',
        background: selected?'var(--color-accent-muted)':'var(--color-input-bg)',
        border:`1.5px solid ${selected?'var(--color-accent)':'var(--color-border)'}`,
        borderRadius:'var(--radius-md)',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2,
      }}>
      <svg width={32} height={32} viewBox="-40 -40 80 80">
        {d&&<path d={d} fill={selected?'var(--color-accent)':'var(--color-text-secondary)'} fillRule="evenodd"/>}
      </svg>
      <span style={{fontSize:8,color:selected?'var(--color-accent)':'var(--color-text-tertiary)',lineHeight:1,textAlign:'center',maxWidth:48,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
        {preset.label}
      </span>
    </button>
  );
};

export const ShapeLibraryPicker: React.FC<Props> = ({ onSelect, currentId }) => {
  const [cat, setCat] = useState<string>('basic');

  const filtered = SHAPE_PRESETS.filter(p=>p.category===cat);

  return (
    <div style={{background:'var(--color-panel-raised)',border:'1px solid var(--color-border)',borderRadius:'var(--radius-md)',overflow:'hidden'}}>
      <div style={{display:'flex',gap:0,borderBottom:'1px solid var(--color-border)',overflowX:'auto'}}>
        {CATEGORIES.map(c=>(
          <button key={c} onClick={()=>setCat(c)}
            style={{
              padding:'4px 8px', fontSize:'var(--font-size-xs)', cursor:'pointer',
              background: cat===c?'var(--color-accent-muted)':'transparent',
              color: cat===c?'var(--color-accent)':'var(--color-text-secondary)',
              border:'none', borderBottom: cat===c?'2px solid var(--color-accent)':'2px solid transparent',
              textTransform:'capitalize', whiteSpace:'nowrap',
            }}>
            {c}
          </button>
        ))}
      </div>
      <div style={{display:'flex',flexWrap:'wrap',gap:4,padding:8,maxHeight:200,overflowY:'auto'}}>
        {filtered.map(p=>(
          <ShapeThumb key={p.id} preset={p} selected={currentId===p.id} onClick={()=>onSelect(p.id)}/>
        ))}
      </div>
    </div>
  );
};