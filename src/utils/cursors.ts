/**
 * Central cursor state system.
 * Maps tools and interaction states to cursor strings.
 */

import type { ToolId } from '../state/toolStore';
import { TOOLS } from '../config/constants';

export type CursorState =
  | 'default'
  | 'move'
  | 'grab'
  | 'grabbing'
  | 'crosshair'
  | 'ew-resize' | 'ns-resize'
  | 'nwse-resize' | 'nesw-resize'
  | 'text'
  | 'zoom-in' | 'zoom-out'
  | 'not-allowed'
  | 'copy'
  | 'help'
  | 'pointer';

const toolCursors: Partial<Record<string, CursorState>> = {
  [TOOLS.SELECT]:        'default',
  [TOOLS.MOVE]:          'move',
  [TOOLS.HAND]:          'grab',
  [TOOLS.ZOOM]:          'zoom-in',
  [TOOLS.ROTATE]:        'grab',
  [TOOLS.SCALE]:         'nwse-resize',
  [TOOLS.SHAPE]: 'crosshair',
  [TOOLS.PEN]:           'crosshair',
  [TOOLS.TEXT]:          'text',
  [TOOLS.NULL]:          'default',
  [TOOLS.GRADIENT]:      'crosshair',
  [TOOLS.MASK]:          'crosshair',
  [TOOLS.PERSPECTIVE]:   'crosshair',
};

export function cursorForTool(tool: ToolId): CursorState {
  return toolCursors[tool] ?? 'default';
}

/** Get cursor for active interaction (overrides tool cursor) */
export function cursorForInteraction(
  interaction: 'panning' | 'dragging' | 'rotating' | 'scaling' | 'drawing' | 'box-select' | null,
  tool: ToolId,
): CursorState {
  switch (interaction) {
    case 'panning':    return 'grabbing';
    case 'dragging':   return 'grabbing';
    case 'rotating':   return 'grabbing';
    case 'scaling':    return 'nwse-resize';
    case 'drawing':    return 'crosshair';
    case 'box-select': return 'crosshair';
    default:           return cursorForTool(tool);
  }
}

/** Apply a cursor globally (during modal transforms, drags) */
export function setBodyCursor(cursor: CursorState | ''): void {
  document.body.style.cursor = cursor;
}