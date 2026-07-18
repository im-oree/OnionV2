/**
 * Guides — draggable guide lines overlay for snapping and alignment.
 * Guides are stored in viewportStore and rendered as SVG lines.
 * Phase 2: Shows existing guides. Drag-to-create from rulers Phase 3+.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useViewportStore } from '../../../state/viewportStore';
import { useCompositionStore } from '../../../state/compositionStore';

interface GuidesProps {
  viewportSize: { width: number; height: number };
}

export const Guides: React.FC<GuidesProps> = ({ viewportSize }) => {
  const settings = useViewportStore((s) => s.settings);
  const moveGuide = useViewportStore((s) => s.moveGuide);

  const comp = useCompositionStore((s) => {
    const id = s.activeCompositionId;
    return id ? s.compositions.find((c) => c.id === id) ?? null : null;
  });

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragRef = useRef({ startY: 0, startX: 0, startPos: 0 });

  if (!comp) return null;

  const zoom = 1;
  const offsetX = (viewportSize.width - comp.width * zoom) / 2;
  const offsetY = (viewportSize.height - comp.height * zoom) / 2;

  const guides = settings.guides;
  const locked = settings.guidesLocked;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, guideId: string, _type: 'horizontal' | 'vertical', currentPos: number) => {
      if (locked) return;
      e.stopPropagation();
      setDraggingId(guideId);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startPos: currentPos,
      };
    },
    [locked],
  );

  useEffect(() => {
    if (!draggingId) return;
    const guide = guides.find((g) => g.id === draggingId);
    if (!guide) return;

    const onMouseMove = (e: MouseEvent) => {
      const delta = guide.type === 'horizontal'
        ? e.clientY - dragRef.current.startY
        : e.clientX - dragRef.current.startX;
      const newPos = dragRef.current.startPos + delta;
      moveGuide(draggingId, newPos);
    };

    const onMouseUp = () => {
      setDraggingId(null);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [draggingId, guides, moveGuide]);

  if (guides.length === 0) return null;

  return (
    <svg
      className="absolute inset-0"
      width={viewportSize.width}
      height={viewportSize.height}
      style={{ zIndex: 25, pointerEvents: locked ? 'none' : 'auto' }}
    >
      {guides.map((guide) => {
        if (guide.type === 'horizontal') {
          const screenY = offsetY + guide.position * zoom;
          return (
            <g key={guide.id}>
              <line
                x1={0}
                y1={screenY}
                x2={viewportSize.width}
                y2={screenY}
                stroke="var(--color-accent)"
                strokeWidth={1}
                strokeDasharray="4 2"
              />
              {!locked && (
                <line
                  x1={0}
                  y1={screenY - 4}
                  x2={viewportSize.width}
                  y2={screenY - 4}
                  stroke="transparent"
                  strokeWidth={8}
                  style={{ cursor: 'ns-resize' }}
                  onMouseDown={(e) => handleMouseDown(e, guide.id, 'horizontal', guide.position)}
                />
              )}
            </g>
          );
        }
        const screenX = offsetX + guide.position * zoom;
        return (
          <g key={guide.id}>
            <line
              x1={screenX}
              y1={0}
              x2={screenX}
              y2={viewportSize.height}
              stroke="var(--color-accent)"
              strokeWidth={1}
              strokeDasharray="4 2"
            />
            {!locked && (
              <line
                x1={screenX - 4}
                y1={0}
                x2={screenX - 4}
                y2={viewportSize.height}
                stroke="transparent"
                strokeWidth={8}
                style={{ cursor: 'ew-resize' }}
                onMouseDown={(e) => handleMouseDown(e, guide.id, 'vertical', guide.position)}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
};
