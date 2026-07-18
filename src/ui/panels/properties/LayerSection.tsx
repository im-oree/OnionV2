import React from 'react';
import { Section, PropRow } from './Section';
import { NumberInput } from './inputs/NumberInput';
import { SelectInput } from './inputs/SelectInput';
import { CheckboxInput } from './inputs/CheckboxInput';
import type { Layer } from '../../../types/layer';
import { useCompositionStore } from '../../../state/compositionStore';

interface Props {
  layer: Layer;
  compId: string;
}

export const LayerSection: React.FC<Props> = ({ layer, compId }) => {
  return (
    <Section label="Layer">
      <PropRow label="Blend">
        <SelectInput
          value={layer.blendMode}
          onChange={(v) => useCompositionStore.getState().updateLayer(compId, layer.id, { blendMode: v as any })}
          options={[
            { label: 'Normal', value: 'normal' },
            { label: 'Multiply', value: 'multiply' },
            { label: 'Screen', value: 'screen' },
            { label: 'Overlay', value: 'overlay' },
          ]}
        />
      </PropRow>
      <PropRow label="Start">
        <NumberInput value={layer.startFrame} onChange={(v) => useCompositionStore.getState().updateLayer(compId, layer.id, { startFrame: v })} min={0} step={1} precision={0} />
      </PropRow>
      <PropRow label="End">
        <NumberInput value={layer.endFrame} onChange={(v) => useCompositionStore.getState().updateLayer(compId, layer.id, { endFrame: v })} min={0} step={1} precision={0} />
      </PropRow>
      <PropRow label="Visible">
        <CheckboxInput value={layer.visible} onChange={(v) => useCompositionStore.getState().updateLayer(compId, layer.id, { visible: v })} />
      </PropRow>
      <PropRow label="Locked">
        <CheckboxInput value={layer.locked} onChange={(v) => useCompositionStore.getState().updateLayer(compId, layer.id, { locked: v })} />
      </PropRow>
    </Section>
  );
};
