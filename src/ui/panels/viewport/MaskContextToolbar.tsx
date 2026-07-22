import React from 'react';
import { useToolStore } from '../../../state/toolStore';
import { TOOLS } from '../../../config/constants';

export const MaskContextToolbar: React.FC = () => {
  const tool = useToolStore(s => s.activeTool);
  const maskShape = useToolStore(s => s.toolSettings.maskShape);
  const updateToolSettings = useToolStore(s => s.updateToolSettings);

  const isMaskTool = tool === (TOOLS.MASK as any);
  if (!isMaskTool) return null;

  const toolbarStyle: React.CSSProperties = {
    position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
    zIndex: 40, display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px',
    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    pointerEvents: 'all',
  };

  const btnStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '4px 12px', cursor: 'pointer',
    background: active ? 'var(--color-accent-muted)' : 'var(--color-input-bg)',
    border: `1.5px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-sm)',
    color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
    fontSize: 'var(--font-size-xs)', fontWeight: active ? 600 : 400,
    transition: 'all 120ms',
  });

  return (
    <div style={toolbarStyle}>
      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginRight: 4 }}>Mask</span>
      <button
        style={btnStyle(maskShape === 'rectangle')}
        onClick={() => updateToolSettings({ maskShape: 'rectangle' })}
        title="Rectangle mask"
      >
        <svg width={14} height={14} viewBox="0 0 14 14">
          <rect x="1" y="1" width="12" height="12" rx="1"
            fill={maskShape === 'rectangle' ? 'var(--color-accent)' : 'var(--color-text-secondary)'}
            fillOpacity={maskShape === 'rectangle' ? 0.2 : 0.15}
            stroke={maskShape === 'rectangle' ? 'var(--color-accent)' : 'var(--color-text-secondary)'}
            strokeWidth="1.5" strokeOpacity={maskShape === 'rectangle' ? 1 : 0.5}
          />
        </svg>
        <span>Rect</span>
      </button>
      <button
        style={btnStyle(maskShape === 'ellipse')}
        onClick={() => updateToolSettings({ maskShape: 'ellipse' })}
        title="Ellipse mask"
      >
        <svg width={14} height={14} viewBox="0 0 14 14">
          <ellipse cx="7" cy="7" rx="6" ry="6"
            fill={maskShape === 'ellipse' ? 'var(--color-accent)' : 'var(--color-text-secondary)'}
            fillOpacity={maskShape === 'ellipse' ? 0.2 : 0.15}
            stroke={maskShape === 'ellipse' ? 'var(--color-accent)' : 'var(--color-text-secondary)'}
            strokeWidth="1.5" strokeOpacity={maskShape === 'ellipse' ? 1 : 0.5}
          />
        </svg>
        <span>Oval</span>
      </button>
      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontStyle: 'italic', marginLeft: 4 }}>
        Click & drag to draw
      </span>
    </div>
  );
};
