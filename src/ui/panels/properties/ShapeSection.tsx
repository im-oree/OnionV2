import React from 'react';
import { Section, PropRow } from './Section';
import { NumberInput } from './inputs/NumberInput';
import type { Layer, ShapeData } from '../../../types/layer';
import { useCompositionStore } from '../../../state/compositionStore';

interface Props {
  layer: Layer;
  compId: string;
}

export const ShapeSection: React.FC<Props> = ({ layer, compId }) => {
  const data = layer.data as ShapeData | undefined;
  if (!data) return null;

  return (
    <Section label="Shape">
      {data.type === 'rectangle' && (
        <>
          <PropRow label="Width">
            <NumberInput value={data.width} onChange={(v) => useCompositionStore.getState().updateLayer(compId, layer.id, { data: { ...data, width: v } })} min={1} step={1} precision={0} />
          </PropRow>
          <PropRow label="Height">
            <NumberInput value={data.height} onChange={(v) => useCompositionStore.getState().updateLayer(compId, layer.id, { data: { ...data, height: v } })} min={1} step={1} precision={0} />
          </PropRow>
          <PropRow label="Corner">
            <NumberInput value={data.borderRadius} onChange={(v) => useCompositionStore.getState().updateLayer(compId, layer.id, { data: { ...data, borderRadius: v } })} min={0} step={1} precision={0} />
          </PropRow>
        </>
      )}
      {data.type === 'ellipse' && (
        <>
          <PropRow label="RX">
            <NumberInput value={data.radiusX} onChange={(v) => useCompositionStore.getState().updateLayer(compId, layer.id, { data: { ...data, radiusX: v } })} min={1} step={1} precision={0} />
          </PropRow>
          <PropRow label="RY">
            <NumberInput value={data.radiusY} onChange={(v) => useCompositionStore.getState().updateLayer(compId, layer.id, { data: { ...data, radiusY: v } })} min={1} step={1} precision={0} />
          </PropRow>
        </>
      )}
    </Section>
  );
};
