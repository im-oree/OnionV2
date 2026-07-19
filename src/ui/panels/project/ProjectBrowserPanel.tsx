import React, { useState, useCallback } from 'react';
import { Plus, Search, X, Film, Folder, Image, Music, FileCode } from 'lucide-react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useProjectStore } from '../../../state/projectStore';
import { openNewCompositionDialog } from '../../dialogs/DialogManager';
import { assetManager } from '../../../storage/AssetManager';
import { createLayerInstance } from '../../../utils/createLayerInstance';
import { useNotificationStore } from '../../../state/notificationStore';

const DOT_COLORS = ['#ff6b8a', '#ff9a5c', '#f0d060', '#6ad588', '#4dd4d1', '#5b8fff', '#8b6aff'];

const IconBtn: React.FC<{ onClick?: () => void; title?: string; children: React.ReactNode }> = ({ onClick, title, children }) => (
  <button onClick={onClick} title={title}
    className="w-6 h-6 flex items-center justify-center border-0 bg-transparent cursor-pointer text-text-secondary hover:text-text-primary rounded-sm transition-colors"
    style={{ transitionDuration: 'var(--dur-fast)' }}>
    {children}
  </button>
);

export const ProjectBrowserPanel: React.FC = () => {
  const compositions = useCompositionStore((s) => s.compositions);
  const activeCompId = useCompositionStore((s) => s.activeCompositionId);
  const setActive = useCompositionStore((s) => s.setActiveComposition);
  const removeComp = useCompositionStore((s) => s.removeComposition);
  const project = useProjectStore((s) => s.project);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const addNotif = useNotificationStore((s) => s.addNotification);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    const state = useCompositionStore.getState();
    const compId = state.activeCompositionId;
    if (!compId) {
      addNotif({ type: 'warning', message: 'Create a composition first before importing.', autoDismiss: 3000 });
      return;
    }
    const comp = state.compositions.find(c => c.id === compId);
    if (!comp) return;
    let imported = 0;
    for (const file of files) {
      // SVG import: parse and create shape layers directly
      if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
        try {
          const { importSvgFile } = await import('../../../utils/svgImport');
          const count = await importSvgFile(file, compId);
          if (count > 0) {
            imported++;
            addNotif({ type: 'success', message: `Imported SVG with ${count} shape${count === 1 ? '' : 's'}`, autoDismiss: 3000 });
          }
        } catch (e) {
          addNotif({ type: 'error', message: `Failed to import SVG: ${(e as Error).message}` });
        }
        continue;
      }
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) continue;
      try {
        const asset = await assetManager.importFile(file);
        const type = asset.type === 'video' ? 'video' : 'image';
        const layer = createLayerInstance(type, comp, {
          name: asset.name,
          data: type === 'video'
            ? { assetId: asset.id, naturalWidth: asset.naturalWidth, naturalHeight: asset.naturalHeight, duration: asset.duration ?? 10, muted: false, volume: 1, playbackRate: 1 }
            : { assetId: asset.id, naturalWidth: asset.naturalWidth, naturalHeight: asset.naturalHeight },
        });
        state.addLayer(compId, layer);
        imported++;
      } catch (err) { /* skip */ }
    }
    if (imported > 0) {
      addNotif({ type: 'success', message: `Imported ${imported} file${imported > 1 ? 's' : ''}`, autoDismiss: 3000 });
    }
  }, [addNotif]);

  const importSvgClick = useCallback(() => {
    const compId = useCompositionStore.getState().activeCompositionId;
    if (!compId) {
      addNotif({ type: 'warning', message: 'Create a composition first.', autoDismiss: 3000 });
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.svg,image/svg+xml';
    input.multiple = true;
    input.onchange = async () => {
      const files = input.files ? Array.from(input.files) : [];
      let total = 0;
      for (const f of files) {
        try {
          const { importSvgFile } = await import('../../../utils/svgImport');
          const count = await importSvgFile(f, compId);
          total += count;
        } catch (e) { console.warn('SVG import failed:', e); }
      }
      if (total > 0) {            addNotif({ type: 'success', message: `Imported SVG with ${total} shape${total === 1 ? '' : 's'}`, autoDismiss: 3000 });
      }
    };
    input.click();
  }, [addNotif]);

  const activeComp = compositions.find(c => c.id === activeCompId);
  const filteredComps = compositions.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  const filteredAssets = project.assets.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div
      className="flex flex-col h-full panel"
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      style={dragOver ? { outline: '2px dashed var(--color-accent)', outlineOffset: -2 } : undefined}
    >
      <div className="flex items-center px-4 shrink-0" style={{ height: 40, borderBottom: '1px solid var(--color-border)' }}>
        <span className="flex-1" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>Project</span>
        <IconBtn onClick={() => setShowSearch(!showSearch)} title="Search"><Search size={14} strokeWidth={1.75} /></IconBtn>
        <IconBtn onClick={importSvgClick} title="Import SVG"><FileCode size={14} strokeWidth={1.75} /></IconBtn>
        <IconBtn onClick={openNewCompositionDialog} title="New Composition"><Plus size={15} strokeWidth={2} /></IconBtn>
      </div>

      {activeComp && (
        <div className="px-4 py-4 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ width: '100%', aspectRatio: '1/1', maxHeight: 140, borderRadius: 'var(--radius-md)', background: activeComp.backgroundColor || '#1a1c22', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <div style={{ width: '70%', height: '70%', borderRadius: 'var(--radius-sm)', background: `linear-gradient(135deg, ${activeComp.backgroundColor || '#2a2e38'}, ${activeComp.backgroundColor || '#1a1c22'})`, opacity: 0.6 }} />
          </div>
          <div className="mt-3">
            <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--color-text-primary)' }}>{activeComp.name}</div>
            <div className="mt-1" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family-mono)' }}>{activeComp.width} x {activeComp.height} px</div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family-mono)' }}>{formatDuration(activeComp.duration)} {activeComp.fps} fps</div>
          </div>
        </div>
      )}

      {showSearch && (
        <div className="px-3 py-2 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2" style={{ height: 30, padding: '0 10px', background: 'var(--color-input-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
            <Search size={13} strokeWidth={1.75} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
            <input type="text" placeholder="Search project..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 bg-transparent border-0 outline-none" style={{ color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }} autoFocus />
            {search && <button onClick={() => setSearch('')} className="border-0 bg-transparent cursor-pointer" style={{ color: 'var(--color-text-disabled)' }}><X size={12} strokeWidth={2} /></button>}
          </div>
        </div>
      )}

      {dragOver && (
        <div className="px-4 py-3 text-center" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-accent)' }}>
          Drop files to import
        </div>
      )}

      <div className="flex-1 overflow-auto py-2">
        {filteredComps.map((comp, i) => (
          <ProjectItem
            key={comp.id}
            icon={<Film size={18} strokeWidth={1.5} />}
            iconBg={comp.backgroundColor || '#2a2e38'}
            name={comp.name}
            info={comp.width + ' x ' + comp.height + ' px'}
            dotColor={DOT_COLORS[i % DOT_COLORS.length]}
            isActive={comp.id === activeCompId}
            onClick={() => setActive(comp.id)}
            onDoubleClick={() => {
              if (activeCompId && activeCompId !== comp.id) {
                const r = useCompositionStore.getState().addCompLayer(activeCompId, comp.id);
                if (!r.ok) alert(r.reason ?? 'Could not add');
              }
            }}
            onDelete={() => {
              const r = removeComp(comp.id);
              if (!r.ok) alert(r.reason ?? 'Cannot delete');
            }}
            draggable
            onDragStart={(e) => { e.dataTransfer.setData('text/plain', 'comp:' + comp.id); e.dataTransfer.effectAllowed = 'copy'; }}
          />
        ))}

        {filteredAssets.length > 0 && (
          <>
            <div className="my-2 mx-4" style={{ height: 1, background: 'var(--color-divider)' }} />
            {filteredAssets.map((a, i) => (
              <ProjectItem
                key={a.id}
                icon={getAssetIcon(a.type)}
                iconBg="#1e2029"
                name={a.name}
                info={a.type}
                dotColor={DOT_COLORS[(filteredComps.length + i) % DOT_COLORS.length]}
              />
            ))}
          </>
        )}

        {filteredComps.length === 0 && filteredAssets.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 gap-3">
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-disabled)' }}>
              {search ? 'No results' : 'Empty project'}
            </div>
            {!search && (
              <button onClick={openNewCompositionDialog} className="border-0 bg-transparent cursor-pointer"
                style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-accent)', fontWeight: 500 }}>
                + New Composition
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface ProjectItemProps {
  icon: React.ReactNode;
  iconBg: string;
  name: string;
  info: string;
  dotColor: string;
  isActive?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onDelete?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}

const ProjectItem: React.FC<ProjectItemProps> = ({
  icon, iconBg, name, info, dotColor, isActive, onClick, onDoubleClick, onDelete, draggable, onDragStart,
}) => (
  <div
    draggable={draggable}
    onDragStart={onDragStart}
    onClick={onClick}
    onDoubleClick={onDoubleClick}
    className="group flex items-center gap-3 cursor-pointer transition-colors mx-2 px-3"
    style={{
      height: 48, borderRadius: 'var(--radius-sm)',
      background: isActive ? 'var(--color-accent-muted)' : 'transparent',
    }}
    onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--color-panel-hover)'; }}
    onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
  >
    <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--color-text-secondary)' }}>{icon}</div>
    <div className="flex-1 min-w-0">
      <div className="truncate" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>{name}</div>
      <div className="truncate" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family-mono)' }}>{info}</div>
    </div>
    <div style={{ width: 10, height: 10, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
    {onDelete && (
      <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="border-0 bg-transparent cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity shrink-0" style={{ color: 'var(--color-text-disabled)' }}>
        <X size={12} strokeWidth={2} />
      </button>
    )}
  </div>
);

function getAssetIcon(type?: string) {
  if (type === 'image') return <Image size={18} strokeWidth={1.5} />;
  if (type === 'audio') return <Music size={18} strokeWidth={1.5} />;
  return <Folder size={18} strokeWidth={1.5} />;
}

function formatDuration(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
}

export default ProjectBrowserPanel;
