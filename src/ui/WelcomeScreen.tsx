import React from 'react';
import { FolderOpen, Plus, Sliders, Film } from 'lucide-react';
import { openNewCompositionDialog, openWorkspacePicker } from './dialogs/DialogManager';
import { useRecentProjectsStore, type RecentProjectEntry } from '../state/recentProjectsStore';
import { useCompositionStore } from '../state/compositionStore';
import { StorageManager } from '../storage/StorageManager';
import { useNotificationStore } from '../state/notificationStore';

export const WelcomeScreen: React.FC = () => {
  const recentProjects = useRecentProjectsStore((s) => s.projects);
  const loadPersisted = useRecentProjectsStore((s) => s.loadPersisted);
  const clearAll = useRecentProjectsStore((s) => s.clearAll);
  const addNotif = useNotificationStore((s) => s.addNotification);
  const addComposition = useCompositionStore((s) => s.addComposition);
  const compositions = useCompositionStore((s) => s.compositions);

  const [hasWorkspace, setHasWorkspace] = React.useState(false);
  const [showAllRecent, setShowAllRecent] = React.useState(false);

  React.useEffect(() => { loadPersisted(); checkWorkspace(); }, []);
  const checkWorkspace = async () => { setHasWorkspace(await StorageManager.getInstance().hasWorkspace()); };

  // Belt-and-suspenders: re-check after a short delay in case storage init
  // completes after the initial check but before the event listener fires
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasWorkspace) checkWorkspace();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    const handler = () => { setHasWorkspace(true); checkWorkspace(); };
    document.addEventListener('workspace:picked', handler);
    document.addEventListener('workspace:restored', handler);
    return () => {
      document.removeEventListener('workspace:picked', handler);
      document.removeEventListener('workspace:restored', handler);
    };
  }, []);

  const handleOpenProject = async (entry: RecentProjectEntry) => {
    try { await StorageManager.getInstance().load(entry.handle);
      addNotif({ type: 'success', message: `Opened "${entry.name}"`, autoDismiss: 3000 });
    } catch { addNotif({ type: 'error', message: `Failed to open "${entry.name}" — project may have been moved.` }); }
  };

  const handleOpenFile = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.onion,.json';
    input.onchange = async () => {
      const file = input.files?.[0]; if (!file) return;
      try {
        const handle = { id: `file_${Date.now()}`, name: file.name.replace(/\.(onion|json)$/, ''), adapterType: 'download' as const, internal: { file } };
        await StorageManager.getInstance().load(handle as any);
        addNotif({ type: 'success', message: `Opened "${file.name}"`, autoDismiss: 3000 });
      } catch { addNotif({ type: 'error', message: 'Failed to open project file.' }); }
    };
    input.click();
  };

  const handleCreateComp = () => {
    addComposition({ name: 'My Composition' });
    addNotif({ type: 'success', message: 'New composition created!', autoDismiss: 3000 });
  };

  const displayProjects = showAllRecent ? recentProjects.slice(0, 12) : recentProjects.slice(0, 4);

  const primaryBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '12px 22px',
    fontSize: 'var(--font-size-md)', fontWeight: 500,
    background: 'var(--color-accent)', color: '#fff',
    borderRadius: 'var(--radius-md)', border: 0, cursor: 'pointer',
    transition: 'background var(--dur-fast) var(--ease-out)',
  };
  const secondaryBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 18px',
    fontSize: 'var(--font-size-md)', fontWeight: 500,
    background: 'var(--color-panel-raised)', color: 'var(--color-text-primary)',
    borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', cursor: 'pointer',
    transition: 'background var(--dur-fast) var(--ease-out)',
  };

  if (!hasWorkspace) {
    return (
      <div className="w-full h-full flex items-center justify-center panel select-none">
        <div className="flex flex-col items-center gap-6 max-w-lg text-center px-6">
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--color-accent-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Film size={28} strokeWidth={1.75} style={{ color: 'var(--color-accent)' }} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>Welcome to Onion</h1>
          <p style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-text-secondary)', lineHeight: 1.6, maxWidth: 380 }}>
            Before you can start creating, Onion needs a workspace folder to store your projects and assets.
          </p>
          <button onClick={openWorkspacePicker} style={primaryBtn}
            onMouseEnter={(e)=>(e.currentTarget as HTMLElement).style.background='var(--color-accent-hover)'}
            onMouseLeave={(e)=>(e.currentTarget as HTMLElement).style.background='var(--color-accent)'}
          >
            <FolderOpen size={16} strokeWidth={2} /> Pick Workspace Folder
          </button>
          <button onClick={handleOpenFile} style={secondaryBtn}
            onMouseEnter={(e)=>(e.currentTarget as HTMLElement).style.background='var(--color-panel-hover)'}
            onMouseLeave={(e)=>(e.currentTarget as HTMLElement).style.background='var(--color-panel-raised)'}
          >
            <FolderOpen size={14} strokeWidth={1.75} /> Open existing project file
          </button>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-disabled)' }}>
            Your workspace folder can be changed later in Preferences.
          </p>

          {recentProjects.length > 0 && (
            <div className="w-full mt-2 pt-4" style={{ borderTop: '1px solid var(--color-divider)' }}>
              <h3 className="text-left mb-3" style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
                Recent Projects
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {recentProjects.slice(0, 4).map((entry) => (
                  <button key={entry.id} onClick={() => handleOpenProject(entry)}
                    className="flex items-start gap-2 text-left cursor-pointer transition-colors"
                    style={{ padding: 10, background: 'var(--color-panel-raised)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                    onMouseEnter={(e)=>(e.currentTarget as HTMLElement).style.background='var(--color-panel-hover)'}
                    onMouseLeave={(e)=>(e.currentTarget as HTMLElement).style.background='var(--color-panel-raised)'}
                  >
                    {entry.thumbnail ? (
                      <img src={entry.thumbnail} alt="" style={{ width: 32, height: 24, borderRadius: 3, objectFit: 'cover', flexShrink: 0, marginTop: 1, border: '1px solid var(--color-border)' }} />
                    ) : (
                      <Film size={14} strokeWidth={1.75} style={{ color: 'var(--color-accent)', flexShrink: 0, marginTop: 2 }} />
                    )}
                    <div className="min-w-0">
                      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }} className="truncate">{entry.name}</p>
                      <p style={{ fontSize: 10, color: 'var(--color-text-disabled)', marginTop: 2 }}>
                        {entry.lastOpened ? new Date(entry.lastOpened).toLocaleDateString() : ''}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (compositions.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center panel select-none">
        <div className="flex flex-col items-center gap-6 max-w-md text-center px-6">
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--color-accent-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Film size={28} strokeWidth={1.75} style={{ color: 'var(--color-accent)' }} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>Start Creating</h1>
          <p style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-text-secondary)', lineHeight: 1.6, maxWidth: 380 }}>
            Your workspace is ready. Create a new composition to get started.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button onClick={handleCreateComp} style={primaryBtn}
              onMouseEnter={(e)=>(e.currentTarget as HTMLElement).style.background='var(--color-accent-hover)'}
              onMouseLeave={(e)=>(e.currentTarget as HTMLElement).style.background='var(--color-accent)'}
            ><Plus size={16} strokeWidth={2} /> New Composition</button>
            <button onClick={() => openNewCompositionDialog()} style={secondaryBtn}
              onMouseEnter={(e)=>(e.currentTarget as HTMLElement).style.background='var(--color-panel-hover)'}
              onMouseLeave={(e)=>(e.currentTarget as HTMLElement).style.background='var(--color-panel-raised)'}
            ><Sliders size={14} strokeWidth={1.75} /> Custom Composition</button>
            <button onClick={handleOpenFile} style={secondaryBtn}
              onMouseEnter={(e)=>(e.currentTarget as HTMLElement).style.background='var(--color-panel-hover)'}
              onMouseLeave={(e)=>(e.currentTarget as HTMLElement).style.background='var(--color-panel-raised)'}
            ><FolderOpen size={14} strokeWidth={1.75} /> Open Project</button>
          </div>

          {recentProjects.length > 0 && (
            <div className="w-full mt-4 pt-4" style={{ borderTop: '1px solid var(--color-divider)' }}>
              <h3 className="text-left mb-3" style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
                Recent Projects
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {displayProjects.map((entry) => (
                  <button key={entry.id} onClick={() => handleOpenProject(entry)}
                    className="flex items-start gap-2 text-left cursor-pointer transition-colors"
                    style={{ padding: 10, background: 'var(--color-panel-raised)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                    onMouseEnter={(e)=>(e.currentTarget as HTMLElement).style.background='var(--color-panel-hover)'}
                    onMouseLeave={(e)=>(e.currentTarget as HTMLElement).style.background='var(--color-panel-raised)'}
                  >
                    {entry.thumbnail ? (
                      <img src={entry.thumbnail} alt="" style={{ width: 32, height: 24, borderRadius: 3, objectFit: 'cover', flexShrink: 0, marginTop: 1, border: '1px solid var(--color-border)' }} />
                    ) : (
                      <Film size={14} strokeWidth={1.75} style={{ color: 'var(--color-accent)', flexShrink: 0, marginTop: 2 }} />
                    )}
                    <div className="min-w-0">
                      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }} className="truncate">{entry.name}</p>
                      <p style={{ fontSize: 10, color: 'var(--color-text-disabled)', marginTop: 2 }}>
                        {entry.lastOpened ? new Date(entry.lastOpened).toLocaleDateString() : ''}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
              {recentProjects.length > 4 && (
                <button onClick={() => setShowAllRecent(!showAllRecent)}
                  className="mt-2 border-0 bg-transparent cursor-pointer"
                  style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-accent)' }}
                >
                  {showAllRecent ? 'Show less' : `Show all (${recentProjects.length})`}
                </button>
              )}
              <div className="flex justify-end mt-1">
                <button onClick={clearAll} className="border-0 bg-transparent cursor-pointer"
                  style={{ fontSize: 10, color: 'var(--color-text-disabled)' }}>
                  Clear recent
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export default WelcomeScreen;