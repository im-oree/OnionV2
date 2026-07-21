import React from 'react';
import { Section, PropRow } from './Section';
import { NumberInput } from './inputs/NumberInput';
import { CheckboxInput } from './inputs/CheckboxInput';
import { SelectInput } from './inputs/SelectInput';
import type { Layer, MaterialProperties } from '../../../types/layer';
import { useCompositionStore } from '../../../state/compositionStore';

interface Props { layer: Layer; compId: string; }

export const MaterialSection: React.FC<Props> = ({ layer, compId }) => {
  const mat: MaterialProperties = layer.material ?? {
    castsShadows: true, lightTransmission: 0, acceptsShadows: true, acceptsLights: true,
    ambient: 100, diffuse: 100, specular: 50, shininess: 50, metal: 0,
  };

  const upd = (patch: Partial<MaterialProperties>) => {
    const next = { ...mat, ...patch };
    useCompositionStore.getState().updateLayer(compId, layer.id, { material: next });
    // Force material re-apply on the renderer
    const renderer = (window as any).__renderer;
    if (renderer) {
      const lr = renderer.layerSync?.getRenderer(layer.id);
      if (lr?.updateMaterial) lr.updateMaterial(next, true);
      renderer.renderLoop?.requestRender?.();
    }
  };

  const data = layer.data as any;
  const fillColor = data?.fill?.color ?? '#ffffff';

  return (
    <Section label="Material" defaultOpen>
      {/* Color */}
      <PropRow label="Color">
        <div className="flex items-center gap-2">
          <input type="color" value={fillColor}
            onChange={e => {
              useCompositionStore.getState().updateLayer(compId, layer.id, {
                data: { ...data, fill: { ...data?.fill, color: e.target.value, type: 'solid' } },
              });
            }}
            style={{ width: 28, height: 22, border: '1px solid var(--color-border)', borderRadius: 3, cursor: 'pointer', padding: 0 }}
          />
          <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family-mono)' }}>
            {fillColor}
          </span>
        </div>
      </PropRow>

      {/* Lighting mode */}
      <PropRow label="Mode">
        <SelectInput
          value={mat.acceptsLights !== false ? 'lit' : 'unlit'}
          onChange={v => upd({ acceptsLights: v === 'lit' })}
          options={[
            { label: 'Lit (Shaded)', value: 'lit' },
            { label: 'Unlit (Flat)', value: 'unlit' },
          ]}
        />
      </PropRow>

      {/* Metallic */}
      <PropRow label="Metallic">
        <NumberInput value={mat.metal} min={0} max={100} step={1} precision={0}
          onChange={v => upd({ metal: v })} />
      </PropRow>

      {/* Roughness */}
      <PropRow label="Roughness">
        <NumberInput value={100 - mat.shininess} min={0} max={100} step={1} precision={0}
          onChange={v => upd({ shininess: 100 - v })} />
      </PropRow>

      {/* Emission */}
      <PropRow label="Emission">
        <NumberInput value={mat.ambient ?? 0} min={0} max={200} step={1} precision={0}
          onChange={v => upd({ ambient: v })} />
      </PropRow>

      {/* Shadows */}
      <PropRow label="Cast Shadows">
        <CheckboxInput value={mat.castsShadows}
          onChange={v => upd({ castsShadows: v })} />
      </PropRow>
      <PropRow label="Receive Shadows">
        <CheckboxInput value={mat.acceptsShadows}
          onChange={v => upd({ acceptsShadows: v })} />
      </PropRow>
    </Section>
  );
};
