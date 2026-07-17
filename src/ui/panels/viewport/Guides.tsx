/**
 * Guides — draggable guide lines overlay for snapping and alignment.
 * Phase 2: Stub implementation. Guides can be shown but not yet created/dragged.
 */
import React from 'react';

interface GuidesProps {
  viewportSize: { width: number; height: number };
  /** Horizontal guide positions (in pixels from top) */
  horizontalGuides?: number[];
  /** Vertical guide positions (in pixels from left) */
  verticalGuides?: number[];
}

export const Guides: React.FC<GuidesProps> = ({
  viewportSize,
  horizontalGuides = [],
  verticalGuides = [],
}) => {
  if (horizontalGuides.length === 0 && verticalGuides.length === 0) {
    return null;
  }

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-20"
      width={viewportSize.width}
      height={viewportSize.height}
    >
      {/* Horizontal guides */}
      {horizontalGuides.map((y, i) => (
        <line
          key={`h-${i}`}
          x1={0}
          y1={y}
          x2={viewportSize.width}
          y2={y}
          stroke="var(--viewport-guide-color)"
          strokeWidth={1}
          strokeDasharray="4 2"
        />
      ))}
      {/* Vertical guides */}
      {verticalGuides.map((x, i) => (
        <line
          key={`v-${i}`}
          x1={x}
          y1={0}
          x2={x}
          y2={viewportSize.height}
          stroke="var(--viewport-guide-color)"
          strokeWidth={1}
          strokeDasharray="4 2"
        />
      ))}
    </svg>
  );
};
