/**
 * ProjectBrowserPanel — project browser with hero card, folders,
 * compositions, and assets. Uses design system CSS vars + Tailwind.
 */
import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import {
  Plus,
  Search,
  X,
  Film,
  Folder as FolderIcon,
  FolderOpen,
  Image as ImageIcon,
  Music,
  FileCode,
  Eye,
  Trash2,
  Edit3,
  Filter,
  ChevronRight,
  ChevronDown as ChevronDownI,
  FolderPlus,
  Box as BoxIcon,
} from 'lucide-react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useProjectStore } from '../../../state/projectStore';
import { openNewCompositionDialog } from '../../dialogs/DialogManager';
import { assetManager, type Asset } from '../../../storage/AssetManager';
import { createLayerInstance } from '../../../utils/createLayerInstance';
import { useSelectionStore } from '../../../state/selectionStore';
import { useNotificationStore } from '../../../state/notificationStore';
import { resolveAsset } from '../../../utils/assetResolver';
import { confirm } from '../../common/ConfirmDialog';
import { useContextMenu } from '../../common/useContextMenu';
import { ContextMenu } from '../../common/ContextMenu';
import type { ContextMenuItem } from '../../common/ContextMenu';
import { buildProjectTree } from '../../../utils/projectTree';

const DOT_COLORS = [
  '#ff6b8a', '#ff9a5c', '#f0d060',
  '#6ad588', '#4dd4d1', '#5b8fff', '#8b6aff',
];

// Gradient pairs used as fallback thumbnails
const THUMB_GRADIENTS: [string, string][] = [
  ['#ff8a95', '#ff6a75'],
  ['#ffb178', '#ff8a5c'],
  ['#f9d872', '#f0c040'],
  ['#8ce09a', '#5cc472'],
  ['#7de5e2', '#4cc4c1'],
  ['#7ba9ff', '#4a80ea'],
  ['#a08bff', '#7a5cff'],
];

function hashName(name: string): number {
  return name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
}

// ── IconBtn ──────────────────────────────────────────────────

const IconBtn: React.FC<{
  onClick?: () => void;
  title?: string;
  children: React.ReactNode;
  active?: boolean;
}> = React.memo(({ onClick, title, children, active }) => (
  <button
    onClick={onClick}
    title={title}
    className="w-6 h-6 flex items-center justify-center border-0 cursor-pointer rounded-sm transition-colors"
    style={{
      background: active ? 'var(--color-accent-muted)' : 'transparent',
      color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
      transitionDuration: 'var(--dur-fast)',
    }}
    onMouseEnter={(e) => {
      if (!active) {
        (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)';
      }
    }}
    onMouseLeave={(e) => {
      if (!active) {
        (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)';
      }
    }}
  >
    {children}
  </button>
));
IconBtn.displayName = 'IconBtn';

// ── Composition hero card ────────────────────────────────────

const CompHero: React.FC<{
  comp: {
    name: string;
    width: number;
    height: number;
    duration: number;
    fps: number;
    backgroundColor?: string;
  };
}> = React.memo(({ comp }) => {
  const [c1, c2] = useMemo(() => {
    return THUMB_GRADIENTS[hashName(comp.name) % THUMB_GRADIENTS.length];
  }, [comp.name]);

  return (
    <div
      className="px-4 py-4 shrink-0"
      style={{ borderBottom: '1px solid var(--color-border)' }}
    >
      <div
        style={{
          width: '100%',
          aspectRatio: '1/1',
          maxHeight: 160,
          borderRadius: 'var(--radius-md)',
          background: comp.backgroundColor || '#1a1c22',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        }}
      >
        <div
          style={{
            width: '65%',
            height: '65%',
            borderRadius: 'var(--radius-sm)',
            background: `linear-gradient(135deg, ${c1}, ${c2})`,
            boxShadow: '0 8px 20px rgba(0,0,0,0.35)',
          }}
        />
      </div>
      <div className="mt-3">
        <div style={{
          fontSize: 'var(--font-size-lg)',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
        }}>
          {comp.name}
        </div>
        <div className="mt-1" style={{
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-tertiary)',
          fontFamily: 'var(--font-family-mono)',
        }}>
          {comp.width} × {comp.height} px
        </div>
        <div style={{
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-tertiary)',
          fontFamily: 'var(--font-family-mono)',
        }}>
          {formatDuration(comp.duration)} · {comp.fps} fps
        </div>
      </div>
    </div>
  );
});
CompHero.displayName = 'CompHero';

// ── Asset row ────────────────────────────────────────────────

