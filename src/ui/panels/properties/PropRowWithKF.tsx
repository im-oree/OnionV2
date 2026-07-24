/**
 * PropRowWithKF — property row with slider, numeric input, reset,
 * and keyframe navigation buttons.
 *
 * All keyframe operations use LAYER-LOCAL frames (via propertyRowActions
 * helpers) so they stay in sync with how keyframes are stored/rendered.
 */
import React, { useState, useCallback } from 'react';
import { useKeyframeStore } from '../../../state/keyframeStore';
import { useCompositionStore } from '../../../state/compositionStore';
import { animationClock } from '../timeline/PlaybackControls';
import { debouncedCapture, flushDebouncedSnapshot } from '../../../state/historyStore';
import { insertKeyframeAtPlayhead, deleteKeyframeAtPlayhead } from '../timeline/propertyRowActions';
import { userEditGuard } from '../../../animation/UserEditGuard';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue: number;
  formatValue?: (v: number) => string;
  parseValue?: (s: string) => number;
  suffix?: string;
  layerId?: string;
  propertyPath?: string;
  onChange: (v: number) => void;
}

/** Get the layer-local frame at the current playhead for a given layer. */
function getLocalFrame(layerId: string | undefined): number {
  const now = Math.round(animationClock.currentFrame);
  if (!layerId || layerId === '__camera__') return now;
  const cs = useCompositionStore.getState();
  const comp = cs.activeCompositionId
    ? cs.compositions.find(c => c.id === cs.activeCompositionId)
    : null;
  const layer = comp?.layers.find(l => l.id === layerId);
  if (!layer) return now;
  return Math.max(0, now - layer.startFrame);
}

/** Convert layer-local frame back to global frame for playhead seeking. */
function toGlobalFrame(layerId: string | undefined, localFrame: number): number {
  if (!layerId || layerId === '__camera__') return localFrame;
  const cs = useCompositionStore.getState();
  const comp = cs.activeCompositionId
    ? cs.compositions.find(c => c.id === cs.activeCompositionId)
    : null;
  const layer = comp?.layers.find(l => l.id === layerId);
  if (!layer) return localFrame;
  return layer.startFrame + localFrame;
}

