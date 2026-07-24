/**
 * AdjustTab — color grading panel for video, image, comp, solid, shape,
 * text layers. All parameters keyframable via property path `adjust.<field>`.
 *
 * Layout: sub-tab bar (Basic / HSL / Curves / Color Wheel / LUT / Mask)
 * with only Basic implemented in 10E-2. Other sub-tabs come in 10E-3 + 10F.
 */
import React, { useCallback, useState } from 'react';
import { useCompositionStore } from '../../../../state/compositionStore';
import { PropRowWithKF } from '../PropRowWithKF';
import { CheckboxInput } from '../inputs/CheckboxInput';
import { defaultAdjustData, type AdjustData } from '../../../../types/layer';
import type { Layer } from '../../../../types/layer';
import { RotateCcw } from 'lucide-react';
import { LUTPanel } from './LUTPanel';

interface Props {
  layer: Layer;
  compId: string;
}

type SubTab = 'basic' | 'hsl' | 'curves' | 'wheel' | 'lut';

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'basic',  label: 'Basic' },
  { id: 'hsl',    label: 'HSL' },
  { id: 'curves', label: 'Curves' },
  { id: 'wheel',  label: 'Wheel' },
  { id: 'lut',    label: 'LUT' },
];

// ── Master enable + reset row ─────────────────────────────

