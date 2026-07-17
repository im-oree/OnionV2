import type { MenuItemDefinition } from '../MenuDropdown';

export const editMenu:MenuItemDefinition[]=[
  {id:'edit.undo',label:'Undo',shortcut:'Ctrl+Z',onClick:()=>console.log('[Menu] Edit > Undo')},
  {id:'edit.redo',label:'Redo',shortcut:'Ctrl+Shift+Z',onClick:()=>console.log('[Menu] Edit > Redo')},
  {id:'edit.sep1',label:'',divider:true,onClick:()=>{}},
  {id:'edit.cut',label:'Cut',shortcut:'Ctrl+X',onClick:()=>console.log('[Menu] Edit > Cut')},
  {id:'edit.copy',label:'Copy',shortcut:'Ctrl+C',onClick:()=>console.log('[Menu] Edit > Copy')},
  {id:'edit.paste',label:'Paste',shortcut:'Ctrl+V',onClick:()=>console.log('[Menu] Edit > Paste')},
  {id:'edit.duplicate',label:'Duplicate',shortcut:'Ctrl+D',onClick:()=>console.log('[Menu] Edit > Duplicate')},
  {id:'edit.delete',label:'Delete',shortcut:'X',onClick:()=>console.log('[Menu] Edit > Delete')},
  {id:'edit.sep2',label:'',divider:true,onClick:()=>{}},
  {id:'edit.selectAll',label:'Select All',shortcut:'A',onClick:()=>console.log('[Menu] Edit > Select All')},
  {id:'edit.deselectAll',label:'Deselect All',shortcut:'Alt+A',onClick:()=>console.log('[Menu] Edit > Deselect All')},
  {id:'edit.invertSelection',label:'Invert Selection',onClick:()=>console.log('[Menu] Edit > Invert Selection')},
  {id:'edit.sep3',label:'',divider:true,onClick:()=>{}},
  {id:'edit.preferences',label:'Preferences...',onClick:()=>console.log('[Menu] Edit > Preferences')},
];
