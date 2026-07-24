/**
 * MaskTab — the Mask sub-panel shown when the Mask icon is active in
 * the Properties panel rail. Handles mask enable, mask tabs (Mask1,
 * Mask2, ... + button), shape library, and all shape-specific settings.
 */
import React, { useCallback } from 'react';
import { useMaskStore } from '../../../state/maskStore';
import type { VectorMask, MaskShapeType } from '../../../types/mask';
import { MaskShapeLibrary } from './MaskShapeLibrary';
import { MaskPropRow } from './MaskPropRow';
import { SelectInput } from './inputs/SelectInput';
import { CheckboxInput } from './inputs/CheckboxInput';
import { Plus, Link, Unlink, Trash2, Copy, Eraser, Paintbrush, X } from 'lucide-react';

interface Props { layerId: string; }

// ── Section wrapper ──────────────────────────────────────────

const Section: React.FC<{
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ label, children, defaultOpen = true }) => {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div style={{ borderBottom: '1px solid var(--color-border)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          width: '100%', padding: '8px 10px',
          background: 'transparent', border: 0, cursor: 'pointer',
          color: 'var(--color-text-secondary)',
          fontSize: 11, fontWeight: 600,
          letterSpacing: '0.02em',
        }}
      >
        <span style={{
          display: 'inline-block', transition: 'transform 120ms',
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          fontSize: 8, opacity: 0.7,
        }}>▶</span>
        <span>{label}</span>
      </button>
      {open && <div style={{ padding: '2px 0 8px' }}>{children}</div>}
    </div>
  );
};

// ── Mask tab bar (Mask1, Mask2, + button) ────────────────────

const MaskTabBar: React.FC<{
  layerId: string;
  masks: VectorMask[];
  selectedMaskId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}> = ({ masks, selectedMaskId, onSelect, onAdd, onRemove }) => {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '8px 10px 4px', flexWrap: 'wrap',
    }}>
      {masks.map(mask => {
        const active = mask.id === selectedMaskId;
        return (
          <div key={mask.id} style={{ position: 'relative' }}>
            <button
              onClick={() => onSelect(mask.id)}
              title={mask.name}
              style={{
                padding: '3px 20px 3px 10px',
                fontSize: 10, fontWeight: 500,
                background: active ? 'var(--color-accent-muted)' : 'var(--color-input-bg)',
                border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                borderRadius: 12,
                color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                cursor: 'pointer',
                transition: 'all 120ms',
              }}
            >
              {mask.name}
            </button>
            {active && masks.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(mask.id); }}
                title="Remove mask"
                style={{
                  position: 'absolute', right: 4, top: '50%',
                  transform: 'translateY(-50%)',
                  width: 14, height: 14, padding: 0,
                  background: 'transparent', border: 0, cursor: 'pointer',
                  color: 'var(--color-accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={10} />
              </button>
            )}
          </div>
        );
      })}
      <button
        onClick={onAdd}
        title="Add mask"
        style={{
          width: 22, height: 22,
          background: 'var(--color-input-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: '50%', cursor: 'pointer',
          color: 'var(--color-accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Plus size={12} strokeWidth={2} />
      </button>
    </div>
  );
};

// ── Main component ──────────────────────────────────────────

