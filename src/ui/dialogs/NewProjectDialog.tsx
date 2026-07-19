/**
 * NewProjectDialog — modal for creating a new project.
 * Provides project name, template selection, and workspace integration.
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StorageManager } from '../../storage/StorageManager';
import { useNotificationStore } from '../../state/notificationStore';
import { useCompositionStore } from '../../state/compositionStore';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: (projectHandle: any) => void;
}

const TEMPLATES = [
  { id: 'empty', label: 'Empty', desc: 'Start from scratch', width: 1920, height: 1080 },
  { id: 'hd', label: 'HD 1080p', desc: '1920 × 1080', width: 1920, height: 1080 },
  { id: '4k', label: '4K UHD', desc: '3840 × 2160', width: 3840, height: 2160 },
  { id: 'square', label: 'Square', desc: '1080 × 1080', width: 1080, height: 1080 },
  { id: 'vertical', label: 'Vertical', desc: '1080 × 1920', width: 1080, height: 1920 },
  { id: 'cinema', label: 'Cinema 4K', desc: '4096 × 2160', width: 4096, height: 2160 },
];

export const NewProjectDialog: React.FC<Props> = ({ open, onClose, onCreated }) => {
  const [name, setName] = useState('New Project');
  const [template, setTemplate] = useState('hd');
  const [fps, setFps] = useState(30);
  const [creating, setCreating] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const addNotif = useNotificationStore((s) => s.addNotification);

  useEffect(() => {
    if (open) {
      setName('New Project');
      setTemplate('hd');
      setFps(30);
      setTimeout(() => nameRef.current?.focus(), 50);
    }
  }, [open]);

  const handleCreate = useCallback(async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const sm = StorageManager.getInstance();
      const selectedTemplate = TEMPLATES.find((t) => t.id === template);

      // Create project via storage manager
      const handle = await sm.createProject(name.trim(), {
        template: selectedTemplate?.id,
      });

      // If we have a workspace, create the project folder on disk
      const adapter = sm.getAdapter();
      if (adapter?.type === 'filesystem') {
        try {
          const ws = await adapter.getWorkspace();
          if (ws) {
            const dirHandle = ws.internal;
            // Create project folder
            const projectDir = await dirHandle.getDirectoryHandle(name.trim(), { create: true });
            // Create a minimal project file
            const fileHandle = await projectDir.getFileHandle('project.onion', { create: true });
            const writable = await fileHandle.createWritable({ keepExistingData: false });
            await writable.write(JSON.stringify({ name: name.trim(), created: new Date().toISOString() }));
            await writable.close();
          }
        } catch {
          // Best effort — project still works in IndexedDB/memory
        }
      }

      // Create default composition based on template
      if (selectedTemplate && selectedTemplate.id !== 'empty') {
        const compStore = useCompositionStore.getState();
        compStore.addComposition({
          name: `${name.trim()} Comp`,
          width: selectedTemplate.width,
          height: selectedTemplate.height,
          fps,
        });
      }

      addNotif({
        type: 'success',
        message: `Project "${name.trim()}" created`,
        autoDismiss: 3000,
      });

      onCreated?.(handle);
      onClose();
    } catch (err: any) {
      addNotif({
        type: 'error',
        message: `Failed to create project: ${err.message ?? 'Unknown error'}`,
      });
    } finally {
      setCreating(false);
    }
  }, [name, template, fps, addNotif, onCreated, onClose]);

  const handleBackdrop = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter') handleCreate();
    },
    [onClose, handleCreate],
  );

  if (!open) return null;

  const selectedT = TEMPLATES.find((t) => t.id === template);

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center bg-[var(--color-bg-overlay)]"
      onClick={handleBackdrop}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-panel rounded-md shadow-modal border border-border w-[440px] max-w-[90vw]"
        role="dialog"
        aria-modal="true"
        aria-label="New Project"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-ui-sm font-semibold text-text-primary">New Project</h2>
          <button
            onClick={onClose}
            className="w-5 h-5 flex items-center justify-center border-0 bg-transparent text-text-disabled hover:text-text-primary cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Project Name */}
          <div className="flex items-center gap-3">
            <label className="text-ui-xs text-text-secondary w-20 shrink-0">Name</label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 h-7 text-ui-xs px-2 bg-surface border border-border rounded-sm text-text-primary outline-none focus:border-accent transition-colors"
              placeholder="My Project"
            />
          </div>

          {/* Template */}
          <div className="flex flex-col gap-2">
            <label className="text-ui-xs text-text-secondary">Template</label>
            <div className="grid grid-cols-3 gap-1.5">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`flex flex-col items-center gap-0.5 p-2 rounded-md border cursor-pointer transition-colors text-center ${
                    template === t.id
                      ? 'bg-accent/10 border-accent text-text-primary'
                      : 'bg-surface border-border text-text-secondary hover:bg-panel-hover'
                  }`}
                  onClick={() => setTemplate(t.id)}
                >
                  <span className="text-ui-xs font-medium">{t.label}</span>
                  <span className="text-[10px] text-text-disabled">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* FPS */}
          <div className="flex items-center gap-3">
            <label className="text-ui-xs text-text-secondary w-20 shrink-0">Frame Rate</label>
            <select
              value={fps}
              onChange={(e) => setFps(Number(e.target.value))}
              className="flex-1 h-7 text-ui-xs px-2 bg-surface border border-border rounded-sm text-text-primary outline-none focus:border-accent"
            >
              {[23.976, 24, 25, 29.97, 30, 50, 59.94, 60].map((rate) => (
                <option key={rate} value={rate}>{rate} fps</option>
              ))}
            </select>
          </div>

          {/* Preview */}
          {selectedT && (
            <div className="flex items-center gap-3 p-2 bg-surface rounded-md border border-border">
              <div
                className="rounded-sm"
                style={{
                  width: 48,
                  height: Math.round(48 * (selectedT.height / selectedT.width)),
                  maxHeight: 48,
                  background: 'var(--color-accent-muted)',
                  border: '1px solid var(--color-border)',
                }}
              />
              <div className="text-ui-xs text-text-secondary">
                <div className="font-medium text-text-primary">{selectedT.label}</div>
                <div className="text-text-disabled">{selectedT.width} × {selectedT.height} · {fps} fps</div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-ui-xs border border-border rounded-sm bg-transparent text-text-secondary cursor-pointer hover:bg-panel-hover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="px-4 py-1.5 text-ui-xs border border-accent rounded-sm bg-accent text-white cursor-pointer hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewProjectDialog;
