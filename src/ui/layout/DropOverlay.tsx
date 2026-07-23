/**
 * DropOverlay — five drop zones (top / bottom / left / right / center)
 * on a container while a tab is being dragged.
 *
 * Zone math is now consistent: same 25% threshold in both hit-detection
 * and visual overlay rendering.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { subscribeDrag, getDragInstanceId, endDrag } from './dragState';
import { useLayoutStore, type DropZone } from '../../state/layoutStore';

interface Props {
  containerId: string;
}

// Edge zone thickness as a fraction of container. Everything inside is center.
const EDGE = 0.25;

export const DropOverlay: React.FC<Props> = ({ containerId }) => {
  const [dragging, setDragging] = useState<string | null>(getDragInstanceId());
  const [hoveredZone, setHoveredZone] = useState<DropZone | null>(null);
  const moveTab = useLayoutStore((s) => s.moveTab);

  useEffect(() => {
    return subscribeDrag(() => {
      setDragging(getDragInstanceId());
      if (getDragInstanceId() === null) setHoveredZone(null);
    });
  }, []);

  const computeZone = useCallback(
    (e: React.DragEvent<HTMLDivElement>): DropZone => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      // Determine which edge is closest — nearest wins
      const distLeft = x;
      const distRight = 1 - x;
      const distTop = y;
      const distBottom = 1 - y;
      const minEdge = Math.min(distLeft, distRight, distTop, distBottom);
      // If mouse is beyond the edge threshold from ALL edges → center
      if (minEdge > EDGE) return 'center';
      if (minEdge === distLeft) return 'left';
      if (minEdge === distRight) return 'right';
      if (minEdge === distTop) return 'top';
      return 'bottom';
    },
    [],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!dragging) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      const zone = computeZone(e);
      if (zone !== hoveredZone) setHoveredZone(zone);
    },
    [dragging, computeZone, hoveredZone],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!dragging) return;
      e.preventDefault();
      e.stopPropagation();
      const zone = computeZone(e);
      moveTab(dragging, containerId, zone);
      setHoveredZone(null);
      endDrag();
    },
    [dragging, computeZone, moveTab, containerId],
  );

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (
      e.clientX <= rect.left || e.clientX >= rect.right ||
      e.clientY <= rect.top  || e.clientY >= rect.bottom
    ) {
      setHoveredZone(null);
    }
  }, []);

  if (!dragging) return null;

  const zoneStyle = (active: boolean): React.CSSProperties => ({
    position: 'absolute',
    background: active
      ? 'rgba(88,101,255,0.35)'
      : 'transparent',
    border: active
      ? '2px solid rgba(120,140,255,1)'
      : '1px dashed rgba(120,140,255,0.25)',
    pointerEvents: 'none',
    transition: 'background 60ms ease',
    boxSizing: 'border-box',
    borderRadius: 2,
  });

  const edgePct = `${(EDGE * 100).toFixed(1)}%`;
  const centerPct = `${(EDGE * 100).toFixed(1)}%`;

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={handleDragLeave}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1000,
        pointerEvents: 'auto',
      }}
    >
      {/* Top edge */}
      <div style={{
        ...zoneStyle(hoveredZone === 'top'),
        top: 4, left: edgePct, right: edgePct, height: `calc(${edgePct} - 4px)`,
      }} />
      {/* Bottom edge */}
      <div style={{
        ...zoneStyle(hoveredZone === 'bottom'),
        bottom: 4, left: edgePct, right: edgePct, height: `calc(${edgePct} - 4px)`,
      }} />
      {/* Left edge */}
      <div style={{
        ...zoneStyle(hoveredZone === 'left'),
        left: 4, top: edgePct, bottom: edgePct, width: `calc(${edgePct} - 4px)`,
      }} />
      {/* Right edge */}
      <div style={{
        ...zoneStyle(hoveredZone === 'right'),
        right: 4, top: edgePct, bottom: edgePct, width: `calc(${edgePct} - 4px)`,
      }} />
      {/* Center */}
      <div style={{
        ...zoneStyle(hoveredZone === 'center'),
        top: centerPct, bottom: centerPct, left: centerPct, right: centerPct,
      }} />
    </div>
  );
};