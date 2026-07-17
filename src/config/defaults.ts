import { COMPOSITION, LAYER_TYPES, PERFORMANCE } from './constants';
import type { Composition, Layer, Project } from '../types';

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
};

export const DEFAULT_SOLID_LAYER: Omit<Layer, 'id'> = {
  type: LAYER_TYPES.SOLID,
  name: 'Solid Layer',
  enabled: true,
  locked: false,
  solo: false,
  blendMode: 'normal',
  opacity: 100,
  transform: {
    position: { x: 0, y: 0 },
    scale: { x: 100, y: 100 },
    rotation: 0,
    anchorPoint: { x: 0.5, y: 0.5 },
  },
  inPoint: 0,
  outPoint: COMPOSITION.DEFAULT_DURATION,
  startTime: 0,
  stretch: 1,
  effects: [],
  masks: [],
  parentId: null,
};

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
