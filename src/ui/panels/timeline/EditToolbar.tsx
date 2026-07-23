/**
 * EditToolbar — timeline edit tools (split / trim / delete / solo).
 * Icons match CapCut/Premiere conventions.
 */
import React, { useCallback } from 'react';
import { Trash2, Shield, ShieldOff } from 'lucide-react';
import {
  useSplitLayer,
  useTrimToPlayhead,
  useTrimBothToPlayhead,
  useDeleteSelected,
  useRippleDelete,
  useSoloSelected,
} from './useSplitLayer';
import { useSelectionStore } from '../../../state/selectionStore';
import { useCompositionStore } from '../../../state/compositionStore';
import { useHistoryStore } from '../../../state/historyStore';

// ── Custom SVG icons ────────────────────────────────────────────

const SplitIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <line x1="7" y1="1" x2="7" y2="13" stroke="currentColor" strokeWidth="1.4" strokeDasharray="1.5 1.5" />
    <path d="M4 3.5 L4 10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M10 3.5 L10 10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M4 3.5 L2 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M4 10.5 L2 10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M10 3.5 L12 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M10 10.5 L12 10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const TrimLeftIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    {/* Bracket on right (kept portion) */}
    <path d="M9 3 L9 11 M9 3 L12 3 M9 11 L12 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    {/* Cut line at playhead */}
    <line x1="6.5" y1="1" x2="6.5" y2="13" stroke="currentColor" strokeWidth="1.4" strokeDasharray="1.5 1.5" />
    {/* Discarded portion on left — thin dashed lines */}
    <path d="M2 5.5 L5 5.5 M2 8.5 L5 8.5" stroke="currentColor" strokeWidth="1" strokeDasharray="1 1" opacity="0.5" />
  </svg>
);

const TrimRightIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    {/* Bracket on left (kept portion) */}
    <path d="M5 3 L5 11 M5 3 L2 3 M5 11 L2 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    {/* Cut line at playhead */}
    <line x1="7.5" y1="1" x2="7.5" y2="13" stroke="currentColor" strokeWidth="1.4" strokeDasharray="1.5 1.5" />
    {/* Discarded portion on right — thin dashed lines */}
    <path d="M9 5.5 L12 5.5 M9 8.5 L12 8.5" stroke="currentColor" strokeWidth="1" strokeDasharray="1 1" opacity="0.5" />
  </svg>
);

const TrimBothIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    {/* Left bracket */}
    <path d="M4 3 L4 11 M4 3 L2 3 M4 11 L2 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    {/* Right bracket */}
    <path d="M10 3 L10 11 M10 3 L12 3 M10 11 L12 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    {/* Playhead line in middle */}
    <line x1="7" y1="1" x2="7" y2="13" stroke="currentColor" strokeWidth="1.4" strokeDasharray="1.5 1.5" />
  </svg>
);

const UndoIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 5h7a3 3 0 0 1 0 6H6" />
    <polyline points="4,2 2,5 4,8" />
  </svg>
);

const RedoIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5H5a3 3 0 0 0 0 6h3" />
    <polyline points="10,2 12,5 10,8" />
  </svg>
);

// ── Button component ────────────────────────────────────────────

