/**
 * TabbedContainer — polished tab bar with:
 *  - Rounded tabs
 *  - Drag-to-reorder within same container
 *  - Drag-out-to-move behaviour
 *  - Auto-collapse: labels + close buttons hide when tabs are squeezed
 */
import React, { Suspense, useCallback, useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import type { TabsNode } from '../../state/layoutStore';
import { useLayoutStore } from '../../state/layoutStore';
import { getPanelDef } from './PanelRegistry';
import { startDrag, endDrag, getDragInstanceId } from './dragState';
import { DropOverlay } from './DropOverlay';
import { ContextMenu, type ContextMenuItem } from '../common/ContextMenu';
import { useContextMenu } from '../common/useContextMenu';

interface Props {
  node: TabsNode;
}

// Layout thresholds — determined by tab count and container width
type LayoutMode = 'full' | 'icon-only' | 'icon-only-compact';

function determineLayoutMode(barWidth: number, tabCount: number): LayoutMode {
  if (tabCount === 0) return 'full';
  const perTab = barWidth / tabCount;
  if (perTab < 40) return 'icon-only-compact'; // no close button, minimal
  if (perTab < 90) return 'icon-only';          // icon + close button, no label
  return 'full';                                 // icon + label + close button
}

export const TabbedContainer: React.FC<Props> = ({ node }) => {
  const setActiveTab = useLayoutStore((s) => s.setActiveTab);
  const closeTab = useLayoutStore((s) => s.closeTab);
  const closeOthers = useLayoutStore((s) => s.closeOthers);
  const moveTab = useLayoutStore((s) => s.moveTab);
  const ctxMenu = useContextMenu();

  const [dropIndicatorIdx, setDropIndicatorIdx] = useState<number | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('full');
  const tabBarRef = useRef<HTMLDivElement>(null);

  const activeTab = node.tabs[node.activeIdx] ?? node.tabs[0];
  const activeDef = activeTab ? getPanelDef(activeTab.panelType) : null;

  // ── Measure container width and pick layout mode ─────────
  useEffect(() => {
    const el = tabBarRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      // Subtract a bit for padding + trailing flex spacer
      const usable = Math.max(0, rect.width - 12);
      const mode = determineLayoutMode(usable, node.tabs.length);
      setLayoutMode(mode);
    });
    ro.observe(el);
    // Initial measurement
    const rect = el.getBoundingClientRect();
    if (rect.width > 0) {
      const usable = Math.max(0, rect.width - 12);
      setLayoutMode(determineLayoutMode(usable, node.tabs.length));
    }
    return () => ro.disconnect();
  }, [node.tabs.length]);

  const handleTabContextMenu = useCallback(
    (e: React.MouseEvent, instanceId: string) => {
      e.preventDefault();
      e.stopPropagation();
      const items: ContextMenuItem[] = [
        { id: 'tab.close', label: 'Close Tab',
          onClick: () => closeTab(instanceId) },
        { id: 'tab.closeOthers', label: 'Close Other Tabs',
          disabled: node.tabs.length <= 1,
          onClick: () => closeOthers(instanceId) },
      ];
      ctxMenu.open(e, items);
    },
    [ctxMenu, closeTab, closeOthers, node.tabs.length],
  );

  const handleTabBarDragOver = useCallback((e: React.DragEvent) => {
    if (!getDragInstanceId()) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    const bar = tabBarRef.current;
    if (!bar) return;
    const tabEls = Array.from(bar.querySelectorAll('[data-tab-el]')) as HTMLElement[];
    let insertIdx = tabEls.length;
    for (let i = 0; i < tabEls.length; i++) {
      const r = tabEls[i].getBoundingClientRect();
      const mid = r.left + r.width / 2;
      if (e.clientX < mid) { insertIdx = i; break; }
    }
    setDropIndicatorIdx(insertIdx);
  }, []);

  const handleTabBarDrop = useCallback((e: React.DragEvent) => {
    const dragId = getDragInstanceId();
    if (!dragId) return;
    e.preventDefault();
    e.stopPropagation();
    const idx = dropIndicatorIdx ?? node.tabs.length;
    moveTab(dragId, node.id, 'center', idx);
    setDropIndicatorIdx(null);
    endDrag();
  }, [dropIndicatorIdx, moveTab, node.id, node.tabs.length]);

  const handleTabBarDragLeave = useCallback((e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right ||
        e.clientY < rect.top || e.clientY > rect.bottom) {
      setDropIndicatorIdx(null);
    }
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        background: 'var(--color-panel, #1f2229)',
        borderRadius: 6,
        overflow: 'hidden',
        minWidth: 0,
        minHeight: 0,
        transition: 'box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* ── Tab bar ────────────────────────────────────────── */}
      <div
        ref={tabBarRef}
        onDragOver={handleTabBarDragOver}
        onDrop={handleTabBarDrop}
        onDragLeave={handleTabBarDragLeave}
        style={{
          display: 'flex',
          alignItems: 'center',
          height: 30,
          background: 'var(--color-panel-raised, #262a33)',
          padding: '0 4px',
          gap: 2,
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          overflowX: 'hidden',
          overflowY: 'hidden',
          flexShrink: 0,
          position: 'relative',
        }}
      >
        {node.tabs.map((tab, idx) => {
          const def = getPanelDef(tab.panelType);
          const label = def?.label ?? tab.panelType;
          const Icon = def?.icon;
          const isActive = idx === node.activeIdx;
          const showIndicatorBefore = dropIndicatorIdx === idx;
          const showIndicatorAfter =
            dropIndicatorIdx === node.tabs.length && idx === node.tabs.length - 1;

          // Active tab always shows label if possible (falls back to icon-only at
          // truly compact). Inactive tabs collapse first.
          const effectiveMode: LayoutMode =
            isActive && layoutMode === 'icon-only' ? 'full' :
            layoutMode;

          const showLabel = effectiveMode === 'full';
          const showClose = effectiveMode !== 'icon-only-compact';

          return (
            <React.Fragment key={tab.instanceId}>
              {showIndicatorBefore && <DropIndicator />}
              <div
                data-tab-el
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', tab.instanceId);
                  startDrag(tab.instanceId);
                  const ghost = (e.currentTarget as HTMLElement).cloneNode(true) as HTMLElement;
                  ghost.style.position = 'absolute';
                  ghost.style.top = '-1000px';
                  ghost.style.opacity = '0.9';
                  document.body.appendChild(ghost);
                  e.dataTransfer.setDragImage(ghost, 20, 15);
                  setTimeout(() => document.body.removeChild(ghost), 0);
                }}
                onDragEnd={() => { endDrag(); setDropIndicatorIdx(null); }}
                onClick={() => setActiveTab(node.id, idx)}
                onContextMenu={(e) => handleTabContextMenu(e, tab.instanceId)}
                title={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: showLabel ? 'flex-start' : 'center',
                  gap: showLabel ? 6 : 0,
                  padding: showLabel
                    ? '0 8px 0 10px'
                    : effectiveMode === 'icon-only-compact'
                    ? '0'
                    : '0 6px',
                  height: 24,
                  minWidth: effectiveMode === 'icon-only-compact' ? 26 : 30,
                  maxWidth: showLabel ? 160 : 40,
                  flexShrink: 1,
                  flexGrow: 0,
                  fontSize: 11,
                  fontWeight: isActive ? 600 : 500,
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  color: isActive
                    ? 'var(--color-text-primary, #fff)'
                    : 'rgba(200,205,220,0.55)',
                  background: isActive
                    ? 'var(--color-panel, #1f2229)'
                    : 'transparent',
                  border: isActive
                    ? '1px solid rgba(255,255,255,0.06)'
                    : '1px solid transparent',
                  borderBottom: isActive
                    ? '1px solid var(--color-panel, #1f2229)'
                    : '1px solid transparent',
                  borderRadius: '6px 6px 0 0',
                  marginBottom: -1,
                  cursor: 'pointer',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  transition:
                    'background 160ms cubic-bezier(0.4, 0, 0.2, 1), ' +
                    'color 160ms cubic-bezier(0.4, 0, 0.2, 1), ' +
                    'border-color 160ms cubic-bezier(0.4, 0, 0.2, 1), ' +
                    'padding 200ms cubic-bezier(0.4, 0, 0.2, 1), ' +
                    'max-width 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background =
                      'rgba(255,255,255,0.03)';
                    (e.currentTarget as HTMLElement).style.color =
                      'rgba(220,225,240,0.85)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.color =
                      'rgba(200,205,220,0.55)';
                  }
                }}
              >
                {Icon && (
                  <Icon
                    size={12}
                    strokeWidth={isActive ? 2 : 1.75}
                  />
                )}
                {showLabel && (
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      minWidth: 0,
                      opacity: 1,
                      transition: 'opacity 160ms',
                    }}
                  >
                    {label}
                  </span>
                )}
                {showClose && showLabel && (
                  <CloseButton onClick={() => closeTab(tab.instanceId)} />
                )}
              </div>
              {showIndicatorAfter && <DropIndicator />}
            </React.Fragment>
          );
        })}
        <div style={{ flex: 1, minWidth: 0 }} />
      </div>

      {/* ── Panel body ────────────────────────────────────── */}
      <div style={{
        flex: 1,
        position: 'relative',
        minWidth: 0,
        minHeight: 0,
        overflow: 'hidden',
      }}>
        {activeDef ? (
          <Suspense fallback={<PanelLoading />}>
            <activeDef.component />
          </Suspense>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            fontSize: 11,
            color: 'rgba(255,255,255,0.35)',
          }}>
            No panel
          </div>
        )}

        <DropOverlay containerId={node.id} />
      </div>

      {ctxMenu.menu && (
        <ContextMenu
          items={ctxMenu.menu.items}
          position={ctxMenu.menu.position}
          onClose={ctxMenu.close}
        />
      )}
    </div>
  );
};

