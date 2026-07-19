/**
 * ProjectSettingsDialog — per-project preferences dialog.
 */
import React from 'react';
import { useProjectStore } from '../../state/projectStore';

interface Props {
  onClose: () => void;
}

export const ProjectSettingsDialog: React.FC<Props> = ({ onClose }) => {
  const project = useProjectStore((s) => s.project);
  const updateSettings = useProjectStore((s) => s.updateSettings);
  const [name, setName] = React.useState(project.name);
  const [autoSaveInterval, setAutoSaveInterval] = React.useState(
    project.settings?.autoSaveInterval ?? 5,
  );
  const [defaultWidth, setDefaultWidth] = React.useState(
    project.settings?.defaultWidth ?? 1920,
  );
  const [defaultHeight, setDefaultHeight] = React.useState(
    project.settings?.defaultHeight ?? 1080,
  );
  const [defaultFps, setDefaultFps] = React.useState(
    project.settings?.defaultFps ?? 30,
  );
  const [notes, setNotes] = React.useState(
    project.settings?.notes ?? '',
  );

  const handleSave = () => {
    updateSettings({
      autoSaveInterval,
      defaultWidth,
      defaultHeight,
      defaultFps,
      notes,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 select-none">
      <div className="bg-surface border border-border rounded-lg shadow-2xl w-[460px] max-w-[90vw] max-h-[80vh] overflow-y-auto">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between sticky top-0 bg-surface z-10">
          <h2 className="text-ui-sm font-semibold text-text-primary">Project Settings</h2>
          <button
            onClick={onClose}
            className="w-5 h-5 flex items-center justify-center border-0 bg-transparent
              cursor-pointer text-text-disabled hover:text-text-primary"
          >✕</button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          {/* Project Name */}
          <Field label="Project Name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-2 py-1.5 bg-panel border border-border rounded-md
                text-ui-xs text-text-primary outline-none focus:border-accent transition-colors"
            />
          </Field>

          {/* Default Composition Resolution */}
          <Field label="Default Composition Size">
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={defaultWidth}
                onChange={(e) => setDefaultWidth(Number(e.target.value))}
                className="w-20 px-2 py-1.5 bg-panel border border-border rounded-md
                  text-ui-xs text-text-primary outline-none focus:border-accent transition-colors"
                min={1}
              />
              <span className="text-text-disabled text-ui-xs">×</span>
              <input
                type="number"
                value={defaultHeight}
                onChange={(e) => setDefaultHeight(Number(e.target.value))}
                className="w-20 px-2 py-1.5 bg-panel border border-border rounded-md
                  text-ui-xs text-text-primary outline-none focus:border-accent transition-colors"
                min={1}
              />
              <span className="text-text-disabled text-ui-xs ml-1">px</span>
            </div>
          </Field>

          {/* Default FPS */}
          <Field label="Default Frame Rate">
            <input
              type="number"
              value={defaultFps}
              onChange={(e) => setDefaultFps(Number(e.target.value))}
              className="w-20 px-2 py-1.5 bg-panel border border-border rounded-md
                text-ui-xs text-text-primary outline-none focus:border-accent transition-colors"
              min={1}
              max={120}
            />
          </Field>

          {/* Auto-save Interval */}
          <Field label="Auto-save Interval">
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={autoSaveInterval}
                onChange={(e) => setAutoSaveInterval(Number(e.target.value))}
                className="w-16 px-2 py-1.5 bg-panel border border-border rounded-md
                  text-ui-xs text-text-primary outline-none focus:border-accent transition-colors"
                min={1}
                max={30}
              />
              <span className="text-text-disabled text-ui-xs">minutes</span>
            </div>
          </Field>

          {/* Notes */}
          <Field label="Project Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-2 py-1.5 bg-panel border border-border rounded-md
                text-ui-xs text-text-primary outline-none focus:border-accent transition-colors resize-y"
              placeholder="Optional project notes..."
            />
          </Field>
        </div>

        <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-ui-xs text-text-primary bg-panel border border-border
              rounded-md cursor-pointer hover:bg-panel-hover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-ui-xs text-white bg-accent rounded-md border-0
              cursor-pointer hover:bg-accent-hover transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col gap-1">
    <label className="text-ui-xs text-text-secondary font-medium">{label}</label>
    {children}
  </div>
);

export default ProjectSettingsDialog;