export const MaskTab: React.FC<Props> = ({ layerId }) => {
  const masks = useMaskStore(s => s.getMasksForLayer(layerId));
  const selectedMaskId = useMaskStore(s => s.selectedMaskId);
  const isEnabled = useMaskStore(s => s.isMaskEnabled(layerId));
  const store = useMaskStore.getState();

  // Ensure something is selected when masks exist
  React.useEffect(() => {
    if (masks.length > 0 && !masks.find(m => m.id === selectedMaskId)) {
      store.selectMask(masks[0].id);
    }
    if (masks.length === 0 && selectedMaskId) {
      store.selectMask(null);
    }
  }, [masks, selectedMaskId, store]);

  const active = masks.find(m => m.id === selectedMaskId) ?? null;

  const addMask = useCallback((shape: MaskShapeType = 'rectangle') => {
    store.addMask(layerId, shape);
  }, [layerId, store]);

  const pickShape = useCallback((shape: MaskShapeType) => {
    if (!active) {
      addMask(shape);
      return;
    }
    // Pen shape triggers pen tool for freeform drawing
    if (shape === 'pen') {
      import('../../../state/toolStore').then(({ useToolStore }) => {
        import('../../../state/penToolStore').then(({ usePenToolStore }) => {
          useToolStore.getState().setActiveTool('pen' as any);
          (window as any).__maskTargetLayerId = layerId;
          (window as any).__maskTargetMaskId = active.id;
          usePenToolStore.getState().startDrawing();
        });
      });
      return;
    }
    store.changeShape(layerId, active.id, shape);
  }, [active, addMask, layerId, store]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      {/* Mask master enable + invert */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 12px', borderBottom: '1px solid var(--color-border)',
      }}>
        <CheckboxInput
          value={isEnabled}
          onChange={(v) => store.setMaskEnabled(layerId, v)}
        />
        <span style={{
          fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)',
        }}>
          Mask
        </span>
        <div style={{ flex: 1 }} />
        {active && isEnabled && (
          <button
            onClick={() => store.updateMask(layerId, active.id, { inverted: !active.inverted })}
            title={active.inverted ? 'Uninvert mask' : 'Invert mask'}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '3px 10px', fontSize: 10, fontWeight: 500,
              background: active.inverted ? 'var(--color-accent-muted)' : 'var(--color-input-bg)',
              border: `1px solid ${active.inverted ? 'var(--color-accent)' : 'var(--color-border)'}`,
              borderRadius: 3, cursor: 'pointer',
              color: active.inverted ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              transition: 'all 120ms',
            }}
          >
            {/* Yin-yang-ish invert icon */}
            <svg width={11} height={11} viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="5" fill="currentColor" fillOpacity="0.25"
                stroke="currentColor" strokeWidth="1"/>
              <path d="M6 1 A5 5 0 0 1 6 11 Z" fill="currentColor"/>
            </svg>
            Invert
          </button>
        )}
      </div>

      {isEnabled && (
        <>
          {/* Mask tabs */}
          <MaskTabBar
            layerId={layerId}
            masks={masks}
            selectedMaskId={selectedMaskId}
            onSelect={(id) => store.selectMask(id)}
            onAdd={() => addMask('rectangle')}
            onRemove={(id) => store.removeMask(layerId, id)}
          />

          {/* Shape library */}
          <div style={{ padding: '4px 10px 12px' }}>
            <MaskShapeLibrary
              activeShape={active?.shapeType}
              onPick={pickShape}
            />
          </div>

          {masks.length === 0 && (
            <div style={{
              padding: '20px', textAlign: 'center',
              color: 'var(--color-text-disabled)', fontSize: 11, fontStyle: 'italic',
            }}>
              Pick a shape above to add your first mask.
            </div>
          )}

          {active && (
            <>
              {active.shapeType === 'text' && (
                <TextMaskSection layerId={layerId} mask={active} />
              )}

              <MaskSettingsSection layerId={layerId} mask={active} />

              {active.shapeType === 'brush' && (
                <BrushToolsSection layerId={layerId} mask={active} />
              )}

              <TrackMaskSection layerId={layerId} mask={active} />
            </>
          )}
        </>
      )}
    </div>
  );
};

// ── Text mask editing ────────────────────────────────────────

