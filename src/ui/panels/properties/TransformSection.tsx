import React, { useCallback, useState } from 'react';
import { Section, PropRow } from './Section';
import { Vector2Input } from './inputs/Vector2Input';
import { NumberInput } from './inputs/NumberInput';
import type { Layer } from '../../../types/layer';
import { useCompositionStore } from '../../../state/compositionStore';
import { useKeyframeStore } from '../../../state/keyframeStore';
import { useTimelineStore } from '../../../state/timelineStore';

interface Props { layer: Layer; compId: string; }

function kfId(): string {
  return `kf_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
}

/** Stopwatch icon for individual axis animation */
const StopwatchIcon: React.FC<{ size?: number }> = ({ size = 11 }) => (
  <svg width={size} height={size} viewBox="0 0 11 11">
    <circle cx="5.5" cy="5.5" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
    <line x1="5.5" y1="2.5" x2="5.5" y2="5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="5.5" y1="5.5" x2="7.5" y2="6.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

/** Toggle button for per-axis mode */
const PerAxisToggle: React.FC<{ enabled: boolean; onToggle: () => void; title: string }> = ({ enabled, onToggle, title }) => (
  <button
    className="flex items-center justify-center border-0 cursor-pointer transition-colors"
    style={{
      width: 20, height: 14,
      borderRadius: 3,
      fontSize: 9,
      fontWeight: 600,
      letterSpacing: '-0.02em',
      background: enabled ? 'rgba(88, 101, 255, 0.2)' : 'transparent',
      color: enabled ? 'var(--color-accent)' : 'var(--color-text-disabled)',
      border: `1px solid ${enabled ? 'rgba(88, 101, 255, 0.4)' : 'var(--color-divider)'}`,
    }}
    onClick={(e) => { e.stopPropagation(); onToggle(); }}
    title={title}
  >
    {enabled ? 'XY' : '1↔'}
  </button>
);

/** Single axis row with its own stopwatch */
const AxisRow: React.FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
  layerId: string;
  property: string;
  currentFrame: number;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  locked?: boolean;
}> = ({ label, value, onChange, layerId, property, currentFrame, min, max, step, precision, locked }) => {
  const revision = useKeyframeStore(s => s.revision);
  void revision;
  const isAnimated = useKeyframeStore(s => s.isPropertyAnimated(layerId, property));
  const hasKfAtFrame = useKeyframeStore(s => {
    if (!isAnimated) return false;
    const kfs = s.engine.getKeyframesForProperty(layerId, property);
    return kfs.some(k => k.time === currentFrame);
  });

  const handleStopwatch = (e: React.MouseEvent) => {
    e.stopPropagation();
    const store = useKeyframeStore.getState();
    store.toggleAnimatedProperty(layerId, property);
    if (!isAnimated) {
      store.addKeyframe(layerId, {
        id: kfId(), property, layerId,
        time: currentFrame, value, interpolation: 'linear',
      });
    }
  };

  const handleDiamond = (e: React.MouseEvent) => {
    e.stopPropagation();
    const store = useKeyframeStore.getState();
    if (hasKfAtFrame) {
      const existing = store.engine.getKeyframesForProperty(layerId, property).find(k => k.time === currentFrame);
      if (existing) store.removeKeyframe(existing.id);
    } else {
      store.addKeyframe(layerId, {
        id: kfId(), property, layerId,
        time: currentFrame, value, interpolation: 'linear',
      });
    }
  };

  return (
    <div className="flex items-center gap-1" style={{ minHeight: 22 }}>
      <button
        className="flex items-center justify-center border-0 bg-transparent cursor-pointer transition-colors shrink-0"
        style={{
          width: 12, height: 12,
          color: isAnimated ? 'var(--color-accent)' : 'var(--color-text-disabled)',
          opacity: isAnimated ? 1 : 0.4,
        }}
        onClick={handleStopwatch}
        title={isAnimated ? `Disable ${label} animation` : `Enable ${label} animation`}
      >
        <StopwatchIcon size={10} />
      </button>
      <span style={{ fontSize: 9, color: 'var(--color-text-secondary)', width: 10, flexShrink: 0 }}>
        {label}
      </span>
      <div className="flex-1 min-w-0">
        <NumberInput
          value={value}
          onChange={onChange}
          min={min} max={max} step={step} precision={precision}
          label=""
          locked={locked}
        />
      </div>
      {isAnimated && (
        <button
          className="flex items-center justify-center border-0 bg-transparent cursor-pointer shrink-0 transition-colors"
          style={{
            width: 10, height: 10,
            color: hasKfAtFrame ? 'var(--color-accent)' : 'var(--color-text-disabled)',
          }}
          onClick={handleDiamond}
          title={hasKfAtFrame ? 'Remove keyframe' : 'Add keyframe'}
        >
          <svg width="7" height="7" viewBox="0 0 8 8" fill="currentColor">
            <polygon points="4,0 8,4 4,8 0,4" fill={hasKfAtFrame ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
      )}
    </div>
  );
};

export const TransformSection: React.FC<Props> = ({ layer, compId }) => {
  // Adjustment layers don't have transform properties — they're invisible effect containers
  if (layer.type === 'adjustment') {
    return (
      <Section label="Adjustment">
        <div style={{ padding: '8px 4px', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)', lineHeight: 1.5 }}>
          Adjustment layers apply effects to all layers beneath them.
          They don't have transform properties.
        </div>
      </Section>
    );
  }

  const t = layer.transform;
  const lockedProps = layer.lockedProperties ?? {};
  const [perAxisPosition, setPerAxisPosition] = useState(false);
  const [perAxisScale, setPerAxisScale] = useState(false);

  const currentFrame = useCompositionStore((s) => {
    const comp = s.activeCompositionId ? s.compositions.find(c => c.id === s.activeCompositionId) : null;
    return comp ? Math.round(comp.currentTime * comp.fps) : 0;
  });

  const isPropertyAnimated = useKeyframeStore(s => s.isPropertyAnimated);
  const addKeyframe = useKeyframeStore(s => s.addKeyframe);
  const engine = useKeyframeStore(s => s.engine);

  const insertOrUpdateKf = useCallback((prop: string, value: number | number[]) => {
    const store = useKeyframeStore.getState();
    if (!store.isPropertyAnimated(layer.id, prop)) {
      store.toggleAnimatedProperty(layer.id, prop);
    }
    const existing = engine.getKeyframesForProperty(layer.id, prop).find(k => k.time === currentFrame);
    if (existing) store.updateKeyframe(existing.id, { value });
    else addKeyframe(layer.id, {
      id: kfId(), property: prop, layerId: layer.id,
      time: currentFrame, value, interpolation: 'linear',
    });
  }, [layer.id, currentFrame, engine, addKeyframe]);

  const autoOrExistingKf = useCallback((prop: string, value: number | number[]) => {
    const autoKey = useTimelineStore.getState().autoKey;
    if (autoKey) { insertOrUpdateKf(prop, value); return; }
    if (!isPropertyAnimated(layer.id, prop)) return;
    const existing = engine.getKeyframesForProperty(layer.id, prop).find(k => k.time === currentFrame);
    if (existing) useKeyframeStore.getState().updateKeyframe(existing.id, { value });
    else addKeyframe(layer.id, {
      id: kfId(), property: prop, layerId: layer.id,
      time: currentFrame, value, interpolation: 'linear',
    });
  }, [layer.id, currentFrame, isPropertyAnimated, engine, addKeyframe, insertOrUpdateKf]);

  const updateTransform = useCallback((patch: Partial<Layer['transform']>, prop?: string) => {
    const nt = { ...layer.transform, ...patch };
    useCompositionStore.getState().updateLayer(compId, layer.id, { transform: nt });
    if (prop) autoOrExistingKf(prop, getTransformValue(prop, nt));
  }, [layer, compId, autoOrExistingKf]);

  const updateOpacity = useCallback((v: number) => {
    useCompositionStore.getState().updateLayer(compId, layer.id, { opacity: v });
    autoOrExistingKf('opacity', v);
  }, [layer.id, compId, autoOrExistingKf]);

  // Per-axis position handlers
  const updatePositionX = useCallback((v: number) => {
    updateTransform({ position: { x: v, y: t.position.y } }, 'transform.position.x');
  }, [updateTransform, t.position.y]);

  const updatePositionY = useCallback((v: number) => {
    updateTransform({ position: { x: t.position.x, y: v } }, 'transform.position.y');
  }, [updateTransform, t.position.x]);

  // Per-axis scale handlers
  const updateScaleX = useCallback((v: number) => {
    updateTransform({ scale: { x: v, y: t.scale.y } }, 'transform.scale.x');
  }, [updateTransform, t.scale.y]);

  const updateScaleY = useCallback((v: number) => {
    updateTransform({ scale: { x: t.scale.x, y: v } }, 'transform.scale.y');
  }, [updateTransform, t.scale.x]);

  return (
    <Section label="Transform">
      <PropRow label="Anchor" animatable="transform.anchorPoint" layer={layer} currentFrame={currentFrame} compId={compId} lockPath="transform.anchorPoint">
        <Vector2Input x={t.anchorPoint.x} y={t.anchorPoint.y}
          onChange={(x, y) => updateTransform({ anchorPoint: { x, y } }, 'transform.anchorPoint')}
          step={1} precision={1} />
      </PropRow>

      {/* Position with per-axis toggle */}
      <PropRow label="Position" animatable="transform.position" layer={layer} currentFrame={currentFrame} compId={compId} lockPath="transform.position">
        <div className="flex items-center gap-1">
          <PerAxisToggle
            enabled={perAxisPosition}
            onToggle={() => setPerAxisPosition(!perAxisPosition)}
            title={perAxisPosition ? 'Switch to combined mode' : 'Switch to per-axis mode'}
          />
          {perAxisPosition ? (
            <div className="flex flex-col gap-0.5 flex-1">
              <AxisRow
                label="X" value={t.position.x} onChange={updatePositionX}
                layerId={layer.id} property="transform.position.x" currentFrame={currentFrame}
                step={1} precision={1} locked={!!lockedProps['transform.position.x']}
              />
              <AxisRow
                label="Y" value={t.position.y} onChange={updatePositionY}
                layerId={layer.id} property="transform.position.y" currentFrame={currentFrame}
                step={1} precision={1} locked={!!lockedProps['transform.position.y']}
              />
            </div>
          ) : (
            <Vector2Input x={t.position.x} y={t.position.y}
              onChange={(x, y) => updateTransform({ position: { x, y } }, 'transform.position')}
              step={1} precision={1}
            />
          )}
        </div>
      </PropRow>

      {/* Scale with per-axis toggle */}
      <PropRow label="Scale" animatable="transform.scale" layer={layer} currentFrame={currentFrame} compId={compId} lockPath="transform.scale">
        <div className="flex items-center gap-1">
          <PerAxisToggle
            enabled={perAxisScale}
            onToggle={() => setPerAxisScale(!perAxisScale)}
            title={perAxisScale ? 'Switch to combined mode' : 'Switch to per-axis mode'}
          />
          {perAxisScale ? (
            <div className="flex flex-col gap-0.5 flex-1">
              <AxisRow
                label="X" value={t.scale.x} onChange={updateScaleX}
                layerId={layer.id} property="transform.scale.x" currentFrame={currentFrame}
                min={-10000} max={10000} step={1} precision={1} locked={!!lockedProps['transform.scale.x']}
              />
              <AxisRow
                label="Y" value={t.scale.y} onChange={updateScaleY}
                layerId={layer.id} property="transform.scale.y" currentFrame={currentFrame}
                min={-10000} max={10000} step={1} precision={1} locked={!!lockedProps['transform.scale.y']}
              />
            </div>
          ) : (
            <Vector2Input x={t.scale.x} y={t.scale.y}
              onChange={(x, y) => updateTransform({ scale: { x, y } }, 'transform.scale')}
              min={-10000} max={10000} step={1} precision={1}
            />
          )}
        </div>
      </PropRow>

      <PropRow label="Rotation" animatable="transform.rotation" layer={layer} currentFrame={currentFrame} compId={compId} lockPath="transform.rotation">
        <NumberInput value={t.rotation}
          onChange={(v) => updateTransform({ rotation: v }, 'transform.rotation')}
          step={1} precision={1} label="°" locked={!!lockedProps['transform.rotation']} />
      </PropRow>
      <PropRow label="Opacity" animatable="opacity" layer={layer} currentFrame={currentFrame} compId={compId} lockPath="opacity">
        <NumberInput value={layer.opacity} onChange={updateOpacity}
          min={0} max={100} step={1} precision={0} label="%" locked={!!lockedProps['opacity']} />
      </PropRow>

      {/* === 3D Controls — unified with 2D, all keyframeable === */}
      {layer.is3D && layer.transform3D && (() => {
        const t3d = layer.transform3D;
        const upd3d = (patch: any) => {
          useCompositionStore.getState().updateLayer(compId, layer.id, {
            transform3D: { ...t3d, ...patch },
          });
        };

        return (
          <>
            <PropRow label="Position Z" animatable="transform3D.position.z" layer={layer} currentFrame={currentFrame} compId={compId} lockPath="transform3D.position.z">
              <AxisRow
                label="Z" value={t3d.position.z}
                onChange={(v) => {
                  upd3d({ position: { ...t3d.position, z: v } });
                  autoOrExistingKf('transform3D.position.z', v);
                }}
                layerId={layer.id} property="transform3D.position.z" currentFrame={currentFrame}
                step={1} precision={1} locked={!!lockedProps['transform3D.position.z']}
              />
            </PropRow>

            <PropRow label="Scale Z" animatable="transform3D.scale.z" layer={layer} currentFrame={currentFrame} compId={compId} lockPath="transform3D.scale.z">
              <AxisRow
                label="Z" value={t3d.scale.z}
                onChange={(v) => {
                  upd3d({ scale: { ...t3d.scale, z: v } });
                  autoOrExistingKf('transform3D.scale.z', v);
                }}
                layerId={layer.id} property="transform3D.scale.z" currentFrame={currentFrame}
                min={-10000} max={10000} step={1} precision={1} locked={!!lockedProps['transform3D.scale.z']}
              />
            </PropRow>

            <PropRow label="Rot X" animatable="transform3D.rotationX" layer={layer} currentFrame={currentFrame} compId={compId} lockPath="transform3D.rotationX">
              <AxisRow
                label="X" value={t3d.rotationX}
                onChange={(v) => {
                  upd3d({ rotationX: v });
                  autoOrExistingKf('transform3D.rotationX', v);
                }}
                layerId={layer.id} property="transform3D.rotationX" currentFrame={currentFrame}
                min={-360} max={360} step={1} precision={1} locked={!!lockedProps['transform3D.rotationX']}
              />
            </PropRow>

            <PropRow label="Rot Y" animatable="transform3D.rotationY" layer={layer} currentFrame={currentFrame} compId={compId} lockPath="transform3D.rotationY">
              <AxisRow
                label="Y" value={t3d.rotationY}
                onChange={(v) => {
                  upd3d({ rotationY: v });
                  autoOrExistingKf('transform3D.rotationY', v);
                }}
                layerId={layer.id} property="transform3D.rotationY" currentFrame={currentFrame}
                min={-360} max={360} step={1} precision={1} locked={!!lockedProps['transform3D.rotationY']}
              />
            </PropRow>

            <PropRow label="Rot Z" animatable="transform3D.rotationZ" layer={layer} currentFrame={currentFrame} compId={compId} lockPath="transform3D.rotationZ">
              <AxisRow
                label="Z" value={t3d.rotationZ}
                onChange={(v) => {
                  upd3d({ rotationZ: v });
                  autoOrExistingKf('transform3D.rotationZ', v);
                }}
                layerId={layer.id} property="transform3D.rotationZ" currentFrame={currentFrame}
                min={-360} max={360} step={1} precision={1} locked={!!lockedProps['transform3D.rotationZ']}
              />
            </PropRow>

            <PropRow label="Anchor Z" animatable="transform3D.anchorPoint.z" layer={layer} currentFrame={currentFrame} compId={compId} lockPath="transform3D.anchorPoint.z">
              <AxisRow
                label="Z" value={t3d.anchorPoint.z}
                onChange={(v) => {
                  upd3d({ anchorPoint: { ...t3d.anchorPoint, z: v } });
                  autoOrExistingKf('transform3D.anchorPoint.z', v);
                }}
                layerId={layer.id} property="transform3D.anchorPoint.z" currentFrame={currentFrame}
                step={1} precision={1} locked={!!lockedProps['transform3D.anchorPoint.z']}
              />
            </PropRow>

            {/* Extrusion — makes flat 3D layer into a box */}
            <PropRow label="Extrude" animatable="transform3D.extrusion" layer={layer} currentFrame={currentFrame} compId={compId} lockPath="transform3D.extrusion">
              <AxisRow
                label="D" value={t3d.extrusion ?? 0}
                onChange={(v) => {
                  upd3d({ extrusion: v });
                  autoOrExistingKf('transform3D.extrusion', v);
                }}
                layerId={layer.id} property="transform3D.extrusion" currentFrame={currentFrame}
                min={0} max={2000} step={1} precision={0} locked={!!lockedProps['transform3D.extrusion']}
              />
            </PropRow>
          </>
        );
      })()}
    </Section>
  );
};

function getTransformValue(path: string, transform: Layer['transform']): number | number[] {
  const field = path.replace('transform.', '');
  if (field === 'rotation') return transform.rotation;
  if (field === 'position') return [transform.position.x, transform.position.y];
  if (field === 'position.x') return transform.position.x;
  if (field === 'position.y') return transform.position.y;
  if (field === 'scale') return [transform.scale.x, transform.scale.y];
  if (field === 'scale.x') return transform.scale.x;
  if (field === 'scale.y') return transform.scale.y;
  if (field === 'anchorPoint') return [transform.anchorPoint.x, transform.anchorPoint.y];
  if (field === 'anchorPoint.x') return transform.anchorPoint.x;
  if (field === 'anchorPoint.y') return transform.anchorPoint.y;
  return 0;
}