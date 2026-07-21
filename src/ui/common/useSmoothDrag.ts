import { useCallback, useRef, useState } from 'react';

interface UseSmoothDragOptions {
  /** Total number of items in the list */
  itemCount: number;
  /** Called when an item is moved from oldIndex to newIndex */
  onReorder: (fromIndex: number, toIndex: number) => void;
  /** Optional: called during drag to update visual position */
  onDrag?: (currentIndex: number) => void;
  /** Height of each row in pixels */
  rowHeight?: number;
}

/**
 * Smooth mouse-based drag reordering — replaces HTML5 DnD.
 * Returns handlers for each draggable item.
 */
export function useSmoothDrag({
  itemCount,
  onReorder,
  onDrag,
  rowHeight = 28,
}: UseSmoothDragOptions) {
  const dragState = useRef<{
    itemIndex: number;
    startY: number;
    currentOffset: number;
  } | null>(null);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [offsetY, setOffsetY] = useState(0);

  const handleMouseDown = useCallback((index: number, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    dragState.current = {
      itemIndex: index,
      startY: e.clientY,
      currentOffset: 0,
    };
    setDragIndex(index);
    setDropIndex(index);
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';

    const onMove = (ev: MouseEvent) => {
      const st = dragState.current;
      if (!st) return;
      const dy = ev.clientY - st.startY;
      st.currentOffset = dy;
      setOffsetY(dy);

      // Calculate which index we're hovering over
      const targetIdx = Math.max(0, Math.min(itemCount - 1,
        Math.round(st.itemIndex + dy / rowHeight)
      ));
      setDropIndex(targetIdx);
      onDrag?.(targetIdx);
    };

    const onUp = () => {
      const st = dragState.current;
      if (st) {
        const finalIdx = Math.max(0, Math.min(itemCount - 1,
          Math.round(st.itemIndex + st.currentOffset / rowHeight)
        ));
        if (finalIdx !== st.itemIndex) {
          onReorder(st.itemIndex, finalIdx);
        }
      }
      dragState.current = null;
      setDragIndex(null);
      setDropIndex(null);
      setOffsetY(0);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [itemCount, onReorder, rowHeight, onDrag]);

  return {
    dragIndex,
    dropIndex,
    offsetY,
    handleMouseDown,
    /** Get style for the dragged item */
    getDragStyle: (index: number): React.CSSProperties => {
      if (dragIndex === index) {
        return {
          transform: `translateY(${offsetY}px)`,
          zIndex: 100,
          opacity: 0.9,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          position: 'relative' as const,
        };
      }
      return {};
    },
    /** Get the drop indicator position */
    getDropIndicator: () => {
      if (dropIndex === null || dragIndex === null) return null;
      return {
        index: dropIndex,
        style: {
          position: 'absolute' as const,
          top: dropIndex * rowHeight,
          left: 8,
          right: 8,
          height: 2,
          background: 'var(--color-accent)',
          borderRadius: 1,
          zIndex: 100,
        },
      };
    },
  };
}
