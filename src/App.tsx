import React from 'react';
import { AppShell } from './ui/layout/AppShell';
import { DialogManager } from './ui/dialogs/DialogManager';
import { ToastContainer } from './ui/common/Toast';
import { CommandPalette } from './ui/common/CommandPalette';
import { AlertModal } from './ui/common/AlertModal';
import { useKeyboardManager, registerAllShortcuts } from './input/KeyboardManager';
import { useCompositionStore } from './state/compositionStore';
import { useNavigationStore } from './state/navigationStore';
import { useRecentProjectsStore } from './state/recentProjectsStore';
import { StorageManager } from './storage/StorageManager';
import { autoSave } from './storage/AutoSave';
import { crashRecovery, type PendingRecovery } from './storage/CrashRecovery';
import { registerPaletteActions } from './config/paletteActions';
import { useCommandPaletteStore } from './state/commandPaletteStore';
import { shortcutRegistry } from './input/ShortcutRegistry';

// Register all shortcuts once
registerAllShortcuts();

// Register command palette actions
registerPaletteActions();

// Register command palette shortcut (Ctrl+Shift+P)
shortcutRegistry.register({
  id: 'palette.open', key: 'p', ctrl: true, shift: true,
  context: 'global', remappable: true,
  handler: () => useCommandPaletteStore.getState().toggle(),
});

