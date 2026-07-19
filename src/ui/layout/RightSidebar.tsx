import React from 'react';
import { useUIStore, type RightSidebarTab } from '../../state/uiStore';
import { Tooltip } from '../common/Tooltip';
import {
  SlidersHorizontal, Sparkles, AlignVerticalJustifyCenter,
  Type, Info, Video, Activity, TrendingUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface TabDef {
  id: RightSidebarTab;
  label: string;
  Icon: LucideIcon;
}

const TABS: TabDef[] = [
  { id: 'properties',  label: 'Properties',  Icon: SlidersHorizontal },
  { id: 'effects',     label: 'Effects',     Icon: Sparkles },
  { id: 'graph',       label: 'Graph Editor', Icon: TrendingUp },
  { id: 'align',       label: 'Align',       Icon: AlignVerticalJustifyCenter },
  { id: 'character',   label: 'Character',   Icon: Type },
  { id: 'info',        label: 'Info',        Icon: Info },
  { id: 'render',      label: 'Render',      Icon: Video },
  { id: 'performance', label: 'Performance', Icon: Activity },
];

export const RightSidebar: React.FC = () => {
  const active = useUIStore((s) => s.activeRightTab);
  const setActive = useUIStore((s) => s.setActiveRightTab);

  return (
    <div className="panel flex flex-col items-center py-4 gap-1 h-full" style={{ width: 36 }}>
      {TABS.map((t) => {
        const isActive = active === t.id;
        return (
          <Tooltip key={t.id} content={t.label} position="left" delay={400}>
            <button
              onClick={() => setActive(t.id)}
              className="flex items-center justify-center border-0 cursor-pointer transition-all"
              style={{
                width: 32, height: 32,
                borderRadius: 'var(--radius-md)',
                background: isActive ? 'var(--color-accent-muted)' : 'transparent',
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
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
              <t.Icon size={16} strokeWidth={isActive ? 2 : 1.75} />
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
};