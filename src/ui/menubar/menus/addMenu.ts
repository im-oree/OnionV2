import type { MenuItemDefinition } from '../MenuDropdown';
import { useCompositionStore } from '../../../state/compositionStore';
import { useSelectionStore } from '../../../state/selectionStore';
import { createLayerInstance } from '../../../utils/createLayerInstance';
import { openImportFilePicker } from '../../../utils/unifiedImport';
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

function add3DShape(shapeType: string): void {
  const state = useCompositionStore.getState();
  const compId = state.activeCompositionId;
  if (!compId) return;
  const comp = state.compositions.find((c) => c.id === compId);
  if (!comp) return;
  const layer = createLayerInstance('shape', comp, {
    name: `${shapeType.charAt(0).toUpperCase() + shapeType.slice(1)}`,
    is3D: true,
    transform3D: {
      position: { x: 0, y: 0, z: 0 },
      scale: { x: 100, y: 100, z: 100 },
      rotationX: 0, rotationY: 0, rotationZ: 0,
      orientation: { x: 0, y: 0, z: 0 },
      anchorPoint: { x: 0, y: 0, z: 0 },
      opacity: 100,
    },
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
    transform3D: {
      position: { x: 0, y: 0, z: 500 },
      scale: { x: 100, y: 100, z: 100 },
      rotationX: 0, rotationY: 0, rotationZ: 0,
      orientation: { x: 0, y: 0, z: 0 },
      anchorPoint: { x: 0, y: 0, z: 0 },
      opacity: 100,
    },
    lightData: {
      lightType: lightType as any,
      color: '#ffffff', intensity: 100, castsShadows: false,
      shadowDarkness: 75, shadowDiffusion: 0,
      falloff: 'smooth', falloffDistance: 500, falloffRadius: 500,
      coneAngle: 54, coneFeather: 50,
      pointOfInterest: { x: 0, y: 0, z: 0 },
    },
  } as any);
  state.addLayer(compId, layer);
  useSelectionStore.getState().select({ type: 'layer', id: layer.id, compositionId: compId });
}

export const addMenu: MenuItemDefinition[] = [
  {
    id: 'layer.importFile',
    label: 'Import File...',
    shortcut: 'Ctrl+I',
    onClick: () => {
      // Unified import — accepts any supported file, auto-adds to timeline
      openImportFilePicker({ addToTimeline: true });
    },
  },
  { id: 'layer.addSep1', label: '', divider: true, onClick: () => {} },

  { id: 'layer.newSolid', label: 'New Solid', shortcut: 'Ctrl+Y', onClick: () => addNewLayer('solid') },
  { id: 'layer.newShape', label: 'New Shape', onClick: () => addNewLayer('shape') },
  { id: 'layer.newText', label: 'New Text', shortcut: 'Ctrl+T', onClick: () => addNewLayer('text') },
  { id: 'layer.addAdjustment', label: 'Adjustment Layer', onClick: () => addNewLayer('adjustment') },
  { id: 'layer.nullLayer', label: 'Null Object', onClick: () => addNewLayer('null') },
  { id: 'layer.newSpline', label: 'Spline', onClick: () => addNewLayer('spline') },
  { id: 'layer.newChart', label: 'Chart', onClick: () => addNewLayer('chart') },
  { id: 'layer.addTransition', label: 'Transition Layer', onClick: () => addNewLayer('transition') },

  { id: 'layer.addSep2', label: '', divider: true, onClick: () => {} },

  { id: 'layer.3dShapes', label: '3D Shape', disabled: true, onClick: () => {} },
  { id: 'layer.3dSphere', label: '  Sphere', onClick: () => add3DShape('sphere') },
  { id: 'layer.3dCube', label: '  Cube', onClick: () => add3DShape('cube') },
  { id: 'layer.3dCylinder', label: '  Cylinder', onClick: () => add3DShape('cylinder') },
  { id: 'layer.3dTorus', label: '  Torus', onClick: () => add3DShape('torus') },
  { id: 'layer.3dCone', label: '  Cone', onClick: () => add3DShape('cone') },

  { id: 'layer.addSep4', label: '', divider: true, onClick: () => {} },

  { id: 'layer.lights', label: 'Light', disabled: true, onClick: () => {} },
  { id: 'layer.lightPoint', label: '  Point Light', onClick: () => addLight('point') },
  { id: 'layer.lightSpot', label: '  Spot Light', onClick: () => addLight('spot') },
  { id: 'layer.lightDirectional', label: '  Directional Light', onClick: () => addLight('parallel') },
  { id: 'layer.lightAmbient', label: '  Ambient Light', onClick: () => addLight('ambient') },

  { id: 'layer.addSep5', label: '', divider: true, onClick: () => {} },

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