const App: React.FC = () => {
  // Mount keyboard listener
  useKeyboardManager();

  // Crash recovery state
  const [pendingRecoveries, setPendingRecoveries] = React.useState<PendingRecovery[]>([]);

  // Prevent browser zoom on Ctrl+scroll for the whole app
  React.useEffect(() => {
    const handler = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };
    document.addEventListener('wheel', handler, { passive: false, capture: true });
    return () => document.removeEventListener('wheel', handler, { capture: true } as EventListenerOptions);
  }, []);

  // Initialize storage, auto-save, and load recent projects on startup
  React.useEffect(() => {
    const init = async () => {
      try {
        const sm = StorageManager.getInstance();
        await sm.detectBestAdapter();

        // Restore workspace handle from IndexedDB (File System API handle survives page reload)
        const adapter = sm.getAdapter();
        if (adapter && adapter.type === 'filesystem') {
          const fsAdapter = adapter as any;
          if (typeof fsAdapter.ensureWorkspace === 'function') {
            const restored = await fsAdapter.ensureWorkspace();
            if (restored) {
              // Notify WelcomeScreen / other UI that workspace is available
              window.dispatchEvent(new CustomEvent('workspace:restored'));
            }
          }
        }

        // Load recent projects from IndexedDB
        await useRecentProjectsStore.getState().loadPersisted();

        // Start auto-save if there's a project
        autoSave.onSave = (timestamp) => {
          const handle = sm.currentProjectHandle;
          if (handle) {
            crashRecovery.markAutosave(handle.id);
            useRecentProjectsStore.getState().addProject({
              id: handle.id,
              name: handle.name,
              lastOpened: new Date(timestamp).toISOString(),
              handle,
            });
          }
        };
        autoSave.start();

        // Check for crash recovery on startup
        const recoveries = crashRecovery.checkAllForRecovery();
        if (recoveries.length > 0) {
          // Enrich with project names from recent projects
          const recent = useRecentProjectsStore.getState().projects;
          const enriched = recoveries.map(r => {
            const found = recent.find(p => p.id === r.projectId);
            return { ...r, projectName: found?.name ?? r.projectId };
          });
          setPendingRecoveries(enriched);
        }
      } catch {
        // Storage initialization is best-effort
      }
    };
    init();

    // Cleanup auto-save on unmount
    return () => {
      autoSave.stop();
    };
  }, []);

  // Run startup optimizations once
  React.useEffect(() => {
    import('./renderer/StartupOptimizer').then(({ runStartupOptimizations }) => {
      runStartupOptimizations();
    });
  }, []);

  // Keep navigation stack in sync with active comp on first mount
  React.useEffect(() => {
    const activeId = useCompositionStore.getState().activeCompositionId;
    if (activeId && useNavigationStore.getState().stack.length === 0) {
      useNavigationStore.getState().reset(activeId);
    }
  }, []);

  // Expose stores globally for menu actions, RAM preview, and undo/redo snapshots
  React.useEffect(() => {
    (window as any).__compositionStore = useCompositionStore;
    import('./state/keyframeStore').then(({ useKeyframeStore }) => {
      (window as any).__keyframeStore = useKeyframeStore;
    });
  }, []);

  // Save the last project handle to localStorage when dirty status changes
  React.useEffect(() => {
    const interval = setInterval(() => {
      const sm = StorageManager.getInstance();
      const handle = sm.currentProjectHandle;
      if (handle) {
        localStorage.setItem('onion_last_project', JSON.stringify({ id: handle.id, name: handle.name }));
      }
    }, 30000); // every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // beforeunload handler for dirty state
  React.useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const sm = StorageManager.getInstance();
      if (sm.isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const handleRestoreRecovery = React.useCallback(async (projectId: string) => {
    const recent = useRecentProjectsStore.getState().projects;
    const entry = recent.find(p => p.id === projectId);
    if (entry) {
      try {
        // Use StorageManager.load() so the project handle is properly set
        // (enables save, auto-save, and dirty tracking for the restored project)
        await StorageManager.getInstance().load(entry.handle);
        crashRecovery.clearRecovery(projectId);
        setPendingRecoveries(prev => prev.filter(r => r.projectId !== projectId));
      } catch {
        // Error already shown by StorageManager.load
      }
    }
  }, []);

  const handleDismissRecovery = React.useCallback((projectId: string) => {
    crashRecovery.clearRecovery(projectId);
    setPendingRecoveries(prev => prev.filter(r => r.projectId !== projectId));
  }, []);

  return (
    <>
      <CommandPalette />
      <AppShell />
      <DialogManager />
      <ToastContainer />
      <AlertModal />
      {pendingRecoveries.length > 0 && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
        >
          <div
            className="flex flex-col gap-4 p-6 max-w-md w-full"
            style={{
              background: 'var(--color-panel)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-modal)',
            }}
          >
            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
              Recover unsaved work?
            </h2>
            <p style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
              {pendingRecoveries.length === 1
                ? `"${pendingRecoveries[0].projectName}" has an autosave newer than the last manual save.`
                : `${pendingRecoveries.length} projects have autosaves newer than their last manual saves.`
              }
            </p>
            <div className="flex flex-col gap-2">
              {pendingRecoveries.map(r => (
                <div
                  key={r.projectId}
                  className="flex items-center justify-between gap-3 p-3"
                  style={{ background: 'var(--color-panel-raised)', borderRadius: 'var(--radius-sm)' }}
                >
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', fontWeight: 500 }}>
                    {r.projectName}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRestoreRecovery(r.projectId)}
                      style={{
                        padding: '4px 12px', fontSize: 'var(--font-size-sm)', fontWeight: 500,
                        background: 'var(--color-accent)', color: '#fff',
                        border: 0, borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                      }}
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => handleDismissRecovery(r.projectId)}
                      style={{
                        padding: '4px 12px', fontSize: 'var(--font-size-sm)', fontWeight: 500,
                        background: 'transparent', color: 'var(--color-text-secondary)',
                        border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {pendingRecoveries.length > 1 && (
              <button
                onClick={() => {
                  pendingRecoveries.forEach(r => crashRecovery.clearRecovery(r.projectId));
                  setPendingRecoveries([]);
                }}
                style={{
                  padding: '6px 12px', fontSize: 'var(--font-size-sm)',
                  background: 'transparent', color: 'var(--color-text-disabled)',
                  border: 0, cursor: 'pointer', textAlign: 'center',
                }}
              >
                Dismiss all
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};
export default App;
