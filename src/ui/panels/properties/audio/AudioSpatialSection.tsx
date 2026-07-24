/**
 * AudioSpatialSection — 3D spatial audio controls for video/audio layers.
 *
 * Controls stereo panning via PannerNode with distance model, directional
 * cone, orientation, doppler, and linked-layer position syncing.
 *
 * All numeric fields are keyframeable via property path `spatial.<field>`.
 */
import React, { useCallback } from 'react';
import { Section } from '../Section';
import { PropRowWithKF } from '../PropRowWithKF';
import { CheckboxInput } from '../inputs/CheckboxInput';
import { SelectInput } from '../inputs/SelectInput';
import type { Layer, VideoData, AudioData } from '../../../../types/layer';
import { useCompositionStore } from '../../../../state/compositionStore';

interface Props {
  layer: Layer;
  compId: string;
}

/** Property path helpers for keyframe binding. */
const sp = (field: string) => `spatial.${field}`;

export const AudioSpatialSection: React.FC<Props> = ({ layer, compId }) => {
  const data = layer.data as (VideoData | AudioData) | undefined;

  const updateData = useCallback((updates: Partial<VideoData & AudioData>) => {
    if (!data) return;
    const newData = { ...data, ...updates };
    useCompositionStore.getState().updateLayer(compId, layer.id, { data: newData });
  }, [data, compId, layer.id]);

  const updateField = useCallback(<K extends string>(field: K, value: any) => {
    updateData({ [field]: value } as any);
  }, [updateData]);

  if (!data) return null;

  // Read current spatial values (defaults from spatialAudio.ts DEFAULT_SPATIAL)
  const enabled = !!(data as any).spatialEnabled;
  const sx = (data as any).spatialX ?? 0;
  const sy = (data as any).spatialY ?? 0;
  const sz = (data as any).spatialZ ?? 0;
  const distModel = (data as any).spatialDistanceModel ?? 'inverse';
  const refDist = (data as any).spatialRefDistance ?? 200;
  const maxDist = (data as any).spatialMaxDistance ?? 2000;
  const rolloff = (data as any).spatialRolloff ?? 1;
  const coneInner = (data as any).spatialConeInnerAngle ?? 360;
  const coneOuter = (data as any).spatialConeOuterAngle ?? 360;
  const coneGain = (data as any).spatialConeOuterGain ?? 0;
  const orientX = (data as any).spatialOrientX ?? 0;
  const orientY = (data as any).spatialOrientY ?? 0;
  const orientZ = (data as any).spatialOrientZ ?? 1;
  const doppler = !!(data as any).spatialDoppler;
  const linkedLayerId = (data as any).spatialLinkedLayerId ?? null;

  // Build layer list for the linked-layer dropdown
  const comp = useCompositionStore(s =>
    s.compositions.find(c => c.id === compId),
  );
  const otherLayers = comp?.layers.filter(l => l.id !== layer.id) ?? [];

  return (
    <>
      {/* ── Master toggle ── */}
      <Section label="3D Spatial Audio">
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 10px',
        }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 11, color: 'var(--color-text-primary)', cursor: 'pointer',
          }}>
            <CheckboxInput
              value={enabled}
              onChange={(v) => updateField('spatialEnabled', v)}
            />
            <span>Enable Spatial Audio</span>
          </label>
          {enabled && (
            <button
              onClick={() => updateData({
                spatialEnabled: false,
                spatialX: 0, spatialY: 0, spatialZ: 0,
                spatialDistanceModel: 'inverse',
                spatialRefDistance: 200,
                spatialMaxDistance: 2000,
                spatialRolloff: 1,
                spatialConeInnerAngle: 360,
                spatialConeOuterAngle: 360,
                spatialConeOuterGain: 0,
                spatialOrientX: 0, spatialOrientY: 0, spatialOrientZ: 1,
                spatialDoppler: false,
                spatialLinkedLayerId: null,
              } as any)}
              style={{
                padding: '3px 8px', fontSize: 9,
                background: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: 3, color: 'var(--color-text-secondary)', cursor: 'pointer',
              }}
            >
              Reset
            </button>
          )}
        </div>

        {!enabled && (
          <div style={{
            padding: '16px 10px', fontSize: 11,
            color: 'var(--color-text-tertiary)', fontStyle: 'italic', textAlign: 'center',
          }}>
            Enable 3D spatial audio to place this audio source in the 3D scene.
          </div>
        )}

        {enabled && (
          <>
            {/* ── Position ── */}
            <div style={{
              borderTop: '1px solid var(--color-divider)',
              borderBottom: '1px solid var(--color-divider)',
              padding: '4px 0',
            }}>
              <div style={{
                padding: '4px 10px', fontSize: 10, fontWeight: 600,
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                Position
              </div>
              <PropRowWithKF
                label="X"
                value={sx}
                min={-5000} max={5000} step={1}
                defaultValue={0}
                formatValue={(v) => `${v}`}
                layerId={layer.id}
                propertyPath={sp('positionX')}
                onChange={(v) => updateField('spatialX', v)}
              />
              <PropRowWithKF
                label="Y"
                value={sy}
                min={-5000} max={5000} step={1}
                defaultValue={0}
                formatValue={(v) => `${v}`}
                layerId={layer.id}
                propertyPath={sp('positionY')}
                onChange={(v) => updateField('spatialY', v)}
              />
              <PropRowWithKF
                label="Z"
                value={sz}
                min={-5000} max={5000} step={1}
                defaultValue={0}
                formatValue={(v) => `${v}`}
                layerId={layer.id}
                propertyPath={sp('positionZ')}
                onChange={(v) => updateField('spatialZ', v)}
              />
            </div>

            {/* ── Distance Model ── */}
            <div style={{ padding: '6px 10px', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', minWidth: 70 }}>
                Distance Model
              </span>
              <div style={{ flex: 1 }}>
                <SelectInput
                  value={distModel}
                  onChange={(v) => updateField('spatialDistanceModel', v)}
                  options={[
                    { label: 'Linear', value: 'linear' },
                    { label: 'Inverse', value: 'inverse' },
                    { label: 'Exponential', value: 'exponential' },
                  ]}
                />
              </div>
            </div>

            {/* ── Distance Params ── */}
            <div style={{
              borderTop: '1px solid var(--color-divider)',
              borderBottom: '1px solid var(--color-divider)',
              padding: '4px 0',
            }}>
              <div style={{
                padding: '4px 10px', fontSize: 10, fontWeight: 600,
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                Distance
              </div>
              <PropRowWithKF
                label="Ref Distance"
                value={refDist}
                min={1} max={5000} step={1}
                defaultValue={200}
                layerId={layer.id}
                propertyPath={sp('refDistance')}
                onChange={(v) => updateField('spatialRefDistance', v)}
              />
              <PropRowWithKF
                label="Max Distance"
                value={maxDist}
                min={10} max={20000} step={10}
                defaultValue={2000}
                layerId={layer.id}
                propertyPath={sp('maxDistance')}
                onChange={(v) => updateField('spatialMaxDistance', Math.max(refDist + 1, v))}
              />
              <PropRowWithKF
                label="Rolloff"
                value={rolloff}
                min={0} max={10} step={0.1}
                defaultValue={1}
                formatValue={(v) => v.toFixed(1)}
                layerId={layer.id}
                propertyPath={sp('rolloff')}
                onChange={(v) => updateField('spatialRolloff', v)}
              />
            </div>

            {/* ── Directional Cone ── */}
            <div style={{
              borderTop: '1px solid var(--color-divider)',
              borderBottom: '1px solid var(--color-divider)',
              padding: '4px 0',
            }}>
              <div style={{
                padding: '4px 10px', fontSize: 10, fontWeight: 600,
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                Cone (360° = omnidirectional)
              </div>
              <PropRowWithKF
                label="Inner Angle"
                value={coneInner}
                min={0} max={360} step={1}
                defaultValue={360}
                formatValue={(v) => `${Math.round(v)}°`}
                layerId={layer.id}
                propertyPath={sp('coneInnerAngle')}
                onChange={(v) => updateField('spatialConeInnerAngle', v)}
              />
              <PropRowWithKF
                label="Outer Angle"
                value={coneOuter}
                min={0} max={360} step={1}
                defaultValue={360}
                formatValue={(v) => `${Math.round(v)}°`}
                layerId={layer.id}
                propertyPath={sp('coneOuterAngle')}
                onChange={(v) => updateField('spatialConeOuterAngle', v)}
              />
              <PropRowWithKF
                label="Outer Gain"
                value={Math.round(coneGain * 100)}
                min={0} max={100} step={1}
                defaultValue={0}
                formatValue={(v) => `${Math.round(v)}%`}
                layerId={layer.id}
                propertyPath={sp('coneOuterGain')}
                onChange={(v) => updateField('spatialConeOuterGain', v / 100)}
              />
            </div>

            {/* ── Orientation ── */}
            <div style={{
              borderTop: '1px solid var(--color-divider)',
              borderBottom: '1px solid var(--color-divider)',
              padding: '4px 0',
            }}>
              <div style={{
                padding: '4px 10px', fontSize: 10, fontWeight: 600,
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                Orientation (direction source is pointing)
              </div>
              <PropRowWithKF
                label="X"
                value={orientX}
                min={-1} max={1} step={0.01}
                defaultValue={0}
                formatValue={(v) => v.toFixed(2)}
                layerId={layer.id}
                propertyPath={sp('orientX')}
                onChange={(v) => updateField('spatialOrientX', v)}
              />
              <PropRowWithKF
                label="Y"
                value={orientY}
                min={-1} max={1} step={0.01}
                defaultValue={0}
                formatValue={(v) => v.toFixed(2)}
                layerId={layer.id}
                propertyPath={sp('orientY')}
                onChange={(v) => updateField('spatialOrientY', v)}
              />
              <PropRowWithKF
                label="Z"
                value={orientZ}
                min={-1} max={1} step={0.01}
                defaultValue={1}
                formatValue={(v) => v.toFixed(2)}
                layerId={layer.id}
                propertyPath={sp('orientZ')}
                onChange={(v) => updateField('spatialOrientZ', v)}
              />
            </div>

            {/* ── Doppler + Linked Layer ── */}
            <div style={{ padding: '8px 10px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
              }}>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 11, color: 'var(--color-text-primary)', cursor: 'pointer',
                }}>
                  <CheckboxInput
                    value={doppler}
                    onChange={(v) => updateField('spatialDoppler', v)}
                  />
                  <span>Doppler Shift</span>
                </label>
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{
                  fontSize: 10, color: 'var(--color-text-tertiary)', minWidth: 70,
                }}>
                  Link to Layer
                </span>
                <div style={{ flex: 1 }}>
                  <SelectInput
                    value={linkedLayerId ?? '__none__'}
                    onChange={(v) => updateField(
                      'spatialLinkedLayerId',
                      v === '__none__' ? null : v,
                    )}
                    options={[
                      { label: 'None (free position)', value: '__none__' },
                      ...otherLayers.map(l => ({
                        label: l.name || l.type,
                        value: l.id,
                      })),
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* ── Linked layer indicator ── */}
            {linkedLayerId && (
              <div style={{
                padding: '6px 10px', fontSize: 10,
                color: 'var(--color-accent)', fontStyle: 'italic',
                borderTop: '1px solid var(--color-divider)',
              }}>
                Position follows layer &quot;
                {otherLayers.find(l => l.id === linkedLayerId)?.name ?? 'unknown'}
                &quot; — edit the layer&apos;s transform to move the audio source.
              </div>
            )}
          </>
        )}
      </Section>
    </>
  );
};

export default AudioSpatialSection;
