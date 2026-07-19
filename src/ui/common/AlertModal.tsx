/**
 * AlertModal — a single global modal component for app-level alerts, confirms, and prompts.
 * Mounted once in App.tsx. Controlled by alertModalStore.
 * Supports: info, success, warning, error, confirm, prompt types.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  useAlertModalStore,
  type AlertModalType,
} from '../../state/alertModalStore';

/* ─── Icons per type ─── */

const TYPE_ICONS: Record<AlertModalType, React.ReactNode> = {
  info: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  success: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  warning: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff9800" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  error: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f44336" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  confirm: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  prompt: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 3 21 3 21 8" />
      <line x1="4" y1="20" x2="21" y2="3" />
      <polyline points="21 16 21 21 16 21" />
      <line x1="15" y1="15" x2="21" y2="21" />
      <line x1="4" y1="4" x2="9" y2="9" />
    </svg>
  ),
};

/* ─── Color accents per type ─── */

const TYPE_BORDER_COLORS: Record<AlertModalType, string> = {
  info: 'var(--color-accent)',
  success: '#4caf50',
  warning: '#ff9800',
  error: '#f44336',
  confirm: 'var(--color-warning)',
  prompt: 'var(--color-accent)',
};

/* ─── Keyboard handler ─── */

function useKeyboard(options: ReturnType<typeof useAlertModalStore.getState>['options'], onDismiss: () => void, onConfirm: () => void) {
  useEffect(() => {
    if (!options) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
      } else if (e.key === 'Enter' && options.type !== 'prompt') {
        e.preventDefault();
        onConfirm();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [options, onDismiss, onConfirm]);
}

/* ─── Component ─── */

export const AlertModal: React.FC = () => {
  const visible = useAlertModalStore((s) => s.visible);
  const options = useAlertModalStore((s) => s.options);
  const resolve = useAlertModalStore((s) => s.resolve);
  const dismiss = useAlertModalStore((s) => s.dismiss);

  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset input when modal opens
  useEffect(() => {
    if (visible && options?.type === 'prompt') {
      setInputValue(options.defaultValue ?? '');
      setInputError(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [visible, options]);

  const handleDismiss = useCallback(() => {
    if (options?.type === 'confirm') {
      resolve(false);
    } else if (options?.type === 'prompt') {
      resolve(null);
    } else {
      dismiss();
    }
  }, [options, resolve, dismiss]);

  const handleConfirm = useCallback(() => {
    if (options?.type === 'prompt') {
      const val = inputValue;
      if (options.validate) {
        const err = options.validate(val);
        if (err) {
          setInputError(err);
          return;
        }
      }
      resolve(val);
    } else if (options?.type === 'confirm') {
      resolve(true);
    } else {
      resolve(undefined);
    }
  }, [options, inputValue, resolve]);

  const handleBackdrop = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) handleDismiss();
    },
    [handleDismiss],
  );

  useKeyboard(options, handleDismiss, handleConfirm);

  if (!visible || !options) return null;

  const hasCancel = options.type === 'confirm' || options.type === 'prompt';
  const showCancel = hasCancel && !options.hideCancel;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.55)' }}
      onClick={handleBackdrop}
    >
      <div
        className="flex flex-col overflow-hidden"
        role="alertdialog"
        aria-modal="true"
        aria-label={options.title}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: options.maxWidth ?? 400,
          background: 'var(--color-panel-raised)',
          border: `1px solid ${TYPE_BORDER_COLORS[options.type] || 'var(--color-border)'}`,
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-modal)',
          animation: 'modal-in 180ms var(--ease-out)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-5 pt-4 pb-2"
          style={{ borderBottom: '1px solid var(--color-divider)' }}
        >
          <span className="shrink-0 flex items-center justify-center" style={{ width: 24, height: 24 }}>
            {TYPE_ICONS[options.type]}
          </span>
          <h2
            style={{
              fontSize: 'var(--font-size-md)',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            {options.title}
          </h2>
        </div>

        {/* Body */}
        <div className="px-5 py-3">
          {options.message && (
            <p
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
                margin: 0,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
              }}
            >
              {options.message}
            </p>
          )}

          {/* Prompt input */}
          {options.type === 'prompt' && (
            <div className="mt-3">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  if (inputError) setInputError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirm();
                }}
                placeholder={options.placeholder ?? ''}
                style={{
                  width: '100%',
                  height: 34,
                  padding: '0 10px',
                  fontSize: 'var(--font-size-sm)',
                  background: 'var(--color-input-bg)',
                  border: `1px solid ${inputError ? '#f44336' : 'var(--color-border-strong)'}`,
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-text-primary)',
                  outline: 'none',
                }}
              />
              {inputError && (
                <p style={{ fontSize: 'var(--font-size-xs)', color: '#f44336', marginTop: 4 }}>
                  {inputError}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-5 pb-4 pt-1">
          {showCancel && (
            <button
              onClick={handleDismiss}
              style={{
                height: 30,
                padding: '0 14px',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 500,
                color: 'var(--color-text-secondary)',
                background: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'background 120ms ease-out',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-panel-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {options.cancelLabel ?? 'Cancel'}
            </button>
          )}
          <button
            onClick={handleConfirm}
            style={{
              height: 30,
              padding: '0 14px',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 500,
              color: options.destructive ? '#fff' : '#fff',
              background: options.destructive ? '#f44336' : 'var(--color-accent)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              transition: 'opacity 120ms ease-out',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            {options.confirmLabel ?? (options.type === 'confirm' ? 'Yes' : 'OK')}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default AlertModal;