const TextMaskSection: React.FC<{ layerId: string; mask: VectorMask }> = ({ layerId, mask }) => {
  const store = useMaskStore.getState();
  const p = mask.params;

  const update = useCallback((patch: Partial<typeof p>) => {
    store.updateMaskParams(layerId, mask.id, patch);
  }, [layerId, mask.id, store]);

  return (
    <div style={{ padding: '4px 10px 12px', borderBottom: '1px solid var(--color-border)' }}>
      <textarea
        value={p.textContent ?? ''}
        onChange={(e) => update({ textContent: e.target.value })}
        placeholder="Enter mask text"
        style={{
          width: '100%',
          minHeight: 60,
          padding: 8,
          background: 'var(--color-input-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: 4,
          color: 'var(--color-text-primary)',
          fontSize: 11,
          resize: 'vertical',
          fontFamily: 'inherit',
          outline: 'none',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
        <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', width: 40 }}>Font</span>
        <SelectInput
          value={p.textFont ?? 'system-ui, sans-serif'}
          onChange={(v) => update({ textFont: v })}
          options={[
            { label: 'System', value: 'system-ui, sans-serif' },
            { label: 'Serif',  value: 'serif' },
            { label: 'Monospace', value: 'monospace' },
            { label: 'Arial',  value: 'Arial, sans-serif' },
            { label: 'Georgia', value: 'Georgia, serif' },
            { label: 'Impact', value: 'Impact, sans-serif' },
            { label: 'Courier', value: 'Courier New, monospace' },
          ]}
        />
      </div>
      <MaskPropRow
        label="Font size" value={p.textSize ?? 40}
        min={1} max={500} step={1} defaultValue={40}
        formatValue={(v) => String(Math.round(v))}
        layerId={layerId} maskId={mask.id} field="textSize"
        onChange={(v) => update({ textSize: v })}
      />
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0',
      }}>
        <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', width: 60 }}>Pattern</span>
        <ToggleBtn active={!!p.textBold} onClick={() => update({ textBold: !p.textBold })}>B</ToggleBtn>
        <ToggleBtn active={!!p.textUnderline} onClick={() => update({ textUnderline: !p.textUnderline })} style={{ textDecoration: 'underline' }}>U</ToggleBtn>
        <ToggleBtn active={!!p.textItalic} onClick={() => update({ textItalic: !p.textItalic })} style={{ fontStyle: 'italic' }}>I</ToggleBtn>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <MaskPropRow
            label="Character" value={p.textCharacterSpacing ?? 0}
            min={-50} max={200} step={1} defaultValue={0}
            layerId={layerId} maskId={mask.id} field="textCharacterSpacing"
            onChange={(v) => update({ textCharacterSpacing: v })}
          />
        </div>
        <div style={{ flex: 1 }}>
          <MaskPropRow
            label="Line" value={p.textLineSpacing ?? 0}
            min={-50} max={200} step={1} defaultValue={0}
            layerId={layerId} maskId={mask.id} field="textLineSpacing"
            onChange={(v) => update({ textLineSpacing: v })}
          />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0' }}>
        <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', width: 60 }}>Alignment</span>
        <AlignBtn active={p.textAlign === 'left'} onClick={() => update({ textAlign: 'left' })}>⇤</AlignBtn>
        <AlignBtn active={p.textAlign === 'center'} onClick={() => update({ textAlign: 'center' })}>≡</AlignBtn>
        <AlignBtn active={p.textAlign === 'right'} onClick={() => update({ textAlign: 'right' })}>⇥</AlignBtn>
      </div>
    </div>
  );
};

const ToggleBtn: React.FC<{
  active: boolean; onClick: () => void; children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ active, onClick, children, style }) => (
  <button
    onClick={onClick}
    style={{
      width: 24, height: 22, padding: 0,
      background: active ? 'var(--color-accent-muted)' : 'var(--color-input-bg)',
      border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
      borderRadius: 3, cursor: 'pointer',
      color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
      fontSize: 11, fontWeight: 600,
      ...style,
    }}
  >{children}</button>
);

const AlignBtn: React.FC<{
  active: boolean; onClick: () => void; children: React.ReactNode;
}> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      width: 26, height: 22, padding: 0,
      background: active ? 'var(--color-accent-muted)' : 'transparent',
      border: `1px solid ${active ? 'var(--color-accent)' : 'transparent'}`,
      borderRadius: 3, cursor: 'pointer',
      color: active ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
      fontSize: 13,
    }}
  >{children}</button>
);

// ── Mask Settings ─────────────────────────────────────────────

