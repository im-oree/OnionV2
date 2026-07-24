import type { IconName } from '../../common/Icon';
import type { ToolId } from '../../../state/toolStore';
import { TOOLS } from '../../../config/constants';

export interface ToolDefinition { id:ToolId; icon:IconName; label:string; shortcut?:string }

/**
 * L1: Clean tool groups — 4 logical sections.
 * Group 1: Selection & Transform
 * Group 2: Create
 * Group 3: Adjust
 * Group 4: Navigate
 */
export const TOOL_GROUPS: ToolDefinition[][] = [
  // ── Selection & Transform ──
  [{ id:TOOLS.SELECT as ToolId, icon:'select', label:'Select', shortcut:'V' },
   { id:TOOLS.MOVE as ToolId, icon:'move', label:'Move', shortcut:'G' },
   { id:TOOLS.ROTATE as ToolId, icon:'rotate', label:'Rotate', shortcut:'R' },
   { id:TOOLS.SCALE as ToolId, icon:'scale', label:'Scale', shortcut:'S' }],

  // ── Create ──
  [{ id:TOOLS.SHAPE as ToolId, icon:'polygon', label:'Shape', shortcut:'Shift+S' },
   { id:TOOLS.PEN as ToolId, icon:'pen', label:'Pen', shortcut:'P' },
   { id:TOOLS.TEXT as ToolId, icon:'text', label:'Text', shortcut:'T' }],

  // ── Adjust ──
  [{ id:TOOLS.GRADIENT as ToolId, icon:'gradient', label:'Gradient', shortcut:'Shift+G' },
   { id:TOOLS.PERSPECTIVE as ToolId, icon:'perspective', label:'Perspective', shortcut:'Shift+M' }],

  // ── Navigate & Util ──
  [{ id:TOOLS.HAND as ToolId, icon:'hand', label:'Hand', shortcut:'H' },
   { id:TOOLS.PICK_WHIP as ToolId, icon:'link', label:'Pick Whip', shortcut:'W' }],
];
