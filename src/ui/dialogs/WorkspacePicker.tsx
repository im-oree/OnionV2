/**
 * WorkspacePicker — dialog for picking or creating a workspace folder.
 */
import React from 'react';
import { StorageManager } from '../../storage/StorageManager';
import { useNotificationStore } from '../../state/notificationStore';

interface Props {
  onClose: () => void;
  onWorkspaceSelected?: (name: string) => void;
}

export const WorkspacePicker: React.FC<Props> = ({ onClose, onWorkspaceSelected }) => {
  const [picking, setPicking] = React.useState(false);
  const [error, setError] = React.useState('');
  const addNotif = useNotificationStore((s) => s.addNotification);

  const handlePickWorkspace = async () => {
    setPicking(true);
    setError('');
    try {
      const sm = StorageManager.getInstance();
      const ws = await sm.pickWorkspace();
      if (ws) {
        addNotif({
          type: 'success',
          message: `Workspace "${ws.name || 'Workspace'}" selected.`,
          autoDismiss: 4000,
        });
        onWorkspaceSelected?.(ws.name || 'Workspace');
        // Dispatch event to notify WelcomeScreen
        document.dispatchEvent(new CustomEvent('workspace:picked', { detail: { name: ws.name } }));
        onClose();
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.name === 'SecurityError') {
        setError('Permission denied. Please grant read/write access to continue.');
      } else {
        setError(err?.message ?? 'Failed to pick workspace');
      }
    } finally {
      setPicking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 select-none">
      <div className="bg-surface border border-border rounded-lg shadow-2xl w-[400px] max-w-[90vw]">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-ui-sm font-semibold text-text-primary">Pick Workspace</h2>
          <button
            onClick={onClose}
            className="w-5 h-5 flex items-center justify-center border-0 bg-transparent
              cursor-pointer text-text-disabled hover:text-text-primary"
          >✕</button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          <p className="text-ui-xs text-text-secondary leading-relaxed">
            Onion needs a workspace folder to store your projects.
            Choose an empty folder or create a new one.
            All project files will be organized within this workspace.
          </p>

          <div className="bg-panel border border-border rounded-md p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" className="text-accent shrink-0">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <span className="text-ui-xs text-text-primary font-medium">Select a folder on your computer</span>
            </div>
            <p className="text-[10px] text-text-disabled pl-[22px]">
              Files will be organized into project subfolders automatically.
            </p>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-700/30 rounded-md px-3 py-2">
              <p className="text-ui-xs text-[#f44336]">{error}</p>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-ui-xs text-text-primary bg-panel border border-border
                rounded-md cursor-pointer hover:bg-panel-hover transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePickWorkspace}
              disabled={picking}
              className="px-3 py-1.5 text-ui-xs text-white bg-accent rounded-md border-0
                cursor-pointer hover:bg-accent-hover transition-colors disabled:opacity-50
                disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {picking ? (
                <>Picking...</>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                  Pick Folder
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkspacePicker;
