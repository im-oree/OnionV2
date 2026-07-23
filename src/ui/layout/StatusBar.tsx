/**
 * StatusBar — subtle, transparent footer with tiny separators.
 */
import React from 'react';
import { useProjectStore } from '../../state/projectStore';
import { useToolStore } from '../../state/toolStore';
import { StorageManager } from '../../storage/StorageManager';

export const StatusBar: React.FC = () => {
  const projectName = useProjectStore((s) => s.project.name);
  const dirty = useProjectStore((s) => s.dirty);
  const activeTool = useToolStore((s) => s.activeTool);
  const [saveStatus, setSaveStatus] = React.useState<string>('');

  React.useEffect(() => {
    const interval = setInterval(() => {
      const sm = StorageManager.getInstance();
      const handle = sm.currentProjectHandle;
      if (handle) {
        const lastSave = sm.lastSaveTime;
        if (lastSave) {
          const seconds = Math.floor((Date.now() - lastSave) / 1000);
          if (seconds < 5) setSaveStatus('Saved just now');
          else if (seconds < 60) setSaveStatus(`Saved ${seconds}s ago`);
          else setSaveStatus(`Saved ${Math.floor(seconds / 60)}m ago`);
        } else {
          setSaveStatus(sm.isDirty ? 'Unsaved changes' : '');
        }
      } else {
        setSaveStatus(dirty ? 'Unsaved changes' : '');
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [dirty]);

  return (
    <div
      className="h-[28px] min-h-[28px] flex items-center px-4 gap-3 select-none"
      style={{
        background: 'transparent',
        color: 'var(--color-text-tertiary)',
        fontSize: 'var(--font-size-sm)',
        letterSpacing: '0.01em',
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="font-medium truncate max-w-[220px]"
          style={{ color: 'var(--color-text-secondary)' }}
          title={projectName}
        >
          {projectName || 'Untitled'}
        </span>
        {dirty && (
          <span style={{ color: 'var(--color-warning)', fontSize: 10 }} title="Unsaved changes">●</span>
        )}
      </div>

      <Divider />
      <span className="capitalize">{activeTool.replace('-', ' ')}</span>

      {saveStatus && (<>
        <Divider />
        <span>{saveStatus}</span>
      </>)}

      <div className="flex-1" />

      <FPSIndicator />
      <ResolutionIndicator />
    </div>
  );
};

const Divider: React.FC = () => (
  <span className="w-px h-3 shrink-0" style={{ background: 'var(--color-border)' }} />
);

const FPSIndicator: React.FC = () => {
  const [fps, setFps] = React.useState(0);
  React.useEffect(() => {
    const interval = setInterval(() => {
      const pm = (window as any).__perfMonitor;
      if (pm) setFps(Math.round(pm.averageFps));
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  return (
    <span className="font-mono" style={{ color: fps > 0 ? 'var(--color-text-secondary)' : 'var(--color-text-disabled)' }}>
      {fps > 0 ? `${fps} fps` : '-- fps'}
    </span>
  );
};

const ResolutionIndicator: React.FC = () => {
  const [res, setRes] = React.useState('');
  React.useEffect(() => {
    const interval = setInterval(() => {
      const pm = (window as any).__perfMonitor;
      if (pm) {
        const q = pm.currentQuality;
        setRes(q === 'full' ? 'Full' : q === 'half' ? '1/2' : '1/4');
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);
  return res ? <span style={{ color: 'var(--color-text-disabled)' }}>Res: {res}</span> : null;
};

export default StatusBar;