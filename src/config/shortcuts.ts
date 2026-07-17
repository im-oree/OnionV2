import { MODIFIERS } from './constants';

export interface Shortcut {
  id: string;
  label: string;
  display: string;
  key: string;
  modifiers: string[];
  context?: string;
  remappable: boolean;
}

export const SHORTCUTS: Record<string, Shortcut> = {
  GRAB: { id:'tool.grab', label:'Grab/Move', display:'G', key:'g', modifiers:[], context:'viewport', remappable:true },
  ROTATE: { id:'tool.rotate', label:'Rotate', display:'R', key:'r', modifiers:[], context:'viewport', remappable:true },
  SCALE: { id:'tool.scale', label:'Scale', display:'S', key:'s', modifiers:[], context:'viewport', remappable:true },
  SELECT_ALL: { id:'edit.selectAll', label:'Select All', display:'A', key:'a', modifiers:[], context:'global', remappable:true },
  DESELECT_ALL: { id:'edit.deselectAll', label:'Deselect All', display:'Alt+A', key:'a', modifiers:[MODIFIERS.ALT], context:'global', remappable:true },
  DELETE: { id:'edit.delete', label:'Delete', display:'X / Delete', key:'x', modifiers:[], context:'global', remappable:true },
  DELETE_ALT: { id:'edit.deleteAlt', label:'Delete', display:'Delete', key:'Delete', modifiers:[], context:'global', remappable:true },
  UNDO: { id:'edit.undo', label:'Undo', display:'Ctrl+Z', key:'z', modifiers:[MODIFIERS.CTRL], context:'global', remappable:true },
  REDO: { id:'edit.redo', label:'Redo', display:'Ctrl+Shift+Z', key:'z', modifiers:[MODIFIERS.CTRL, MODIFIERS.SHIFT], context:'global', remappable:true },
  PLAY_PAUSE: { id:'playback.playPause', label:'Play / Pause', display:'Space', key:' ', modifiers:[], context:'timeline', remappable:true },
  NEXT_FRAME: { id:'playback.nextFrame', label:'Next Frame', display:'Right Arrow', key:'ArrowRight', modifiers:[], context:'timeline', remappable:true },
  PREV_FRAME: { id:'playback.prevFrame', label:'Previous Frame', display:'Left Arrow', key:'ArrowLeft', modifiers:[], context:'timeline', remappable:true },
  JUMP_FORWARD: { id:'playback.jumpForward', label:'Jump Forward 10', display:'Shift+Right', key:'ArrowRight', modifiers:[MODIFIERS.SHIFT], context:'timeline', remappable:true },
  JUMP_BACK: { id:'playback.jumpBack', label:'Jump Back 10', display:'Shift+Left', key:'ArrowLeft', modifiers:[MODIFIERS.SHIFT], context:'timeline', remappable:true },
  GO_TO_START: { id:'playback.goToStart', label:'First Frame', display:'Home', key:'Home', modifiers:[], context:'timeline', remappable:true },
  GO_TO_END: { id:'playback.goToEnd', label:'Last Frame', display:'End', key:'End', modifiers:[], context:'timeline', remappable:true },
  TOGGLE_SIDE_PANEL: { id:'ui.toggleSidePanel', label:'Toggle Side Panel', display:'N', key:'n', modifiers:[], context:'global', remappable:true },
  TOGGLE_TOOLBAR: { id:'ui.toggleToolbar', label:'Toggle Toolbar', display:'T', key:'t', modifiers:[], context:'global', remappable:true },
  FRAME_SELECTED: { id:'viewport.frameSelected', label:'Frame Selected', display:'Numpad .', key:'.', modifiers:[], context:'viewport', remappable:true },
  SAVE: { id:'file.save', label:'Save', display:'Ctrl+S', key:'s', modifiers:[MODIFIERS.CTRL], context:'global', remappable:true },
  OPEN: { id:'file.open', label:'Open', display:'Ctrl+O', key:'o', modifiers:[MODIFIERS.CTRL], context:'global', remappable:true },
  NEW_COMPOSITION: { id:'composition.new', label:'New Composition', display:'Ctrl+N', key:'n', modifiers:[MODIFIERS.CTRL], context:'global', remappable:true },
  RENDER: { id:'render.addToQueue', label:'Add to Render Queue', display:'Ctrl+M', key:'m', modifiers:[MODIFIERS.CTRL], context:'global', remappable:true },
};