const MaskSettingsSection: React.FC<{ layerId: string; mask: VectorMask }> = ({ layerId, mask }) => {
  const store = useMaskStore.getState();
  const update = useCallback((patch: Partial<VectorMask>) => {
    store.updateMask(layerId, mask.id, patch);
  }, [layerId, mask.id, store]);

  const toggleLink = useCallback(() => {
    update({ linkSize: !mask.linkSize });
  }, [mask.linkSize, update]);

  const isRect = mask.shapeType === 'rectangle';
  const isStar = mask.shapeType === 'star';
  const isFilm = mask.shapeType === 'filmstrip';
  const isSplit = mask.shapeType === 'split';
  const isBrush = mask.shapeType === 'brush';
  const isText  = mask.shapeType === 'text';
  const isPen   = mask.shapeType === 'pen' || mask.shapeType === 'path';

  return (
    <Section label="Mask settings" defaultOpen={true}>
      {/* Position — X + Y on same row */}
      <div style={{ display: 'flex', gap: 8, padding: '2px 10px' }}>
        <div style={{ flex: 1 }}>
          <MaskPropRow
            label="X" value={mask.positionX}
            min={-2000} max={2000} step={1} defaultValue={0}
            layerId={layerId} maskId={mask.id} field="positionX"
            onChange={(v) => update({ positionX: v })}
          />
        </div>
        <div style={{ flex: 1 }}>
          <MaskPropRow
            label="Y" value={mask.positionY}
            min={-2000} max={2000} step={1} defaultValue={0}
            layerId={layerId} maskId={mask.id} field="positionY"
            onChange={(v) => update({ positionY: v })}
          />
        </div>
      </div>

      {/* Rotation */}
      <MaskPropRow
        label="Rotation" value={mask.rotation}
        min={-360} max={360} step={0.1} defaultValue={0}
        formatValue={(v) => `${v.toFixed(1)}°`}
        layerId={layerId} maskId={mask.id} field="rotation"
        onChange={(v) => update({ rotation: v })}
      />

      {/* Size — W + H with link/unlink (hidden for brush/pen) */}
      {!isBrush && !isPen && (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, padding: '2px 10px' }}>
          <div style={{ flex: 1 }}>
            <MaskPropRow
              label="Width" value={mask.sizeW}
              min={2} max={5000} step={1} defaultValue={400}
              layerId={layerId} maskId={mask.id} field="sizeW"
              onChange={(v) => update({ sizeW: v })}
            />
          </div>
          <button
            onClick={toggleLink}
            title={mask.linkSize ? 'Unlink W and H' : 'Link W and H'}
            style={{
              width: 22, height: 22,
              background: mask.linkSize ? 'var(--color-accent-muted)' : 'var(--color-input-bg)',
              border: `1px solid ${mask.linkSize ? 'var(--color-accent)' : 'var(--color-border)'}`,
              borderRadius: 3, cursor: 'pointer', marginBottom: 20,
              color: mask.linkSize ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {mask.linkSize ? <Link size={11} /> : <Unlink size={11} />}
          </button>
          <div style={{ flex: 1 }}>
            <MaskPropRow
              label="Height" value={mask.sizeH}
              min={2} max={5000} step={1} defaultValue={300}
              layerId={layerId} maskId={mask.id} field="sizeH"
              onChange={(v) => update({ sizeH: v })}
            />
          </div>
        </div>
      )}

      {/* Rectangle-only: round corners */}
      {isRect && (
        <MaskPropRow
          label="Round corners" value={mask.params.roundCorners ?? 0}
          min={0} max={500} step={1} defaultValue={0}
          layerId={layerId} maskId={mask.id} field="roundCorners"
          onChange={(v) => store.updateMaskParams(layerId, mask.id, { roundCorners: v })}
        />
      )}

      {/* Star-only: sides + inner ratio */}
      {isStar && (
        <>
          <MaskPropRow
            label="Points" value={mask.params.sides ?? 5}
            min={3} max={20} step={1} defaultValue={5}
            layerId={layerId} maskId={mask.id} field="sides"
            onChange={(v) => store.updateMaskParams(layerId, mask.id, { sides: v })}
          />
          <MaskPropRow
            label="Inner ratio" value={(mask.params.innerRatio ?? 0.4) * 100}
            min={5} max={95} step={1} defaultValue={40}
            formatValue={(v) => `${Math.round(v)}%`}
            layerId={layerId} maskId={mask.id} field="innerRatio"
            onChange={(v) => store.updateMaskParams(layerId, mask.id, { innerRatio: v / 100 })}
          />
        </>
      )}

      {/* Filmstrip-only: strip count + gap */}
      {isFilm && (
        <>
          <MaskPropRow
            label="Count" value={mask.params.stripCount ?? 8}
            min={2} max={40} step={1} defaultValue={8}
            layerId={layerId} maskId={mask.id} field="stripCount"
            onChange={(v) => store.updateMaskParams(layerId, mask.id, { stripCount: v })}
          />
          <MaskPropRow
            label="Gap" value={(mask.params.stripGap ?? 0.15) * 100}
            min={0} max={80} step={1} defaultValue={15}
            formatValue={(v) => `${Math.round(v)}%`}
            layerId={layerId} maskId={mask.id} field="stripGap"
            onChange={(v) => store.updateMaskParams(layerId, mask.id, { stripGap: v / 100 })}
          />
        </>
      )}

      {/* Split-only: direction + offset */}
      {isSplit && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px' }}>
            <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', width: 60 }}>Direction</span>
            <SelectInput
              value={mask.params.splitDirection ?? 'vertical'}
              onChange={(v) => store.updateMaskParams(layerId, mask.id, { splitDirection: v as any })}
              options={[
                { label: 'Vertical (keep left)', value: 'vertical' },
                { label: 'Horizontal (keep top)', value: 'horizontal' },
              ]}
            />
          </div>
          <MaskPropRow
            label="Offset" value={(mask.params.splitOffset ?? 0) * 100}
            min={-100} max={100} step={1} defaultValue={0}
            formatValue={(v) => `${Math.round(v)}%`}
            layerId={layerId} maskId={mask.id} field="splitOffset"
            onChange={(v) => store.updateMaskParams(layerId, mask.id, { splitOffset: v / 100 })}
          />
        </>
      )}

      {/* Text-only: zoom (font-size already above) */}
      {isText && (
        <MaskPropRow
          label="Zoom" value={mask.params.textZoom ?? 100}
          min={10} max={500} step={1} defaultValue={100}
          formatValue={(v) => `${Math.round(v)}%`}
          layerId={layerId} maskId={mask.id} field="textZoom"
          onChange={(v) => store.updateMaskParams(layerId, mask.id, { textZoom: v })}
        />
      )}

      {/* Feather — universal */}
      <MaskPropRow
        label="Feather" value={mask.feather}
        min={0} max={500} step={1} defaultValue={0}
        layerId={layerId} maskId={mask.id} field="feather"
        onChange={(v) => update({ feather: v })}
      />

      {/* Brush-specific: brush size + expansion */}
      {isBrush && (
        <>
          <MaskPropRow
            label="Brush size" value={mask.params.brushSize ?? 60}
            min={1} max={500} step={1} defaultValue={60}
            layerId={layerId} maskId={mask.id} field="brushSize"
            onChange={(v) => store.updateMaskParams(layerId, mask.id, { brushSize: v })}
          />
          <MaskPropRow
            label="Expansion" value={mask.expansion}
            min={-500} max={500} step={1} defaultValue={0}
            layerId={layerId} maskId={mask.id} field="expansion"
            onChange={(v) => update({ expansion: v })}
          />
        </>
      )}

      {/* Pen-specific: expansion only (no size) */}
      {isPen && (
        <MaskPropRow
          label="Expansion" value={mask.expansion}
          min={-500} max={500} step={1} defaultValue={0}
          layerId={layerId} maskId={mask.id} field="expansion"
          onChange={(v) => update({ expansion: v })}
        />
      )}

      {/* Opacity + inverted + mode (utility row) */}
      <div style={{ display: 'flex', gap: 4, padding: '4px 10px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>Mode</div>
          <SelectInput
            value={mask.mode}
            onChange={(v) => update({ mode: v as any })}
            options={[
              { label: 'Add', value: 'add' },
              { label: 'Subtract', value: 'subtract' },
              { label: 'Intersect', value: 'intersect' },
              { label: 'Difference', value: 'difference' },
            ]}
          />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, padding: '4px 10px', alignItems: 'center' }}>
        <label style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 10, color: 'var(--color-text-secondary)',
        }}>
          <CheckboxInput value={mask.inverted} onChange={(v) => update({ inverted: v })} />
          Invert
        </label>
        <button
          onClick={() => store.duplicateMask(layerId, mask.id)}
          title="Duplicate mask"
          style={{
            padding: '3px 8px', fontSize: 10,
            background: 'var(--color-input-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 3, cursor: 'pointer',
            color: 'var(--color-text-secondary)',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <Copy size={10} /> Duplicate
        </button>
      </div>
    </Section>
  );
};

