import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { Layer } from '../../../types/layer';
import { Icon } from '../../common/Icon';

const LAYER_ICONS: Record<string, string> = {
  solid: 'square', shape: 'triangle', text: 'type',
  image: 'image', video: 'film', null: 'circle',
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
  /** F2 rename trigger — when this changes to truthy, enters rename edit mode */
  forceRename?: boolean;
}

export const LayerRow: React.FC<LayerRowProps> = ({
  layer, depth, isSelected,
  onSelect, onToggleVisibility, onToggleLock, onToggleSolo,
  onRename, onDragStart, onDrop,
  onDuplicate, onDelete, forceRename,
}) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(layer.name);
  const [dragOver, setDragOver] = useState<'above' | 'below' | 'child' | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  // F2 rename trigger — when forceRename becomes true, enter edit mode
  useEffect(() => {
    if (forceRename) {
      setEditing(true);
      setName(layer.name);
    }
  }, [forceRename, layer.name]);

  useEffect(() => {
    if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); }
  }, [editing]);
  useEffect(() => { setName(layer.name); }, [layer.name]);

  const handleDoubleClick = useCallback(() => { if (!layer.locked) setEditing(true); }, [layer.locked]);

  const handleRenameSubmit = useCallback(() => {
    setEditing(false);
    if (name.trim() && name !== layer.name) onRename(layer.id, name.trim());
    else setName(layer.name);
  }, [name, layer.id, layer.name, onRename]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => onSelect(layer.id, e.ctrlKey || e.metaKey, e.shiftKey),
    [layer.id, onSelect],
  );

  // Right-click context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const contextRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });

    // Select this layer on right-click if not already selected
    if (!isSelected) onSelect(layer.id, false, false);
  }, [layer.id, isSelected, onSelect]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [contextMenu]);

  const contextAction = useCallback((action: () => void) => {
    setContextMenu(null);
    action();
  }, []);

  const handleDragStart = useCallback(
    (e: React.DragEvent) => { e.dataTransfer.setData('text/plain', layer.id); onDragStart(layer.id); },
    [layer.id, onDragStart],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!rowRef.current) return;
    const rect = rowRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const h = rect.height;
    setDragOver(y < h * 0.25 ? 'above' : y > h * 0.75 ? 'below' : 'child');
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(null), []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const draggedId = e.dataTransfer.getData('text/plain');
    if (draggedId !== layer.id && dragOver) onDrop(layer.id, draggedId, dragOver);
  }, [layer.id, dragOver, onDrop]);

  const indent = depth * 16 + 4;

  return (
    <div ref={rowRef} className="relative" draggable={!layer.locked}
      onDragStart={handleDragStart} onDragOver={handleDragOver}
      onDragLeave={handleDragLeave} onDrop={handleDrop}
      onContextMenu={handleContextMenu}
    >
      <div className={`flex items-center h-row gap-1 cursor-pointer text-ui-sm select-none ${isSelected ? 'bg-accent text-text-primary' : 'text-text-secondary hover:bg-panel-hover'}`}
        style={{ paddingLeft: indent }} onClick={handleClick} onDoubleClick={handleDoubleClick}
      >
        <span className="w-3 shrink-0" />
        <Icon name={(LAYER_ICONS[layer.type] ?? 'circle') as any} size={14} className={`shrink-0 ${isSelected ? 'text-white' : 'text-text-disabled'}`} />

        <div className="flex-1 min-w-0">
          {editing ? (
            <input ref={inputRef} type="text" value={name} onChange={(e) => setName(e.target.value)}
              onBlur={handleRenameSubmit} onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') { setName(layer.name); setEditing(false); } }}
              className="w-full h-[18px] text-ui-xs px-1 bg-surface border border-accent rounded-sm text-text-primary outline-none"
            />
          ) : (
            <span className="truncate text-ui-xs block">{layer.name}</span>
          )}
        </div>

        {!editing && (
          <div className="flex items-center gap-0.5 mr-1 shrink-0">
            <button className={`w-4 h-4 border-0 bg-transparent cursor-pointer flex items-center justify-center ${layer.visible ? 'text-text-secondary' : 'text-text-disabled'} hover:text-text-primary`}
              onClick={(e) => { e.stopPropagation(); onToggleVisibility(layer.id); }} title="Visibility"
            >
              {layer.visible ? (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              ) : (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              )}
            </button>
            <button className={`w-4 h-4 border-0 bg-transparent cursor-pointer flex items-center justify-center ${layer.locked ? 'text-text-secondary' : 'text-text-disabled'} hover:text-text-primary`}
              onClick={(e) => { e.stopPropagation(); onToggleLock(layer.id); }} title="Lock"
            >
              {layer.locked ? (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              ) : (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
              )}
            </button>
            <button className={`w-4 h-4 border-0 bg-transparent cursor-pointer flex items-center justify-center ${layer.soloed ? 'text-accent' : 'text-text-disabled'} hover:text-text-primary`}
              onClick={(e) => { e.stopPropagation(); onToggleSolo(layer.id); }} title="Solo"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/></svg>
            </button>
          </div>
        )}
      </div>
      {dragOver === 'above' && <div className="absolute top-0 left-0 right-0 h-0.5 bg-accent" />}
      {dragOver === 'below' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}

      {/* Right-click context menu */}
      {contextMenu && (
        <div ref={contextRef} className="fixed z-[9999] min-w-[140px] bg-panel border border-border rounded-md shadow-dropdown py-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button className="w-full text-left px-3 py-1 text-ui-xs text-text-secondary hover:bg-panel-hover border-0 bg-transparent cursor-pointer"
            onClick={() => contextAction(() => setEditing(true))}>
            Rename
          </button>
          <button className="w-full text-left px-3 py-1 text-ui-xs text-text-secondary hover:bg-panel-hover border-0 bg-transparent cursor-pointer"
            onClick={() => contextAction(() => onDuplicate?.(layer.id))}>
            Duplicate
          </button>
          <button className="w-full text-left px-3 py-1 text-ui-xs text-text-secondary hover:bg-panel-hover border-0 bg-transparent cursor-pointer"
            onClick={() => contextAction(() => onToggleSolo(layer.id))}>
            {layer.soloed ? 'Unsolo' : 'Solo'}
          </button>
          <button className="w-full text-left px-3 py-1 text-ui-xs text-text-secondary hover:bg-panel-hover border-0 bg-transparent cursor-pointer"
            onClick={() => contextAction(() => onToggleVisibility(layer.id))}>
            {layer.visible ? 'Hide' : 'Show'}
          </button>
          <div className="border-t border-border my-1" />
          <button className="w-full text-left px-3 py-1 text-ui-xs text-danger hover:bg-panel-hover border-0 bg-transparent cursor-pointer"
            onClick={() => contextAction(() => onDelete?.(layer.id))}>
            Delete
          </button>
        </div>
      )}
    </div>
  );
};
