import React from 'react';
import { Sparkles } from 'lucide-react';
import { useExportStore } from '../../../state/exportStore';

export const RenderPanel: React.FC = () => {
  const openSettings = useExportStore((s) => s.openSettings);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24, gap: 12, height: '100%',
      color: 'var(--color-text-secondary)', fontSize: 11, textAlign: 'center',
    }}>
      <Sparkles size={22} strokeWidth={1.5} style={{ opacity: 0.5 }} />
      <div style={{ maxWidth: 240, lineHeight: 1.5 }}>
        Export has moved to the <strong>Render</strong> menu.
        Use <kbd style={{
          padding: '1px 5px', borderRadius: 3,
          background: 'var(--color-input-bg)',
          border: '1px solid var(--color-border)',
          fontSize: 10, fontFamily: 'monospace',
        }}>Ctrl+M</kbd> or click below.
      </div>
      <button
        onClick={openSettings}
        style={{
          padding: '6px 16px', fontSize: 11, fontWeight: 600,
          background: 'var(--color-accent)',
          border: 'none', borderRadius: 4,
          color: '#ffffff', cursor: 'pointer',
        }}
      >
        Open Export Dialog
      </button>
    </div>
  );
};

export default RenderPanel;