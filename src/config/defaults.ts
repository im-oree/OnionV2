import { COMPOSITION, PERFORMANCE } from './constants';
import type { Composition, Layer, Project } from '../types';
import { defaultTransform, defaultTransform3D, defaultCameraData, defaultLightData } from '../types/layer';
import { defaultEnvironment3D } from '../types/composition';

/** AE-style layer label color palette */
export const LAYER_COLORS = [
  '#B7B7B7', '#F5A623', '#F8E71C', '#7ED321', '#50E3C2',
  '#4A90E2', '#9013FE', '#BD10E0', '#D0021B', '#E8913A',
  '#8B572A', '#D4A017', '#417505', '#B8E986', '#4A4A4A',
];

let _layerCounter = 0;

export const DEFAULT_COMPOSITION: Omit<Composition, 'id'> = {
  name: 'New Composition',
  width: COMPOSITION.DEFAULT_WIDTH,
  height: COMPOSITION.DEFAULT_HEIGHT,
  fps: COMPOSITION.DEFAULT_FPS,
  duration: COMPOSITION.DEFAULT_DURATION,
  backgroundColor: '#000000',
  layers: [],
  currentTime: 0,
  workAreaStart: 0,
  workAreaEnd: COMPOSITION.DEFAULT_DURATION,
  pixelAspect: COMPOSITION.PIXEL_ASPECT,
  environment3D: defaultEnvironment3D(),
  rendererMode: 'full',
  viewMode: 'activeCamera',
};

export function createDefaultLayer(type: Layer['type'], name: string): Omit<Layer, 'id'> {
  const base = {
    type,
    name,
    visible: true,
    locked: false,
    soloed: false,
    shy: false,
    blendMode: 'normal' as const,
    opacity: 100,
    transform: defaultTransform(),
    startFrame: 0,
    endFrame: 300,
    zIndex: 0,
    effects: [],
    masks: [],
    parentId: null,
    color: LAYER_COLORS[_layerCounter++ % LAYER_COLORS.length],
  };

  if (type === 'camera') {
    return { ...base, cameraData: defaultCameraData(), transform: { ...defaultTransform(), position: { x: 0, y: 0 } } } as any;
  }
  if (type === 'light') {
    return { ...base, lightData: defaultLightData(), transform: { ...defaultTransform(), position: { x: 0, y: 0 } } } as any;
  }

  return base;
}

export const DEFAULT_PROJECT: Omit<Project, 'id'> = {
  name: 'Untitled Project',
  version: '1.0',
  created: Date.now(),
  modified: Date.now(),
  compositions: [],
  assets: [],
  settings: {
    adaptiveResolution: PERFORMANCE.ADAPTIVE_RESOLUTION_ON,
    ramPreview: PERFORMANCE.RAM_PREVIEW_ON,
    targetFps: PERFORMANCE.TARGET_FPS,
    gridSnap: true,
    snapToGuides: true,
  },
};

export const DEFAULT_UI_STATE = {
  activeWorkspace: 'layout',
  panelVisibility: {
    menubar: true,
    toolbar: true,
    timeline: true,
    outliner: true,
    properties: true,
  },
  panelSizes: {
    toolbarWidth: 36,
    outlinerRatio: 0.4,
    timelineHeight: 150,
    propertiesRatio: 0.6,
  },
};
