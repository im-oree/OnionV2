import React from 'react';
import { openNewCompositionDialog } from '../dialogs/DialogManager';

export const EmptyStateLanding: React.FC = () => {
  return (
    <div className="w-full h-full flex items-center justify-center bg-app">
      <div className="flex gap-6">
        <LandingCard
          title="New Composition"
          icon={<CompIcon />}
          onClick={openNewCompositionDialog}
        />
        <LandingCard
          title="Open Project"
          subtitle="From your computer"
          icon={<FolderIcon />}
          onClick={() => {
            // Placeholder — hook up File System Access API in storage phase
            openNewCompositionDialog();
          }}
        />
      </div>
    </div>
  );
};

const LandingCard: React.FC<{
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  onClick: () => void;
}> = ({ title, subtitle, icon, onClick }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center justify-center gap-3 w-[220px] h-[180px] bg-panel border border-border rounded-md cursor-pointer hover:bg-panel-hover hover:border-accent transition-colors"
  >
    <div className="text-text-secondary">{icon}</div>
    <div className="text-center">
      <div className="text-ui-md text-text-primary">{title}</div>
      {subtitle && (
        <div className="text-ui-xs text-text-disabled mt-1">{subtitle}</div>
      )}
    </div>
  </button>
);

const CompIcon: React.FC = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="6" y="10" width="36" height="28" rx="2" />
    <path d="M6 16 h36" />
    <circle cx="10" cy="13" r="1" fill="currentColor" />
    <circle cx="14" cy="13" r="1" fill="currentColor" />
    <path d="M18 24 l6 4 l-6 4 z" fill="currentColor" />
  </svg>
);

const FolderIcon: React.FC = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M6 14 h12 l4 4 h20 v22 h-36 z" />
  </svg>
);