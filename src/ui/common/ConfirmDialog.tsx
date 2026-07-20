/**
 * ConfirmDialog — A reusable, promise-based confirmation dialog for destructive actions.
 *
 * Usage (imperative):
 *   import { confirm } from '../common/ConfirmDialog';
 *   const yes = await confirm('Delete 3 layers?', 'Delete Layers');
 *   if (yes) doDelete();
 *
 * Usage (component):
 *   <ConfirmDialog open message="Delete?" onConfirm={...} onCancel={...} />
 */
import React, { useEffect, useRef, useCallback } from 'react';

/* ── Imperative API ── */

interface PendingConfirm {
  id: number;
  message: string;
  title: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive: boolean;
  resolve: (value: boolean) => void;
}

let _nextId = 0;
let _pending: PendingConfirm[] = [];
let _confirming = false;
const _listeners: Array<() => void> = [];

function _notify() {
  for (const l of _listeners) l();
}

/**
 * Show a confirmation dialog. Returns a Promise<boolean>.
 * Enter confirms, Escape cancels, clicking backdrop cancels.
 *
 * @param message  The question to show
 * @param title    Optional title (default "Confirm")
 * @param options  Optional: { confirmLabel, cancelLabel, destructive }
 */
export function confirm(
  message: string,
  title = 'Confirm',
  options?: { confirmLabel?: string; cancelLabel?: string; destructive?: boolean },
): Promise<boolean> {
  // Prevent stacking: if a confirm is already open, resolve the old one as false and replace
  if (_confirming && _pending.length > 0) {
    const old = _pending.pop();
    old?.resolve(false);
  }
  _confirming = true;

  return new Promise<boolean>((resolve) => {
    const entry: PendingConfirm = {
      id: _nextId++,
      message,
      title,
      confirmLabel: options?.confirmLabel ?? 'Delete',
      cancelLabel: options?.cancelLabel ?? 'Cancel',
      destructive: options?.destructive ?? true,
      resolve,
    };
    _pending.push(entry);
    _notify();
  });
}

/** Dismiss a pending confirm (by id) */
function dismiss(id: number, value: boolean) {
  const idx = _pending.findIndex((p) => p.id === id);
  if (idx >= 0) {
    _pending[idx].resolve(value);
    _pending = _pending.filter((p) => p.id !== id);
    _confirming = _pending.length > 0;
    _notify();
  }
}

/* ── React Container (render once in App root) ── */

export const ConfirmDialogContainer: React.FC = () => {
  const [, setTick] = React.useState(0);

  useEffect(() => {
    const handler = () => setTick((t) => t + 1);
    _listeners.push(handler);
    return () => {
      const idx = _listeners.indexOf(handler);
      if (idx >= 0) _listeners.splice(idx, 1);
    };
  }, []);

  if (_pending.length === 0) return null;

  // Only render the most recent dialog
  const current = _pending[_pending.length - 1];
  return <SingleConfirmDialog key={current.id} entry={current} />;
};

/* ── Single Dialog Instance ── */

const SingleConfirmDialog: React.FC<{ entry: PendingConfirm }> = ({ entry }) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  const handleConfirm = useCallback(() => dismiss(entry.id, true), [entry.id]);
  const handleCancel = useCallback(() => dismiss(entry.id, false), [entry.id]);

  // Focus the confirm button on mount, and set up keyboard handling
  useEffect(() => {
    // Small delay so the button is in the DOM
    const t = setTimeout(() => confirmRef.current?.focus(), 50);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'NumpadEnter') {
        e.preventDefault();
        e.stopPropagation();
        dismiss(entry.id, true);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        dismiss(entry.id, false);
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [entry.id]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.12s ease-out',
      }}
      onClick={handleCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--color-panel)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
          padding: 0,
          minWidth: 340, maxWidth: 420,
          animation: 'scaleIn 0.12s ease-out',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 20px 0',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: entry.destructive ? 'rgba(244,67,54,0.12)' : 'rgba(88,101,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {entry.destructive ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f44336" strokeWidth="2" strokeLinecap="round">
                <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
          </div>
          <span style={{
            fontSize: 'var(--font-size-md)', fontWeight: 600,
            color: 'var(--color-text-primary)',
          }}>
            {entry.title}
          </span>
        </div>

        {/* Message */}
        <div style={{ padding: '10px 20px 16px 58px' }}>
          <p style={{
            fontSize: 'var(--font-size-sm)', lineHeight: 1.5,
            color: 'var(--color-text-secondary)', margin: 0,
          }}>
            {entry.message}
          </p>
        </div>

        {/* Buttons */}
        <div style={{
          padding: '0 20px 14px',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          <button
            ref={cancelRef}
            onClick={handleCancel}
            style={{
              height: 30, padding: '0 16px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--font-size-sm)',
              cursor: 'pointer',
              fontWeight: 500,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-panel-hover)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            {entry.cancelLabel} <span style={{ opacity: 0.4, fontSize: 'var(--font-size-xs)', marginLeft: 4 }}>Esc</span>
          </button>
          <button
            ref={confirmRef}
            onClick={handleConfirm}
            style={{
              height: 30, padding: '0 16px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: entry.destructive ? '#f44336' : 'var(--color-accent)',
              color: '#fff',
              fontSize: 'var(--font-size-sm)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.9'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
          >
            {entry.confirmLabel} <span style={{ opacity: 0.6, fontSize: 'var(--font-size-xs)', marginLeft: 4 }}>↵</span>
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default ConfirmDialogContainer;
