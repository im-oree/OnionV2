import type { MenuItemDefinition } from '../MenuDropdown';
import { openNewCompositionDialog } from '../../dialogs/DialogManager';
import { assetManager } from '../../../storage/AssetManager';
import { useCompositionStore } from '../../../state/compositionStore';
import { useSelectionStore } from '../../../state/selectionStore';
import { createLayerInstance } from '../../../utils/createLayerInstance';

export const fileMenu:MenuItemDefinition[]=[
  {id:'file.new',label:'New Project',shortcut:'Ctrl+N',onClick:()=>openNewCompositionDialog()},
  {id:'file.open',label:'Open Project...',shortcut:'Ctrl+O',onClick:()=>console.log('[Menu] File > Open')},
  {id:'file.openRecent',label:'Open Recent',children:[{id:'file.recent.none',label:'(No recent files)',disabled:true,onClick:()=>{}}]},
  {id:'file.sep1',label:'',divider:true,onClick:()=>{}},
  {id:'file.save',label:'Save',shortcut:'Ctrl+S',onClick:()=>console.log('[Menu] File > Save')},
  {id:'file.saveAs',label:'Save As...',shortcut:'Ctrl+Shift+S',onClick:()=>console.log('[Menu] File > Save As')},
  {id:'file.saveCopy',label:'Save Copy...',onClick:()=>console.log('[Menu] File > Save Copy')},
  {id:'file.sep2',label:'',divider:true,onClick:()=>{}},
  {id:'file.import',label:'Import...',shortcut:'Ctrl+I',onClick:async()=>{
    const state = useCompositionStore.getState();
    const compId = state.activeCompositionId;
    if (!compId) return;
    const comp = state.compositions.find((c) => c.id === compId);
    if (!comp) return;
    const assets = await assetManager.importFromFilePicker();
    for (const asset of assets) {
      const type = asset.type === 'video' ? 'video' : 'image';
      const layer = createLayerInstance(type, comp, {
        name: asset.name,
        data: type === 'video'
          ? { assetId: asset.id, naturalWidth: asset.naturalWidth, naturalHeight: asset.naturalHeight, duration: asset.duration ?? 10, muted: false, volume: 1, playbackRate: 1 }
          : { assetId: asset.id, naturalWidth: asset.naturalWidth, naturalHeight: asset.naturalHeight },
      });
      state.addLayer(compId, layer);
      useSelectionStore.getState().select({ type: 'layer', id: layer.id, compositionId: compId });
    }
  }},
  {id:'file.export',label:'Export...',children:[
    {id:'file.export.video',label:'Video...',shortcut:'Ctrl+M',onClick:()=>console.log('[Menu] File > Export > Video')},
    {id:'file.export.frame',label:'Frame...',onClick:()=>console.log('[Menu] File > Export > Frame')},
    {id:'file.export.proxy',label:'Proxy...',onClick:()=>console.log('[Menu] File > Export > Proxy')},
  ]},
  {id:'file.sep3',label:'',divider:true,onClick:()=>{}},
  {id:'file.quit',label:'Quit',shortcut:'Ctrl+Q',onClick:()=>console.log('[Menu] File > Quit')},
];
