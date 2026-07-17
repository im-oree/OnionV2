import type { MenuItemDefinition } from '../MenuDropdown';

export const renderMenu:MenuItemDefinition[]=[
  {id:'render.addToQueue',label:'Add to Render Queue',shortcut:'Ctrl+M',onClick:()=>console.log('[Menu] Render > Add to Queue')},
  {id:'render.addFrame',label:'Add Frame to Render Queue',onClick:()=>console.log('[Menu] Render > Add Frame')},
  {id:'render.sep1',label:'',divider:true,onClick:()=>{}},
  {id:'render.queue',label:'Render Queue...',onClick:()=>console.log('[Menu] Render > Queue')},
  {id:'render.outputModule',label:'Output Module Settings...',onClick:()=>console.log('[Menu] Render > Output Module')},
  {id:'render.sep2',label:'',divider:true,onClick:()=>{}},
  {id:'render.preview',label:'RAM Preview',shortcut:'Space',onClick:()=>console.log('[Menu] Render > RAM Preview')},
  {id:'render.adaptiveRes',label:'Adaptive Resolution',checked:true,onClick:()=>console.log('[Menu] Render > Toggle Adaptive Resolution')},
];
