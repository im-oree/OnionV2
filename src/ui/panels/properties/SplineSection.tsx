import React from 'react';
import { Section, PropRow } from './Section';
import { NumberInput } from './inputs/NumberInput';
import { ColorInput } from './inputs/ColorInput';
import { useCompositionStore } from '../../../state/compositionStore';
import { useKeyframeStore } from '../../../state/keyframeStore';
import type { SplineData } from '../../../types/spline';

export const SplineSection: React.FC<{ layer: any; compId: string }> = ({ layer, compId }) => {
  const data: SplineData = layer.data ?? {
    points: [],
    closed: false,
    strokeColor: '#ffffff', strokeWidth: 3, strokeOpacity: 100,
    fillColor: '#ffffff', fillOpacity: 0,
    trimStart: 0, trimEnd: 1,
  };

  const upd = (patch: Partial<SplineData>) =>
    useCompositionStore.getState().updateLayer(compId, layer.id, { data: { ...data, ...patch } });

  const addKeyframe = (property: string, value: number) => {
    const store = useKeyframeStore.getState();
    const comp = useCompositionStore.getState().compositions.find(c => c.id === compId);
    if (!comp) return;
    const frame = useCompositionStore.getState().getCurrentFrame?.(compId) ?? 0;
    store.addKeyframe(layer.id, {
      id: `kf_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      property,
      time: frame,
      value,
      interpolation: 'linear',
    });
  };

  return (
    <>
      <Section label="Spline Stroke">
        <PropRow label="Color">
          <ColorInput value={data.strokeColor} onChange={v => upd({ strokeColor: v })} />
        </PropRow>
        <PropRow label="Width">
          <NumberInput value={data.strokeWidth} min={0} max={100} step={0.5} onChange={v => upd({ strokeWidth: v })} />
        </PropRow>
        <PropRow label="Opacity">
          <NumberInput value={data.strokeOpacity} min={0} max={100} step={1} onChange={v => upd({ strokeOpacity: v })} />
        </PropRow>
      </Section>

      <Section label="Spline Fill">
        <PropRow label="Color">
          <ColorInput value={data.fillColor} onChange={v => upd({ fillColor: v })} />
        </PropRow>
        <PropRow label="Opacity">
          <NumberInput value={data.fillOpacity} min={0} max={100} step={1} onChange={v => upd({ fillOpacity: v })} />
        </PropRow>
      </Section>

      <Section label="Trim Path (Draw-On Animation)">
        <PropRow label="Start" hint="Keyframe this to animate draw-on">
          <NumberInput
            value={data.trimStart}
            min={0} max={1} step={0.01}
            onChange={v => upd({ trimStart: v })}
            onKeyframe={() => addKeyframe('data.trimStart', data.trimStart)}
          />
        </PropRow>
        <PropRow label="End" hint="Keyframe this to animate draw-on">
          <NumberInput
            value={data.trimEnd}
            min={0} max={1} step={0.01}
            onChange={v => upd({ trimEnd: v })}
            onKeyframe={() => addKeyframe('data.trimEnd', data.trimEnd)}
          />
        </PropRow>
        <PropRow label="Closed">
          <label className="flex items-center gap-1 cursor-pointer" style={{ fontSize: 'var(--font-size-xs)' }}>
            <input
              type="checkbox"
              checked={data.closed}
              onChange={e => upd({ closed: e.target.checked })}
            />
            Closed path
          </label>
        </PropRow>
      </Section>
    </>
  );
};
