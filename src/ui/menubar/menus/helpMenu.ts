import type { MenuItemDefinition } from '../MenuDropdown';

export const helpMenu:MenuItemDefinition[]=[
  {id:'help.about',label:'About OnionV2',onClick:()=>console.log('[Menu] Help > About')},
  {id:'help.sep1',label:'',divider:true,onClick:()=>{}},
  {id:'help.docs',label:'Documentation',shortcut:'F1',onClick:()=>console.log('[Menu] Help > Documentation')},
  {id:'help.shortcuts',label:'Keyboard Shortcuts...',onClick:()=>console.log('[Menu] Help > Shortcuts')},
  {id:'help.tutorials',label:'Tutorials',onClick:()=>console.log('[Menu] Help > Tutorials')},
  {id:'help.sep2',label:'',divider:true,onClick:()=>{}},
  {id:'help.checkUpdate',label:'Check for Updates...',onClick:()=>console.log('[Menu] Help > Check Updates')},
  {id:'help.reportBug',label:'Report a Bug...',onClick:()=>console.log('[Menu] Help > Report Bug')},
];
