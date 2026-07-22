/**
 * EffectsHubPanel — combined panel for Effect Library, Custom Effects,
 * and Transitions, housed under a single sidebar tab with sub-tabs.
 *
 * Reduces sidebar clutter by replacing three individual tabs with one.
 */
import React, { useState } from 'react';
import {
  LibraryBig, Code2, ArrowLeftRight,
} from 'lucide-react';
import { useCustomEffectsStore } from '../../../state/customEffectsStore';
import EffectLibraryPanel from './EffectLibraryPanel';
import CustomEffectPanel from '../customEffect/CustomEffectPanel';
import { TransitionLibraryPanel } from './TransitionLibraryPanel';

type SubTab = 'library' | 'custom' | 'transitions';

const SUB_TABS: { id: SubTab; label: string; Icon: React.ElementType }[] = [
  { id: 'library',     label: 'Library',     Icon: LibraryBig },
  { id: 'custom',      label: 'Custom',      Icon: Code2 },
  { id: 'transitions', label: 'Transitions', Icon: ArrowLeftRight },
];

export const EffectsHubPanel: React.FC = () => {
  const [subTab, setSubTab] = useState<SubTab>('library');
  const customEffectsCount = useCustomEffectsStore((s) => s.effects.length);

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-panel)' }}>
      {/* Sub-tab bar */}
      <div
        className="flex items-center shrink-0 gap-1 px-2"
        style={{ height: 36, borderBottom: '1px solid var(--color-border)' }}
      >
        {SUB_TABS.map((t) => {
          const isActive = subTab === t.id;
          const showBadge = t.id === 'custom' && customEffectsCount > 0;
          return (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className="flex items-center gap-1.5 border-0 cursor-pointer transition-colors relative"
              style={{
                height: 26, padding: '0 10px',
                borderRadius: 'var(--radius-sm)',
                background: isActive ? 'var(--color-accent-muted)' : 'transparent',
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                fontSize: 11,
                fontWeight: isActive ? 600 : 400,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'var(--color-panel-hover)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)';
                }
              }}
            >
              <t.Icon size={13} strokeWidth={isActive ? 2 : 1.75} />
              {t.label}
              {showBadge && (
                <span
                  style={{
                    position: 'absolute', top: -2, right: -2,
                    minWidth: 14, height: 14,
                    borderRadius: 7,
                    fontSize: 9, lineHeight: '14px',
                    textAlign: 'center',
                    padding: '0 3px',
                    background: 'var(--color-accent)',
                    color: '#fff',
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}
                >
                  {customEffectsCount}
                </span>
              )}
            </button>
          );
        })}

        <div className="flex-1" />
      </div>

      {/* Sub-panel content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {subTab === 'library' && <EffectLibraryPanel />}
        {subTab === 'custom' && (
          <CustomEffectPanel />
        )}
        {subTab === 'transitions' && <TransitionLibraryPanel />}
      </div>
    </div>
  );
};

export default EffectsHubPanel;
