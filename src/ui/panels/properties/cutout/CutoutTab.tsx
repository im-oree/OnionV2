/**
 * CutoutTab — background removal panel for video / image / comp layers.
 * Sub-tabs: Auto (AI model + realtime preview), Refine (feather/stroke),
 * Manual (correction brush), Chroma (chroma key).
 */
import React, { useCallback, useState } from 'react';
import { useCompositionStore } from '../../../../state/compositionStore';
import { CheckboxInput } from '../inputs/CheckboxInput';
import { defaultCutoutData, type CutoutData, type CutoutModel } from '../../../../types/layer';
import type { Layer } from '../../../../types/layer';
import { MODEL_REGISTRY, getSegmentationModel } from '../../../../renderer/cutout/segmentationModels';
import { PropRowWithKF } from '../PropRowWithKF';
import { useCutoutBrushStore } from './cutoutBrushStore';

interface Props {
  layer: Layer;
  compId: string;
}

type SubTab = 'auto' | 'refine' | 'manual' | 'chroma';

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'auto',   label: 'Auto' },
  { id: 'refine', label: 'Refine' },
  { id: 'manual', label: 'Manual' },
  { id: 'chroma', label: 'Chroma' },
];

// ── Header ────────────────────────────────────────────────

const CutoutHeader: React.FC<{
  enabled: boolean;
  onToggle: (v: boolean) => void;
  progress: number | undefined;
}> = ({ enabled, onToggle, progress }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 12px',
    borderBottom: '1px solid var(--color-border)',
  }}>
    <CheckboxInput value={enabled} onChange={onToggle} />
    <span style={{
      fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)',
      flex: 1,
    }}>
      Remove Background
    </span>
    {enabled && progress !== undefined && progress < 1 && (
      <span style={{
        fontSize: 9, fontWeight: 600, letterSpacing: '0.05em',
        padding: '2px 6px',
        background: 'rgba(255,193,7,0.15)', color: '#ffc107',
        borderRadius: 3, fontFamily: 'var(--font-family-mono)',
      }}>
        Processing {Math.round(progress * 100)}%
      </span>
    )}
    {enabled && (progress === 1 || progress === undefined) && (
      <span style={{
        fontSize: 9, fontWeight: 600, letterSpacing: '0.05em',
        padding: '2px 6px',
        background: 'rgba(74,222,128,0.15)', color: '#4ade80',
        borderRadius: 3, fontFamily: 'var(--font-family-mono)',
      }}>
        ACTIVE
      </span>
    )}
  </div>
);

// ── Sub-tab bar ───────────────────────────────────────────

