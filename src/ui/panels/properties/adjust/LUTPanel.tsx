/**
 * LUTPanel — Adjust tab LUT sub-panel.
 * Lists available LUTs, lets user import .cube files, controls intensity
 * + skin-tone protection. All values keyframable.
 */
import React, { useCallback, useRef } from 'react';
import { useLUTStore } from '../../../../renderer/color/lutStore';
import { useCompositionStore } from '../../../../state/compositionStore';
import { PropRowWithKF } from '../PropRowWithKF';
import { CheckboxInput } from '../inputs/CheckboxInput';
import { defaultAdjustData, type AdjustData } from '../../../../types/layer';
import type { Layer } from '../../../../types/layer';
import { Upload, Trash2 } from 'lucide-react';

interface Props {
  layer: Layer;
  compId: string;
}

export const LUTPanel: React.FC<Props> = ({ layer, compId }) => {
  const revision = useLUTStore(s => s.revision);
  void revision;
  const luts = useLUTStore(s => s.luts);
  const importLUTFile = useLUTStore(s => s.importLUTFile);
  const removeLUT = useLUTStore(s => s.removeLUT);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const data: any = layer.data ?? {};
  const adjust: AdjustData = data.adjust ?? defaultAdjustData();

  const updateAdjust = useCallback((patch: Partial<AdjustData>) => {
    const newAdjust = { ...adjust, ...patch };
    const newData = { ...data, adjust: newAdjust };
    useCompositionStore.getState().updateLayer(compId, layer.id, { data: newData });
  }, [adjust, data, compId, layer.id]);

  const handlePickFile = () => fileInputRef.current?.click();

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const entry = await importLUTFile(file);
    if (entry) updateAdjust({ lutId: entry.id, lutIntensity: 100 });
    // Reset input so same file can be picked again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const activeLutId = adjust.lutId ?? '__identity';
  const activeLut = luts.find(l => l.id === activeLutId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Import button */}
      <div style={{
        padding: '10px 12px',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <button
          onClick={handlePickFile}
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: 11, fontWeight: 500,
            background: 'var(--color-accent-muted)',
            border: '1px solid var(--color-accent)',
            borderRadius: 4,
            color: 'var(--color-accent)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <Upload size={12} /> Import .cube LUT
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".cube,.CUBE"
          style={{ display: 'none' }}
          onChange={handleFileSelected}
        />
      </div>

      {/* LUT list */}
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div style={{
          fontSize: 10, fontWeight: 600,
          color: 'var(--color-text-tertiary)',
          letterSpacing: '0.06em', textTransform: 'uppercase',
          marginBottom: 6,
        }}>
          Available LUTs ({luts.length})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 240, overflowY: 'auto' }}>
          {luts.map(lut => {
            const isActive = lut.id === activeLutId;
            return (
              <div
                key={lut.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 8px',
                  background: isActive ? 'var(--color-accent-muted)' : 'var(--color-input-bg)',
                  border: `1px solid ${isActive ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  borderRadius: 3, cursor: 'pointer',
                  transition: 'all 120ms',
                }}
                onClick={() => updateAdjust({ lutId: lut.id })}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 11, fontWeight: isActive ? 600 : 500,
                    color: isActive ? 'var(--color-accent)' : 'var(--color-text-primary)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{lut.name}</div>
                  <div style={{
                    fontSize: 9, color: 'var(--color-text-tertiary)',
                    fontFamily: 'var(--font-family-mono)',
                  }}>
                    {lut.id === '__identity' ? 'no color change' : `${lut.size}³`}
                    {lut.builtin && lut.id !== '__identity' ? ' · built-in' : ''}
                  </div>
                </div>
                {!lut.builtin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (activeLutId === lut.id) updateAdjust({ lutId: '__identity' });
                      removeLUT(lut.id);
                    }}
                    title="Remove LUT"
                    style={{
                      width: 20, height: 20, padding: 0,
                      background: 'transparent', border: 0,
                      cursor: 'pointer',
                      color: 'var(--color-text-disabled)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: 3,
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.color = 'var(--color-danger)';
                      (e.currentTarget as HTMLElement).style.background = 'rgba(239,91,91,0.1)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.color = 'var(--color-text-disabled)';
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Intensity + skin tone (only when a real LUT is selected) */}
      {activeLutId !== '__identity' && activeLut && (
        <>
          <PropRowWithKF
            label="Intensity"
            value={adjust.lutIntensity ?? 100}
            min={0} max={100} step={1}
            defaultValue={100}
            formatValue={v => `${Math.round(v)}%`}
            layerId={layer.id}
            propertyPath="adjust.lutIntensity"
            onChange={v => updateAdjust({ lutIntensity: v })}
          />
          <div style={{ padding: '6px 12px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckboxInput
              value={!!adjust.protectSkinTone}
              onChange={v => updateAdjust({ protectSkinTone: v })}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--color-text-primary)' }}>
                Protect skin tone
              </div>
              <div style={{ fontSize: 9, color: 'var(--color-text-tertiary)', marginTop: 1 }}>
                Reduces LUT effect on skin-tone hues
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LUTPanel;