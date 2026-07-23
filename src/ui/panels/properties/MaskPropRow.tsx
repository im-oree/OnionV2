/**
 * MaskPropRow — keyframeable numeric row for mask properties.
 * Uses PropRowWithKF's underlying keyframe engine with property path
 * `mask.<maskId>.<field>` so animations survive across renders.
 */
import React, { useCallback } from 'react';
import { useKeyframeStore } from '../../../state/keyframeStore';
import { useCompositionStore } from '../../../state/compositionStore';
import { animationClock } from '../timeline/PlaybackControls';
import { debouncedCapture, flushDebouncedSnapshot } from '../../../state/historyStore';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue: number;
  formatValue?: (v: number) => string;
  suffix?: string;
  layerId: string;
  maskId: string;
  field: string;         // e.g. 'positionX', 'sizeW', 'feather'
  onChange: (v: number) => void;
}

function propertyPath(maskId: string, field: string): string {
  return `mask.${maskId}.${field}`;
}

/** Layer-local frame at current playhead */
function getLocalFrame(layerId: string): number {
  const now = Math.round(animationClock.currentFrame);
  const cs = useCompositionStore.getState();
  const comp = cs.activeCompositionId
    ? cs.compositions.find(c => c.id === cs.activeCompositionId)
    : null;
  const layer = comp?.layers.find(l => l.id === layerId);
  if (!layer) return now;
  return Math.max(0, now - layer.startFrame);
}

function toGlobalFrame(layerId: string, localFrame: number): number {
  const cs = useCompositionStore.getState();
  const comp = cs.activeCompositionId
    ? cs.compositions.find(c => c.id === cs.activeCompositionId)
    : null;
  const layer = comp?.layers.find(l => l.id === layerId);
  if (!layer) return localFrame;
  return layer.startFrame + localFrame;
}