const SubTabBar: React.FC<{
  active: SubTab;
  onSelect: (t: SubTab) => void;
}> = ({ active, onSelect }) => (
  <div style={{
    display: 'flex', gap: 2, padding: '6px 10px',
    borderBottom: '1px solid var(--color-border)',
    background: 'var(--color-surface-alt)',
  }}>
    {SUB_TABS.map(tab => (
      <button
        key={tab.id}
        onClick={() => onSelect(tab.id)}
        style={{
          flex: 1, padding: '5px 8px', fontSize: 10,
          fontWeight: active === tab.id ? 600 : 500,
          background: active === tab.id ? 'var(--color-accent-muted)' : 'transparent',
          color: active === tab.id ? 'var(--color-accent)' : 'var(--color-text-secondary)',
          border: 0, borderRadius: 3, cursor: 'pointer',
          transition: 'all 120ms ease',
        }}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

// ── Coming soon placeholder ───────────────────────────────

const ComingSoon: React.FC<{ label: string }> = ({ label }) => (
  <div style={{
    padding: 24, textAlign: 'center', fontSize: 11,
    color: 'var(--color-text-disabled)', fontStyle: 'italic',
  }}>
    {label}
  </div>
);

// ── Model selector ────────────────────────────────────────

const ModelSelector: React.FC<{
  value: CutoutModel;
  onChange: (m: CutoutModel) => void;
}> = ({ value, onChange }) => {
  const [error, setError] = React.useState<string | null>(null);

  const handleSelect = async (id: CutoutModel) => {
    if (id === 'none') { onChange(id); return; }
    setError(null);
    // Pre-warm the model so the user gets feedback right away if it fails
    try {
      await getSegmentationModel(id as any);
      onChange(id);
    } catch (err: any) {
      const isUser = err?.userFriendly;
      setError(isUser ? err.message : `Failed to load ${MODEL_REGISTRY[id as Exclude<CutoutModel,'none'>]?.displayName}`);
      // Even on failure, save the user's preference — they may fix it later
      onChange(id);
    }
  };

  return (
    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{
        fontSize: 10, fontWeight: 600,
        color: 'var(--color-text-tertiary)',
        letterSpacing: '0.06em', textTransform: 'uppercase',
      }}>
        AI Model
      </div>
      {(Object.keys(MODEL_REGISTRY) as CutoutModel[]).map(id => {
        if (id === 'none') return null;
        const meta = MODEL_REGISTRY[id as Exclude<CutoutModel, 'none'>];
        if (!meta) return null;
        const isActive = value === id;
        return (
          <button
            key={id}
            onClick={() => handleSelect(id)}
            style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'flex-start', gap: 2,
              padding: '8px 10px',
              background: isActive ? 'var(--color-accent-muted)' : 'var(--color-input-bg)',
              border: `1px solid ${isActive ? 'var(--color-accent)' : 'var(--color-border)'}`,
              borderRadius: 4, cursor: 'pointer',
              transition: 'all 120ms ease',
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            }}>
              <span style={{
                fontSize: 11, fontWeight: 600,
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-primary)',
                flex: 1, textAlign: 'left',
              }}>{meta.displayName}</span>
              <span style={{
                fontSize: 9, fontFamily: 'var(--font-family-mono)',
                color: 'var(--color-text-tertiary)',
              }}>{meta.sizeMB} MB</span>
              {meta.realtime && (
                <span style={{
                  fontSize: 8, fontWeight: 700, letterSpacing: '0.05em',
                  padding: '1px 4px',
                  background: 'rgba(74,222,128,0.15)', color: '#4ade80',
                  borderRadius: 2,
                }}>RT</span>
              )}
            </div>
            <div style={{
              fontSize: 9, color: 'var(--color-text-tertiary)',
              textAlign: 'left', lineHeight: 1.3,
            }}>
              {meta.description}
            </div>
          </button>
        );
      })}

      {error && (
        <div style={{
          padding: '8px 10px', marginTop: 4,
          background: 'rgba(255,152,0,0.1)',
          border: '1px solid rgba(255,152,0,0.3)',
          borderRadius: 3, fontSize: 10,
          color: '#ff9800', lineHeight: 1.5,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Model unavailable</div>
          <div>{error}</div>
        </div>
      )}
    </div>
  );
};

// ── Auto sub-panel (with working bake) ─────────────────────

const AutoSubPanel: React.FC<{
  layer: Layer;
  cutout: CutoutData;
  onChange: (patch: Partial<CutoutData>) => void;
  compId: string;
}> = ({ layer, cutout, onChange, compId }) => {
  const [bakeError, setBakeError] = React.useState<string | null>(null);
  const [isBakingNow, setIsBakingNow] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    import('../../../../renderer/cutout/CutoutBakeCoordinator').then(({ subscribeToBakeProgress, isBaking }) => {
      if (!mounted) return;
      setIsBakingNow(isBaking(layer.id));
      const unsub = subscribeToBakeProgress(p => {
        if (p.layerId !== layer.id) return;
        setIsBakingNow(p.fraction < 1);
      });
      return () => unsub();
    });
    return () => { mounted = false; };
  }, [layer.id]);

  const isEligible = ['video', 'image', 'comp'].includes(layer.type);
  if (!isEligible) {
    return (
      <ComingSoon label={`Background removal not available for ${layer.type} layers.`} />
    );
  }
  if (layer.type === 'comp') {
    return (
      <ComingSoon label="Comp-layer cutout baking coming soon — for now use it on the individual video/image layers inside the comp." />
    );
  }

  const startBake = async () => {
    setBakeError(null);
    setIsBakingNow(true);
    try {
      const { bakeCutout } = await import('../../../../renderer/cutout/CutoutBakeCoordinator');
      const { CutoutCompositor } = await import('../../../../renderer/cutout/CutoutCompositor');
      void CutoutCompositor;
      const ok = await bakeCutout(layer.id, compId, cutout);
      if (ok) {
        const renderer: any = (window as any).__renderer;
        renderer?.cutoutCompositor?.invalidateBakedForLayer?.(layer.id);
        renderer?.renderLoop?.requestRender?.();
      } else {
        setBakeError('Bake was cancelled or failed.');
      }
    } catch (err: any) {
      setBakeError(err?.message ?? 'Unknown error');
    } finally {
      setIsBakingNow(false);
    }
  };

  const cancelBake = async () => {
    const { cancelBake: cancel } = await import('../../../../renderer/cutout/CutoutBakeCoordinator');
    cancel(layer.id);
  };

  return (
    <>
      <ModelSelector
        value={cutout.model}
        onChange={(m) => onChange({ model: m })}
      />

      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid var(--color-border)',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        <div style={{
          fontSize: 10, fontWeight: 600,
          color: 'var(--color-text-tertiary)',
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          Bake status
        </div>
        {cutout.bakeComplete ? (
          <div style={{
            padding: '8px 10px',
            background: 'rgba(74,222,128,0.1)',
            border: '1px solid rgba(74,222,128,0.3)',
            borderRadius: 3, fontSize: 10,
            color: 'var(--color-text-primary)',
          }}>
            ✓ Baked ({cutout.bakedFrameCount ?? 0} frames)
          </div>
        ) : cutout.bakedFrameCount != null && cutout.totalFrameCount != null && isBakingNow ? (
          <div style={{
            padding: '8px 10px',
            background: 'rgba(255,193,7,0.1)',
            border: '1px solid rgba(255,193,7,0.3)',
            borderRadius: 3, fontSize: 10,
            color: 'var(--color-text-primary)',
          }}>
            Baking: {cutout.bakedFrameCount} / {cutout.totalFrameCount} frames
            <div style={{
              marginTop: 4, height: 3,
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 2, overflow: 'hidden',
            }}>
              <div style={{
                width: `${Math.round((cutout.bakedFrameCount / cutout.totalFrameCount) * 100)}%`,
                height: '100%', background: '#ffc107',
                transition: 'width 200ms ease',
              }} />
            </div>
          </div>
        ) : (
          <div style={{
            padding: '8px 10px',
            background: 'var(--color-input-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 3, fontSize: 10,
            color: 'var(--color-text-tertiary)',
          }}>
            Not baked. Realtime preview only.
          </div>
        )}

        {isBakingNow ? (
          <button
            onClick={cancelBake}
            style={{
              padding: '6px 12px', fontSize: 11, fontWeight: 500,
              background: 'rgba(239,91,91,0.15)',
              border: '1px solid rgba(239,91,91,0.4)',
              borderRadius: 4, cursor: 'pointer',
              color: '#ef5b5b',
            }}
          >
            Cancel bake
          </button>
        ) : (
          <button
            onClick={startBake}
            style={{
              padding: '6px 12px', fontSize: 11, fontWeight: 500,
              background: 'var(--color-accent-muted)',
              border: '1px solid var(--color-accent)',
              borderRadius: 4, cursor: 'pointer',
              color: 'var(--color-accent)',
            }}
          >
            {cutout.bakeComplete ? 'Re-bake' : 'Process'}
          </button>
        )}

        {bakeError && (
          <div style={{
            padding: '6px 8px', fontSize: 10,
            background: 'rgba(239,91,91,0.1)',
            border: '1px solid rgba(239,91,91,0.35)',
            borderRadius: 3, color: '#ef5b5b',
          }}>
            {bakeError}
          </div>
        )}
      </div>
    </>
  );
};