// ── Small components ────────────────────────────────────────

const CloseButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    style={{
      marginLeft: 4,
      width: 14,
      height: 14,
      padding: 0,
      background: 'transparent',
      border: 0,
      borderRadius: 3,
      color: 'inherit',
      opacity: 0,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'opacity 160ms cubic-bezier(0.4, 0, 0.2, 1), background 160ms',
      flexShrink: 0,
    }}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLElement).style.opacity = '1';
      (e.currentTarget as HTMLElement).style.background = 'rgba(255,80,80,0.25)';
      (e.currentTarget as HTMLElement).style.color = '#fff';
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLElement).style.opacity = '0.4';
      (e.currentTarget as HTMLElement).style.background = 'transparent';
      (e.currentTarget as HTMLElement).style.color = 'inherit';
    }}
  >
    <X size={9} strokeWidth={2.5} />
  </button>
);

const DropIndicator: React.FC = () => (
  <div style={{
    width: 2,
    height: 20,
    background: 'var(--color-accent, #5865ff)',
    borderRadius: 1,
    boxShadow: '0 0 6px var(--color-accent, #5865ff)',
    margin: '0 2px',
    flexShrink: 0,
    animation: 'pulseGlow 800ms ease-in-out infinite alternate',
  }} />
);

const PanelLoading: React.FC = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    fontFamily: 'system-ui, sans-serif',
  }}>
    Loading…
  </div>
);