import type { MenuItemDefinition } from '../MenuDropdown';
import { useCompositionStore } from '../../../state/compositionStore';
import { useSelectionStore } from '../../../state/selectionStore';
import { createLayerInstance } from '../../../utils/createLayerInstance';
import { assetManager } from '../../../storage/AssetManager';
import type { Layer } from '../../../types/layer';

function addNewLayer(type: Layer['type']): void {
  const state = useCompositionStore.getState();
  const compId = state.activeCompositionId;
  if (!compId) return;
  const comp = state.compositions.find((c) => c.id === compId);
  if (!comp) return;
  const layer = createLayerInstance(type, comp);
  state.addLayer(compId, layer);
  useSelectionStore.getState().select({ type: 'layer', id: layer.id, compositionId: compId });
}

async function importFromFile(): Promise<void> {
  const state = useCompositionStore.getState();
  const compId = state.activeCompositionId;
  if (!compId) return;
  const comp = state.compositions.find((c) => c.id === compId);
  if (!comp) return;
  const assets = await assetManager.importFromFilePicker();
  for (const asset of assets) {
    if (asset.type === 'model3d') {
      // 3D models need special handling — load the scene and create a model3d layer
      const { loadModelFile } = await import('../../../renderer/layers/Model3DLoader');
      try {
        // Re-fetch the blob to create a File for the loader
        const resp = await fetch(asset.url);
        const blob = await resp.blob();
        const file = new File([blob], asset.name, { type: asset.mimeType || 'model/gltf-binary' });
        await loadModelFile(file); // validates and populates the cache
      } catch {
        // Best effort — layer will still be created, loader will retry
      }
      const ext = asset.name.split('.').pop()?.toLowerCase() ?? 'glb';
      const format = (ext === 'gltf' || ext === 'glb') ? ext as 'gltf' | 'glb'
        : (ext === 'obj') ? 'obj' as const
        : (ext === 'ply') ? 'ply' as const
        : (ext === 'stl') ? 'stl' as const
        : 'gltf' as const;
      const count = comp.layers.filter(l => l.type === 'model3d').length + 1;
      const layer = createLayerInstance('model3d', comp, {
        name: asset.name.replace(/\.[^.]+$/, '') + ' ' + count,
        is3D: true,
        transform3D: { position:{x:0,y:0,z:0}, scale:{x:100,y:100,z:100},
          rotationX:0, rotationY:0, rotationZ:0,
          orientation:{x:0,y:0,z:0}, anchorPoint:{x:0,y:0,z:0}, opacity:100 },
        data: {
          assetId: asset.id,
          url: asset.url,
          fileName: asset.name,
          mimeType: asset.mimeType,
          format,
          scale: 1,
          autoRotate: false,
          autoRotateSpeed: 1,
        },
      } as any);
      state.addLayer(compId, layer);
      useSelectionStore.getState().select({ type: 'layer', id: layer.id, compositionId: compId });
    } else {
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
  }
}

function add3DShape(shapeType: string): void {
  const state = useCompositionStore.getState();
  const compId = state.activeCompositionId;
  if (!compId) return;
  const comp = state.compositions.find((c) => c.id === compId);
  if (!comp) return;
  const layer = createLayerInstance('shape', comp, {
    name: `${shapeType.charAt(0).toUpperCase() + shapeType.slice(1)}`,
    is3D: true,
    transform3D: { position: {x:0,y:0,z:0}, scale: {x:100,y:100,z:100},
      rotationX:0, rotationY:0, rotationZ:0,
      orientation:{x:0,y:0,z:0}, anchorPoint:{x:0,y:0,z:0}, opacity:100 },
  }, shapeType);
  state.addLayer(compId, layer);
  useSelectionStore.getState().select({ type: 'layer', id: layer.id, compositionId: compId });
}

function addLight(lightType: string): void {
  const state = useCompositionStore.getState();
  const compId = state.activeCompositionId;
  if (!compId) return;
  const comp = state.compositions.find((c) => c.id === compId);
  if (!comp) return;
  const layer = createLayerInstance('light' as any, comp, {
    name: `${lightType.charAt(0).toUpperCase() + lightType.slice(1)} Light`,
    is3D: true,
    transform3D: { position: {x:0,y:0,z:500}, scale: {x:100,y:100,z:100},
      rotationX:0, rotationY:0, rotationZ:0,
      orientation:{x:0,y:0,z:0}, anchorPoint:{x:0,y:0,z:0}, opacity:100 },
    lightData: {
      lightType: lightType as any,
      color: '#ffffff', intensity: 100, castsShadows: false,
      shadowDarkness: 75, shadowDiffusion: 0,
      falloff: 'smooth', falloffDistance: 500, falloffRadius: 500,
      coneAngle: 54, coneFeather: 50,
      pointOfInterest: {x:0,y:0,z:0},
    },
  } as any);
  state.addLayer(compId, layer);
  useSelectionStore.getState().select({ type: 'layer', id: layer.id, compositionId: compId });
}

async function import3DModel(): Promise<void> {
  const { useNotificationStore } = await import('../../../state/notificationStore');
  const { loadModelFile } = await import('../../../renderer/layers/Model3DLoader');
  const state = useCompositionStore.getState();
  const compId = state.activeCompositionId;
  if (!compId) {
    useNotificationStore.getState().addNotification({
      type: 'warning', message: 'Create a composition first before importing a 3D model.', autoDismiss: 3000,
    });
    return;
  }
  const comp = state.compositions.find((c) => c.id === compId);
  if (!comp) return;

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.gltf,.glb,.obj,.fbx,.ply,.stl,.3ds,.dae,.json';
  input.multiple = true;
  input.onchange = async () => {
    const files = Array.from(input.files ?? []);
    if (files.length === 0) return;
    let imported = 0;
    for (const file of files) {
      try {
        // Step 1: Load the model to validate it and get the scene
        const modelData = await loadModelFile(file);

        // Step 2: Import into the asset manager so it appears in the Project panel
        const asset = await assetManager.importFile(file);

        const ext = file.name.split('.').pop()?.toLowerCase() ?? 'glb';
        const format = (ext === 'gltf' || ext === 'glb') ? ext as 'gltf' | 'glb'
          : (ext === 'obj') ? 'obj' as const
          : (ext === 'ply') ? 'ply' as const
          : (ext === 'stl') ? 'stl' as const
          : 'gltf' as const;
        const count = comp.layers.filter(l => l.type === 'model3d').length + 1;
        const layer = createLayerInstance('model3d', comp, {
          name: `${file.name.replace(/\.[^.]+$/, '')} ${count}`,
          is3D: true,
          transform3D: { position: {x:0,y:0,z:0}, scale: {x:100,y:100,z:100},
            rotationX:0, rotationY:0, rotationZ:0,
            orientation:{x:0,y:0,z:0}, anchorPoint:{x:0,y:0,z:0}, opacity:100 },
          data: {
            assetId: asset.id,
            url: asset.url,
            fileName: file.name,
            mimeType: file.type || 'model/gltf-binary',
            format,
            scale: 1,
            autoRotate: false,
            autoRotateSpeed: 1,
          },
        } as any);
        state.addLayer(compId, layer);
        useSelectionStore.getState().select({ type: 'layer', id: layer.id, compositionId: compId });
        imported++;
      } catch (err) {
        console.error(`[3D Import] Failed to load ${file.name}:`, err);
        useNotificationStore.getState().addNotification({
          type: 'error', message: `Failed to import "${file.name}": ${(err as Error)?.message ?? 'Unknown error'}`,
        });
      }
    }
    if (imported > 0) {
      useNotificationStore.getState().addNotification({
        type: 'success', message: `Imported ${imported} 3D model${imported > 1 ? 's' : ''}`, autoDismiss: 3000,
      });
    }
  };
  input.click();
}

export const addMenu: MenuItemDefinition[] = [
  {
    id: 'layer.importFile',
    label: 'Import File...',
    shortcut: 'Ctrl+I',
    onClick: () => { importFromFile(); },
  },
  {
    id: 'layer.addSep1',
    label: '',
    divider: true,
    onClick: () => {},
  },
  {
    id: 'layer.newSolid',
    label: 'New Solid',
    shortcut: 'Ctrl+Y',
    onClick: () => addNewLayer('solid'),
  },
  {
    id: 'layer.newShape',
    label: 'New Shape',
    onClick: () => addNewLayer('shape'),
  },
  {
    id: 'layer.newText',
    label: 'New Text',
    shortcut: 'Ctrl+T',
    onClick: () => addNewLayer('text'),
  },
  {
    id: 'layer.addAdjustment',
    label: 'Adjustment Layer',
    onClick: () => addNewLayer('adjustment'),
  },
  {
    id: 'layer.nullLayer',
    label: 'Null Object',
    onClick: () => addNewLayer('null'),
  },
  {
    id: 'layer.newSpline',
    label: 'Spline',
    onClick: () => addNewLayer('spline'),
  },
  {
    id: 'layer.newChart',
    label: 'Chart',
    onClick: () => addNewLayer('chart'),
  },
  {
    id: 'layer.addTransition',
    label: 'Transition Layer',
    onClick: () => addNewLayer('transition'),
  },
  {
    id: 'layer.addSep2',
    label: '',
    divider: true,
    onClick: () => {},
  },
  {
    id: 'layer.3dShapes',
    label: '3D Shape',
    disabled: true,
    onClick: () => {},
  },
  {
    id: 'layer.3dSphere',
    label: '  Sphere',
    onClick: () => add3DShape('sphere'),
  },
  {
    id: 'layer.3dCube',
    label: '  Cube',
    onClick: () => add3DShape('cube'),
  },
  {
    id: 'layer.3dCylinder',
    label: '  Cylinder',
    onClick: () => add3DShape('cylinder'),
  },
  {
    id: 'layer.3dTorus',
    label: '  Torus',
    onClick: () => add3DShape('torus'),
  },
  {
    id: 'layer.3dCone',
    label: '  Cone',
    onClick: () => add3DShape('cone'),
  },
  {
    id: 'layer.addSep3',
    label: '',
    divider: true,
    onClick: () => {},
  },
  {
    id: 'layer.import3DModel',
    label: 'Import 3D Model...',
    shortcut: 'Ctrl+Shift+I',
    onClick: () => import3DModel(),
  },
  {
    id: 'layer.addSep4',
    label: '',
    divider: true,
    onClick: () => {},
  },
  {
    id: 'layer.lights',
    label: 'Light',
    disabled: true,
    onClick: () => {},
  },
  {
    id: 'layer.lightPoint',
    label: '  Point Light',
    onClick: () => addLight('point'),
  },
  {
    id: 'layer.lightSpot',
    label: '  Spot Light',
    onClick: () => addLight('spot'),
  },
  {
    id: 'layer.lightDirectional',
    label: '  Directional Light',
    onClick: () => addLight('parallel'),
  },
  {
    id: 'layer.lightAmbient',
    label: '  Ambient Light',
    onClick: () => addLight('ambient'),
  },
  {
    id: 'layer.addSep5',
    label: '',
    divider: true,
    onClick: () => {},
  },
  {
    id: 'layer.duplicate',
    label: 'Duplicate',
    shortcut: 'Ctrl+D',
    onClick: () => {
      const compState = useCompositionStore.getState();
      const compId = compState.activeCompositionId;
      if (!compId) return;
      const comp = compState.compositions.find((c) => c.id === compId);
      if (!comp) return;
      const selectedIds = useSelectionStore.getState().getSelectedIds();
      const originals = selectedIds.map(id => comp.layers.find(l => l.id === id)).filter(Boolean) as Layer[];
      if (originals.length === 0) return;
      import('../../../utils/duplicateLayer').then(({ duplicateLayers }) => {
        const dups = duplicateLayers(compId, originals);
        useSelectionStore.getState().replaceSelection(dups.map(d => d.id), compId);
      });
    },
  },
  {
    id: 'layer.delete',
    label: 'Delete',
    shortcut: 'X',
    onClick: () => {
      const compState = useCompositionStore.getState();
      const compId = compState.activeCompositionId;
      if (!compId) return;
      const selectedIds = useSelectionStore.getState().getSelectedIds();
      for (const id of selectedIds) {
        compState.removeLayer(compId, id);
      }
      useSelectionStore.getState().clearSelection();
    },
  },
  {
    id: 'layer.rename',
    label: 'Rename',
    shortcut: 'F2',
    onClick: () => document.dispatchEvent(new CustomEvent('layer:rename')),
  },
  {
    id: 'add.extractAudio',
    label: 'Extract Audio from Selection',
    onClick: () => {
      import('../../../state/selectionStore').then((m) => {
        const sel = m.useSelectionStore.getState().selected.filter(x => x.type === 'layer');
        if (sel.length !== 1) {
          import('../../../state/notificationStore').then(n => {
            n.useNotificationStore.getState().addNotification({
              type: 'warning', message: 'Select exactly one layer to extract audio from.',
              autoDismiss: 3000,
            });
          });
          return;
        }
        import('../../dialogs/DialogManager').then((d) => {
          d.openExtractAudioDialog(sel[0].id);
        });
      });
    },
  },
];