// ── Brush tools ─────────────────────────────────────────────

const BrushToolsSection: React.FC<{ layerId: string; mask: VectorMask }> = ({ layerId, mask }) => {
  const store = useMaskStore.getState();
  const brushMode = useMaskStore(s => (s as any).brushMode as ('paint'|'erase') | undefined) ?? 'paint';
  const setBrushMode = (mode: 'paint' | 'erase') => {
    useMaskStore.setState({ brushMode: mode } as any);
  };
  return (
    <Section label="Brush tools" defaultOpen={true}>
      <div style={{ display: 'flex', gap: 6, padding: '4px 10px' }}>
        <button
          onClick={() => setBrushMode('paint')}
          title="Paint brush"
          style={brushBtn(brushMode === 'paint')}
        >
          <Paintbrush size={13} /> Paint
        </button>
        <button
          onClick={() => setBrushMode('erase')}
          title="Erase brush"
          style={brushBtn(brushMode === 'erase')}
        >
          <Eraser size={13} /> Erase
        </button>
        <button
          onClick={() => store.clearBrushStrokes(layerId, mask.id)}
          title="Clear all strokes"
          style={{
            padding: '4px 8px', fontSize: 10,
            background: 'var(--color-input-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 3, cursor: 'pointer',
            color: 'var(--color-danger)',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <Trash2 size={11} /> Clear
        </button>
      </div>
      <div style={{
        padding: '4px 10px 0', fontSize: 10, color: 'var(--color-text-tertiary)',
        fontStyle: 'italic',
      }}>
        {mask.params.brushStrokes?.length ?? 0} stroke{(mask.params.brushStrokes?.length ?? 0) === 1 ? '' : 's'}.
        Draw on the viewport to add strokes.
      </div>
    </Section>
  );
};

const brushBtn = (active: boolean): React.CSSProperties => ({
  padding: '4px 10px', fontSize: 10,
  background: active ? 'var(--color-accent-muted)' : 'var(--color-input-bg)',
  border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
  borderRadius: 3, cursor: 'pointer',
  color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
  display: 'flex', alignItems: 'center', gap: 4,
});

// ── Track Mask ─────────────────────────────────────────────

const TrackMaskSection: React.FC<{ layerId: string; mask: VectorMask }> = ({ layerId, mask }) => {
  const store = useMaskStore.getState();
  return (
    <Section label="Track mask" defaultOpen={false}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px' }}>
        <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', width: 60 }}>Direction</span>
        <SelectInput
          value={mask.trackDirection}
          onChange={(v) => store.setTrackDirection(layerId, mask.id, v as any)}
          options={[
            { label: 'Both', value: 'both' },
            { label: 'Horizontal', value: 'horizontal' },
            { label: 'Vertical', value: 'vertical' },
          ]}
        />
      </div>
      <div style={{ padding: '4px 10px 8px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          disabled
          title="Motion tracking — coming soon"
          style={{
            padding: '4px 12px', fontSize: 10, fontWeight: 500,
            background: 'var(--color-input-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 3, cursor: 'not-allowed',
            color: 'var(--color-text-disabled)',
          }}
        >
          Track
        </button>
      </div>
    </Section>
  );
};

export default MaskTab;