export const PropRowWithKF: React.FC<Props> = ({
  label,
  value,
  min, max,
  step = 1,
  defaultValue,
  formatValue,
  parseValue,
  layerId,
  propertyPath,
  onChange,
}) => {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const kfRevision = useKeyframeStore(s => s.revision);
  void kfRevision;
  const engine = useKeyframeStore(s => s.engine);

  // Subscribe to animationClock frame changes so the component re-renders
  // during playback/scrubbing, keeping the slider value in sync.
  // Throttled: only re-renders when localFrame actually changes.
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

  const keyframes = React.useMemo(() => {
    if (!layerId || !propertyPath) return [];
    return engine.getKeyframesForProperty(layerId, propertyPath);
  }, [layerId, propertyPath, engine, kfRevision]);

  const hasKfNav = !!(layerId && propertyPath);
  const isAnimated = keyframes.length > 0;

  // Compute local frame for keyframe-at-playhead check
  const localFrame = getLocalFrame(layerId);
  const atKeyframe = keyframes.some(k => k.time === localFrame);

  // When animated, evaluate the interpolated value from the keyframe engine
  // at the current frame instead of showing the raw data value.
  const animatedValue = React.useMemo(() => {
    if (!isAnimated || !layerId || !propertyPath) return value;
    const local = getLocalFrame(layerId);
    const result = engine.evaluate(layerId, propertyPath, local);
    return typeof result.value === 'number' ? result.value : value;
  }, [isAnimated, layerId, propertyPath, value, engine, kfRevision, localFrame]);

  const displayValue = editing ? inputValue : (formatValue ? formatValue(animatedValue) : String(animatedValue));

  // ── Slider drag: debounced undo ─────────────────────────────
  const sliderDragging = React.useRef(false);
  const handleSliderMouseDown = useCallback(() => {
    sliderDragging.current = true;
    if (layerId && propertyPath) userEditGuard.begin(layerId, propertyPath);
    debouncedCapture('Change Value');
  }, [layerId, propertyPath]);
  const handleSliderMouseUp = useCallback(() => {
    if (sliderDragging.current) {
      sliderDragging.current = false;
      if (layerId && propertyPath) userEditGuard.end(layerId, propertyPath);
      flushDebouncedSnapshot();
    }
  }, [layerId, propertyPath]);
  React.useEffect(() => {
    // Global mouseup guard in case the slider drag ends outside the element
    const onUp = () => handleSliderMouseUp();
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, [handleSliderMouseUp]);

  const handleReset = useCallback(() => {
    // When animated, update the keyframe at the current frame too
    if (isAnimated && layerId && propertyPath) {
      const local = getLocalFrame(layerId);
      const existing = keyframes.find(k => k.time === local);
      if (existing) {
        useKeyframeStore.getState().updateKeyframe(existing.id, { value: defaultValue });
      }
    }
    onChange(defaultValue);
  }, [defaultValue, onChange, isAnimated, layerId, propertyPath, keyframes]);

  const handlePrevKf = useCallback(() => {
    if (!layerId || !propertyPath) return;
    const local = getLocalFrame(layerId);
    const prev = [...keyframes].sort((a, b) => b.time - a.time).find(k => k.time < local);
    if (!prev) return;
    const global = toGlobalFrame(layerId, prev.time);
    animationClock.seekToFrame(global);
    const cs = useCompositionStore.getState();
    const compId = cs.activeCompositionId;
    if (compId) {
      const c = cs.compositions.find(cc => cc.id === compId);
      if (c) cs.setCurrentTime(compId, global / c.fps);
    }
  }, [layerId, propertyPath, keyframes]);

  const handleNextKf = useCallback(() => {
    if (!layerId || !propertyPath) return;
    const local = getLocalFrame(layerId);
    const next = [...keyframes].sort((a, b) => a.time - b.time).find(k => k.time > local);
    if (!next) return; // No auto-insert — that surprised users
    const global = toGlobalFrame(layerId, next.time);
    animationClock.seekToFrame(global);
    const cs = useCompositionStore.getState();
    const compId = cs.activeCompositionId;
    if (compId) {
      const c = cs.compositions.find(cc => cc.id === compId);
      if (c) cs.setCurrentTime(compId, global / c.fps);
    }
  }, [layerId, propertyPath, keyframes]);

  const handleToggleKf = useCallback(() => {
    if (!layerId || !propertyPath) return;
    // Delegate to shared helpers which correctly handle local-frame math,
    // property-animation state, and correct value reading.
    if (atKeyframe) deleteKeyframeAtPlayhead(layerId, propertyPath);
    else insertKeyframeAtPlayhead(layerId, propertyPath);
  }, [layerId, propertyPath, atKeyframe]);

  const inputFocus = useCallback(() => {
    if (layerId && propertyPath) userEditGuard.begin(layerId, propertyPath);
  }, [layerId, propertyPath]);
  const inputBlur = useCallback(() => {
    if (layerId && propertyPath) userEditGuard.end(layerId, propertyPath);
  }, [layerId, propertyPath]);

  // Cleanup guard on unmount — release any active guard
  React.useEffect(() => {
    return () => {
      if (layerId && propertyPath) userEditGuard.end(layerId, propertyPath);
    };
  }, [layerId, propertyPath]);

  const commitInput = useCallback(() => {
    const raw = inputValue.trim();
    const parsed = parseValue ? parseValue(raw) : Number(raw);
    if (Number.isFinite(parsed)) {
      onChange(Math.max(min, Math.min(max, parsed)));
    }
    setEditing(false);
  }, [inputValue, parseValue, min, max, onChange]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      padding: '6px 10px',
    }}>
      <div style={{
        fontSize: 11,
        color: 'var(--color-text-secondary)',
        fontWeight: 500,
      }}>
        {label}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={animatedValue}
          onMouseDown={handleSliderMouseDown}
          onMouseUp={handleSliderMouseUp}
          onTouchStart={handleSliderMouseDown}
          onTouchEnd={handleSliderMouseUp}
          onChange={(e) => {
            const v = Number(e.target.value);
            // When animated, also update the keyframe at the current frame
            if (isAnimated && layerId && propertyPath) {
              const local = getLocalFrame(layerId);
              const existing = keyframes.find(k => k.time === local);
              if (existing) {
                useKeyframeStore.getState().updateKeyframe(existing.id, { value: v });
              }
            }
            onChange(v);
          }}
          style={{
            flex: 1,
            height: 4,
            accentColor: 'var(--color-accent, #5865ff)',
            cursor: 'pointer',
            minWidth: 0,
          }}
        />

        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--color-input-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: 3,
          padding: '0 4px',
          height: 22,
          minWidth: 56,
          justifyContent: 'flex-end',
          flexShrink: 0,
        }}>
          {editing ? (
            <input
              type="text"
              value={inputValue}
              autoFocus
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={inputFocus}
              onBlur={() => { commitInput(); inputBlur(); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { commitInput(); inputBlur(); }
                else if (e.key === 'Escape') { inputBlur(); setEditing(false); }
              }}
              style={{
                width: 44,
                height: 18,
                padding: 0,
                background: 'transparent',
                border: 0,
                outline: 'none',
                color: 'var(--color-text-primary)',
                fontSize: 10,
                fontFamily: 'var(--font-family-mono)',
                textAlign: 'right',
              }}
            />
          ) : (
            <span
              onClick={() => {
                setInputValue(String(value));
                setEditing(true);
              }}
              style={{
                fontSize: 10,
                fontFamily: 'var(--font-family-mono)',
                color: 'var(--color-text-primary)',
                cursor: 'text',
                minWidth: 40,
                textAlign: 'right',
                userSelect: 'none',
              }}
              title="Click to edit"
            >
              {displayValue}
            </span>
          )}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            marginLeft: 2,
          }}>
            <button
              onClick={() => onChange(Math.min(max, animatedValue + step))}
              style={miniBtnStyle}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)'}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--color-text-tertiary)'}
            >▲</button>
            <button
              onClick={() => onChange(Math.max(min, animatedValue - step))}
              style={miniBtnStyle}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)'}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--color-text-tertiary)'}
            >▼</button>
          </div>
        </div>

        <button
          onClick={handleReset}
          title="Reset to default"
          style={{
            width: 20,
            height: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 0,
            background: 'transparent',
            color: 'var(--color-text-tertiary)',
            cursor: 'pointer',
            borderRadius: 3,
            flexShrink: 0,
            transition: 'color 120ms, background 120ms',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)';
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'var(--color-text-tertiary)';
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
        >
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 4v3h3" />
            <path d="M2 7a5 5 0 1 0 1.5-3.5" />
          </svg>
        </button>

        {hasKfNav && (
          <>
            <button
              onClick={handlePrevKf}
              title="Previous keyframe"
              disabled={!isAnimated}
              style={navBtnStyle(isAnimated)}
              onMouseEnter={(e) => {
                if (isAnimated) (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)';
              }}
              onMouseLeave={(e) => {
                if (isAnimated) (e.currentTarget as HTMLElement).style.color = 'var(--color-text-tertiary)';
              }}
            >
              ‹
            </button>
            <button
              onClick={handleToggleKf}
              title={atKeyframe ? 'Remove keyframe at playhead' : 'Add keyframe at playhead'}
              style={{
                width: 18,
                height: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 0,
                background: 'transparent',
                color: atKeyframe ? 'var(--color-accent, #5865ff)' : 'var(--color-text-tertiary)',
                cursor: 'pointer',
                borderRadius: 3,
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10">
                <polygon
                  points="5,1 9,5 5,9 1,5"
                  fill={atKeyframe ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth="1"
                />
              </svg>
            </button>
            <button
              onClick={handleNextKf}
              title="Next keyframe"
              disabled={!isAnimated}
              style={navBtnStyle(isAnimated)}
              onMouseEnter={(e) => {
                if (isAnimated) (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)';
              }}
              onMouseLeave={(e) => {
                if (isAnimated) (e.currentTarget as HTMLElement).style.color = 'var(--color-text-tertiary)';
              }}
            >
              ›
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const miniBtnStyle: React.CSSProperties = {
  width: 10,
  height: 9,
  padding: 0,
  border: 0,
  background: 'transparent',
  color: 'var(--color-text-tertiary)',
  fontSize: 6,
  lineHeight: '9px',
  cursor: 'pointer',
  transition: 'color 120ms',
};

const navBtnStyle = (enabled: boolean): React.CSSProperties => ({
  width: 18,
  height: 20,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 0,
  background: 'transparent',
  color: enabled ? 'var(--color-text-tertiary)' : 'var(--color-text-disabled)',
  cursor: enabled ? 'pointer' : 'not-allowed',
  borderRadius: 3,
  flexShrink: 0,
  fontSize: 10,
});

export default PropRowWithKF;