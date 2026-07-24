/**
 * SaveProjectDialog — modal that asks the user for a project name
 * before the first save. Replaces the OS file picker.
 *
 * On confirm: creates a folder under the workspace with the given name,
 * saves the project into it, and transitions the app to a "named project"
 * state where subsequent Ctrl+S saves silently.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StorageManager } from '../../storage/StorageManager';
import { useProjectStore } from '../../state/projectStore';
import { useNotificationStore } from '../../state/notificationStore';
import { useRecentProjectsStore } from '../../state/recentProjectsStore';
import type { ProjectHandle } from '../../storage/StorageAdapter';

interface Props {
  open: boolean;
  /** Called after successful save. */
  onClose: () => void;
  /** Passed to distinguish "Save first time" vs "Save As duplicate". */
  mode?: 'first-save' | 'save-as';
  /** Initial name — defaults to current project name (or "Untitled Project") */
  initialName?: string;
}

const RESERVED = /[/\\:*?"<>|]/g;

function sanitizeName(input: string): string {
  return input
    .trim()
    .replace(/[.\s]+$/, '')       // trailing dots or spaces
    .replace(/^[.\s]+/, '')       // leading dots or spaces
    .replace(RESERVED, '_');       // OS-reserved chars
}

function validateName(name: string): string | null {
  const t = name.trim();
  if (!t) return 'Enter a project name.';
  if (t.length > 100) return 'Name too long (max 100 characters).';
  if (RESERVED.test(t)) return 'Name contains invalid characters: / \\ : * ? " < > |';
  if (/^\.+$/.test(t)) return 'Name cannot be only dots.';
  const reservedNames = ['CON','PRN','AUX','NUL','COM1','COM2','COM3','COM4','LPT1','LPT2','LPT3'];
  if (reservedNames.includes(t.toUpperCase())) return 'Reserved system name.';
  return null;
}

export const SaveProjectDialog: React.FC<Props> = ({
  open, onClose, mode = 'first-save', initialName,
}) => {
  const projectName = useProjectStore(s => s.project.name);
  const [name, setName] = useState(() => {
    if (initialName) return initialName;
    if (projectName && projectName !== 'Untitled Project') return projectName;
    return '';
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [collision, setCollision] = useState<ProjectHandle | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setCollision(null);
    setSaving(false);
    // Reset name each open in case project name changed
    if (initialName) setName(initialName);
    else if (projectName && projectName !== 'Untitled Project') setName(projectName);
    // Focus + select all after a tick
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 10);
  }, [open, initialName, projectName]);

  const doSave = useCallback(async (overwrite = false) => {
    const err = validateName(name);
    if (err) { setError(err); return; }
    const safe = sanitizeName(name);
    setError(null);
    setSaving(true);
    try {
      const sm = StorageManager.getInstance();
      if (!sm.getAdapter()) await sm.detectBestAdapter();

      // Check for collision
      const existing = await sm.listProjects();
      const conflict = existing.find(p => p.name.toLowerCase() === safe.toLowerCase());

      if (conflict && !overwrite) {
        setCollision(conflict);
        setSaving(false);
        return;
      }

      // Create the project folder + save
      const handle = await sm.createProject(safe);

      // Reflect the new name into project store so titlebar etc. update
      const proj = useProjectStore.getState().project;
      useProjectStore.setState({
        project: { ...proj, name: safe, modified: Date.now() },
        dirty: true,
      });

      await sm.saveAs(safe, handle);

      // Recent projects update
      useRecentProjectsStore.getState().addProject({
        id: handle.id,
        name: safe,
        lastOpened: new Date().toISOString(),
        handle,
      });

      useNotificationStore.getState().addNotification({
        type: 'success',
        message: `Saved "${safe}"`,
        autoDismiss: 3000,
      });
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Save failed.');
      setSaving(false);
    }
  }, [name, onClose]);

  const loadExisting = useCallback(async () => {
    if (!collision) return;
    try {
      await StorageManager.getInstance().load(collision);
      onClose();
      useNotificationStore.getState().addNotification({
        type: 'success',
        message: `Opened existing "${collision.name}"`,
        autoDismiss: 2500,
      });
    } catch (e: any) {
      setError(`Could not load existing project: ${e?.message ?? 'Unknown error'}`);
    }
  }, [collision, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    if (e.key === 'Enter' && !collision && !saving) {
      e.preventDefault();
      doSave(false);
    }
  }, [doSave, saving, collision, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)', userSelect: 'none',
      }}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 440, maxWidth: '90vw',
          background: 'var(--color-surface, #232630)',
          border: '1px solid var(--color-border, #383d47)',
          borderRadius: 8,
          boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--color-border, #383d47)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h2 style={{
            margin: 0, fontSize: 13, fontWeight: 600,
            color: 'var(--color-text-primary, #dfe3ea)',
          }}>
            {mode === 'save-as' ? 'Save Project As' : 'Save Project'}
          </h2>
          <button
            onClick={onClose}
            style={{
              width: 22, height: 22, padding: 0,
              background: 'transparent', border: 0, cursor: 'pointer',
              color: 'var(--color-text-disabled, #6b7280)',
              fontSize: 16, lineHeight: 1,
            }}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{
            margin: 0, fontSize: 11,
            color: 'var(--color-text-secondary, #a0a7b3)',
            lineHeight: 1.5,
          }}>
            {mode === 'save-as'
              ? 'Enter a name for the copy. A new folder will be created in your workspace.'
              : 'Enter a name for your project. A folder will be created in your workspace with all project files inside.'}
          </p>

          <div>
            <label style={{
              display: 'block',
              fontSize: 10, fontWeight: 600, letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--color-text-tertiary, #7a828e)',
              marginBottom: 4,
            }}>
              Project name
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={e => {
                setName(e.target.value);
                setError(null);
                setCollision(null);
              }}
              placeholder="My awesome video"
              disabled={saving}
              style={{
                width: '100%',
                height: 32, padding: '0 10px',
                background: 'var(--color-input-bg, #1a1d24)',
                border: `1px solid ${error ? 'var(--color-danger, #ef5b5b)' : 'var(--color-border, #383d47)'}`,
                borderRadius: 4,
                color: 'var(--color-text-primary, #dfe3ea)',
                fontSize: 13,
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '8px 10px',
              background: 'rgba(239,91,91,0.1)',
              border: '1px solid rgba(239,91,91,0.35)',
              borderRadius: 4,
              fontSize: 11,
              color: '#ef5b5b',
            }}>
              {error}
            </div>
          )}

          {collision && (
            <div style={{
              padding: '10px 12px',
              background: 'rgba(255,193,7,0.1)',
              border: '1px solid rgba(255,193,7,0.35)',
              borderRadius: 4,
              fontSize: 11,
              color: 'var(--color-text-primary, #dfe3ea)',
              display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <div><b>"{collision.name}"</b> already exists in the workspace.</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={loadExisting}
                  style={{
                    flex: 1, padding: '5px 8px',
                    fontSize: 10, fontWeight: 500,
                    background: 'transparent',
                    border: '1px solid var(--color-border, #383d47)',
                    borderRadius: 3, cursor: 'pointer',
                    color: 'var(--color-text-primary, #dfe3ea)',
                  }}
                >
                  Load existing
                </button>
                <button
                  onClick={() => doSave(true)}
                  disabled={saving}
                  style={{
                    flex: 1, padding: '5px 8px',
                    fontSize: 10, fontWeight: 500,
                    background: 'rgba(239,91,91,0.2)',
                    border: '1px solid rgba(239,91,91,0.5)',
                    borderRadius: 3, cursor: 'pointer',
                    color: '#ef5b5b',
                  }}
                >
                  Overwrite
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--color-border, #383d47)',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '6px 14px', fontSize: 12,
              background: 'transparent',
              border: '1px solid var(--color-border, #383d47)',
              borderRadius: 4, cursor: 'pointer',
              color: 'var(--color-text-primary, #dfe3ea)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => doSave(false)}
            disabled={saving || !name.trim() || !!collision}
            style={{
              padding: '6px 16px', fontSize: 12, fontWeight: 500,
              background: 'var(--color-accent, #5865ff)',
              color: '#fff',
              border: 0, borderRadius: 4,
              cursor: saving ? 'wait' : 'pointer',
              opacity: (saving || !name.trim() || !!collision) ? 0.5 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveProjectDialog;