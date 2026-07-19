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

interface Props { layer: Layer; compId: string; }

function defaultLinearGradient(): GradientFill {
  return {
    type: 'linear-gradient',
    angle: 0,
    stops: [
      { offset: 0, color: '#ffffff' },
      { offset: 1, color: '#000000' },
    ],
  };
}

function defaultRadialGradient(): GradientFill {
  return {
    type: 'radial-gradient',
    centerX: 0.5, centerY: 0.5, radius: 0.5,
    stops: [
      { offset: 0, color: '#ffffff' },
      { offset: 1, color: '#000000' },
    ],
  };
}

export const ShapeSection: React.FC<Props> = ({ layer, compId }) => {
  const data = layer.data as ShapeData | undefined;
  if (!data) return null;

  const fill: ShapeFill = (data as any).fill ?? defaultShapeFill();
  const stroke: ShapeStroke = (data as any).stroke ?? defaultShapeStroke();

  const update = (patch: Partial<ShapeData>) => {
    useCompositionStore.getState().updateLayer(compId, layer.id, { data: { ...data, ...patch } });
  };
  const updateFill = (patch: Partial<ShapeFill>) => {
    update({ fill: { ...fill, ...patch } } as any);
  };
  const updateStroke = (patch: Partial<ShapeStroke>) => {
    update({ stroke: { ...stroke, ...patch } } as any);
  };
  const setFillType = (type: 'solid' | 'linear-gradient' | 'radial-gradient') => {
    if (type === 'solid') {
      updateFill({ type: 'solid', gradient: undefined });
    } else if (type === 'linear-gradient') {
      updateFill({ type: 'linear-gradient', gradient: defaultLinearGradient() });
    } else {
      updateFill({ type: 'radial-gradient', gradient: defaultRadialGradient() });
    }
  };
  const updateGradient = (g: GradientFill) => {
    updateFill({ gradient: g, type: g.type });
  };

  return (
    <>
      <Section label="Shape">
        {data.type === 'rectangle' && (
          <>
            <PropRow label="Width">
              <NumberInput value={data.width} onChange={(v) => update({ width: v } as any)} min={1} step={1} precision={0} />
            </PropRow>
            <PropRow label="Height">
              <NumberInput value={data.height} onChange={(v) => update({ height: v } as any)} min={1} step={1} precision={0} />
            </PropRow>
            <PropRow label="Corner">
              <NumberInput value={data.borderRadius} onChange={(v) => update({ borderRadius: v } as any)} min={0} step={1} precision={0} />
            </PropRow>
          </>
        )}
        {data.type === 'ellipse' && (
          <>
            <PropRow label="RX">
              <NumberInput value={data.radiusX} onChange={(v) => update({ radiusX: v } as any)} min={1} step={1} precision={0} />
            </PropRow>
            <PropRow label="RY">
              <NumberInput value={data.radiusY} onChange={(v) => update({ radiusY: v } as any)} min={1} step={1} precision={0} />
            </PropRow>
          </>
        )}
      </Section>

      <Section label="Fill">
        <PropRow label="Type">
          <SelectInput
            value={fill.type}
            onChange={(v) => setFillType(v as any)}
            options={[
              { label: 'Solid', value: 'solid' },
              { label: 'Linear Gradient', value: 'linear-gradient' },
              { label: 'Radial Gradient', value: 'radial-gradient' },
            ]}
          />
        </PropRow>

        {fill.type === 'solid' && (
          <PropRow label="Color">
            <ColorInput value={fill.color} onChange={(c) => updateFill({ color: c })} />
          </PropRow>
        )}

        {fill.type !== 'solid' && fill.gradient && (
          <>
            <div style={{ padding: '8px 0' }}>
              <GradientEditor value={fill.gradient} onChange={updateGradient} />
            </div>
            {fill.gradient.type === 'linear-gradient' && (
              <PropRow label="Angle">
                <NumberInput
                  value={fill.gradient.angle}
                  onChange={(v) => updateGradient({ ...fill.gradient!, angle: v } as GradientFill)}
                  min={-360} max={360} step={1} precision={0} label="°"
                />
              </PropRow>
            )}
            {fill.gradient.type === 'radial-gradient' && (
              <>
                <PropRow label="Cx">
                  <NumberInput
                    value={fill.gradient.centerX}
                    onChange={(v) => updateGradient({ ...fill.gradient!, centerX: v } as GradientFill)}
                    min={0} max={1} step={0.05} precision={2}
                  />
                </PropRow>
                <PropRow label="Cy">
                  <NumberInput
                    value={fill.gradient.centerY}
                    onChange={(v) => updateGradient({ ...fill.gradient!, centerY: v } as GradientFill)}
                    min={0} max={1} step={0.05} precision={2}
                  />
                </PropRow>
                <PropRow label="Radius">
                  <NumberInput
                    value={fill.gradient.radius}
                    onChange={(v) => updateGradient({ ...fill.gradient!, radius: v } as GradientFill)}
                    min={0.05} max={2} step={0.05} precision={2}
                  />
                </PropRow>
              </>
            )}
          </>
        )}

        <PropRow label="Opacity">
          <NumberInput value={fill.opacity} onChange={(v) => updateFill({ opacity: v })} min={0} max={100} step={1} precision={0} label="%" />
        </PropRow>
      </Section>

      <Section label="Stroke" defaultOpen={stroke.enabled}>
        <PropRow label="Enabled">
          <CheckboxInput value={stroke.enabled} onChange={(v) => updateStroke({ enabled: v })} />
        </PropRow>
        {stroke.enabled && (
          <>
            <PropRow label="Color">
              <ColorInput value={stroke.color} onChange={(c) => updateStroke({ color: c })} />
            </PropRow>
            <PropRow label="Width">
              <NumberInput value={stroke.width} onChange={(v) => updateStroke({ width: v })} min={0} step={0.5} precision={1} label="px" />
            </PropRow>
            <PropRow label="Opacity">
              <NumberInput value={stroke.opacity} onChange={(v) => updateStroke({ opacity: v })} min={0} max={100} step={1} precision={0} label="%" />
            </PropRow>
          </>
        )}
      </Section>
    </>
  );
};