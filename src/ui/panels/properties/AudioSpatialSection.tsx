/**
 * AudioSpatialSection — 3D audio positioning controls.
 * Lives inside the Audio subtab. All numeric fields are keyframeable
 * via the standard property-path keyframe system (spatial.*).
 */
import React, { useCallback } from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { PropRowWithKF } from './PropRowWithKF';
import { Section } from './Section';
import { SelectInput } from './inputs/SelectInput';
import { CheckboxInput } from './inputs/CheckboxInput';
import type { Layer } from '../../../types/layer';
import { Link, Unlink } from 'lucide-react';

interface Props {
  layer: Layer;
  compId: string;
}

// ── Section wrapper ────────────────────────────────────────

export const AudioSpatialSection: React.FC<Props> = ({ layer, compId }) => {
  const data = layer.data as any;

  // Watch other layers in the comp for the "link to layer" dropdown
  const otherLayers = useCompositionStore(s => {
    const comp = s.compositions.find(c => c.id === compId);
    if (!comp) return [];
    return comp.layers
      .filter(l => l.id !== layer.id && l.type !== 'audio')
      .map(l => ({ id: l.id, name: l.name, type: l.type }));
  });

  const update = useCallback((patch: Record<string, any>) => {
    const newData = { ...(data ?? {}), ...patch };
    useCompositionStore.getState().updateLayer(compId, layer.id, { data: newData });
  }, [layer.id, compId, data]);

  const enabled = !!data?.spatialEnabled;
  const linkedId = data?.spatialLinkedLayerId ?? null;
  const linkedLayer = linkedId ? otherLayers.find(l => l.id === linkedId) : null;

  // When linked, source position is auto-updated from the layer transform —
  // show that as read-only info.
  const linkedPos = React.useMemo(() => {
    if (!linkedId) return null;
    const comp = useCompositionStore.getState().compositions.find(c => c.id === compId);
    const l = comp?.layers.find(l => l.id === linkedId);
    if (!l) return null;
    const t3d = (l as any).transform3D;
    return {
      x: t3d ? t3d.position.x : l.transform.position.x,
      y: t3d ? t3d.position.y : l.transform.position.y,
      z: t3d ? t3d.position.z : 0,
    };
  }, [linkedId, compId, useCompositionStore(s => s.compositions)]);

  return (
    <>
      {/* ── Master enable ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <CheckboxInput
          value={enabled}
          onChange={v => {
            // On first enable: default to the linked layer's own position,
            // fallback to (0,0,0)
            const patch: Record<string, unknown> = { spatialEnabled: v };
            if (v && data?.spatialX === undefined) {
              patch['spatialX'] = 0;
              patch['spatialY'] = 0;
              patch['spatialZ'] = 0;
              patch['spatialDistanceModel'] = 'inverse';
              patch['spatialRefDistance'] = 200;
              patch['spatialMaxDistance'] = 2000;
              patch['spatialRolloff'] = 1;
              patch['spatialConeInnerAngle'] = 360;
              patch['spatialConeOuterAngle'] = 360;
              patch['spatialConeOuterGain'] = 0;
              patch['spatialOrientX'] = 0;
              patch['spatialOrientY'] = 0;
              patch['spatialOrientZ'] = 1;
              patch['spatialDoppler'] = false;
            }
            update(patch);
          }}
        />
        <span style={{
          fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)',
          flex: 1,
        }}>
          3D Spatial Audio
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
      </div>

      {!enabled && (
        <div style={{
          padding: '20px', textAlign: 'center', fontStyle: 'italic',
          fontSize: 11, color: 'var(--color-text-disabled)',
        }}>
          Enable 3D positioning to place this audio source in space.
        </div>
      )}

      {enabled && (
        <>
          {/* ── Link to layer ── */}
          <Section label="Link" defaultOpen={true}>
            <div style={{ padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', width: 60 }}>
                Link to
              </span>
              <div style={{ flex: 1 }}>
                <SelectInput
                  value={linkedId ?? '__none__'}
                  onChange={(v) => update({ spatialLinkedLayerId: v === '__none__' ? null : v })}
                  options={[
                    { label: 'None (free position)', value: '__none__' },
                    ...otherLayers.map(l => ({ label: `${l.name} (${l.type})`, value: l.id })),
                  ]}
                />
              </div>
              {linkedLayer && (
                <button
                  onClick={() => update({ spatialLinkedLayerId: null })}
                  title="Unlink"
                  style={{
                    width: 22, height: 22, padding: 0,
                    background: 'var(--color-accent-muted)',
                    border: '1px solid var(--color-accent)',
                    borderRadius: 3, cursor: 'pointer',
                    color: 'var(--color-accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Unlink size={11} />
                </button>
              )}
              {!linkedLayer && (
                <div style={{
                  width: 22, height: 22, padding: 0,
                  color: 'var(--color-text-disabled)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Link size={11} />
                </div>
              )}
            </div>
            {linkedLayer && linkedPos && (
              <div style={{
                padding: '4px 12px', fontSize: 10,
                color: 'var(--color-text-tertiary)', fontStyle: 'italic',
              }}>
                Position auto-synced to "{linkedLayer.name}": ({Math.round(linkedPos.x)}, {Math.round(linkedPos.y)}, {Math.round(linkedPos.z)})
              </div>
            )}
          </Section>

          {/* ── Position (only editable when not linked) ── */}
          <Section label="Position" defaultOpen={true}>
            <PropRowWithKF
              label="X"
              value={data.spatialX ?? 0}
              min={-5000} max={5000} step={1}
              defaultValue={0}
              formatValue={(v) => String(Math.round(v))}
              layerId={layer.id}
              propertyPath="spatial.positionX"
              onChange={(v) => !linkedId && update({ spatialX: v })}
            />
            <PropRowWithKF
              label="Y"
              value={data.spatialY ?? 0}
              min={-5000} max={5000} step={1}
              defaultValue={0}
              formatValue={(v) => String(Math.round(v))}
              layerId={layer.id}
              propertyPath="spatial.positionY"
              onChange={(v) => !linkedId && update({ spatialY: v })}
            />
            <PropRowWithKF
              label="Z (depth)"
              value={data.spatialZ ?? 0}
              min={-5000} max={5000} step={1}
              defaultValue={0}
              formatValue={(v) => String(Math.round(v))}
              layerId={layer.id}
              propertyPath="spatial.positionZ"
              onChange={(v) => !linkedId && update({ spatialZ: v })}
            />
            {linkedId && (
              <div style={{
                padding: '4px 12px', fontSize: 10, color: 'var(--color-text-tertiary)',
                fontStyle: 'italic',
              }}>
                Unlink to edit position manually.
              </div>
            )}
          </Section>

          {/* ── Distance falloff ── */}
          <Section label="Distance falloff" defaultOpen={true}>
            <div style={{ padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', width: 60 }}>
                Model
              </span>
              <div style={{ flex: 1 }}>
                <SelectInput
                  value={data.spatialDistanceModel ?? 'inverse'}
                  onChange={(v) => update({ spatialDistanceModel: v })}
                  options={[
                    { label: 'Inverse (realistic)', value: 'inverse' },
                    { label: 'Linear', value: 'linear' },
                    { label: 'Exponential', value: 'exponential' },
                  ]}
                />
              </div>
            </div>
            <PropRowWithKF
              label="Reference"
              value={data.spatialRefDistance ?? 200}
              min={1} max={5000} step={1}
              defaultValue={200}
              formatValue={(v) => `${Math.round(v)}px`}
              layerId={layer.id}
              propertyPath="spatial.refDistance"
              onChange={(v) => update({ spatialRefDistance: v })}
            />
            <PropRowWithKF
              label="Max"
              value={data.spatialMaxDistance ?? 2000}
              min={1} max={20000} step={10}
              defaultValue={2000}
              formatValue={(v) => `${Math.round(v)}px`}
              layerId={layer.id}
              propertyPath="spatial.maxDistance"
              onChange={(v) => update({ spatialMaxDistance: v })}
            />
            <PropRowWithKF
              label="Rolloff"
              value={data.spatialRolloff ?? 1}
              min={0} max={10} step={0.1}
              defaultValue={1}
              formatValue={(v) => v.toFixed(1)}
              layerId={layer.id}
              propertyPath="spatial.rolloff"
              onChange={(v) => update({ spatialRolloff: v })}
            />
            <div style={{
              padding: '4px 12px', fontSize: 10, color: 'var(--color-text-tertiary)',
              fontStyle: 'italic',
            }}>
              Full volume inside {data.spatialRefDistance ?? 200}px, silent past {data.spatialMaxDistance ?? 2000}px.
            </div>
          </Section>

          {/* ── Directional cone ── */}
          <Section label="Directional cone" defaultOpen={false}>
            <PropRowWithKF
              label="Inner ∠"
              value={data.spatialConeInnerAngle ?? 360}
              min={0} max={360} step={1}
              defaultValue={360}
              formatValue={(v) => `${Math.round(v)}°`}
              layerId={layer.id}
              propertyPath="spatial.coneInnerAngle"
              onChange={(v) => update({ spatialConeInnerAngle: v })}
            />
            <PropRowWithKF
              label="Outer ∠"
              value={data.spatialConeOuterAngle ?? 360}
              min={0} max={360} step={1}
              defaultValue={360}
              formatValue={(v) => `${Math.round(v)}°`}
              layerId={layer.id}
              propertyPath="spatial.coneOuterAngle"
              onChange={(v) => update({ spatialConeOuterAngle: v })}
            />
            <PropRowWithKF
              label="Outer gain"
              value={(data.spatialConeOuterGain ?? 0) * 100}
              min={0} max={100} step={1}
              defaultValue={0}
              formatValue={(v) => `${Math.round(v)}%`}
              layerId={layer.id}
              propertyPath="spatial.coneOuterGain"
              onChange={(v) => update({ spatialConeOuterGain: v / 100 })}
            />
            <div style={{ padding: '4px 12px', fontSize: 10, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>
              Orientation — direction source points
            </div>
            <div style={{ display: 'flex', gap: 8, padding: '2px 10px' }}>
              <div style={{ flex: 1 }}>
                <PropRowWithKF
                  label="X"
                  value={data.spatialOrientX ?? 0}
                  min={-1} max={1} step={0.01}
                  defaultValue={0}
                  formatValue={(v) => v.toFixed(2)}
                  layerId={layer.id}
                  propertyPath="spatial.orientX"
                  onChange={(v) => update({ spatialOrientX: v })}
                />
              </div>
              <div style={{ flex: 1 }}>
                <PropRowWithKF
                  label="Y"
                  value={data.spatialOrientY ?? 0}
                  min={-1} max={1} step={0.01}
                  defaultValue={0}
                  formatValue={(v) => v.toFixed(2)}
                  layerId={layer.id}
                  propertyPath="spatial.orientY"
                  onChange={(v) => update({ spatialOrientY: v })}
                />
              </div>
              <div style={{ flex: 1 }}>
                <PropRowWithKF
                  label="Z"
                  value={data.spatialOrientZ ?? 1}
                  min={-1} max={1} step={0.01}
                  defaultValue={1}
                  formatValue={(v) => v.toFixed(2)}
                  layerId={layer.id}
                  propertyPath="spatial.orientZ"
                  onChange={(v) => update({ spatialOrientZ: v })}
                />
              </div>
            </div>
            <div style={{
              padding: '4px 12px', fontSize: 10, color: 'var(--color-text-tertiary)',
              fontStyle: 'italic',
            }}>
              360° = omnidirectional. Narrow the inner angle for spotlight-style audio.
            </div>
          </Section>

          {/* ── Doppler ── */}
          <Section label="Doppler shift" defaultOpen={false}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px' }}>
              <CheckboxInput
                value={!!data.spatialDoppler}
                onChange={v => update({ spatialDoppler: v })}
              />
              <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                Enable pitch shift as source moves
              </span>
            </div>
            <div style={{
              padding: '4px 12px', fontSize: 10, color: 'var(--color-text-tertiary)',
              fontStyle: 'italic',
            }}>
              Simulates the Doppler effect — a passing car engine drops pitch as it moves past.
            </div>
          </Section>
        </>
      )}
    </>
  );
};

export default AudioSpatialSection;