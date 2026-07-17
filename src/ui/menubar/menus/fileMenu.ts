import type { MenuItemDefinition } from '../MenuDropdown';
import { openNewCompositionDialog } from '../../dialogs/DialogManager';

export const fileMenu:MenuItemDefinition[]=[
  {id:'file.new',label:'New Project',shortcut:'Ctrl+N',onClick:()=>openNewCompositionDialog()},
  {id:'file.open',label:'Open Project...',shortcut:'Ctrl+O',onClick:()=>console.log('[Menu] File > Open')},
  {id:'file.openRecent',label:'Open Recent',children:[{id:'file.recent.none',label:'(No recent files)',disabled:true,onClick:()=>{}}]},
  {id:'file.sep1',label:'',divider:true,onClick:()=>{}},
  {id:'file.save',label:'Save',shortcut:'Ctrl+S',onClick:()=>console.log('[Menu] File > Save')},
  {id:'file.saveAs',label:'Save As...',shortcut:'Ctrl+Shift+S',onClick:()=>console.log('[Menu] File > Save As')},
  {id:'file.saveCopy',label:'Save Copy...',onClick:()=>console.log('[Menu] File > Save Copy')},
  {id:'file.sep2',label:'',divider:true,onClick:()=>{}},
  {id:'file.import',label:'Import...',shortcut:'Ctrl+I',onClick:()=>console.log('[Menu] File > Import')},
  {id:'file.export',label:'Export...',children:[
    {id:'file.export.video',label:'Video...',shortcut:'Ctrl+M',onClick:()=>console.log('[Menu] File > Export > Video')},
    {id:'file.export.frame',label:'Frame...',onClick:()=>console.log('[Menu] File > Export > Frame')},
    {id:'file.export.proxy',label:'Proxy...',onClick:()=>console.log('[Menu] File > Export > Proxy')},
  ]},
  {id:'file.sep3',label:'',divider:true,onClick:()=>{}},
  {id:'file.quit',label:'Quit',shortcut:'Ctrl+Q',onClick:()=>console.log('[Menu] File > Quit')},
];
