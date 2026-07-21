import React, { useState } from 'react';
import {
  AlignHorizontalJustifyStart, AlignHorizontalJustifyCenter, AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd,
  AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter,
} from 'lucide-react';
import { useSelectionStore } from '../../../state/selectionStore';
import { useCompositionStore } from '../../../state/compositionStore';
import { Tooltip } from '../../common/Tooltip';

type AnchorPos = [number, number]; // [0|0.5|1, 0|0.5|1]

export const AlignPanel: React.FC = () => {
  const selectedIds = useSelectionStore((s) => s.selected.filter((x) => x.type === 'layer').map((x) => x.id));
  const comp = useCompositionStore((s) => s.activeCompositionId ? s.compositions.find((c) => c.id === s.activeCompositionId) ?? null : null);
  const [anchor, setAnchor] = useState<AnchorPos>([0.5, 0.5]);

  const alignTo = (mode: 'left'|'centerH'|'right'|'top'|'centerV'|'bottom') => {
    import('../../../utils/alignLayers').then(m => m.alignLayers(mode, 'composition'));
  };

  const alignButtons = [
    { mode: 'left',    label: 'Align Left',     Icon: AlignHorizontalJustifyStart },
    { mode: 'centerH', label: 'Center Horiz.',  Icon: AlignHorizontalJustifyCenter },
    { mode: 'right',   label: 'Align Right',    Icon: AlignHorizontalJustifyEnd },
    { mode: 'top',     label: 'Align Top',      Icon: AlignVerticalJustifyStart },
    { mode: 'centerV', label: 'Center Vert.',   Icon: AlignVerticalJustifyCenter },
    { mode: 'bottom',  label: 'Align Bottom',   Icon: AlignVerticalJustifyEnd },
  ];

  return (
    <div className="flex flex-col h-full p-5 gap-6">
      {/* Anchor Point Grid + Transform display */}
      <div className="flex items-start gap-6">
        <div className="flex-1 space-y-3">
          <SLabel>Position</SLabel>
          <div className="grid grid-cols-2 gap-3">
            <ValBox label="x" value={selectedIds.length === 1 ? getPos(comp, selectedIds[0], 'x') : '—'} />
            <ValBox label="y" value={selectedIds.length === 1 ? getPos(comp, selectedIds[0], 'y') : '—'} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ValBox label="width" value={comp ? String(comp.width) : '—'} />
            <ValBox label="height" value={comp ? String(comp.height) : '—'} />
          </div>
        </div>

        {/* 9-dot anchor grid */}
        <div>
          <SLabel>Anchor</SLabel>
          <div className="mt-2" style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            width: 80, height: 80,
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-input-bg)',
          }}>
            {([0, 0.5, 1] as const).map(ay =>
              ([0, 0.5, 1] as const).map(ax => {
                const isActive = anchor[0] === ax && anchor[1] === ay;
                return (
                  <button
                    key={`${ax}-${ay}`}
                    onClick={() => setAnchor([ax, ay])}
                    className="flex items-center justify-center border-0 bg-transparent cursor-pointer"
                    style={{ width: '100%', height: '100%' }}
                  >
                    <div style={{
                      width: isActive ? 12 : 8,
                      height: isActive ? 12 : 8,
                      borderRadius: '50%',
                      background: isActive ? 'var(--color-accent)' : 'var(--color-text-disabled)',
                      transition: 'all var(--dur-fast) var(--ease-out)',
                      transform: isActive ? 'scale(1)' : 'scale(1)',
                    }}>
                      {isActive && (
                        <svg width="12" height="12" viewBox="0 0 12 12">
                          <line x1="6" y1="2" x2="6" y2="10" stroke="#fff" strokeWidth="1.5" />
                          <line x1="2" y1="6" x2="10" y2="6" stroke="#fff" strokeWidth="1.5" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Alignment buttons */}
      <div>
        <SLabel>Align Layers</SLabel>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {alignButtons.map((b) => (
            <Tooltip key={b.mode} content={b.label} position="top" delay={300}>
              <button
                onClick={() => alignTo(b.mode)}
                className="flex items-center justify-center border-0 cursor-pointer transition-all"
                style={{
                  height: 40, borderRadius: 'var(--radius-md)',
                  background: 'var(--color-input-bg)',
                  color: 'var(--color-text-secondary)',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-panel-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-input-bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)'; }}
              >
                <b.Icon size={18} strokeWidth={1.75} />
              </button>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* Distribute */}
      <div>
        <SLabel>Distribute</SLabel>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Tooltip content="Distribute Horizontally" position="top" delay={300}>
            <button
              onClick={() => import('../../../utils/alignLayers').then(m => m.distributeLayers('horizontal'))}
              className="flex items-center justify-center border-0 cursor-pointer transition-all"
              style={{ height: 40, borderRadius: 'var(--radius-md)', background: 'var(--color-input-bg)', color: 'var(--color-text-secondary)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-panel-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-input-bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)'; }}
            >
              <AlignHorizontalDistributeCenter size={18} strokeWidth={1.75} />
            </button>
          </Tooltip>
          <Tooltip content="Distribute Vertically" position="top" delay={300}>
            <button
              onClick={() => import('../../../utils/alignLayers').then(m => m.distributeLayers('vertical'))}
              className="flex items-center justify-center border-0 cursor-pointer transition-all"
              style={{ height: 40, borderRadius: 'var(--radius-md)', background: 'var(--color-input-bg)', color: 'var(--color-text-secondary)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-panel-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-input-bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)'; }}
            >
              <AlignVerticalDistributeCenter size={18} strokeWidth={1.75} />
            </button>
          </Tooltip>
        </div>
      </div>

      {selectedIds.length === 0 && (
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-disabled)', fontStyle: 'italic' }}>
          Select layers to align
        </div>
      )}
    </div>
  );
};

const SLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    fontSize: 'var(--font-size-xs)', fontWeight: 600,
    letterSpacing: '0.06em', textTransform: 'uppercase',
    color: 'var(--color-text-tertiary)',
  }}>{children}</div>
);

const ValBox: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginBottom: 2 }}>{label}</div>
    <div style={{
      fontSize: 'var(--font-size-lg)', fontWeight: 600,
      color: 'var(--color-text-primary)',
      fontFamily: 'var(--font-family-mono)',
    }}>
      {value} <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--color-text-disabled)' }}>px</span>
    </div>
  </div>
);

function getPos(comp: any, layerId: string, axis: 'x' | 'y'): string {
  if (!comp) return '—';
  const layer = comp.layers.find((l: any) => l.id === layerId);
  if (!layer) return '—';
  return String(Math.round(layer.transform.position[axis]));
}

export default AlignPanel;