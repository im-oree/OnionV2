import React, { useState } from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useProjectStore } from '../../../state/projectStore';
import { openNewCompositionDialog } from '../../dialogs/DialogManager';

export const ProjectBrowserPanel: React.FC = () => {
  const compositions = useCompositionStore((s) => s.compositions);
  const activeCompId = useCompositionStore((s) => s.activeCompositionId);
  const setActive = useCompositionStore((s) => s.setActiveComposition);
  const removeComp = useCompositionStore((s) => s.removeComposition);
  const project = useProjectStore((s) => s.project);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<{ comps: boolean; assets: boolean }>({
    comps: true,
    assets: true,
  });

  const filteredComps = compositions.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );
  const filteredAssets = project.assets.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center px-2 border-b border-border bg-panel-header"
        style={{ height: 28 }}
      >
        <span className="text-ui-xs text-text-secondary font-medium flex-1">Project</span>
        <button
          className="w-[18px] h-[18px] flex items-center justify-center border-0 bg-transparent cursor-pointer text-text-secondary hover:text-text-primary hover:bg-panel-hover rounded-sm"
          onClick={openNewCompositionDialog}
          title="New Composition"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="px-2 py-1 border-b border-border">
        <input
          type="search"
          placeholder="Search project..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-[20px] text-ui-xs px-1 bg-surface border border-border rounded-sm text-text-primary outline-none focus:border-accent"
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {compositions.length === 0 && project.assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 gap-3">
            <div className="text-ui-xs text-text-disabled">Empty project</div>
            <button
              className="text-ui-xs text-accent hover:text-accent-hover border-0 bg-transparent cursor-pointer underline"
              onClick={openNewCompositionDialog}
            >
              Create composition
            </button>
          </div>
        ) : (
          <>
            {/* Compositions folder */}
            <FolderRow
              label={`Compositions (${filteredComps.length})`}
              expanded={expanded.comps}
              onToggle={() => setExpanded((s) => ({ ...s, comps: !s.comps }))}
            />
            {expanded.comps &&
              filteredComps.map((comp) => (
                <CompRow
                  key={comp.id}
                  name={comp.name}
                  info={`${comp.width}×${comp.height} @ ${comp.fps}fps`}
                  compId={comp.id}
                  activeCompId={activeCompId}
                  isActive={comp.id === activeCompId}
                  onClick={() => setActive(comp.id)}
                  onDelete={() => {
                    const r = removeComp(comp.id);
                    if (!r.ok) alert(r.reason ?? 'Cannot delete');
                  }}
                />
              ))}

            {/* Assets folder */}
            <FolderRow
              label={`Assets (${filteredAssets.length})`}
              expanded={expanded.assets}
              onToggle={() => setExpanded((s) => ({ ...s, assets: !s.assets }))}
            />
            {expanded.assets &&
              (filteredAssets.length === 0 ? (
                <div className="text-ui-xs text-text-disabled px-6 py-1">No assets imported</div>
              ) : (
                filteredAssets.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center h-[22px] px-6 gap-1 text-ui-xs text-text-secondary hover:bg-panel-hover cursor-pointer"
                  >
                    <span className="truncate">{a.name}</span>
                  </div>
                ))
              ))}
          </>
        )}
      </div>
    </div>
  );
};

const FolderRow: React.FC<{
  label: string;
  expanded: boolean;
  onToggle: () => void;
}> = ({ label, expanded, onToggle }) => (
  <div
    className="flex items-center h-[22px] px-2 gap-1 cursor-pointer hover:bg-panel-hover text-ui-xs text-text-secondary font-medium select-none"
    onClick={onToggle}
  >
    <svg
      width="8"
      height="8"
      viewBox="0 0 8 8"
      fill="currentColor"
      className={`transition-transform ${expanded ? 'rotate-90' : ''}`}
    >
      <polygon points="2,0 6,4 2,8" />
    </svg>
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6 l3 -3 h6 l3 3 h6 v14 h-18 z" />
    </svg>
    <span>{label}</span>
  </div>
);

const CompRow: React.FC<{
  name: string;
  info: string;
  compId: string;
  activeCompId: string | null;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}> = ({ name, info, compId, activeCompId, isActive, onClick, onDelete }) => {
  const addAsLayer = () => {
    if (!activeCompId) return;
    if (activeCompId === compId) {
      alert('Cannot add a composition inside itself.');
      return;
    }
    const result = useCompositionStore.getState().addCompLayer(activeCompId, compId);
    if (!result.ok) alert(result.reason ?? 'Could not add composition as layer.');
  };
  return (
    <div
      onClick={onClick}
      onDoubleClick={addAsLayer}
      title={`Click to activate. Double-click to add as layer in ${activeCompId ? 'active comp' : '(no active comp)'}`}
      className={`group flex items-center h-[24px] pl-6 pr-2 gap-2 cursor-pointer text-ui-xs ${
        isActive ? 'bg-accent/30 text-text-primary' : 'text-text-secondary hover:bg-panel-hover'
      }`}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="5" width="18" height="14" rx="1" />
        <path d="M3 9 h18" />
      </svg>
      <span className="truncate flex-1">{name}</span>
      <span className="text-[9px] text-text-disabled shrink-0">{info}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="w-3 h-3 border-0 bg-transparent cursor-pointer text-text-disabled hover:text-danger opacity-0 group-hover:opacity-100"
        title="Delete"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
          <line x1="2" y1="2" x2="8" y2="8" />
          <line x1="8" y1="2" x2="2" y2="8" />
        </svg>
      </button>
    </div>
  );
};

export default ProjectBrowserPanel;