// ── Main tab ──────────────────────────────────────────────

export const CutoutTab: React.FC<Props> = ({ layer, compId }) => {
  const [subTab, setSubTab] = useState<SubTab>('auto');

  // Turn off the manual brush whenever we leave the Manual sub-tab
  React.useEffect(() => {
    if (subTab !== 'manual') {
      useCutoutBrushStore.getState().setActive(false);
    }
  }, [subTab]);
  const data: any = layer.data ?? {};
  const cutout: CutoutData = data.cutout ?? defaultCutoutData();

  const updateCutout = useCallback((patch: Partial<CutoutData>) => {
    const newCutout = { ...cutout, ...patch };
    const newData = { ...data, cutout: newCutout };
    useCompositionStore.getState().updateLayer(compId, layer.id, { data: newData });
  }, [cutout, data, compId, layer.id]);

  // Auto-bake trigger: if user just enabled cutout AND there's no baked
  // data AND it's a video/image layer, kick off the bake automatically.
  const enabledRef = React.useRef(cutout.enabled);
  React.useEffect(() => {
    if (!cutout.enabled) { enabledRef.current = false; return; }
    if (enabledRef.current) return;  // already tracking
    enabledRef.current = true;
    if (cutout.bakeComplete) return;   // already baked
    if (cutout.bakedFrameCount != null && cutout.bakedFrameCount > 0) return;
    if (layer.type !== 'video' && layer.type !== 'image') return;

    const doAutoBake = async () => {
      const { bakeCutout } = await import('../../../../renderer/cutout/CutoutBakeCoordinator');
      const ok = await bakeCutout(layer.id, compId, cutout);
      if (ok) {
        const renderer: any = (window as any).__renderer;
        renderer?.cutoutCompositor?.invalidateBakedForLayer?.(layer.id);
        renderer?.renderLoop?.requestRender?.();
      }
    };

    const totalFrames = layer.type === 'image'
      ? 1
      : Math.max(1, Math.floor(layer.endFrame - layer.startFrame));

    if (totalFrames > 300) {
      // Confirm before baking large videos
      import('../../../common/ConfirmDialog').then(({ confirm }) => {
        confirm(
          `Bake background removal for ${totalFrames} frames? This may take a few minutes.`,
          'Auto-bake cutout',
          { confirmLabel: 'Bake' },
        ).then(yes => {
          if (yes) doAutoBake();
        });
      });
    } else {
      doAutoBake();
    }
  }, [cutout.enabled, cutout.bakeComplete, cutout.bakedFrameCount, layer.id, layer.type, layer.endFrame, layer.startFrame, compId, cutout]);

  const progress = cutout.totalFrameCount
    ? (cutout.bakedFrameCount ?? 0) / cutout.totalFrameCount
    : undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <CutoutHeader
        enabled={cutout.enabled}
        onToggle={v => updateCutout({ enabled: v })}
        progress={progress}
      />

      {cutout.enabled && (
        <>
          <SubTabBar active={subTab} onSelect={setSubTab} />
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {subTab === 'auto' && (
              <AutoSubPanel layer={layer} cutout={cutout} onChange={updateCutout} compId={compId} />
            )}
            {subTab === 'refine' && (
              <RefineSubPanel
                layer={layer} cutout={cutout} onChange={updateCutout} compId={compId}
              />
            )}
            {subTab === 'manual' && (
              <ManualSubPanel
                layer={layer} cutout={cutout} onChange={updateCutout}
                onSubTabLeave={() => useCutoutBrushStore.getState().setActive(false)}
              />
            )}
            {subTab === 'chroma' && (
              <ChromaSubPanel
                layer={layer} cutout={cutout} onChange={updateCutout}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ── Refine sub-panel: matte refinement + stroke controls ──────

const RefineSubPanel: React.FC<{
  layer: Layer;
  cutout: CutoutData;
  onChange: (patch: Partial<CutoutData>) => void;
  compId: string;
}> = ({ layer, cutout, onChange, compId }) => {
  void compId;
  const stroke = cutout.stroke ?? defaultCutoutData().stroke;

  const updateStroke = (patch: Partial<typeof stroke>) => {
    onChange({ stroke: { ...stroke, ...patch } });
  };

  return (
    <>
      {/* ── Matte refinement ── */}
      <SectionHeader label="Matte" />

      <PropRowWithKF
        label="Threshold"
        value={cutout.threshold ?? 50}
        min={0} max={100} step={1}
        defaultValue={50}
        formatValue={v => `${Math.round(v)}`}
        layerId={layer.id}
        propertyPath="cutout.threshold"
        onChange={v => onChange({ threshold: v })}
      />
      <PropRowWithKF
        label="Feather"
        value={cutout.feather ?? 2}
        min={0} max={100} step={0.5}
        defaultValue={2}
        formatValue={v => `${v.toFixed(1)} px`}
        layerId={layer.id}
        propertyPath="cutout.feather"
        onChange={v => onChange({ feather: v })}
      />
      <PropRowWithKF
        label="Smoothing"
        value={cutout.smoothing ?? 30}
        min={0} max={100} step={1}
        defaultValue={30}
        formatValue={v => `${Math.round(v)}`}
        layerId={layer.id}
        propertyPath="cutout.smoothing"
        onChange={v => onChange({ smoothing: v })}
      />
      <PropRowWithKF
        label="Contract/Expand"
        value={cutout.contract ?? 0}
        min={-50} max={50} step={0.5}
        defaultValue={0}
        formatValue={v => v > 0 ? `+${v.toFixed(1)} px` : `${v.toFixed(1)} px`}
        layerId={layer.id}
        propertyPath="cutout.contract"
        onChange={v => onChange({ contract: v })}
      />

      {/* ── Stroke ── */}
      <SectionHeader label="Stroke" />

      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 12px',
      }}>
        <CheckboxInput
          value={stroke.enabled}
          onChange={v => updateStroke({ enabled: v })}
        />
        <span style={{
          fontSize: 11, color: 'var(--color-text-primary)',
          fontWeight: 500,
        }}>
          Enable stroke
        </span>
      </div>

      {stroke.enabled && (
        <>
          <ColorRow
            label="Color"
            value={stroke.color}
            onChange={c => updateStroke({ color: c })}
          />
          <PropRowWithKF
            label="Width"
            value={stroke.width}
            min={0} max={50} step={0.5}
            defaultValue={4}
            formatValue={v => `${v.toFixed(1)} px`}
            layerId={layer.id}
            propertyPath="cutout.stroke.width"
            onChange={v => updateStroke({ width: v })}
          />
          <PropRowWithKF
            label="Softness"
            value={stroke.softness}
            min={0} max={100} step={1}
            defaultValue={40}
            formatValue={v => `${Math.round(v)}%`}
            layerId={layer.id}
            propertyPath="cutout.stroke.softness"
            onChange={v => updateStroke({ softness: v })}
          />

          {/* Position toggle */}
          <PropRow label="Position">
            <SegmentedControl
              options={[
                { id: 'inside',  label: 'Inside' },
                { id: 'center',  label: 'Center' },
                { id: 'outside', label: 'Outside' },
              ]}
              value={stroke.position}
              onChange={id => updateStroke({ position: id as any })}
            />
          </PropRow>

          {/* Style toggle */}
          <PropRow label="Style">
            <SegmentedControl
              options={[
                { id: 'solid', label: 'Solid' },
                { id: 'glow',  label: 'Glow' },
              ]}
              value={stroke.style}
              onChange={id => updateStroke({ style: id as any })}
            />
          </PropRow>
        </>
      )}
    </>
  );
};

// ── Small helpers used by the Refine sub-panel ────────────────

const PropRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '4px 12px',
  }}>
    <span style={{
      fontSize: 10, color: 'var(--color-text-secondary)',
      minWidth: 80,
    }}>{label}</span>
    <div style={{ flex: 1 }}>{children}</div>
  </div>
);

