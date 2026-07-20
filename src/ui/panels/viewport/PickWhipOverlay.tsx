/**
 * PickWhipOverlay — renders the pick whip line during parent drag.
 *
 * Shows a curved line from the child layer's center to the mouse cursor,
 * with a pulsing circle at the cursor end. When hovering over a valid
 * parent candidate, the circle turns green and the line becomes solid.
 */
import React, { useEffect, useState } from 'react';
import { useToolStore } from '../../../state/toolStore';
import { TOOLS } from '../../../config/constants';

interface PickWhipState {
  active: boolean;
  childId: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  hoveredParentId: string | null;
}

// Module-level state shared between the hook and the overlay
let _pickWhipState: PickWhipState = {
  active: false, childId: '', startX: 0, startY: 0,
  currentX: 0, currentY: 0, hoveredParentId: null,
};
let _pickWhipListeners: Array<() => void> = [];

export function setPickWhipState(patch: Partial<PickWhipState>): void {
  _pickWhipState = { ..._pickWhipState, ...patch };
  for (const fn of _pickWhipListeners) fn();
}

export function getPickWhipState(): PickWhipState {
  return _pickWhipState;
}

export function clearPickWhip(): void {
  _pickWhipState = {
    active: false, childId: '', startX: 0, startY: 0,
    currentX: 0, currentY: 0, hoveredParentId: null,
  };
  for (const fn of _pickWhipListeners) fn();
}

export const PickWhipOverlay: React.FC = () => {
  const [, forceUpdate] = useState(0);
  const activeTool = useToolStore((s) => s.activeTool);

  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1);
    _pickWhipListeners.push(listener);
    return () => {
      _pickWhipListeners = _pickWhipListeners.filter((fn) => fn !== listener);
    };
  }, []);

  if (activeTool !== TOOLS.PICK_WHIP || !_pickWhipState.active) return null;

  const { startX, startY, currentX, currentY, hoveredParentId } = _pickWhipState;
  const isOverParent = !!hoveredParentId;

  // Curved path from start to current
  const midX = (startX + currentX) / 2;
  const midY = (startY + currentY) / 2 - 40; // curve upward

  return (
    <svg
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 30,
      }}
    >
      {/* Shadow line */}
      <path
        d={`M ${startX} ${startY} Q ${midX} ${midY} ${currentX} ${currentY}`}
        fill="none"
        stroke="rgba(0,0,0,0.3)"
        strokeWidth="3"
      />
      {/* Main line */}
      <path
        d={`M ${startX} ${startY} Q ${midX} ${midY} ${currentX} ${currentY}`}
        fill="none"
        stroke={isOverParent ? '#22c55e' : '#f59e0b'}
        strokeWidth="2"
        strokeDasharray={isOverParent ? 'none' : '6 3'}
      />
      {/* Origin dot */}
      <circle cx={startX} cy={startY} r="4" fill="#f59e0b" stroke="#fff" strokeWidth="1" />
      {/* Cursor ring — pulses when over a valid parent */}
      <circle
        cx={currentX} cy={currentY}
        r={isOverParent ? 10 : 6}
        fill="none"
        stroke={isOverParent ? '#22c55e' : '#f59e0b'}
        strokeWidth="2"
        opacity={isOverParent ? 1 : 0.7}
      />
      {isOverParent && (
        <circle cx={currentX} cy={currentY} r="3" fill="#22c55e" />
      )}
    </svg>
  );
};