const AdjustHeader: React.FC<{
  enabled: boolean;
  onToggle: (v: boolean) => void;
  onReset: () => void;
}> = ({ enabled, onToggle, onReset }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 12px',
    borderBottom: '1px solid var(--color-border)',
  }}>
    <CheckboxInput value={enabled} onChange={onToggle} />
    <span style={{
      fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)',
      flex: 1,
    }}>
      Adjust
    </span>
    {enabled && (
      <span style={{
        fontSize: 9, letterSpacing: '0.05em', fontWeight: 600,
        padding: '2px 6px',
        background: 'rgba(74,222,128,0.15)',
        color: '#4ade80',
        borderRadius: 3,
        fontFamily: 'var(--font-family-mono)',
      }}>ACTIVE</span>
    )}
    <button
      onClick={onReset}
      title="Reset all adjustments"
      style={{
        width: 24, height: 24, padding: 0,
        background: 'transparent',
        border: '1px solid var(--color-border)',
        borderRadius: 3, cursor: 'pointer',
        color: 'var(--color-text-secondary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <RotateCcw size={11} />
    </button>
  </div>
);

// ── Sub-tab bar ───────────────────────────────────────────

const SubTabBar: React.FC<{
  active: SubTab;
  onSelect: (t: SubTab) => void;
}> = ({ active, onSelect }) => (
  <div style={{
    display: 'flex', gap: 2,
    padding: '6px 10px',
    borderBottom: '1px solid var(--color-border)',
    background: 'var(--color-surface-alt)',
  }}>
    {SUB_TABS.map(tab => (
      <button
        key={tab.id}
        onClick={() => onSelect(tab.id)}
        style={{
          flex: 1,
          padding: '5px 8px',
          fontSize: 10,
          fontWeight: active === tab.id ? 600 : 500,
          background: active === tab.id ? 'var(--color-accent-muted)' : 'transparent',
          color: active === tab.id ? 'var(--color-accent)' : 'var(--color-text-secondary)',
          border: 0,
          borderRadius: 3,
          cursor: 'pointer',
          transition: 'all 120ms ease',
        }}
        onMouseEnter={e => {
          if (active !== tab.id)
            (e.currentTarget as HTMLElement).style.background = 'var(--color-panel-hover)';
        }}
        onMouseLeave={e => {
          if (active !== tab.id)
            (e.currentTarget as HTMLElement).style.background = 'transparent';
        }}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

// ── Section header ────────────────────────────────────────

const SectionHeader: React.FC<{ label: string }> = ({ label }) => (
  <div style={{
    padding: '10px 12px 4px',
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--color-text-tertiary)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  }}>
    {label}
  </div>
);

// ── Main tab ──────────────────────────────────────────────

export const AdjustTab: React.FC<Props> = ({ layer, compId }) => {
  const [subTab, setSubTab] = useState<SubTab>('basic');
  const data: any = layer.data ?? {};
  const adjust: AdjustData = data.adjust ?? defaultAdjustData();

  const updateAdjust = useCallback((patch: Partial<AdjustData>) => {
    const newAdjust = { ...adjust, ...patch };
    const newData = { ...data, adjust: newAdjust };
    useCompositionStore.getState().updateLayer(compId, layer.id, { data: newData });
  }, [adjust, data, compId, layer.id]);

  const resetAll = useCallback(() => {
    const fresh = defaultAdjustData();
    const newData = { ...data, adjust: fresh };
    useCompositionStore.getState().updateLayer(compId, layer.id, { data: newData });
  }, [data, compId, layer.id]);

  const set = (key: keyof AdjustData) => (v: number | boolean) => updateAdjust({ [key]: v } as any);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
    }}>
      <AdjustHeader
        enabled={adjust.enabled}
        onToggle={v => updateAdjust({ enabled: v })}
        onReset={resetAll}
      />

      {adjust.enabled && (
        <>
          <SubTabBar active={subTab} onSelect={setSubTab} />

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {subTab === 'basic' && (
              <BasicAdjustPanel
                adjust={adjust}
                layer={layer}
                onChange={updateAdjust}
              />
            )}
            {subTab === 'hsl' && <ComingSoonSection label="HSL adjustments coming in 10F" />}
            {subTab === 'curves' && <ComingSoonSection label="Curves coming in 10F" />}
            {subTab === 'wheel' && <ComingSoonSection label="Color Wheel coming in 10F" />}
            {subTab === 'lut' && <LUTPanel layer={layer} compId={compId} />}
          </div>
        </>
      )}
    </div>
  );
};

const ComingSoonSection: React.FC<{ label: string }> = ({ label }) => (
  <div style={{
    padding: 24, textAlign: 'center',
    fontSize: 11, color: 'var(--color-text-disabled)',
    fontStyle: 'italic',
  }}>
    {label}
  </div>
);

// ── Basic sub-panel (14 sliders across 3 sections) ────────

const BasicAdjustPanel: React.FC<{
  adjust: AdjustData;
  layer: Layer;
  onChange: (patch: Partial<AdjustData>) => void;
}> = ({ adjust, layer, onChange }) => {
  const path = (field: string) => `adjust.${field}`;

  return (
    <>
      {/* ── Color ── */}
      <SectionHeader label="Color" />

      <PropRowWithKF
        label="Temp"
        value={adjust.temp}
        min={-100} max={100} step={1}
        defaultValue={0}
        formatValue={v => `${Math.round(v)}`}
        layerId={layer.id}
        propertyPath={path('temp')}
        onChange={v => onChange({ temp: v })}
      />
      <PropRowWithKF
        label="Tint"
        value={adjust.tint}
        min={-100} max={100} step={1}
        defaultValue={0}
        formatValue={v => `${Math.round(v)}`}
        layerId={layer.id}
        propertyPath={path('tint')}
        onChange={v => onChange({ tint: v })}
      />
      <PropRowWithKF
        label="Saturation"
        value={adjust.saturation}
        min={-100} max={100} step={1}
        defaultValue={0}
        formatValue={v => `${Math.round(v)}`}
        layerId={layer.id}
        propertyPath={path('saturation')}
        onChange={v => onChange({ saturation: v })}
      />

      {/* ── Lightness ── */}
      <SectionHeader label="Lightness" />

      <PropRowWithKF
        label="Exposure"
        value={adjust.exposure}
        min={-100} max={100} step={1}
        defaultValue={0}
        formatValue={v => `${Math.round(v)}`}
        layerId={layer.id}
        propertyPath={path('exposure')}
        onChange={v => onChange({ exposure: v })}
      />
      <PropRowWithKF
        label="Contrast"
        value={adjust.contrast}
        min={-100} max={100} step={1}
        defaultValue={0}
        formatValue={v => `${Math.round(v)}`}
        layerId={layer.id}
        propertyPath={path('contrast')}
        onChange={v => onChange({ contrast: v })}
      />
      <PropRowWithKF
        label="Highlight"
        value={adjust.highlights}
        min={-100} max={100} step={1}
        defaultValue={0}
        formatValue={v => `${Math.round(v)}`}
        layerId={layer.id}
        propertyPath={path('highlights')}
        onChange={v => onChange({ highlights: v })}
      />
      <PropRowWithKF
        label="Shadow"
        value={adjust.shadows}
        min={-100} max={100} step={1}
        defaultValue={0}
        formatValue={v => `${Math.round(v)}`}
        layerId={layer.id}
        propertyPath={path('shadows')}
        onChange={v => onChange({ shadows: v })}
      />
      <PropRowWithKF
        label="Whites"
        value={adjust.whites}
        min={-100} max={100} step={1}
        defaultValue={0}
        formatValue={v => `${Math.round(v)}`}
        layerId={layer.id}
        propertyPath={path('whites')}
        onChange={v => onChange({ whites: v })}
      />
      <PropRowWithKF
        label="Blacks"
        value={adjust.blacks}
        min={-100} max={100} step={1}
        defaultValue={0}
        formatValue={v => `${Math.round(v)}`}
        layerId={layer.id}
        propertyPath={path('blacks')}
        onChange={v => onChange({ blacks: v })}
      />
      <PropRowWithKF
        label="Brilliance"
        value={adjust.brilliance}
        min={-100} max={100} step={1}
        defaultValue={0}
        formatValue={v => `${Math.round(v)}`}
        layerId={layer.id}
        propertyPath={path('brilliance')}
        onChange={v => onChange({ brilliance: v })}
      />

      {/* ── Effects ── */}
      <SectionHeader label="Effects" />

      <PropRowWithKF
        label="Sharpen"
        value={adjust.sharpen}
        min={0} max={100} step={1}
        defaultValue={0}
        formatValue={v => `${Math.round(v)}`}
        layerId={layer.id}
        propertyPath={path('sharpen')}
        onChange={v => onChange({ sharpen: v })}
      />
      <PropRowWithKF
        label="Clarity"
        value={adjust.clarity}
        min={-100} max={100} step={1}
        defaultValue={0}
        formatValue={v => `${Math.round(v)}`}
        layerId={layer.id}
        propertyPath={path('clarity')}
        onChange={v => onChange({ clarity: v })}
      />
      <PropRowWithKF
        label="Fade"
        value={adjust.fade}
        min={0} max={100} step={1}
        defaultValue={0}
        formatValue={v => `${Math.round(v)}`}
        layerId={layer.id}
        propertyPath={path('fade')}
        onChange={v => onChange({ fade: v })}
      />
      <PropRowWithKF
        label="Vignette"
        value={adjust.vignette}
        min={-100} max={100} step={1}
        defaultValue={0}
        formatValue={v => `${Math.round(v)}`}
        layerId={layer.id}
        propertyPath={path('vignette')}
        onChange={v => onChange({ vignette: v })}
      />
      <PropRowWithKF
        label="V. Feather"
        value={adjust.vignetteFeather}
        min={0} max={100} step={1}
        defaultValue={50}
        formatValue={v => `${Math.round(v)}`}
        layerId={layer.id}
        propertyPath={path('vignetteFeather')}
        onChange={v => onChange({ vignetteFeather: v })}
      />

      {/* Bottom padding */}
      <div style={{ height: 12 }} />
    </>
  );
};

export default AdjustTab;