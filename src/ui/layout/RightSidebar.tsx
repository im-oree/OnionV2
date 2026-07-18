import React from 'react';
import { useUIStore, type RightSidebarTab } from '../../state/uiStore';

interface TabDef {
  id: RightSidebarTab;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabDef[] = [
  { id: 'properties', label: 'Properties', icon: <PropsIcon /> },
  { id: 'effects', label: 'Effects', icon: <FxIcon /> },
  { id: 'align', label: 'Align', icon: <AlignIcon /> },
  { id: 'character', label: 'Character', icon: <CharIcon /> },
  { id: 'info', label: 'Info', icon: <InfoIcon /> },
  { id: 'render', label: 'Render', icon: <RenderIcon /> },
];

export const RightSidebar: React.FC = () => {
  const active = useUIStore((s) => s.activeRightTab);
  const setActive = useUIStore((s) => s.setActiveRightTab);

  return (
    <div className="flex flex-col items-center h-full py-2 gap-1">
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => setActive(t.id)}
          title={t.label}
          className={`w-[26px] h-[26px] flex items-center justify-center border-0 cursor-pointer rounded-sm transition-colors
            ${active === t.id
              ? 'bg-accent text-white'
              : 'bg-transparent text-text-secondary hover:bg-panel-hover'}`}
        >
          {t.icon}
        </button>
      ))}
    </div>
  );
};

function PropsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
      <circle cx="8" cy="6" r="2" fill="currentColor" />
      <circle cx="14" cy="12" r="2" fill="currentColor" />
      <circle cx="10" cy="18" r="2" fill="currentColor" />
    </svg>
  );
}
function FxIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12 h4 l3 -6 l4 12 l3 -6 h1" />
    </svg>
  );
}
function AlignIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="8" height="6" />
      <rect x="3" y="14" width="14" height="6" />
      <line x1="21" y1="2" x2="21" y2="22" />
    </svg>
  );
}
function CharIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="4,7 4,4 20,4 20,7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  );
}
function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="8" x2="12" y2="8" />
      <line x1="12" y1="12" x2="12" y2="16" />
    </svg>
  );
}
function RenderIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3 v18 M3 12 h18 M5.6 5.6 l12.8 12.8 M18.4 5.6 l-12.8 12.8" />
    </svg>
  );
}