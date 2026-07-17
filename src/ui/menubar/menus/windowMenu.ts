import type { MenuItemDefinition } from '../MenuDropdown';

export const windowMenu:MenuItemDefinition[]=[
  {id:'window.layout',label:'Layout Workspace',onClick:()=>console.log('[Menu] Window > Layout')},
  {id:'window.animation',label:'Animation Workspace',onClick:()=>console.log('[Menu] Window > Animation')},
  {id:'window.compositing',label:'Compositing Workspace',onClick:()=>console.log('[Menu] Window > Compositing')},
  {id:'window.sep1',label:'',divider:true,onClick:()=>{}},
  {id:'window.toggleToolbar',label:'Toggle Toolbar',shortcut:'T',checked:true,onClick:()=>console.log('[Menu] Window > Toggle Toolbar')},
  {id:'window.toggleSidePanel',label:'Toggle Side Panel',shortcut:'N',checked:true,onClick:()=>console.log('[Menu] Window > Toggle Side Panel')},
  {id:'window.toggleTimeline',label:'Toggle Timeline',checked:true,onClick:()=>console.log('[Menu] Window > Toggle Timeline')},
  {id:'window.sep2',label:'',divider:true,onClick:()=>{}},
  {id:'window.showOutliner',label:'Show Outliner',checked:true,onClick:()=>console.log('[Menu] Window > Show Outliner')},
  {id:'window.showProperties',label:'Show Properties',checked:true,onClick:()=>console.log('[Menu] Window > Show Properties')},
  {id:'window.showEffects',label:'Show Effects',checked:false,onClick:()=>console.log('[Menu] Window > Show Effects')},
  {id:'window.sep3',label:'',divider:true,onClick:()=>{}},
  {id:'window.newWindow',label:'New Window',onClick:()=>console.log('[Menu] Window > New Window')},
  {id:'window.fullScreen',label:'Full Screen',shortcut:'F11',onClick:()=>console.log('[Menu] Window > Full Screen')},
];
