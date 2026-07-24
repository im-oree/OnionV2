/**
 * RenameProjectDialog — lets user rename the current project folder.
 * Moves the folder in the workspace + updates the handle in memory.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StorageManager } from '../../storage/StorageManager';
import { useProjectStore } from '../../state/projectStore';
import { useNotificationStore } from '../../state/notificationStore';
import { useRecentProjectsStore } from '../../state/recentProjectsStore';

interface Props {
  open: boolean;
  onClose: () => void;
}

const RESERVED = /[/\\:*?"<>|]/g;

function sanitizeName(input: string): string {
  return input.trim().replace(/[.\s]+$/, '').replace(/^[.\s]+/, '').replace(RESERVED, '_');
}

function validateName(name: string): string | null {
  const t = name.trim();
  if (!t) return 'Enter a name.';
  if (t.length > 100) return 'Name too long.';
  if (RESERVED.test(t)) return 'Invalid characters.';
  return null;
}

export const RenameProjectDialog: React.FC<Props> = ({ open, onClose }) => {
  const currentName = useProjectStore(s => s.project.name);
  const [name, setName] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName(currentName);
    setError(null);
    setRenaming(false);
    setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 10);
  }, [open, currentName]);

  const doRename = useCallback(async () => {
    const err = validateName(name);
    if (err) { setError(err); return; }
    const safe = sanitizeName(name);
    if (safe === currentName) { onClose(); return; }
    setRenaming(true);
    try {
      const sm = StorageManager.getInstance();
      const oldHandle = sm.currentProjectHandle;
      if (!oldHandle) throw new Error('No open project to rename.');

      // Create a new folder with the new name
      const existing = await sm.listProjects();
      if (existing.some(p => p.name.toLowerCase() === safe.toLowerCase())) {
        setError(`"${safe}" already exists.`);
        setRenaming(false);
        return;
      }

      const newHandle = await sm.createProject(safe);
      // Save current state into the new folder
      const proj = useProjectStore.getState().project;
      useProjectStore.setState({
        project: { ...proj, name: safe, modified: Date.now() },
        dirty: false,
      });
      await sm.saveAs(safe, newHandle);

      // Delete the old folder
      try {
        const adapter = sm.getAdapter();
        if (adapter?.deleteProject) await adapter.deleteProject(oldHandle);
      } catch {
        // Best-effort — old folder may still exist as an orphan
      }

      // Update recent projects
      const recentStore = useRecentProjectsStore.getState();
      recentStore.removeProject(oldHandle.id);
      recentStore.addProject({
        id: newHandle.id,
        name: safe,
        lastOpened: new Date().toISOString(),
        handle: newHandle,
      });

      useNotificationStore.getState().addNotification({
        type: 'success',
        message: `Renamed to "${safe}"`,
        autoDismiss: 3000,
      });
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Rename failed.');
      setRenaming(false);
    }
  }, [name, currentName, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    if (e.key === 'Enter' && !renaming) { e.preventDefault(); doRename(); }
  }, [doRename, renaming, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
      }}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div style={{
        width: 400, background: 'var(--color-surface, #232630)',
        border: '1px solid var(--color-border, #383d47)', borderRadius: 8,
        boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
        fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)' }}>
          <h2 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Rename Project
          </h2>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setError(null); }}
            disabled={renaming}
            style={{
              height: 32, padding: '0 10px',
              background: 'var(--color-input-bg)',
              border: `1px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`,
              borderRadius: 4, color: 'var(--color-text-primary)',
              fontSize: 13, outline: 'none', fontFamily: 'inherit',
            }}
          />
          {error && (
            <div style={{ fontSize: 11, color: '#ef5b5b' }}>{error}</div>
          )}
        </div>
        <div style={{
          padding: '12px 16px', borderTop: '1px solid var(--color-border)',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          <button
            onClick={onClose} disabled={renaming}
            style={{
              padding: '6px 14px', fontSize: 12, background: 'transparent',
              border: '1px solid var(--color-border)', borderRadius: 4,
              cursor: 'pointer', color: 'var(--color-text-primary)',
            }}
          >Cancel</button>
          <button
            onClick={doRename} disabled={renaming || !name.trim()}
            style={{
              padding: '6px 16px', fontSize: 12, fontWeight: 500,
              background: 'var(--color-accent)', color: '#fff',
              border: 0, borderRadius: 4, cursor: 'pointer',
              opacity: (renaming || !name.trim()) ? 0.5 : 1,
            }}
          >{renaming ? 'Renaming…' : 'Rename'}</button>
        </div>
      </div>
    </div>
  );
};

export default RenameProjectDialog;