const AssetRow: React.FC<{
  asset: { id: string; name: string; type: string };
  dotColor: string;
  isSelected: boolean;
  isHighlighted: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onPreview: () => void;
}> = ({
  asset,
  dotColor,
  isSelected,
  isHighlighted,
  onClick,
  onDoubleClick,
  onDragStart,
  onContextMenu,
  onPreview,
}) => {
  const [thumb, setThumb] = useState<string | null>(null);

  useEffect(() => {
    const full = assetManager.getAsset(asset.id);
    if (!full?.url) return;

    let cancelled = false;

    if (full.thumbnail) {
      setThumb(full.thumbnail);
      return;
    }

    if (asset.type === 'video') {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      video.onloadeddata = () => {
        if (cancelled) return;
        video.currentTime = Math.min(0.5, (video.duration || 1) * 0.1);
      };

      video.onseeked = () => {
        if (cancelled) return;
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 96;
          const vw = video.videoWidth || 64;
          const vh = video.videoHeight || 64;
          const scale = Math.min(maxDim / vw, maxDim / vh);
          canvas.width = Math.round(vw * scale);
          canvas.height = Math.round(vh * scale);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            if (!cancelled) setThumb(canvas.toDataURL('image/jpeg', 0.7));
          }
        } catch { /* ignore */ }
        video.src = '';
      };

      video.onerror = () => {
        if (!cancelled) video.src = '';
      };

      video.src = full.url;

      return () => {
        cancelled = true;
        video.onloadeddata = null;
        video.onseeked = null;
        video.onerror = null;
        video.src = '';
      };
    }

    if (asset.type === 'image') {
      const img = new window.Image();
      img.onload = () => {
        if (cancelled) return;
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 96;
          const scale = Math.min(
            maxDim / img.naturalWidth,
            maxDim / img.naturalHeight,
          );
          canvas.width = Math.round(img.naturalWidth * scale);
          canvas.height = Math.round(img.naturalHeight * scale);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            if (!cancelled) setThumb(canvas.toDataURL('image/jpeg', 0.7));
          }
        } catch { /* ignore */ }
      };
      img.src = full.url;

      return () => {
        cancelled = true;
        img.onload = null;
      };
    }

    return () => { cancelled = true; };
  }, [asset.id, asset.type]);

  const icon = useMemo(() => {
    switch (asset.type) {
      case 'image': return <ImageIcon size={18} strokeWidth={1.5} />;
      case 'video': return <Film size={18} strokeWidth={1.5} />;
      case 'audio': return <Music size={18} strokeWidth={1.5} />;
      case 'model3d': return <BoxIcon size={18} strokeWidth={1.5} />;
      default: return <FolderIcon size={18} strokeWidth={1.5} />;
    }
  }, [asset.type]);

  const [thumbC1, thumbC2] = useMemo(() => {
    return THUMB_GRADIENTS[hashName(asset.name) % THUMB_GRADIENTS.length];
  }, [asset.name]);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      data-asset-id={asset.id}
      className="group flex items-center gap-3 cursor-pointer transition-colors mx-2 px-3"
      style={{
        height: 52,
        borderRadius: 'var(--radius-sm)',
        background: isSelected ? 'var(--color-accent-muted)' : 'transparent',
        boxShadow: isHighlighted
          ? 'inset 0 0 0 2px var(--color-accent)'
          : 'none',
        transition: 'box-shadow 300ms ease-out, background 150ms ease-out',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          (e.currentTarget as HTMLElement).style.background = 'var(--color-panel-hover)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
        }
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 'var(--radius-sm)',
          background: thumb
            ? `url(${thumb}) center/cover`
            : `linear-gradient(135deg, ${thumbC1}, ${thumbC2})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: '#fff',
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
          position: 'relative',
        }}
      >
        {!thumb && icon}
        {/* Small colored indicator dot on thumbnail */}
        <div
          style={{
            position: 'absolute',
            top: 3,
            right: 3,
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: dotColor,
            boxShadow: '0 0 0 1.5px rgba(0,0,0,0.3)',
          }}
        />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div
          className="truncate"
          style={{
            fontSize: 'var(--font-size-sm)',
            fontWeight: 500,
            color: 'var(--color-text-primary)',
            marginBottom: 2,
          }}
        >
          {asset.name}
        </div>
        <div
          className="truncate"
          style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-tertiary)',
            fontFamily: 'var(--font-family-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {asset.type}
        </div>
      </div>

      {/* Right dot */}
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: dotColor,
          flexShrink: 0,
          boxShadow: `0 0 8px ${dotColor}40`,
        }}
      />

      {/* Preview button */}
      <button
        onClick={(e) => { e.stopPropagation(); onPreview(); }}
        className="border-0 bg-transparent cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        style={{ color: 'var(--color-text-disabled)', padding: 2 }}
        title="Preview"
      >
        <Eye size={12} strokeWidth={2} />
      </button>
    </div>
  );
};

// ── Composition row ──────────────────────────────────────────

const CompRow: React.FC<{
  comp: {
    id: string;
    name: string;
    width: number;
    height: number;
    backgroundColor?: string;
  };
  dotColor: string;
  isActive: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
  onDelete: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent) => void;
}> = ({
  comp,
  dotColor,
  isActive,
  onClick,
  onDoubleClick,
  onDelete,
  onContextMenu,
  onDragStart,
}) => {
  const [c1, c2] = useMemo(() => {
    return THUMB_GRADIENTS[hashName(comp.name) % THUMB_GRADIENTS.length];
  }, [comp.name]);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      data-comp-id={comp.id}
      className="group flex items-center gap-3 cursor-pointer transition-colors mx-2 px-3"
      style={{
        height: 52,
        borderRadius: 'var(--radius-sm)',
        background: isActive ? 'var(--color-accent-muted)' : 'transparent',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.background = 'var(--color-panel-hover)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
        }
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 'var(--radius-sm)',
          background: comp.backgroundColor || '#2a2e38',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: '65%',
            height: '65%',
            borderRadius: 'var(--radius-xs, 3px)',
            background: `linear-gradient(135deg, ${c1}, ${c2})`,
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="truncate"
          style={{
            fontSize: 'var(--font-size-sm)',
            fontWeight: isActive ? 600 : 500,
            color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            marginBottom: 2,
          }}
        >
          {comp.name}
        </div>
        <div
          className="truncate"
          style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-tertiary)',
            fontFamily: 'var(--font-family-mono)',
          }}
        >
          {comp.width} × {comp.height} px
        </div>
      </div>
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: dotColor,
          flexShrink: 0,
          boxShadow: `0 0 8px ${dotColor}40`,
        }}
      />
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="border-0 bg-transparent cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        style={{ color: 'var(--color-text-disabled)' }}
        title="Delete"
      >
        <X size={12} strokeWidth={2} />
      </button>
    </div>
  );
};

// ── Folder row ───────────────────────────────────────────────

const FolderRow: React.FC<{
  folder: import('../../../types/project').ProjectFolder;
  depth: number;
  hasChildren: boolean;
  onToggle: () => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
  onDrop: (payload: { kind: 'asset' | 'comp' | 'folder'; id: string }) => void;
}> = ({
  folder, depth, hasChildren, onToggle, onRename, onDelete, onDrop,
}) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(folder.name);
  const [dragOver, setDragOver] = useState(false);
  const expanded = folder.expanded ?? true;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const treeJson = e.dataTransfer.getData('application/onion-tree');
    if (treeJson) {
      try {
        const payload = JSON.parse(treeJson);
        if (payload?.kind && payload?.id) { onDrop(payload); return; }
      } catch { /* fall through */ }
    }
    const assetId = e.dataTransfer.getData('application/onion-asset');
    if (assetId) { onDrop({ kind: 'asset', id: assetId }); return; }
  };

  return (
    <div
      className="group flex items-center gap-2 cursor-pointer mx-2 px-2 select-none"
      style={{
        height: 30,
        marginLeft: depth * 16,
        borderRadius: 'var(--radius-sm)',
        background: dragOver ? 'var(--color-accent-muted)' : 'transparent',
        outline: dragOver ? '1px dashed var(--color-accent)' : 'none',
      }}
      onClick={onToggle}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(
          'application/onion-tree',
          JSON.stringify({ kind: 'folder', id: folder.id }),
        );
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
      onMouseEnter={(e) => {
        if (!dragOver) {
          (e.currentTarget as HTMLElement).style.background = 'var(--color-panel-hover)';
        }
      }}
      onMouseLeave={(e) => {
        if (!dragOver) {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
        }
      }}
    >
      {hasChildren ? (
        expanded
          ? <ChevronDownI size={12} style={{ color: 'var(--color-text-tertiary)' }} />
          : <ChevronRight size={12} style={{ color: 'var(--color-text-tertiary)' }} />
      ) : (
        <span style={{ width: 12 }} />
      )}
      {expanded
        ? <FolderOpen size={14} style={{ color: 'var(--color-accent)' }} />
        : <FolderIcon size={14} style={{ color: 'var(--color-text-secondary)' }} />
      }
      {editing ? (
        <input
          type="text"
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            if (name.trim() && name !== folder.name) onRename(name.trim());
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') { setName(folder.name); setEditing(false); }
          }}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 outline-none"
          style={{
            height: 22,
            padding: '0 6px',
            background: 'var(--color-input-bg)',
            border: '1px solid var(--color-accent)',
            borderRadius: 'var(--radius-xs, 3px)',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--font-size-sm)',
          }}
        />
      ) : (
        <span
          className="flex-1 truncate"
          style={{
            fontSize: 'var(--font-size-sm)',
            fontWeight: 500,
            color: 'var(--color-text-primary)',
          }}
        >
          {folder.name}
        </span>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="border-0 bg-transparent cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        style={{ color: 'var(--color-text-disabled)' }}
        title="Delete folder"
      >
        <X size={12} strokeWidth={2} />
      </button>
    </div>
  );
};

// ── Filter chip ──────────────────────────────────────────────

const FilterChip: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
}> = React.memo(({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className="border-0 cursor-pointer transition-colors"
    style={{
      height: 22,
      padding: '0 10px',
      borderRadius: 11,
      fontSize: 'var(--font-size-xs)',
      fontWeight: active ? 600 : 500,
      color: active ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
      background: active ? 'var(--color-accent-muted)' : 'transparent',
    }}
    onMouseEnter={(e) => {
      if (!active) {
        (e.currentTarget as HTMLElement).style.background = 'var(--color-panel-hover)';
        (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)';
      }
    }}
    onMouseLeave={(e) => {
      if (!active) {
        (e.currentTarget as HTMLElement).style.background = 'transparent';
        (e.currentTarget as HTMLElement).style.color = 'var(--color-text-tertiary)';
      }
    }}
  >
    {label}
  </button>
));
FilterChip.displayName = 'FilterChip';

// ── Asset preview modal ─────────────────────────────────────

const AssetPreviewModal: React.FC<{
  asset: Asset;
  onClose: () => void;
  onAdd: () => void;
}> = ({ asset, onClose, onAdd }) => (
  <div
    className="fixed inset-0 flex items-center justify-center"
    style={{
      zIndex: 9999,
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(4px)',
    }}
    onClick={onClose}
  >
    <div
      className="flex flex-col gap-3"
      style={{
        background: 'var(--color-panel)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        padding: 20,
        maxWidth: '85vw',
        maxHeight: '85vh',
        minWidth: 340,
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2">
        <span
          className="flex-1 truncate"
          style={{
            fontSize: 'var(--font-size-md)',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
          }}
        >
          {asset.name}
        </span>
        <button
          onClick={onClose}
          className="border-0 bg-transparent cursor-pointer"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <X size={14} />
        </button>
      </div>
      <div
        className="flex items-center justify-center overflow-hidden"
        style={{
          background: '#0a0a10',
          borderRadius: 'var(--radius-sm)',
          minHeight: 240,
          maxHeight: '60vh',
        }}
      >
        {asset.type === 'image' && asset.url ? (
          <img
            src={asset.url}
            alt={asset.name}
            style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain' }}
          />
        ) : asset.type === 'video' && asset.url ? (
          <video
            src={asset.url}
            controls
            style={{ maxWidth: '100%', maxHeight: '60vh' }}
          />
        ) : (
          <div style={{
            color: 'var(--color-text-disabled)',
            fontSize: 'var(--font-size-sm)',
          }}>
            No preview available
          </div>
        )}
      </div>
      <div style={{
        fontSize: 'var(--font-size-xs)',
        color: 'var(--color-text-tertiary)',
        fontFamily: 'var(--font-family-mono)',
      }}>
        {asset.naturalWidth} × {asset.naturalHeight} px · {formatFileSize(asset.size)}
      </div>
      <button
        onClick={onAdd}
        className="self-end border-0 cursor-pointer"
        style={{
          background: 'var(--color-accent)',
          color: '#fff',
          borderRadius: 'var(--radius-sm)',
          padding: '8px 18px',
          fontSize: 'var(--font-size-sm)',
          fontWeight: 500,
        }}
      >
        Add to Timeline
      </button>
    </div>
  </div>
);

// ── Main component ──────────────────────────────────────────

export const ProjectBrowserPanel: React.FC = () => {
  const compositions = useCompositionStore((s) => s.compositions);
  const activeCompId = useCompositionStore((s) => s.activeCompositionId);
  const setActive = useCompositionStore((s) => s.setActiveComposition);
  const removeComp = useCompositionStore((s) => s.removeComposition);
  const project = useProjectStore((s) => s.project);
  const folders = useProjectStore((s) => s.project.folders ?? []);
  const addFolder = useProjectStore((s) => s.addFolder);
  const removeFolder = useProjectStore((s) => s.removeFolder);
  const renameFolder = useProjectStore((s) => s.renameFolder);
  const moveFolder = useProjectStore((s) => s.moveFolder);
  const toggleFolder = useProjectStore((s) => s.toggleFolder);
  const moveAssetToFolder = useProjectStore((s) => s.moveAssetToFolder);
  const moveCompToFolder = useProjectStore((s) => s.moveCompToFolder);

  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const addNotif = useNotificationStore((s) => s.addNotification);
  const [dragOver, setDragOver] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const [highlightedAsset, setHighlightedAsset] = useState<string | null>(null);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<
    'all' | 'image' | 'video' | 'audio' | 'model3d'
  >('all');
  const [showBatchRename, setShowBatchRename] = useState(false);
  const [batchFind, setBatchFind] = useState('');
  const [batchReplace, setBatchReplace] = useState('');
  const lastClickedIdx = useRef<number>(-1);
  const panelCtx = useContextMenu();

  // Reveal asset event
  useEffect(() => {
    const handler = (e: Event) => {
      const assetId = (e as CustomEvent).detail?.assetId;
      if (!assetId) return;
      setHighlightedAsset(assetId);
      setTimeout(() => {
        const el = document.querySelector(`[data-asset-id="${assetId}"]`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => setHighlightedAsset(null), 2000);
        }
      }, 100);
    };
    document.addEventListener('project:revealAsset', handler);
    return () => document.removeEventListener('project:revealAsset', handler);
  }, []);

  // Sync AssetManager → projectStore
  useEffect(() => {
    const sync = () => {
      const allAssets = assetManager.getAllAssets();
      const projStore = useProjectStore.getState();
      for (const a of allAssets) {
        const exists = projStore.project.assets.some((pa) => pa.id === a.id);
        if (!exists) {
          projStore.addAsset({
            id: a.id,
            name: a.name,
            type: a.type,
            path: a.url,
            size: a.size,
            originalName: a.name,
            mimeType: a.mimeType,
            importedAt: a.importedAt,
            naturalWidth: a.naturalWidth,
            naturalHeight: a.naturalHeight,
            duration: a.duration,
          });
        }
      }
    };
    sync();
    assetManager.events.on('assets:changed', sync);
    return () => { assetManager.events.off('assets:changed', sync); };
  }, []);

  // Drop handling
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    let imported = 0;
    for (const file of files) {
      if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
        try {
          const compId = useCompositionStore.getState().activeCompositionId;
          if (!compId) {
            addNotif({
              type: 'warning',
              message: 'Create a composition first before importing SVG.',
              autoDismiss: 3000,
            });
            continue;
          }
          const { importSvgFile } = await import('../../../utils/svgImport');
          const count = await importSvgFile(file, compId);
          if (count > 0) {
            imported++;
            addNotif({
              type: 'success',
              message: `Imported SVG with ${count} shape${count === 1 ? '' : 's'}`,
              autoDismiss: 3000,
            });
          }
        } catch (err) {
          addNotif({
            type: 'error',
            message: `Failed to import SVG: ${(err as Error).message}`,
          });
        }
        continue;
      }

      try {
        await assetManager.importFile(file);
        imported++;
      } catch (err) {
        addNotif({
          type: 'error',
          message: `Failed to import "${file.name}": ${(err as Error)?.message ?? 'Unknown error'}`,
        });
      }
    }

    if (imported > 0) {
      addNotif({
        type: 'success',
        message: `Imported ${imported} file${imported > 1 ? 's' : ''}`,
        autoDismiss: 3000,
      });
    }
  }, [addNotif]);

  const importFiles = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,video/*,audio/*,.svg,.glb,.gltf,.obj,.ply,.stl';
    input.onchange = async () => {
      const files = input.files ? Array.from(input.files) : [];
      let imported = 0;
      for (const file of files) {
        try { await assetManager.importFile(file); imported++; } catch { /* skip */ }
      }
      if (imported > 0) {
        addNotif({
          type: 'success',
          message: `Imported ${imported} file${imported > 1 ? 's' : ''}`,
          autoDismiss: 3000,
        });
      }
    };
    input.click();
  }, [addNotif]);

  const importSvgClick = useCallback(() => {
    const compId = useCompositionStore.getState().activeCompositionId;
    if (!compId) {
      addNotif({
        type: 'warning',
        message: 'Create a composition first.',
        autoDismiss: 3000,
      });
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
        } catch { /* skip */ }
      }
      if (total > 0) {
        addNotif({
          type: 'success',
          message: `Imported ${total} shape${total === 1 ? '' : 's'}`,
          autoDismiss: 3000,
        });
      }
    };
    input.click();
  }, [addNotif]);

  const handleAssetDoubleClick = useCallback((assetId: string) => {
    const state = useCompositionStore.getState();
    const compId = state.activeCompositionId;
    if (!compId) {
      addNotif({
        type: 'warning',
        message: 'Select a composition first.',
        autoDismiss: 3000,
      });
      return;
    }
    const comp = state.compositions.find((c) => c.id === compId);
    if (!comp) return;

    const asset = resolveAsset(assetId);
    if (!asset) {
      addNotif({
        type: 'warning',
        message: 'Asset not found.',
        autoDismiss: 3000,
      });
      return;
    }

    const layer = createLayerInstance(asset.type, comp, { name: asset.name });
    const layerData = (layer as any).data ?? {};
    layerData.assetId = asset.id;

    if (asset.type === 'model3d') {
      const fullAsset = assetManager.getAsset(asset.id);
      layerData.url = fullAsset?.url ?? '';
      layerData.format = 'gltf';
      layerData.scale = 1;
    } else if (asset.type === 'video') {
      layerData.duration = asset.duration ?? 10;
    }

    (layer as any).data = layerData;
    state.addLayer(compId, layer);
    useSelectionStore.getState().select({
      type: 'layer',
      id: layer.id,
      compositionId: compId,
    });
    addNotif({
      type: 'info',
      message: `Added "${asset.name}" to timeline`,
      autoDismiss: 2000,
    });
  }, [addNotif]);

  const handleAssetDragStart = useCallback(
    (e: React.DragEvent, assetId: string) => {
      e.dataTransfer.setData('application/onion-asset', assetId);
      e.dataTransfer.effectAllowed = 'copy';
    },
    [],
  );

  const activeComp = compositions.find((c) => c.id === activeCompId);
  const filteredComps = compositions.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );
  const filteredAssets = project.assets.filter((a) => {
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || a.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const tree = useMemo(
    () => buildProjectTree(folders, filteredComps, filteredAssets),
    [folders, filteredComps, filteredAssets],
  );

  const isAssetUsed = useCallback((assetId: string): boolean => {
    for (const comp of useCompositionStore.getState().compositions) {
      for (const layer of comp.layers) {
        const data = layer.data as any;
        if (data?.assetId === assetId) return true;
      }
    }
    return false;
  }, []);

  const unusedCount = project.assets.filter((a) => !isAssetUsed(a.id)).length;

  const handleAssetClick = useCallback(
    (assetId: string, idx: number, ctrl: boolean, shift: boolean) => {
      setSelectedAssets((prev) => {
        const next = new Set(prev);
        if (shift && lastClickedIdx.current >= 0) {
          const allIds = filteredAssets.map((a) => a.id);
          const from = Math.max(0, Math.min(lastClickedIdx.current, idx));
          const to = Math.min(allIds.length - 1, Math.max(lastClickedIdx.current, idx));
          for (let i = from; i <= to; i++) next.add(allIds[i]);
        } else if (ctrl) {
          if (next.has(assetId)) next.delete(assetId);
          else next.add(assetId);
        } else {
          next.clear();
          next.add(assetId);
        }
        lastClickedIdx.current = idx;
        return next;
      });
    },
    [filteredAssets],
  );

  const deleteSelected = useCallback(async () => {
    const count = selectedAssets.size;
    const yes = await confirm(
      `Delete ${count} asset${count === 1 ? '' : 's'}?`,
      'Delete Assets',
      { confirmLabel: `Delete ${count}` },
    );
    if (!yes) return;
    for (const id of selectedAssets) {
      assetManager.deleteAsset(id);
      useProjectStore.getState().removeAsset(id);
    }
    addNotif({
      type: 'success',
      message: `Deleted ${count} asset${count > 1 ? 's' : ''}`,
      autoDismiss: 3000,
    });
    setSelectedAssets(new Set());
  }, [selectedAssets, addNotif]);

  const deleteUnused = useCallback(async () => {
    const unused = project.assets.filter((a) => !isAssetUsed(a.id));
    if (unused.length === 0) {
      addNotif({
        type: 'info',
        message: 'No unused assets found.',
        autoDismiss: 3000,
      });
      return;
    }
    const yes = await confirm(
      `Delete ${unused.length} unused asset${unused.length > 1 ? 's' : ''}?`,
      'Delete Unused Assets',
      { confirmLabel: `Delete ${unused.length}` },
    );
    if (!yes) return;
    for (const a of unused) {
      assetManager.deleteAsset(a.id);
      useProjectStore.getState().removeAsset(a.id);
    }
    addNotif({
      type: 'success',
      message: `Deleted ${unused.length} unused`,
      autoDismiss: 3000,
    });
  }, [project.assets, isAssetUsed, addNotif]);

  const deleteAssetById = useCallback(async (assetId: string) => {
    const asset = project.assets.find((a) => a.id === assetId);
    if (!asset) return;
    const yes = await confirm(
      `Delete asset "${asset.name}"?`,
      'Delete Asset',
      { confirmLabel: 'Delete' },
    );
    if (!yes) return;
    assetManager.deleteAsset(assetId);
    useProjectStore.getState().removeAsset(assetId);
    setSelectedAssets((prev) => {
      const next = new Set(prev);
      next.delete(assetId);
      return next;
    });
    addNotif({
      type: 'success',
      message: `Deleted "${asset.name}"`,
      autoDismiss: 3000,
    });
  }, [project.assets, addNotif]);

  const renameAssetById = useCallback((assetId: string) => {
    const asset = project.assets.find((a) => a.id === assetId);
    if (!asset) return;
    const newName = prompt('Rename asset:', asset.name);
    if (newName?.trim() && newName !== asset.name) {
      useProjectStore.getState().renameAsset(assetId, newName.trim());
    }
  }, [project.assets]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      addNotif({
        type: 'info',
        message: 'Copied to clipboard',
        autoDismiss: 1500,
      });
    }).catch(() => {});
  }, [addNotif]);

  const handlePanelContextMenu = useCallback((e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-asset-id]') || t.closest('[data-comp-id]')) return;
    e.preventDefault();
    e.stopPropagation();

    const items: ContextMenuItem[] = [
      { id: 'pm.import', label: 'Import Files...', shortcut: 'Ctrl+I', onClick: importFiles },
      { id: 'pm.importSvg', label: 'Import SVG...', onClick: importSvgClick },
      { id: 'pm.d1', divider: true },
      { id: 'pm.addComp', label: 'New Composition', onClick: openNewCompositionDialog },
      { id: 'pm.newFolder', label: 'New Folder', onClick: () => {
        const name = prompt('Folder name:', 'New Folder');
        if (name?.trim()) addFolder(name.trim(), null);
      }},
      { id: 'pm.d2', divider: true },
      { id: 'pm.selectAll', label: 'Select All', shortcut: 'Ctrl+A', onClick: () => {
        setSelectedAssets(new Set(filteredAssets.map((a) => a.id)));
      }},
    ];
    panelCtx.open(e, items);
  }, [importFiles, importSvgClick, filteredAssets, panelCtx, addFolder]);

  const handleAssetContextMenu = useCallback((e: React.MouseEvent, assetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const asset = project.assets.find((a) => a.id === assetId);
    if (!asset) return;

    if (!selectedAssets.has(assetId)) {
      setSelectedAssets(new Set([assetId]));
    }

    const items: ContextMenuItem[] = [
      { id: 'ac.preview', label: 'Preview', onClick: () => {
        const full = assetManager.getAsset(assetId);
        if (full) setPreviewAsset(full);
      }},
      { id: 'ac.addToTimeline', label: 'Add to Timeline', shortcut: 'Enter', onClick: () => handleAssetDoubleClick(assetId) },
      { id: 'ac.d1', divider: true },
      { id: 'ac.rename', label: 'Rename', shortcut: 'F2', onClick: () => renameAssetById(assetId) },
      { id: 'ac.copyId', label: 'Copy Asset ID', onClick: () => copyToClipboard(assetId) },
      { id: 'ac.copyPath', label: 'Copy Name', onClick: () => copyToClipboard(asset.name) },
      { id: 'ac.moveToFolder', label: 'Move to Folder', children: [
        { id: 'ac.mtf.root', label: '(Root)', onClick: () => moveAssetToFolder(assetId, null) },
        ...folders.map((f) => ({
          id: `ac.mtf.${f.id}`,
          label: f.name,
          onClick: () => moveAssetToFolder(assetId, f.id),
        })),
        { id: 'ac.mtf.d', divider: true },
        { id: 'ac.mtf.new', label: '+ New Folder...', onClick: () => {
          const n = prompt('Folder name:', 'New Folder');
          if (n?.trim()) {
            const f = addFolder(n.trim(), null);
            moveAssetToFolder(assetId, f.id);
          }
        }},
      ]},
      { id: 'ac.d2', divider: true },
      ...(selectedAssets.size > 1 ? [
        { id: 'ac.delSel', label: `Delete ${selectedAssets.size} Selected`, shortcut: 'Del', onClick: deleteSelected },
      ] : [
        { id: 'ac.delete', label: 'Delete', shortcut: 'Del', onClick: () => deleteAssetById(assetId) },
      ]),
    ];
    panelCtx.open(e, items);
  }, [
    project.assets, selectedAssets, folders, handleAssetDoubleClick,
    renameAssetById, copyToClipboard, deleteAssetById, deleteSelected,
    moveAssetToFolder, addFolder, panelCtx,
  ]);

  const handleCompContextMenu = useCallback((e: React.MouseEvent, compId: string, compName: string) => {
    e.preventDefault();
    e.stopPropagation();
    const items: ContextMenuItem[] = [
      { id: 'cc.preview', label: 'Preview', onClick: () => setActive(compId) },
      { id: 'cc.addLayer', label: 'Add as Layer in Active Comp', disabled: !activeCompId || activeCompId === compId, onClick: () => {
        if (!activeCompId || activeCompId === compId) return;
        const r = useCompositionStore.getState().addCompLayer(activeCompId, compId);
        if (!r.ok) addNotif({ type: 'error', message: r.reason ?? 'Could not add', autoDismiss: 3000 });
      }},
      { id: 'cc.d1', divider: true },
      { id: 'cc.rename', label: 'Rename', shortcut: 'F2', onClick: () => {
        const newName = prompt('Rename composition:', compName);
        if (newName?.trim() && newName !== compName) {
          useCompositionStore.getState().renameComposition(compId, newName.trim());
        }
      }},
      { id: 'cc.moveToFolder', label: 'Move to Folder', children: [
        { id: 'cc.mtf.root', label: '(Root)', onClick: () => moveCompToFolder(compId, null) },
        ...folders.map((f) => ({
          id: `cc.mtf.${f.id}`,
          label: f.name,
          onClick: () => moveCompToFolder(compId, f.id),
        })),
      ]},
      { id: 'cc.d2', divider: true },
      { id: 'cc.delete', label: 'Delete', shortcut: 'Del', onClick: async () => {
        const yes = await confirm(`Delete composition "${compName}"?`, 'Delete Composition', { confirmLabel: 'Delete' });
        if (yes) removeComp(compId);
      }},
    ];
    panelCtx.open(e, items);
  }, [activeCompId, setActive, removeComp, addNotif, folders, moveCompToFolder, panelCtx]);

  const batchRename = useCallback(() => {
    if (!batchFind.trim()) return;
    let count = 0;
    const idsToRename = selectedAssets.size > 0
      ? [...selectedAssets]
      : filteredAssets.map((a) => a.id);

    for (const id of idsToRename) {
      const asset = project.assets.find((a) => a.id === id);
      if (!asset) continue;
      const newName = asset.name.replaceAll(batchFind, batchReplace);
      if (newName !== asset.name) {
        useProjectStore.getState().renameAsset(id, newName);
        count++;
      }
    }
    addNotif({
      type: 'success',
      message: `Renamed ${count} asset${count > 1 ? 's' : ''}`,
      autoDismiss: 3000,
    });
    setShowBatchRename(false);
    setBatchFind('');
    setBatchReplace('');
  }, [selectedAssets, filteredAssets, batchFind, batchReplace, project.assets, addNotif]);

  return (
    <div
      className="flex flex-col h-full panel"
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      style={dragOver ? {
        outline: '2px dashed var(--color-accent)',
        outlineOffset: -2,
      } : undefined}
    >
      {/* Header */}
      <div
        className="flex items-center px-4 shrink-0"
        style={{
          height: 40,
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <span
          className="flex-1"
          style={{
            fontSize: 'var(--font-size-sm)',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
          }}
        >
          Project
        </span>
        <IconBtn
          onClick={() => setShowSearch(!showSearch)}
          title="Search"
          active={showSearch}
        >
          <Search size={14} strokeWidth={1.75} />
        </IconBtn>
        <IconBtn onClick={importSvgClick} title="Import SVG">
          <FileCode size={14} strokeWidth={1.75} />
        </IconBtn>
        <IconBtn onClick={openNewCompositionDialog} title="New Composition">
          <Plus size={15} strokeWidth={2} />
        </IconBtn>
        <IconBtn
          onClick={() => {
            const name = prompt('Folder name:', 'New Folder');
            if (name?.trim()) addFolder(name.trim(), null);
          }}
          title="New Folder"
        >
          <FolderPlus size={14} strokeWidth={1.75} />
        </IconBtn>
      </div>

      {/* Hero */}
      {activeComp && <CompHero comp={activeComp} />}

      {/* Search */}
      {showSearch && (
        <div
          className="px-3 py-2 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div
            className="flex items-center gap-2"
            style={{
              height: 30,
              padding: '0 10px',
              background: 'var(--color-input-bg)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
            }}
          >
            <Search
              size={13}
              strokeWidth={1.75}
              style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }}
            />
            <input
              type="text"
              placeholder="Search project..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent border-0 outline-none"
              style={{
                color: 'var(--color-text-primary)',
                fontSize: 'var(--font-size-sm)',
              }}
              autoFocus
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="border-0 bg-transparent cursor-pointer"
                style={{ color: 'var(--color-text-disabled)' }}
              >
                <X size={12} strokeWidth={2} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Type filter */}
      <div
        className="flex items-center gap-1 px-3 py-1.5 shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <Filter
          size={12}
          strokeWidth={1.75}
          style={{ color: 'var(--color-text-disabled)', flexShrink: 0 }}
        />
        {([
          ['all', 'All'],
          ['image', 'Images'],
          ['video', 'Videos'],
          ['audio', 'Audio'],
          ['model3d', '3D'],
        ] as const).map(([key, label]) => (
          <FilterChip
            key={key}
            label={label}
            active={typeFilter === key}
            onClick={() => setTypeFilter(key)}
          />
        ))}
        {unusedCount > 0 && (
          <button
            onClick={deleteUnused}
            title="Delete all unused assets"
            className="border-0 bg-transparent cursor-pointer ml-auto transition-colors"
            style={{
              height: 22,
              padding: '0 8px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-danger)',
            }}
            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'rgba(255,80,80,0.1)'}
            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
          >
            {unusedCount} unused
          </button>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedAssets.size > 0 && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 shrink-0"
          style={{
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-accent-muted)',
          }}
        >
          <span
            style={{
              fontSize: 'var(--font-size-xs)',
              fontWeight: 600,
              color: 'var(--color-accent)',
            }}
          >
            {selectedAssets.size} selected
          </span>
          <button
            onClick={() => setShowBatchRename(true)}
            className="flex items-center gap-1 border-0 bg-transparent cursor-pointer transition-colors"
            style={{
              height: 22,
              padding: '0 6px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-secondary)',
            }}
            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--color-panel-hover)'}
            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
          >
            <Edit3 size={11} /> Rename
          </button>
          <button
            onClick={deleteSelected}
            className="flex items-center gap-1 border-0 bg-transparent cursor-pointer transition-colors"
            style={{
              height: 22,
              padding: '0 6px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-danger)',
            }}
            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'rgba(255,80,80,0.1)'}
            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
          >
            <Trash2 size={11} /> Delete
          </button>
          <button
            onClick={() => setSelectedAssets(new Set())}
            className="border-0 bg-transparent cursor-pointer ml-auto"
            style={{
              height: 22,
              padding: '0 4px',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-disabled)',
            }}
          >
            Clear
          </button>
        </div>
      )}

      {/* Content list */}
      <div
        className="flex-1 overflow-y-auto py-2 min-h-0"
        onContextMenu={handlePanelContextMenu}
      >
        {tree.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-3">
            <FolderIcon
              size={32}
              strokeWidth={1.2}
              style={{ color: 'var(--color-text-disabled)', opacity: 0.5 }}
            />
            <div style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-disabled)',
            }}>
              {search ? 'No results' : 'Empty project'}
            </div>
            {!search && (
              <button
                onClick={openNewCompositionDialog}
                className="border-0 bg-transparent cursor-pointer"
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-accent)',
                  fontWeight: 500,
                }}
              >
                + New Composition
              </button>
            )}
          </div>
        ) : (
          tree.map((item, i) => {
            if (item.kind === 'folder') {
              return (
                <FolderRow
                  key={item.folder.id}
                  folder={item.folder}
                  depth={item.depth}
                  hasChildren={item.hasChildren}
                  onToggle={() => toggleFolder(item.folder.id)}
                  onRename={(newName) => renameFolder(item.folder.id, newName)}
                  onDelete={async () => {
                    const yes = await confirm(
                      `Delete folder "${item.folder.name}"? Contents will move to root.`,
                      'Delete Folder',
                      { confirmLabel: 'Delete' },
                    );
                    if (yes) removeFolder(item.folder.id);
                  }}
                  onDrop={(payload) => {
                    if (payload.kind === 'asset') moveAssetToFolder(payload.id, item.folder.id);
                    else if (payload.kind === 'comp') moveCompToFolder(payload.id, item.folder.id);
                    else if (payload.kind === 'folder' && payload.id !== item.folder.id) moveFolder(payload.id, item.folder.id);
                  }}
                />
              );
            }
            if (item.kind === 'comp') {
              const comp = item.comp;
              return (
                <div key={comp.id} style={{ marginLeft: item.depth * 16 }}>
                  <CompRow
                    comp={comp}
                    dotColor={DOT_COLORS[i % DOT_COLORS.length]}
                    isActive={comp.id === activeCompId}
                    onClick={() => setActive(comp.id)}
                    onDoubleClick={() => {
                      if (activeCompId && activeCompId !== comp.id) {
                        const r = useCompositionStore.getState().addCompLayer(activeCompId, comp.id);
                        if (!r.ok) alert(r.reason ?? 'Could not add');
                      }
                    }}
                    onDelete={async () => {
                      const yes = await confirm(
                        `Delete composition "${comp.name}"?`,
                        'Delete Composition',
                        { confirmLabel: 'Delete' },
                      );
                      if (yes) {
                        const r = removeComp(comp.id);
                        if (!r.ok) alert(r.reason ?? 'Cannot delete');
                      }
                    }}
                    onContextMenu={(e) => handleCompContextMenu(e, comp.id, comp.name)}
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        'application/onion-tree',
                        JSON.stringify({ kind: 'comp', id: comp.id }),
                      );
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                  />
                </div>
              );
            }
            // asset
            const a = item.asset;
            return (
              <div key={a.id} style={{ marginLeft: item.depth * 16 }}>
                <AssetRow
                  asset={a}
                  dotColor={DOT_COLORS[i % DOT_COLORS.length]}
                  isSelected={selectedAssets.has(a.id)}
                  isHighlighted={highlightedAsset === a.id}
                  onClick={(e) => handleAssetClick(a.id, i, e.ctrlKey || e.metaKey, e.shiftKey)}
                  onDoubleClick={() => handleAssetDoubleClick(a.id)}
                  onDragStart={(e) => {
                    handleAssetDragStart(e, a.id);
                    e.dataTransfer.setData(
                      'application/onion-tree',
                      JSON.stringify({ kind: 'asset', id: a.id }),
                    );
                  }}
                  onContextMenu={(e) => handleAssetContextMenu(e, a.id)}
                  onPreview={() => {
                    const full = assetManager.getAsset(a.id);
                    if (full) setPreviewAsset(full);
                  }}
                />
              </div>
            );
          })
        )}
      </div>

      {previewAsset && (
        <AssetPreviewModal
          asset={previewAsset}
          onClose={() => setPreviewAsset(null)}
          onAdd={() => {
            handleAssetDoubleClick(previewAsset.id);
            setPreviewAsset(null);
          }}
        />
      )}

      {showBatchRename && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 9999, background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowBatchRename(false)}
        >
          <div
            className="flex flex-col gap-3"
            style={{
              background: 'var(--color-panel)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              padding: 20,
              minWidth: 380,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              fontSize: 'var(--font-size-md)',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              marginBottom: 4,
            }}>
              Batch Rename ({selectedAssets.size > 0 ? `${selectedAssets.size} selected` : 'all filtered'})
            </div>
            <div>
              <label style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-secondary)',
                display: 'block',
                marginBottom: 4,
              }}>
                Find
              </label>
              <input
                type="text"
                value={batchFind}
                onChange={(e) => setBatchFind(e.target.value)}
                autoFocus
                placeholder="Text to find..."
                style={{
                  width: '100%',
                  height: 32,
                  padding: '0 10px',
                  background: 'var(--color-input-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--font-size-sm)',
                  outline: 'none',
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') batchRename(); }}
              />
            </div>
            <div>
              <label style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-secondary)',
                display: 'block',
                marginBottom: 4,
              }}>
                Replace with
              </label>
              <input
                type="text"
                value={batchReplace}
                onChange={(e) => setBatchReplace(e.target.value)}
                placeholder="Replacement text..."
                style={{
                  width: '100%',
                  height: 32,
                  padding: '0 10px',
                  background: 'var(--color-input-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--font-size-sm)',
                  outline: 'none',
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') batchRename(); }}
              />
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setShowBatchRename(false)}
                style={{
                  height: 30,
                  padding: '0 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  background: 'transparent',
                  color: 'var(--color-text-secondary)',
                  fontSize: 'var(--font-size-sm)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={batchRename}
                disabled={!batchFind.trim()}
                style={{
                  height: 30,
                  padding: '0 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: batchFind.trim() ? 'var(--color-accent)' : 'var(--color-text-disabled)',
                  color: '#fff',
                  fontSize: 'var(--font-size-sm)',
                  cursor: batchFind.trim() ? 'pointer' : 'not-allowed',
                  opacity: batchFind.trim() ? 1 : 0.5,
                }}
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {panelCtx.menu && (
        <ContextMenu
          items={panelCtx.menu.items}
          position={panelCtx.menu.position}
          onClose={panelCtx.close}
        />
      )}
    </div>
  );
};

function formatDuration(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default ProjectBrowserPanel;