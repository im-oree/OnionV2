import React from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useKeyframeStore } from '../../../state/keyframeStore';
import { NumberInput } from '../properties/inputs/NumberInput';
import { CheckboxInput } from '../properties/inputs/CheckboxInput';
import { SelectInput } from '../properties/inputs/SelectInput';
import { Section, PropRow } from '../properties/Section';
import { useContextMenu } from '../../common/useContextMenu';
import { ContextMenu } from '../../common/ContextMenu';

const CAMERA_ID = '__camera__';

function kfId(): string {
  return `kf_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
}

/** Camera property row with stopwatch and diamond keyframe buttons. */
const CamPropRow: React.FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
  property: string;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  labelSuffix?: string;
}> = ({ label, value, onChange, property, min, max, step, precision, labelSuffix }) => {
  const isAnimated = useKeyframeStore(s => s.isPropertyAnimated(CAMERA_ID, property));

  const frame = (() => {
    const cs = useCompositionStore.getState();
    const comp = cs.activeCompositionId ? cs.compositions.find(c => c.id === cs.activeCompositionId) : null;
    return comp ? Math.round(comp.currentTime * comp.fps) : 0;
  })();
  const hasKfAtFrame = useKeyframeStore(s => {
    if (!isAnimated) return false;
    return s.engine.getKeyframesForProperty(CAMERA_ID, property).some(k => k.time === frame);
  });

  const handleStopwatch = () => {
    const store = useKeyframeStore.getState();
    store.toggleAnimatedProperty(CAMERA_ID, property);
    if (!isAnimated) {
      store.addKeyframe(CAMERA_ID, {
        id: kfId(), property, layerId: CAMERA_ID, time: frame, value, interpolation: 'linear',
      });
    }
  };

  const handleDiamond = () => {
    const store = useKeyframeStore.getState();
    if (hasKfAtFrame) {
      const existing = store.engine.getKeyframesForProperty(CAMERA_ID, property).find(k => k.time === frame);
      if (existing) store.removeKeyframe(existing.id);
    } else {
      store.addKeyframe(CAMERA_ID, {
        id: kfId(), property, layerId: CAMERA_ID, time: frame, value, interpolation: 'linear',
      });
    }
  };

  const ctxMenu = useContextMenu();

  const handleContext = (e: React.MouseEvent) => {
    e.preventDefault();
    const def = (window as any).__cameraDefaults?.[property] ?? 0;
    ctxMenu.open(e, [
      { id: 'ctx.hdr', label: `Camera ${label}`, disabled: true, onClick: () => {} },
      { id: 'ctx.d1', label: '', divider: true, onClick: () => {} },
      {
        id: 'ctx.insKf', label: 'Insert Keyframe',
        onClick: () => {
          const store = useKeyframeStore.getState();
          const cs = useCompositionStore.getState();
          const comp = cs.compositions.find(c => c.id === cs.activeCompositionId);
          const f = comp ? Math.round(comp.currentTime * comp.fps) : 0;
          if (!store.isPropertyAnimated(CAMERA_ID, property)) {
            store.toggleAnimatedProperty(CAMERA_ID, property);
          }
          const existing = store.engine.getKeyframesForProperty(CAMERA_ID, property).find(k => k.time === f);
          if (existing) store.updateKeyframe(existing.id, { value });
          else store.addKeyframe(CAMERA_ID, {
            id: kfId(), property, layerId: CAMERA_ID, time: f, value, interpolation: 'linear',
          });
        },
      },
      ...(hasKfAtFrame ? [{
        id: 'ctx.remKf', label: 'Remove Keyframe',
        onClick: () => {
          const store = useKeyframeStore.getState();
          const cs = useCompositionStore.getState();
          const comp = cs.compositions.find(c => c.id === cs.activeCompositionId);
          const f = comp ? Math.round(comp.currentTime * comp.fps) : 0;
          const existing = store.engine.getKeyframesForProperty(CAMERA_ID, property).find(k => k.time === f);
          if (existing) store.removeKeyframe(existing.id);
        },
      }] : []),
      { id: 'ctx.d2', label: '', divider: true, onClick: () => {} },
      {
        id: 'ctx.reset', label: 'Reset to Default',
        onClick: () => { if (def !== undefined) onChange(def); },
      },
      { id: 'ctx.d3', label: '', divider: true, onClick: () => {} },
      {
        id: 'ctx.copyPath', label: 'Copy Data Path',
        onClick: () => { navigator.clipboard?.writeText(property); },
      },
    ]);
  };

  return (
    <PropRow label={label}>
      <div className="flex items-center gap-1 flex-1" onContextMenu={handleContext}>
        {/* Stopwatch */}
        <button onClick={handleStopwatch} title={isAnimated ? 'Disable animation' : 'Enable animation'}
          style={{
            width: 14, height: 14, border: 'none', background: 'transparent', cursor: 'pointer',
            color: isAnimated ? 'var(--color-accent)' : 'var(--color-text-disabled)',
            opacity: isAnimated ? 1 : 0.45, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <svg width="11" height="11" viewBox="0 0 11 11">
            <circle cx="5.5" cy="5.5" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <line x1="5.5" y1="2.5" x2="5.5" y2="5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="5.5" y1="5.5" x2="7.5" y2="6.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          </svg>
        </button>
        {/* Value input */}
        <div className="flex-1">
          <NumberInput
            value={value} onChange={onChange}
            min={min} max={max} step={step} precision={precision}
            label={labelSuffix}
          />
        </div>
        {/* Diamond keyframe toggle */}
        {isAnimated && (
          <button onClick={handleDiamond} title={hasKfAtFrame ? 'Remove keyframe' : 'Add keyframe'}
            style={{
              width: 10, height: 10, border: 'none', background: 'transparent', cursor: 'pointer',
              color: hasKfAtFrame ? 'var(--color-accent)' : 'var(--color-text-disabled)',
              padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <svg width="7" height="7" viewBox="0 0 8 8" fill="currentColor">
              {hasKfAtFrame
                ? <polygon points="4,0 8,4 4,8 0,4" />
                : <polygon points="4,0 8,4 4,8 0,4" fill="none" stroke="currentColor" strokeWidth="1" />}
            </svg>
          </button>
        )}
      </div>
      {ctxMenu.menu && <ContextMenu items={ctxMenu.menu.items} position={ctxMenu.menu.position} onClose={ctxMenu.close} />}
    </PropRow>
  );
};

/**
 * CameraPanel — dedicated panel for all camera/3D settings.
 * All numeric camera properties are keyframeable via CamPropRow.
 */
export const CameraPanel: React.FC = () => {
  const comp = useCompositionStore(s =>
    s.activeCompositionId
      ? s.compositions.find(c => c.id === s.activeCompositionId) ?? null
      : null
  );

  if (!comp) {
    return (
      <div className="p-4 text-center" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-disabled)' }}>
        No composition
      </div>
    );
  }

  const upd = (patch: any) => useCompositionStore.getState().updateComposition(comp.id, patch);

  const cam = {
    mode: comp.cameraMode ?? 'perspective',
    posX: comp.cameraPositionX ?? 0,
    posY: comp.cameraPositionY ?? 0,
    posZ: comp.cameraPositionZ ?? 1000,
    rotX: comp.cameraRotationX ?? 0,
    rotY: comp.cameraRotationY ?? 0,
    rotZ: comp.cameraRotationZ ?? 0,
    fov: comp.cameraFOV ?? 50,
    zoom: comp.cameraZoom ?? 1,
    near: comp.cameraNear ?? 0.1,
    far: comp.cameraFar ?? 10000,
    dof: comp.cameraDOF ?? false,
    focusDist: comp.cameraFocusDistance ?? 500,
    aperture: comp.cameraAperture ?? 5,
    showGizmo: comp.cameraShowGizmo ?? true,
    selectCamera: comp.cameraSelected ?? false,
    exposure: comp.cameraExposure ?? 0,
  };

  const toDeg = (r: number) => r * (180 / Math.PI);
  const toRad = (d: number) => d * (Math.PI / 180);

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ fontSize: 'var(--font-size-xs)' }}>
      {/* ── Camera Mode ── */}
      <Section label="Camera">
        <PropRow label="Mode">
          <SelectInput
            value={cam.mode}
            onChange={(v) => {
              // Keep perspective3D=true for both modes so 3D layers still render
              // The cameraMode determines which projection to use
              upd({ cameraMode: v, perspective3D: true });
            }}
            options={[
              { label: 'Perspective', value: 'perspective' },
              { label: 'Orthographic', value: 'orthographic' },
            ]}
          />
        </PropRow>
        <PropRow label="Select Camera">
          <CheckboxInput value={cam.selectCamera} onChange={v => upd({ cameraSelected: v })} />
        </PropRow>
        <PropRow label="Show Frustum">
          <CheckboxInput value={cam.showGizmo} onChange={v => {
            upd({ cameraShowGizmo: v });
            (window as any).__cameraGizmoVisible = v;
          }} />
        </PropRow>

        {/* ── Move with View Toggle ── */}
        <PropRow label="Move with View">
          <CheckboxInput value={comp.cameraMoveWithView ?? false}
            onChange={v => upd({ cameraMoveWithView: v })} />
        </PropRow>

        {/* ── Invert Controls ── */}
        <div style={{ marginTop: 6, marginBottom: 2, fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-tertiary)', fontWeight: 600, letterSpacing: '0.04em' }}>
          Invert
        </div>
        <PropRow label="Orbit">
          <CheckboxInput value={comp.cameraInvertOrbit ?? false}
            onChange={v => upd({ cameraInvertOrbit: v })} />
        </PropRow>
        <PropRow label="Pan">
          <CheckboxInput value={comp.cameraInvertPan ?? false}
            onChange={v => upd({ cameraInvertPan: v })} />
        </PropRow>
        <PropRow label="Zoom">
          <CheckboxInput value={comp.cameraInvertZoom ?? false}
            onChange={v => upd({ cameraInvertZoom: v })} />
        </PropRow>
      </Section>

      {/* ── Position ── */}
      <Section label="Position" defaultOpen={true}>
        <CamPropRow label="X" value={cam.posX} onChange={v => upd({ cameraPositionX: v })} property="camera.positionX" step={1} precision={0} />
        <CamPropRow label="Y" value={cam.posY} onChange={v => upd({ cameraPositionY: v })} property="camera.positionY" step={1} precision={0} />
        <CamPropRow label="Z" value={cam.posZ} onChange={v => upd({ cameraPositionZ: v })} property="camera.positionZ" min={1} max={50000} step={10} precision={0} />
      </Section>

      {/* ── Rotation ── */}
      <Section label="Rotation" defaultOpen={true}>
        <CamPropRow label="X" value={toDeg(cam.rotX)} onChange={v => upd({ cameraRotationX: toRad(v) })} property="camera.rotationX" min={-90} max={90} step={1} precision={1} />
        <CamPropRow label="Y" value={toDeg(cam.rotY)} onChange={v => upd({ cameraRotationY: toRad(v) })} property="camera.rotationY" min={-180} max={180} step={1} precision={1} />
        <CamPropRow label="Z" value={toDeg(cam.rotZ)} onChange={v => upd({ cameraRotationZ: toRad(v) })} property="camera.rotationZ" min={-180} max={180} step={1} precision={1} />
      </Section>

      {/* ── Lens ── */}
      <Section label="Lens">
        <CamPropRow label="FOV" value={cam.fov} onChange={v => upd({ cameraFOV: v })} property="camera.fov" min={1} max={179} step={1} precision={0} />
        <CamPropRow label="Zoom" value={cam.zoom} onChange={v => upd({ cameraZoom: v })} property="camera.zoom" min={0.01} max={100} step={0.1} precision={2} />
        <CamPropRow label="Near Clip" value={cam.near} onChange={v => upd({ cameraNear: v })} property="camera.near" min={0.01} max={1000} step={0.1} precision={2} />
        <CamPropRow label="Far Clip" value={cam.far} onChange={v => upd({ cameraFar: v })} property="camera.far" min={100} max={100000} step={100} precision={0} />
      </Section>

      {/* ── Depth of Field ── */}
      <Section label="Depth of Field" defaultOpen={cam.dof}>
        <PropRow label="Enable DOF">
          <CheckboxInput value={cam.dof} onChange={v => upd({ cameraDOF: v })} />
        </PropRow>
        {cam.dof && (
          <>
            <CamPropRow label="Focus Dist" value={cam.focusDist} onChange={v => upd({ cameraFocusDistance: v })} property="camera.focusDistance" min={0} max={10000} step={10} precision={0} />
            <CamPropRow label="Aperture" value={cam.aperture} onChange={v => upd({ cameraAperture: v })} property="camera.aperture" min={0} max={100} step={0.5} precision={1} />
          </>
        )}
      </Section>

      {/* ── Exposure ── */}
      <Section label="Exposure" defaultOpen={false}>
        <CamPropRow label="EV" value={cam.exposure} onChange={v => upd({ cameraExposure: v })} property="camera.exposure" min={-4} max={4} step={0.1} precision={1} />
      </Section>

      {/* ── Orientation Guide ── */}
      <Section label="Orientation" defaultOpen={false}>
        <div style={{ padding: '4px 0', color: 'var(--color-text-tertiary)', fontSize: 10, lineHeight: 1.6 }}>
          <div><span style={{color:'#ff3355'}}>→ X</span> Right &nbsp; <span style={{color:'#55dd33'}}>↑ Y</span> Up &nbsp; <span style={{color:'#3388ff'}}>→ Z</span> Forward</div>
          <div style={{marginTop:4}}>MMB orbit · Shift+MMB pan · Scroll zoom</div>
        </div>
      </Section>
    </div>
  );
};
