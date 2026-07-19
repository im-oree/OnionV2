import type { IconName } from '../../common/Icon';
import type { ToolId } from '../../../state/toolStore';
import { TOOLS } from '../../../config/constants';

export interface ToolDefinition { id:ToolId; icon:IconName; label:string; shortcut?:string }

/**
 * L1: Blender-style tool groups.
 * Group 1: Selection & Transform
 * Group 2: Shapes
 * Group 3: Drawing
 * Group 4: Navigation
 * 
 * Zoom tool removed — user zooms via Ctrl+Scroll (industry standard).
 */
export const TOOL_GROUPS: ToolDefinition[][] = [
  [{ id:TOOLS.SELECT as ToolId, icon:'select', label:'Select', shortcut:'V' },
   { id:TOOLS.MOVE as ToolId, icon:'move', label:'Move', shortcut:'G' },
   { id:TOOLS.ROTATE as ToolId, icon:'rotate', label:'Rotate', shortcut:'R' },
   { id:TOOLS.SCALE as ToolId, icon:'scale', label:'Scale', shortcut:'S' }],
  [{ id:TOOLS.SHAPE_RECT as ToolId, icon:'rectangle', label:'Rectangle', shortcut:'Shift+R' },
   { id:TOOLS.SHAPE_ELLIPSE as ToolId, icon:'ellipse', label:'Ellipse', shortcut:'Shift+E' },
   { id:TOOLS.SHAPE_POLYGON as ToolId, icon:'polygon', label:'Polygon', shortcut:'Shift+P' }],
  [{ id:TOOLS.PEN as ToolId, icon:'pen', label:'Pen', shortcut:'P' },
   { id:TOOLS.TEXT as ToolId, icon:'text', label:'Text', shortcut:'T' },
   { id:TOOLS.GRADIENT as ToolId, icon:'gradient', label:'Gradient', shortcut:'Shift+G' }],
  [{ id:TOOLS.HAND as ToolId, icon:'hand', label:'Hand', shortcut:'H' }],
];
