import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Eye, EyeOff, Lock, Unlock, Circle, ChevronUp, ChevronDown } from 'lucide-react';
import type { Layer } from '../../../types/layer';
import { Icon } from '../../common/Icon';

const LAYER_ICONS: Record<string, string> = {
  solid: 'rectangle', shape: 'polygon', text: 'text',
  image: 'image', video: 'video', null: 'ellipse', comp: 'grid',
};

interface LayerRowProps {
  layer: Layer;
  depth: number;
  isSelected: boolean;
  onSelect: (id: string, add: boolean, range: boolean) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onToggleSolo: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDragStart: (id: string) => void;
  onDrop: (targetId: string, draggedId: string, position: 'above' | 'below' | 'child') => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
  forceRename?: boolean;
  onDoubleClick?: (id: string) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export const LayerRow: React.FC<LayerRowProps> = ({
  layer, depth, isSelected,
  onSelect, onToggleVisibility, onToggleLock, onToggleSolo,
  onRename, onDragStart, onDrop,  onDuplicate, onDelete, forceRename, onDoubleClick,
  canMoveUp, canMoveDown, onMoveUp, onMoveDown,
}) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(layer.name);
  const dragOverRef = useRef<'above' | 'below' | 'child' | null>(null);
  const [dragOver, setDragOver] = useState<'above' | 'below' | 'child' | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (forceRename) { setEditing(true); setName(layer.name); } }, [forceRename, layer.name]);
  useEffect(() => { if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); } }, [editing]);
  useEffect(() => { setName(layer.name); }, [layer.name]);

  const handleDoubleClickInternal = useCallback(() => {
    if (layer.type === 'comp' && onDoubleClick) { onDoubleClick(layer.id); return; }
    // Path layers: double-click enters point-edit mode
    if (layer.type === 'shape' && (layer.data as any)?.type === 'path') {
      import('../../../state/penToolStore').then(({ usePenToolStore }) => {
        import('../../../state/toolStore').then(({ useToolStore }) => {
          useToolStore.getState().setActiveTool('pen');
          usePenToolStore.getState().startEditing(layer.id);
        });
      });
      return;
    }
    if (!layer.locked) setEditing(true);
  }, [layer.locked, layer.type, layer.id, layer.data, onDoubleClick]);

  const handleRenameSubmit = useCallback(() => {
    setEditing(false);
    if (name.trim() && name !== layer.name) onRename(layer.id, name.trim());
    else setName(layer.name);
  }, [name, layer.id, layer.name, onRename]);

  const handleClick = useCallback((e: React.MouseEvent) => onSelect(layer.id, e.ctrlKey || e.metaKey, e.shiftKey), [layer.id, onSelect]);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
    if (!isSelected) onSelect(layer.id, false, false);
  }, [layer.id, isSelected, onSelect]);
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [contextMenu]);
  const contextAction = useCallback((action: () => void) => { setContextMenu(null); action(); }, []);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', layer.id); onDragStart(layer.id);
  }, [layer.id, onDragStart]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!rowRef.current) return;
    const rect = rowRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top; const h = rect.height;
    const pos: 'above' | 'below' | 'child' = y < h * 0.25 ? 'above' : y > h * 0.75 ? 'below' : 'child';
    dragOverRef.current = pos; setDragOver(pos);
  }, []);
  const handleDragLeave = useCallback(() => { dragOverRef.current = null; setDragOver(null); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const pos = dragOverRef.current;
    dragOverRef.current = null; setDragOver(null);
    const draggedId = e.dataTransfer.getData('text/plain');
    if (draggedId !== layer.id && pos) onDrop(layer.id, draggedId, pos);
  }, [layer.id, onDrop]);

  const indent = depth * 18 + 8;

  return (
    <div
      ref={rowRef}
      className="relative"
      draggable={!layer.locked}
      onDragStart={handleDragStart} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
      onContextMenu={handleContextMenu}
      style={{ height: 32 }}
    >
      <div
        className="flex items-center h-full gap-2 cursor-pointer select-none transition-colors mx-2 px-2"
        style={{
          paddingLeft: indent,
          borderLeft: layer.color ? `3px solid ${layer.color}` : undefined,
          background: isSelected ? 'var(--color-accent-muted)' : 'transparent',
          color: isSelected ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
          fontSize: 'var(--font-size-sm)',
          borderRadius: 'var(--radius-sm)',
        }}
        onMouseEnter={(e)=>{ if(!isSelected)(e.currentTarget as HTMLElement).style.background='var(--color-panel-hover)'; }}
        onMouseLeave={(e)=>{ if(!isSelected)(e.currentTarget as HTMLElement).style.background='transparent'; }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClickInternal}
      >
        <Icon name={(LAYER_ICONS[layer.type] ?? 'ellipse') as any} size={14} strokeWidth={1.75} className="shrink-0" />
        <div className="flex-1 min-w-0">
          {editing ? (
            <input ref={inputRef} type="text" value={name}
              onChange={(e) => setName(e.target.value)} onBlur={handleRenameSubmit}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') { setName(layer.name); setEditing(false); } }}
              className="w-full outline-none"
              style={{
                height: 22, padding: '0 6px',
                background: 'var(--color-input-bg)',
                border: '1px solid var(--color-accent)',
                borderRadius: 'var(--radius-xs)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--font-size-sm)',
              }}
            />
          ) : (
            <span className="truncate block leading-tight">{layer.name}</span>
          )}
        </div>

        {!editing && (
          <div className="flex items-center gap-1 shrink-0">
            {onMoveUp && (
              <IconBtn disabled={!canMoveUp} onClick={(e)=>{ e.stopPropagation(); onMoveUp(); }} title="Move Up">
                <ChevronUp size={13} strokeWidth={2}/>
              </IconBtn>
            )}
            {onMoveDown && (
              <IconBtn disabled={!canMoveDown} onClick={(e)=>{ e.stopPropagation(); onMoveDown(); }} title="Move Down">
                <ChevronDown size={13} strokeWidth={2}/>
              </IconBtn>
            )}
            <IconBtn active={layer.visible} onClick={(e)=>{ e.stopPropagation(); onToggleVisibility(layer.id); }} title="Visibility">
              {layer.visible ? <Eye size={13} strokeWidth={1.75}/> : <EyeOff size={13} strokeWidth={1.75}/>}
            </IconBtn>
            <IconBtn active={layer.locked} onClick={(e)=>{ e.stopPropagation(); onToggleLock(layer.id); }} title="Lock">
              {layer.locked ? <Lock size={13} strokeWidth={1.75}/> : <Unlock size={13} strokeWidth={1.75}/>}
            </IconBtn>
            <IconBtn active={layer.soloed} accent onClick={(e)=>{ e.stopPropagation(); onToggleSolo(layer.id); }} title="Solo">
              <Circle size={12} strokeWidth={2} fill={layer.soloed ? 'currentColor' : 'none'} />
            </IconBtn>
          </div>
        )}
      </div>

      {dragOver === 'above' && <div className="absolute top-0 left-2 right-2 pointer-events-none" style={{ height: 2, background: 'var(--color-accent)', borderRadius: 2 }} />}
      {dragOver === 'below' && <div className="absolute bottom-0 left-2 right-2 pointer-events-none" style={{ height: 2, background: 'var(--color-accent)', borderRadius: 2 }} />}

      {contextMenu && (
        <div className="fixed z-[9999] min-w-[180px] py-1.5"
          style={{ left: contextMenu.x, top: contextMenu.y, background: 'var(--color-panel-raised)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-dropdown)' }}
        >
          {(layer.type === 'image' || layer.type === 'video') && (layer.data as any)?.assetId && (
            <button onClick={() => contextAction(() => document.dispatchEvent(new CustomEvent('project:revealAsset', { detail: { assetId: (layer.data as any).assetId } })))}
              className="w-full text-left border-0 bg-transparent cursor-pointer transition-colors"
              style={{ height: 30, padding: '0 14px', fontSize: 'var(--font-size-md)', color: 'var(--color-text-primary)' }}
              onMouseEnter={(e)=>(e.currentTarget as HTMLElement).style.background='var(--color-panel-hover)'}
              onMouseLeave={(e)=>(e.currentTarget as HTMLElement).style.background='transparent'}
            >Reveal in Project Panel</button>
          )}
          {(layer.type === 'image' || layer.type === 'video') && (layer.data as any)?.assetId && (
            <div className="h-px my-1.5 mx-2" style={{ background: 'var(--color-divider)' }} />
          )}
          {[
            { label: 'Rename', onClick: () => setEditing(true) },
            { label: 'Duplicate', onClick: () => onDuplicate?.(layer.id) },
            { label: layer.soloed ? 'Unsolo' : 'Solo', onClick: () => onToggleSolo(layer.id) },
            { label: layer.visible ? 'Hide' : 'Show', onClick: () => onToggleVisibility(layer.id) },
          ].map((it, i) => (
            <button key={i} onClick={() => contextAction(it.onClick)}
              className="w-full text-left border-0 bg-transparent cursor-pointer transition-colors"
              style={{ height: 30, padding: '0 14px', fontSize: 'var(--font-size-md)', color: 'var(--color-text-primary)' }}
              onMouseEnter={(e)=>(e.currentTarget as HTMLElement).style.background='var(--color-panel-hover)'}
              onMouseLeave={(e)=>(e.currentTarget as HTMLElement).style.background='transparent'}
            >{it.label}</button>
          ))}
          <div className="h-px my-1.5 mx-2" style={{ background: 'var(--color-divider)' }} />
          <button onClick={() => contextAction(() => onDelete?.(layer.id))}
            className="w-full text-left border-0 bg-transparent cursor-pointer transition-colors"
            style={{ height: 30, padding: '0 14px', fontSize: 'var(--font-size-md)', color: 'var(--color-danger)' }}
            onMouseEnter={(e)=>(e.currentTarget as HTMLElement).style.background='var(--color-panel-hover)'}
            onMouseLeave={(e)=>(e.currentTarget as HTMLElement).style.background='transparent'}
          >Delete</button>
        </div>
      )}
    </div>
  );
};

const IconBtn: React.FC<{ active?: boolean; accent?: boolean; disabled?: boolean; onClick: (e: React.MouseEvent)=>void; title: string; children: React.ReactNode }> = ({ active, accent, disabled, onClick, title, children }) => (
  <button
    onClick={onClick} title={title}
    className="border-0 bg-transparent cursor-pointer flex items-center justify-center transition-colors"
    style={{
      width: 20, height: 20, borderRadius: 'var(--radius-xs)',
      color: disabled ? 'var(--color-text-disabled)' : accent && active ? 'var(--color-accent)' : active ? 'var(--color-text-secondary)' : 'var(--color-text-disabled)',
      opacity: disabled ? 0.3 : 1,
      pointerEvents: disabled ? 'none' : undefined,
    }}
    onMouseEnter={(e)=>{ if(!disabled) (e.currentTarget as HTMLElement).style.color='var(--color-text-primary)'; }}
    onMouseLeave={(e)=>{ if(!disabled) (e.currentTarget as HTMLElement).style.color = accent && active ? 'var(--color-accent)' : active ? 'var(--color-text-secondary)' : 'var(--color-text-disabled)'; }}
  >{children}</button>
);