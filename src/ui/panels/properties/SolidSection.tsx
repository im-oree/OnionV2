import React from 'react';
import { Section, PropRow } from './Section';
import { NumberInput } from './inputs/NumberInput';
import { ColorInput } from './inputs/ColorInput';
import type { Layer, SolidData } from '../../../types/layer';
import { useCompositionStore } from '../../../state/compositionStore';

interface Props {
  layer: Layer;
  compId: string;
}

export const SolidSection: React.FC<Props> = ({ layer, compId }) => {
  const data = layer.data as SolidData | undefined;
  if (!data) return null;
  return (
    <Section label="Solid">
      <PropRow label="Color">
        <ColorInput value={data.color} onChange={(v) => useCompositionStore.getState().updateLayer(compId, layer.id, { data: { ...data, color: v } })} />
      </PropRow>
      <PropRow label="Width">
        <NumberInput value={data.width} onChange={(v) => useCompositionStore.getState().updateLayer(compId, layer.id, { data: { ...data, width: v } })} min={1} step={1} precision={0} />
      </PropRow>
      <PropRow label="Height">
        <NumberInput value={data.height} onChange={(v) => useCompositionStore.getState().updateLayer(compId, layer.id, { data: { ...data, height: v } })} min={1} step={1} precision={0} />
      </PropRow>
    </Section>
  );
};