export const MaskPropRow: React.FC<Props> = ({
  label, value, min, max, step = 1, defaultValue,
  formatValue, layerId, maskId, field, onChange,
}) => {
  const [editing, setEditing] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');
  const kfRevision = useKeyframeStore(s => s.revision);
  const engine = useKeyframeStore(s => s.engine);

  // Subscribe to animationClock so keyframe nav arrows re-render the display
  const [, forceUpdate] = React.useState(0);
  const lastFrameRef = React.useRef(-1);
  React.useEffect(() => {
    const handler = () => {
      const local = getLocalFrame(layerId);
      if (local !== lastFrameRef.current) {
        lastFrameRef.current = local;
        forceUpdate(n => n + 1);
      }
    };
    animationClock.on('frame-changed', handler);
    return () => { animationClock.off('frame-changed', handler); };
  }, [layerId]);

  const path = propertyPath(maskId, field);
  const keyframes = React.useMemo(
    () => engine.getKeyframesForProperty(layerId, path),
    [layerId, path, engine, kfRevision],
  );
  const isAnimated = keyframes.length > 0;
  const localFrame = getLocalFrame(layerId);
  const atKeyframe = keyframes.some(k => k.time === localFrame);

  const dragging = React.useRef(false);
  const onSliderDown = useCallback(() => {
    dragging.current = true;
    debouncedCapture(`Change ${label}`);
  }, [label]);
  const onSliderUp = useCallback(() => {
    if (dragging.current) {
      dragging.current = false;
      flushDebouncedSnapshot();
    }
  }, []);
  React.useEffect(() => {
    const up = () => onSliderUp();
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, [onSliderUp]);

  const toggleKf = useCallback(() => {
    const store = useKeyframeStore.getState();
    const existing = keyframes.find(k => k.time === localFrame);
    if (existing) {
      store.removeKeyframe(existing.id);
    } else {
      if (!store.isPropertyAnimated(layerId, path)) {
        store.toggleAnimatedProperty(layerId, path);
      }
      store.addKeyframe(layerId, {
        id: `kf_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        property: path,
        layerId,
        time: localFrame,
        value,
        interpolation: 'linear',
      });
    }
  }, [keyframes, layerId, path, value, localFrame]);

  const prevKf = useCallback(() => {
    const local = getLocalFrame(layerId);
    const prev = [...keyframes].sort((a, b) => b.time - a.time).find(k => k.time < local);
    if (!prev) return;
    const global = toGlobalFrame(layerId, prev.time);
    animationClock.seekToFrame(global);
    const cs = useCompositionStore.getState();
    const c = cs.compositions.find(cc => cc.id === cs.activeCompositionId);
    if (c) cs.setCurrentTime(c.id, global / c.fps);
  }, [keyframes, layerId]);

  const nextKf = useCallback(() => {
    const local = getLocalFrame(layerId);
    const next = [...keyframes].sort((a, b) => a.time - b.time).find(k => k.time > local);
    if (!next) return;
    const global = toGlobalFrame(layerId, next.time);
    animationClock.seekToFrame(global);
    const cs = useCompositionStore.getState();
    const c = cs.compositions.find(cc => cc.id === cs.activeCompositionId);
    if (c) cs.setCurrentTime(c.id, global / c.fps);
  }, [keyframes, layerId]);

  const reset = useCallback(() => {
    onChange(defaultValue);
  }, [defaultValue, onChange]);

  const commitInput = useCallback(() => {
    const parsed = Number(inputValue.trim());
    if (Number.isFinite(parsed)) {
      onChange(Math.max(min, Math.min(max, parsed)));
    }
    setEditing(false);
  }, [inputValue, min, max, onChange]);

  const displayValue = editing
    ? inputValue
    : formatValue ? formatValue(value) : String(Math.round(value));

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 3,
      padding: '4px 10px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{
          flex: 1, fontSize: 10, color: 'var(--color-text-secondary)',
        }}>
          {label}
        </span>
        <div style={{
          display: 'flex', alignItems: 'center',
          background: 'var(--color-input-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: 3, height: 20, minWidth: 52,
          justifyContent: 'flex-end', padding: '0 4px',
        }}>
          {editing ? (
            <input
              type="text" value={inputValue} autoFocus
              onChange={e => setInputValue(e.target.value)}
              onBlur={commitInput}
              onKeyDown={e => {
                if (e.key === 'Enter') commitInput();
                if (e.key === 'Escape') setEditing(false);
              }}
              style={{
                width: '100%', border: 0, background: 'transparent',
                outline: 'none', color: 'var(--color-text-primary)',
                fontSize: 10, fontFamily: 'var(--font-family-mono)',
                textAlign: 'right',
              }}
            />
          ) : (
            <span
              onClick={() => { setInputValue(String(value)); setEditing(true); }}
              style={{
                fontSize: 10, fontFamily: 'var(--font-family-mono)',
                color: 'var(--color-text-primary)', cursor: 'text',
                minWidth: 36, textAlign: 'right', userSelect: 'none',
              }}
            >{displayValue}</span>
          )}
        </div>
        <NavGroup
          isAnimated={isAnimated}
          atKeyframe={atKeyframe}
          onPrev={prevKf}
          onNext={nextKf}
          onToggle={toggleKf}
          onReset={reset}
        />
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onMouseDown={onSliderDown}
        onMouseUp={onSliderUp}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          width: '100%', height: 3,
          accentColor: 'var(--color-accent)',
          cursor: 'pointer',
        }}
      />
    </div>
  );
};

const NavGroup: React.FC<{
  isAnimated: boolean;
  atKeyframe: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToggle: () => void;
  onReset: () => void;
}> = ({ isAnimated, atKeyframe, onPrev, onNext, onToggle, onReset }) => {
  const btn = (enabled: boolean): React.CSSProperties => ({
    width: 14, height: 16, border: 0, background: 'transparent',
    color: enabled ? 'var(--color-text-tertiary)' : 'var(--color-text-disabled)',
    cursor: enabled ? 'pointer' : 'default',
    fontSize: 9, padding: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  });
  return (
    <div style={{ display: 'flex', gap: 1, marginLeft: 2 }}>
      <button onClick={onReset} title="Reset" style={btn(true)}>
        <svg width="9" height="9" viewBox="0 0 14 14" fill="none"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M2 4v3h3" />
          <path d="M2 7a5 5 0 1 0 1.5-3.5" />
        </svg>
      </button>
      <button onClick={onPrev} disabled={!isAnimated} title="Prev keyframe" style={btn(isAnimated)}>‹</button>
      <button onClick={onToggle} title={atKeyframe ? 'Remove keyframe' : 'Add keyframe'}
        style={{ ...btn(true), color: atKeyframe ? 'var(--color-accent)' : 'var(--color-text-tertiary)' }}>
        <svg width="8" height="8" viewBox="0 0 10 10">
          <polygon points="5,1 9,5 5,9 1,5"
            fill={atKeyframe ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth="1"/>
        </svg>
      </button>
      <button onClick={onNext} disabled={!isAnimated} title="Next keyframe" style={btn(isAnimated)}>›</button>
    </div>
  );
};

export default MaskPropRow;