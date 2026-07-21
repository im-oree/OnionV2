import React from 'react';
import { Section, PropRow } from './Section';
import { NumberInput } from './inputs/NumberInput';
import { ColorInput } from './inputs/ColorInput';
import { CheckboxInput } from './inputs/CheckboxInput';
import { SelectInput } from './inputs/SelectInput';
import { useCompositionStore } from '../../../state/compositionStore';
import { ResolutionPresets } from './ResolutionPresets';

export const CompSection: React.FC = () => {
  const comp = useCompositionStore((s) => {
    const id = s.activeCompositionId;
    return id ? s.compositions.find((c) => c.id === id) ?? null : null;
  });
  if (!comp) return null;

  return (
    <Section label="Composition">
      <ResolutionPresets />
      <PropRow label="Name">
        <input
          type="text" value={comp.name}
          onChange={(e) => useCompositionStore.getState().updateComposition(comp.id, { name: e.target.value })}
          className="w-full outline-none"
          style={{
            height: 26, padding: '0 10px',
            background: 'var(--color-input-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--font-size-md)',
          }}
        />
      </PropRow>
      <PropRow label="Width">
        <NumberInput value={comp.width} onChange={(v) => useCompositionStore.getState().updateComposition(comp.id, { width: v })} min={64} max={8192} step={1} precision={0} />
      </PropRow>
      <PropRow label="Height">
        <NumberInput value={comp.height} onChange={(v) => useCompositionStore.getState().updateComposition(comp.id, { height: v })} min={64} max={8192} step={1} precision={0} />
      </PropRow>
      <PropRow label="FPS">
        <NumberInput value={comp.fps} onChange={(v) => useCompositionStore.getState().updateComposition(comp.id, { fps: v })} min={1} max={120} step={1} precision={0} />
      </PropRow>
      <PropRow label="Duration">
        <NumberInput value={comp.duration} onChange={(v) => useCompositionStore.getState().updateComposition(comp.id, { duration: v })} min={1} step={1} precision={0} />
      </PropRow>
      <PropRow label="Bg Color">
        <ColorInput value={comp.backgroundColor} onChange={(v) => useCompositionStore.getState().updateComposition(comp.id, { backgroundColor: v })} />
      </PropRow>
      <PropRow label="Motion Blur">
        <CheckboxInput
          value={comp.motionBlur?.enabled ?? false}
          onChange={(v) =>
            useCompositionStore.getState().updateComposition(comp.id, {
              motionBlur: {
                enabled: v,
                shutterAngle: comp.motionBlur?.shutterAngle ?? 180,
                shutterPhase: comp.motionBlur?.shutterPhase ?? -90,
                samples: comp.motionBlur?.samples ?? 8,
              },
            })
          }
        />
      </PropRow>
      {comp.motionBlur?.enabled && (
        <>
          <PropRow label="Shutter Angle">
            <NumberInput
              value={comp.motionBlur?.shutterAngle ?? 180}
              onChange={(v) =>
                useCompositionStore.getState().updateComposition(comp.id, {
                  motionBlur: {
                    enabled: comp.motionBlur?.enabled ?? false,
                    shutterAngle: v,
                    shutterPhase: comp.motionBlur?.shutterPhase ?? -90,
                    samples: comp.motionBlur?.samples ?? 8,
                  },
                })
              }
              min={0} max={720} step={1} precision={0}
            />
          </PropRow>
          <PropRow label="Shutter Phase">
            <NumberInput
              value={comp.motionBlur?.shutterPhase ?? -90}
              onChange={(v) =>
                useCompositionStore.getState().updateComposition(comp.id, {
                  motionBlur: {
                    enabled: comp.motionBlur?.enabled ?? false,
                    shutterAngle: comp.motionBlur?.shutterAngle ?? 180,
                    shutterPhase: v,
                    samples: comp.motionBlur?.samples ?? 8,
                  },
                })
              }
              min={-360} max={360} step={1} precision={0}
            />
          </PropRow>
          <PropRow label="MB Samples">
            <NumberInput
              value={comp.motionBlur?.samples ?? 8}
              onChange={(v) =>
                useCompositionStore.getState().updateComposition(comp.id, {
                  motionBlur: {
                    enabled: comp.motionBlur?.enabled ?? false,
                    shutterAngle: comp.motionBlur?.shutterAngle ?? 180,
                    shutterPhase: comp.motionBlur?.shutterPhase ?? -90,
                    samples: Math.max(2, Math.round(v)),
                  },
                })
              }
              min={2} max={64} step={1} precision={0}
            />
          </PropRow>
        </>
      )}

      {/* ── Time Remapping for comp layers ── */}
      <Section label="Time Remapping" defaultOpen={false}>
        <PropRow label="Enable">
          <CheckboxInput
            value={(comp as any).timeRemap ?? false}
            onChange={(v) => {
              const patch: any = { timeRemap: v };
              if (v && !(comp as any).timeRemapKeyframes) {
                patch.timeRemapKeyframes = [
                  { time: 0, sourceFrame: 0 },
                  { time: Math.floor(comp.duration * comp.fps), sourceFrame: Math.floor(comp.duration * comp.fps) },
                ];
              }
              useCompositionStore.getState().updateComposition(comp.id, patch);
            }}
          />
        </PropRow>
        {(comp as any).timeRemap && (
          <PropRow label="Keyframes">
            <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>
              {((comp as any).timeRemapKeyframes ?? []).length} keyframes
            </span>
          </PropRow>
        )}
        <PropRow label="Frame Blend">
          <CheckboxInput
            value={(comp as any).frameBlending ?? false}
            onChange={(v) => {
              const patch: any = { frameBlending: v };
              useCompositionStore.getState().updateComposition(comp.id, patch);
            }}
          />
        </PropRow>
        {(comp as any).frameBlending && (
          <PropRow label="Blend Type">
            <SelectInput
              value={(comp as any).frameBlendingType ?? 'frameMix'}
              onChange={(v) => {
                const patch: any = { frameBlendingType: v };
                useCompositionStore.getState().updateComposition(comp.id, patch);
              }}
              options={[
                { label: 'Frame Mix', value: 'frameMix' },
                { label: 'Pixel Motion', value: 'pixelMotion' },
              ]}
            />
          </PropRow>
        )}
      </Section>

      {/* ── 3D Perspective toggle ── */}
      <PropRow label="3D Perspective">
        <CheckboxInput
          value={comp.perspective3D ?? false}
          onChange={(v) =>
            useCompositionStore.getState().updateComposition(comp.id, { perspective3D: v })
          }
        />
      </PropRow>

      {(comp.perspective3D ?? false) && (
        <>
          {/* ── Camera Settings (all keyframeable) ── */}
          {/* ── Camera Settings ── */}
          <div style={{
            marginTop: 6, paddingTop: 4,
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-accent)',
            fontWeight: 600, letterSpacing: '0.04em',
            textTransform: 'uppercase' as const,
          }}>
            Camera
          </div>

          <PropRow label="FOV" animatable="camera.fov" layer={comp as any} currentFrame={Math.floor(comp.currentTime * comp.fps)} compId={comp.id}>
            <NumberInput
              value={comp.cameraFOV ?? 50}
              min={10} max={170} step={1} precision={0} label="°"
              onChange={(v) =>
                useCompositionStore.getState().updateComposition(comp.id, { cameraFOV: v })
              }
            />
          </PropRow>
          <PropRow label="Position Z" animatable="camera.positionZ" layer={comp as any} currentFrame={Math.floor(comp.currentTime * comp.fps)} compId={comp.id}>
            <NumberInput
              value={comp.cameraPositionZ ?? 1000}
              min={50} max={10000} step={10} precision={0}
              onChange={(v) =>
                useCompositionStore.getState().updateComposition(comp.id, { cameraPositionZ: v })
              }
            />
          </PropRow>
          <PropRow label="Orbit X" animatable="camera.orbitX" layer={comp as any} currentFrame={Math.floor(comp.currentTime * comp.fps)} compId={comp.id}>
            <NumberInput
              value={((comp.cameraOrbitX ?? 0) * (180 / Math.PI))}
              min={-90} max={90} step={1} precision={1} label="°"
              onChange={(v) =>
                useCompositionStore.getState().updateComposition(comp.id, { cameraOrbitX: v * (Math.PI / 180) })
              }
            />
          </PropRow>
          <PropRow label="Orbit Y" animatable="camera.orbitY" layer={comp as any} currentFrame={Math.floor(comp.currentTime * comp.fps)} compId={comp.id}>
            <NumberInput
              value={((comp.cameraOrbitY ?? 0) * (180 / Math.PI))}
              min={-180} max={180} step={1} precision={1} label="°"
              onChange={(v) =>
                useCompositionStore.getState().updateComposition(comp.id, { cameraOrbitY: v * (Math.PI / 180) })
              }
            />
          </PropRow>
          <PropRow label="Pan X" animatable="camera.panX" layer={comp as any} currentFrame={Math.floor(comp.currentTime * comp.fps)} compId={comp.id}>
            <NumberInput
              value={comp.cameraPanX ?? 0}
              step={1} precision={0}
              onChange={(v) =>
                useCompositionStore.getState().updateComposition(comp.id, { cameraPanX: v })
              }
            />
          </PropRow>
          <PropRow label="Pan Y" animatable="camera.panY" layer={comp as any} currentFrame={Math.floor(comp.currentTime * comp.fps)} compId={comp.id}>
            <NumberInput
              value={comp.cameraPanY ?? 0}
              step={1} precision={0}
              onChange={(v) =>
                useCompositionStore.getState().updateComposition(comp.id, { cameraPanY: v })
              }
            />
          </PropRow>

          {/* ── Depth of Field ── */}
          <div style={{
            marginTop: 8, paddingTop: 6,
            borderTop: '1px solid var(--color-border)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-tertiary)',
            fontWeight: 600, letterSpacing: '0.04em',
            textTransform: 'uppercase' as const,
          }}>
            Depth of Field
          </div>
          <PropRow label="Enable DOF" animatable="camera.dof" layer={comp as any} currentFrame={Math.floor(comp.currentTime * comp.fps)} compId={comp.id}>
            <CheckboxInput
              value={comp.cameraDOF ?? false}
              onChange={(v) =>
                useCompositionStore.getState().updateComposition(comp.id, { cameraDOF: v })
              }
            />
          </PropRow>
          {(comp.cameraDOF ?? false) && (
            <>
              <PropRow label="Focus Distance" animatable="camera.focusDistance" layer={comp as any} currentFrame={Math.floor(comp.currentTime * comp.fps)} compId={comp.id}>
                <NumberInput
                  value={comp.cameraFocusDistance ?? 500}
                  min={1} max={5000} step={10} precision={0}
                  onChange={(v) =>
                    useCompositionStore.getState().updateComposition(comp.id, { cameraFocusDistance: v })
                  }
                />
              </PropRow>
              <PropRow label="Aperture" animatable="camera.aperture" layer={comp as any} currentFrame={Math.floor(comp.currentTime * comp.fps)} compId={comp.id}>
                <NumberInput
                  value={comp.cameraAperture ?? 5}
                  min={0} max={100} step={0.5} precision={1}
                  onChange={(v) =>
                    useCompositionStore.getState().updateComposition(comp.id, { cameraAperture: v })
                  }
                />
              </PropRow>
            </>
          )}

          {/* ── Exposure ── */}
          <PropRow label="Exposure" animatable="camera.exposure" layer={comp as any} currentFrame={Math.floor(comp.currentTime * comp.fps)} compId={comp.id}>
            <NumberInput
              value={comp.cameraExposure ?? 0}
              min={-4} max={4} step={0.1} precision={1}
              onChange={(v) =>
                useCompositionStore.getState().updateComposition(comp.id, { cameraExposure: v })
              }
            />
          </PropRow>

          {/* ── Scene Settings ── */}
          <div style={{
            marginTop: 8, paddingTop: 6,
            borderTop: '1px solid var(--color-border)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-tertiary)',
            fontWeight: 600, letterSpacing: '0.04em',
            textTransform: 'uppercase' as const,
          }}>
            Scene
          </div>
          <PropRow label="Fly Speed">
            <NumberInput
              value={comp.flySpeed ?? 500}
              min={50} max={5000} step={50} precision={0}
              onChange={(v) => useCompositionStore.getState().updateComposition(comp.id, { flySpeed: v })}
            />
          </PropRow>
          <PropRow label="Grid Visible">
            <CheckboxInput
              value={comp.gridVisible ?? true}
              onChange={(v) => {
                useCompositionStore.getState().updateComposition(comp.id, { gridVisible: v });
                (window as any).__renderer?.sceneManager?.setGridVisible?.(v);
              }}
            />
          </PropRow>
          <PropRow label="Grid Size">
            <NumberInput
              value={comp.gridSize ?? 100}
              min={10} max={500} step={10} precision={0}
              onChange={(v) => useCompositionStore.getState().updateComposition(comp.id, { gridSize: v })}
            />
          </PropRow>
          <PropRow label="Show Axes">
            <CheckboxInput
              value={comp.showAxes ?? true}
              onChange={(v) => {
                useCompositionStore.getState().updateComposition(comp.id, { showAxes: v });
                const axes = (window as any).__renderer?.sceneManager?.scene?.getObjectByName('axes');
                if (axes) axes.visible = v;
              }}
            />
          </PropRow>
          <PropRow label="Show Frustum">
            <CheckboxInput
              value={comp.showFrustum ?? true}
              onChange={(v) => {
                useCompositionStore.getState().updateComposition(comp.id, { showFrustum: v });
                const frustum = (window as any).__renderer?.sceneManager?.scene?.getObjectByName('cameraFrustum');
                if (frustum) frustum.visible = v;
              }}
            />
          </PropRow>
        </>
      )}
    </Section>
  );
};