const SegmentedControl: React.FC<{
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}> = ({ options, value, onChange }) => (
  <div style={{
    display: 'flex', gap: 2,
    background: 'var(--color-input-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: 4, padding: 2,
  }}>
    {options.map(opt => (
      <button
        key={opt.id}
        onClick={() => onChange(opt.id)}
        style={{
          flex: 1, padding: '3px 8px', fontSize: 10, fontWeight: 500,
          background: opt.id === value ? 'var(--color-accent-muted)' : 'transparent',
          color: opt.id === value ? 'var(--color-accent)' : 'var(--color-text-secondary)',
          border: `1px solid ${opt.id === value ? 'var(--color-accent)' : 'transparent'}`,
          borderRadius: 3, cursor: 'pointer',
          transition: 'all 120ms',
        }}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

const ColorRow: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
}> = ({ label, value, onChange }) => {
  const [showPicker, setShowPicker] = React.useState(false);
  return (
    <>
      <PropRow label={label}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            onClick={() => setShowPicker(p => !p)}
            style={{
              width: 32, height: 22,
              background: value,
              border: '1px solid var(--color-border)',
              borderRadius: 3, cursor: 'pointer',
            }}
            title="Pick color"
          />
          <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            style={{
              flex: 1, height: 22, padding: '0 6px',
              background: 'var(--color-input-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 3, color: 'var(--color-text-primary)',
              fontSize: 10, fontFamily: 'var(--font-family-mono)',
              outline: 'none',
            }}
          />
        </div>
      </PropRow>
      {showPicker && (
        <div style={{ padding: '4px 12px 8px' }}>
          <input
            type="color"
            value={value}
            onChange={e => onChange(e.target.value)}
            style={{
              width: '100%', height: 32,
              border: '1px solid var(--color-border)',
              borderRadius: 3, cursor: 'pointer',
              background: 'transparent',
            }}
          />
        </div>
      )}
    </>
  );
};

const SectionHeader: React.FC<{ label: string }> = ({ label }) => (
  <div style={{
    padding: '10px 12px 4px', fontSize: 10, fontWeight: 600,
    color: 'var(--color-text-tertiary)',
    letterSpacing: '0.06em', textTransform: 'uppercase',
  }}>
    {label}
  </div>
);

// ── Manual sub-panel: correction brush ────────────────────────

// ── Chroma sub-panel ──────────────────────────────────────────

const ChromaSubPanel: React.FC<{
  layer: Layer;
  cutout: CutoutData;
  onChange: (patch: Partial<CutoutData>) => void;
}> = ({ layer, cutout, onChange }) => {
  const chroma = cutout.chroma ?? defaultCutoutData().chroma;
  const [pickingColor, setPickingColor] = React.useState(false);

  const updateChroma = (patch: Partial<typeof chroma>) => {
    onChange({ chroma: { ...chroma, ...patch } });
  };

  const isEligible = ['video', 'image', 'comp'].includes(layer.type);
  if (!isEligible) {
    return (
      <ComingSoon label={`Chroma key not available for ${layer.type} layers.`} />
    );
  }

  const startEyedropper = () => {
    setPickingColor(true);
    document.body.style.cursor = 'crosshair';

    const onClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      cleanup();

      const canvas = document.querySelector('canvas');
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const inCanvas =
        e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (!inCanvas) return;

      // Sample the WebGL canvas pixel at the click position
      const x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width));
      const y = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height));

      // Use a scratch 2D canvas to read pixel color from the WebGL canvas
      const scratch = document.createElement('canvas');
      scratch.width = 1;
      scratch.height = 1;
      const ctx = scratch.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(canvas, x, y, 1, 1, 0, 0, 1, 1);
      const px = ctx.getImageData(0, 0, 1, 1).data;
      const hex = '#'
        + px[0].toString(16).padStart(2, '0')
        + px[1].toString(16).padStart(2, '0')
        + px[2].toString(16).padStart(2, '0');
      updateChroma({ keyColor: hex });
    };

    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); cleanup(); }
    };

    const cleanup = () => {
      setPickingColor(false);
      document.body.style.cursor = '';
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onEsc, true);
    };

    // Delay attachment by one tick so the current click doesn't fire it
    setTimeout(() => {
      document.addEventListener('click', onClick, true);
      document.addEventListener('keydown', onEsc, true);
    }, 0);
  };

  return (
    <>
      {/* Master enable */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 12px',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <CheckboxInput
          value={chroma.enabled}
          onChange={v => updateChroma({ enabled: v })}
        />
        <span style={{
          flex: 1, fontSize: 11,
          color: 'var(--color-text-primary)', fontWeight: 500,
        }}>
          Enable chroma key
        </span>
        {chroma.enabled && (
          <span style={{
            fontSize: 9, fontWeight: 600, letterSpacing: '0.05em',
            padding: '2px 6px',
            background: 'rgba(74,222,128,0.15)', color: '#4ade80',
            borderRadius: 3, fontFamily: 'var(--font-family-mono)',
          }}>ACTIVE</span>
        )}
      </div>

      {chroma.enabled && (
        <>
          {/* Key color picker */}
          <SectionHeader label="Key color" />

          <PropRow label="Color">
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flex: 1 }}>
              <div
                style={{
                  width: 32, height: 22,
                  background: chroma.keyColor,
                  border: '1px solid var(--color-border)',
                  borderRadius: 3,
                }}
              />
              <input
                type="color"
                value={chroma.keyColor}
                onChange={e => updateChroma({ keyColor: e.target.value })}
                style={{
                  width: 32, height: 22, padding: 0,
                  border: '1px solid var(--color-border)',
                  borderRadius: 3, cursor: 'pointer',
                  background: 'transparent',
                }}
                title="Pick color from palette"
              />
              <input
                type="text"
                value={chroma.keyColor}
                onChange={e => updateChroma({ keyColor: e.target.value })}
                style={{
                  flex: 1, height: 22, padding: '0 6px',
                  background: 'var(--color-input-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 3, color: 'var(--color-text-primary)',
                  fontSize: 10, fontFamily: 'var(--font-family-mono)',
                  outline: 'none',
                }}
              />
              <button
                onClick={startEyedropper}
                title="Pick color from viewport"
                style={{
                  width: 26, height: 22, padding: 0,
                  background: pickingColor ? 'var(--color-accent-muted)' : 'var(--color-input-bg)',
                  border: `1px solid ${pickingColor ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  borderRadius: 3, cursor: 'pointer',
                  color: pickingColor ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 22l3-3 8-8-3-3-8 8-3 3z" />
                  <path d="M15 7l4-4 3 3-4 4" />
                </svg>
              </button>
            </div>
          </PropRow>

          <div style={{
            padding: '4px 12px 8px', fontSize: 10,
            color: 'var(--color-text-tertiary)', lineHeight: 1.4,
          }}>
            Use the eyedropper to pick the exact green/blue screen color from your video.
          </div>

          {/* Tuning knobs — all keyframable */}
          <SectionHeader label="Key tuning" />

          <PropRowWithKF
            label="Similarity"
            value={chroma.similarity}
            min={0} max={100} step={1}
            defaultValue={40}
            formatValue={v => `${Math.round(v)}%`}
            layerId={layer.id}
            propertyPath="cutout.chroma.similarity"
            onChange={v => updateChroma({ similarity: v })}
          />
          <PropRowWithKF
            label="Smoothness"
            value={chroma.smoothness}
            min={0} max={100} step={1}
            defaultValue={20}
            formatValue={v => `${Math.round(v)}%`}
            layerId={layer.id}
            propertyPath="cutout.chroma.smoothness"
            onChange={v => updateChroma({ smoothness: v })}
          />
          <PropRowWithKF
            label="Spill Suppress"
            value={chroma.spillSuppress}
            min={0} max={100} step={1}
            defaultValue={30}
            formatValue={v => `${Math.round(v)}%`}
            layerId={layer.id}
            propertyPath="cutout.chroma.spillSuppress"
            onChange={v => updateChroma({ spillSuppress: v })}
          />

          <div style={{
            padding: '6px 12px 12px', fontSize: 10,
            color: 'var(--color-text-tertiary)', lineHeight: 1.5,
          }}>
            <b>Similarity</b>: how close to the key color counts as background.<br />
            <b>Smoothness</b>: how soft the edge between kept and removed.<br />
            <b>Spill Suppress</b>: removes green tint from subject edges.
          </div>

          {/* Info card about layering with AI removal */}
          <div style={{
            margin: '4px 12px 12px', padding: '8px 10px',
            background: 'rgba(88,101,255,0.08)',
            border: '1px solid rgba(88,101,255,0.25)',
            borderRadius: 4, fontSize: 10, lineHeight: 1.4,
            color: 'var(--color-text-secondary)',
          }}>
            Chroma key can be used on its own OR stacked with the Auto AI removal.
            When both are active, chroma applies first, then the AI mask refines what remains.
          </div>
        </>
      )}
    </>
  );
};

const ManualSubPanel: React.FC<{
  layer: Layer;
  cutout: CutoutData;
  onChange: (patch: Partial<CutoutData>) => void;
  onSubTabLeave: () => void;
}> = ({ layer, cutout, onChange, onSubTabLeave }) => {
  void onSubTabLeave;
  const brush = useCutoutBrushStore();

  // Auto-enable brush when this sub-panel mounts
  React.useEffect(() => {
    brush.setActive(true);
    return () => brush.setActive(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isEligible = ['video', 'image'].includes(layer.type);
  if (!isEligible) {
    return (
      <ComingSoon label={`Manual brush not available for ${layer.type} layers.`} />
    );
  }

  const strokeCount = (cutout.manualStrokes ?? []).length;

  const clearStrokes = () => {
    onChange({ manualStrokes: [], manualMode: 'ai' });
    const renderer: any = (window as any).__renderer;
    renderer?.renderLoop?.requestRender?.();
  };

  const undoLast = () => {
    const strokes = cutout.manualStrokes ?? [];
    if (strokes.length === 0) return;
    onChange({ manualStrokes: strokes.slice(0, -1) });
    const renderer: any = (window as any).__renderer;
    renderer?.renderLoop?.requestRender?.();
  };

  return (
    <>
      {/* Mode selector — full 3 buttons matching Capcut */}
      <SectionHeader label="Mask mode" />

      <PropRow label="Mode">
        <SegmentedControl
          options={[
            { id: 'ai',      label: 'AI only' },
            { id: 'correct', label: 'AI + Fix' },
            { id: 'replace', label: 'Manual' },
          ]}
          value={cutout.manualMode ?? 'ai'}
          onChange={id => onChange({ manualMode: id as any })}
        />
      </PropRow>

      <div style={{
        padding: '4px 12px 8px',
        fontSize: 10, color: 'var(--color-text-tertiary)',
        lineHeight: 1.5,
      }}>
        {(cutout.manualMode ?? 'ai') === 'ai' &&
          'Using AI-generated mask only. Paint below to switch to correction mode.'}
        {cutout.manualMode === 'correct' &&
          'Paints add to (keep) or subtract from (erase) the AI mask.'}
        {cutout.manualMode === 'replace' &&
          'Manual paint only. AI mask is ignored — start painting to build up your mask.'}
      </div>

      {/* Brush tool + size */}
      <SectionHeader label="Brush" />

      <PropRow label="Tool">
        <SegmentedControl
          options={[
            { id: 'keep',  label: '+ Keep' },
            { id: 'erase', label: '\u2212 Erase' },
          ]}
          value={brush.tool === 'none' ? 'keep' : brush.tool}
          onChange={id => brush.setTool(id as any)}
        />
      </PropRow>

      <PropRow label="Size">
        <input
          type="range"
          min={4} max={300} step={1}
          value={brush.size}
          onChange={e => brush.setSize(Number(e.target.value))}
          style={{ flex: 1, accentColor: 'var(--color-accent)' }}
        />
        <span style={{
          fontSize: 10, fontFamily: 'var(--font-family-mono)',
          color: 'var(--color-text-primary)',
          minWidth: 40, textAlign: 'right',
        }}>
          {brush.size}px
        </span>
      </PropRow>

      {/* Stroke count + actions */}
      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{
          flex: 1, fontSize: 10,
          color: 'var(--color-text-secondary)',
        }}>
          {strokeCount} stroke{strokeCount === 1 ? '' : 's'}
        </span>
        <button
          onClick={undoLast}
          disabled={strokeCount === 0}
          style={{
            padding: '4px 10px', fontSize: 10,
            background: 'var(--color-input-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 3, cursor: strokeCount === 0 ? 'not-allowed' : 'pointer',
            color: 'var(--color-text-secondary)',
            opacity: strokeCount === 0 ? 0.4 : 1,
          }}
        >
          Undo last
        </button>
        <button
          onClick={clearStrokes}
          disabled={strokeCount === 0}
          style={{
            padding: '4px 10px', fontSize: 10,
            background: strokeCount === 0 ? 'var(--color-input-bg)' : 'rgba(239,91,91,0.15)',
            border: `1px solid ${strokeCount === 0 ? 'var(--color-border)' : 'rgba(239,91,91,0.4)'}`,
            borderRadius: 3, cursor: strokeCount === 0 ? 'not-allowed' : 'pointer',
            color: strokeCount === 0 ? 'var(--color-text-secondary)' : '#ef5b5b',
            opacity: strokeCount === 0 ? 0.4 : 1,
          }}
        >
          Clear all
        </button>
      </div>

      <div style={{
        padding: '4px 12px 12px', fontSize: 10,
        color: 'var(--color-text-tertiary)',
        fontStyle: 'italic',
      }}>
        Paint on the viewport to add strokes. + brush adds subject, \u2212 brush removes.
      </div>
    </>
  );
};

export default CutoutTab;