import React from 'react';
import { Section, PropRow } from './Section';
import { NumberInput } from './inputs/NumberInput';
import { ColorInput } from './inputs/ColorInput';
import { SelectInput } from './inputs/SelectInput';
import type { Layer, TextData } from '../../../types/layer';
import { useCompositionStore } from '../../../state/compositionStore';

interface Props {
  layer: Layer;
  compId: string;
}

export const TextSection: React.FC<Props> = ({ layer, compId }) => {
  const data = layer.data as TextData | undefined;
  if (!data) return null;

  return (
    <Section label="Text">
      <PropRow label="Content">
        <textarea
          value={data.text}
          onChange={(e) => useCompositionStore.getState().updateLayer(compId, layer.id, { data: { ...data, text: e.target.value } })}
          className="w-full h-12 text-ui-xs px-1 bg-surface border border-border rounded-sm text-text-primary outline-none focus:border-accent resize-none"
        />
      </PropRow>
      <PropRow label="Font">
        <SelectInput
          value={data.fontFamily}
          onChange={(v) => useCompositionStore.getState().updateLayer(compId, layer.id, { data: { ...data, fontFamily: v } })}
          options={[
            { label: 'Inter', value: 'Inter' },
            { label: 'Arial', value: 'Arial' },
            { label: 'Helvetica', value: 'Helvetica' },
            { label: 'Georgia', value: 'Georgia' },
            { label: 'monospace', value: 'monospace' },
          ]}
        />
      </PropRow>
      <PropRow label="Size">
        <NumberInput value={data.fontSize} onChange={(v) => useCompositionStore.getState().updateLayer(compId, layer.id, { data: { ...data, fontSize: v } })} min={1} step={1} precision={0} />
      </PropRow>
      <PropRow label="Color">
        <ColorInput value={data.color} onChange={(v) => useCompositionStore.getState().updateLayer(compId, layer.id, { data: { ...data, color: v } })} />
      </PropRow>
      <PropRow label="Align">
        <SelectInput
          value={data.alignment}
          onChange={(v) => useCompositionStore.getState().updateLayer(compId, layer.id, { data: { ...data, alignment: v as any } })}
          options={[
            { label: 'Left', value: 'left' },
            { label: 'Center', value: 'center' },
            { label: 'Right', value: 'right' },
          ]}
        />
      </PropRow>
    </Section>
  );
};