const ToolBtn: React.FC<{
  onClick: () => void;
  title: string;
  disabled?: boolean;
  danger?: boolean;
  active?: boolean;
  children: React.ReactNode;
}> = ({ onClick, title, disabled, danger, active, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    style={{
      width: 28,
      height: 26,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: 0,
      background: active
        ? 'rgba(88,101,255,0.18)'
        : 'transparent',
      color: disabled
        ? 'rgba(150,155,170,0.35)'
        : danger
        ? active ? '#ff6060' : 'rgba(200,205,220,0.7)'
        : active
        ? 'var(--color-accent, #5865ff)'
        : 'rgba(200,205,220,0.85)',
      borderRadius: 5,
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'background 150ms cubic-bezier(0.4,0,0.2,1), color 150ms',
      flexShrink: 0,
    }}
    onMouseEnter={(e) => {
      if (disabled) return;
      if (!active) {
        (e.currentTarget as HTMLElement).style.background = danger
          ? 'rgba(255,80,80,0.15)'
          : 'rgba(255,255,255,0.06)';
        (e.currentTarget as HTMLElement).style.color = danger
          ? '#ff7070'
          : 'var(--color-text-primary, #fff)';
      }
    }}
    onMouseLeave={(e) => {
      if (disabled) return;
      if (!active) {
        (e.currentTarget as HTMLElement).style.background = 'transparent';
        (e.currentTarget as HTMLElement).style.color = danger
          ? 'rgba(200,205,220,0.7)'
          : 'rgba(200,205,220,0.85)';
      }
    }}
  >
    {children}
  </button>
);

const Divider: React.FC = () => (
  <div
    style={{
      width: 1,
      height: 16,
      background: 'rgba(255,255,255,0.08)',
      margin: '0 4px',
      flexShrink: 0,
    }}
  />
);

// ── Main toolbar ────────────────────────────────────────────────

const EditToolbarImpl: React.FC = () => {
  const split = useSplitLayer();
  const trim = useTrimToPlayhead();
  const trimBoth = useTrimBothToPlayhead();
  const delSel = useDeleteSelected();
  const rippleDel = useRippleDelete();
  const soloSel = useSoloSelected();

  // Subscribe to length only — a primitive, doesn't cause spurious re-renders
  const selectedCount = useSelectionStore(s => {
    let count = 0;
    for (const item of s.selected) if (item.type === 'layer') count++;
    return count;
  });
  const hasSelection = selectedCount > 0;

  // Solo state — subscribe to selection, read comp store imperatively.
  // Playback uses silent set which does NOT notify, so this stays cheap.
  const anySelectedSoloed = useSelectionStore(s => {
    const compId = useCompositionStore.getState().activeCompositionId;
    if (!compId) return false;
    const comp = useCompositionStore.getState().compositions.find(c => c.id === compId);
    if (!comp) return false;
    for (const item of s.selected) {
      if (item.type !== 'layer') continue;
      const layer = comp.layers.find(l => l.id === item.id);
      if (layer?.soloed) return true;
    }
    return false;
  });

  const canUndo = useHistoryStore(s => s.past.length > 0);
  const canRedo = useHistoryStore(s => s.future.length > 0);
  const undo = useHistoryStore(s => s.undo);
  const redo = useHistoryStore(s => s.redo);

  const handleSplit = useCallback(() => split(), [split]);
  const handleTrimLeft = useCallback(() => trim('in'), [trim]);
  const handleTrimRight = useCallback(() => trim('out'), [trim]);
  const handleTrimBoth = useCallback(() => trimBoth(0), [trimBoth]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: '4px 8px',
        height: 34,
        background: 'var(--color-panel-raised, #262a33)',
        borderBottom: '1px solid var(--color-border, rgba(255,255,255,0.06))',
        flexShrink: 0,
      }}
    >
      {/* Undo / Redo */}
      <ToolBtn onClick={undo} title="Undo (Ctrl+Z)" disabled={!canUndo}>
        <UndoIcon size={13} />
      </ToolBtn>
      <ToolBtn onClick={redo} title="Redo (Ctrl+Shift+Z)" disabled={!canRedo}>
        <RedoIcon size={13} />
      </ToolBtn>

      <Divider />

      {/* Split */}
      <ToolBtn
        onClick={handleSplit}
        title="Split at Playhead (Ctrl+Shift+D)"
        disabled={!hasSelection}
      >
        <SplitIcon size={13} />
      </ToolBtn>

      {/* Trim left (delete before playhead) */}
      <ToolBtn
        onClick={handleTrimLeft}
        title="Delete Before Playhead (Ctrl+[)"
        disabled={!hasSelection}
      >
        <TrimLeftIcon size={13} />
      </ToolBtn>

      {/* Trim both — collapse to playhead */}
      <ToolBtn
        onClick={handleTrimBoth}
        title="Trim to Playhead (both sides)"
        disabled={!hasSelection}
      >
        <TrimBothIcon size={13} />
      </ToolBtn>

      {/* Trim right (delete after playhead) */}
      <ToolBtn
        onClick={handleTrimRight}
        title="Delete After Playhead (Ctrl+])"
        disabled={!hasSelection}
      >
        <TrimRightIcon size={13} />
      </ToolBtn>

      <Divider />

      {/* Delete selected */}
      <ToolBtn
        onClick={delSel}
        title="Delete Selected (Del)"
        disabled={!hasSelection}
        danger
      >
        <Trash2 size={13} strokeWidth={1.75} />
      </ToolBtn>

      {/* Ripple delete */}
      <ToolBtn
        onClick={rippleDel}
        title="Ripple Delete — close the gap (Shift+Del)"
        disabled={!hasSelection}
        danger
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 4h8" />
          <path d="M4 4v7a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V4" />
          <path d="M6 2h2" />
          <path d="M11.5 8 L13 6.5 M13 8 L11.5 6.5" opacity="0.7" />
        </svg>
      </ToolBtn>

      <Divider />

      {/* Solo / Isolate */}
      <ToolBtn
        onClick={soloSel}
        title={anySelectedSoloed ? 'Un-solo Selected' : 'Solo Selected (hides others)'}
        disabled={!hasSelection}
        active={anySelectedSoloed}
      >
        {anySelectedSoloed ? <ShieldOff size={13} strokeWidth={1.75} /> : <Shield size={13} strokeWidth={1.75} />}
      </ToolBtn>

      <div style={{ flex: 1 }} />

      {/* Selection count indicator */}
      {hasSelection && (
        <span
          style={{
            fontSize: 10,
            color: 'rgba(150,160,180,0.65)',
            fontFamily: 'system-ui, sans-serif',
            paddingRight: 6,
            letterSpacing: '0.03em',
            userSelect: 'none',
          }}
        >
          {selectedCount} selected
        </span>
      )}
    </div>
  );
};

export const EditToolbar = React.memo(EditToolbarImpl);
export default EditToolbar;