/**
 * PanelRegistry — every dockable panel is registered here.
 * The Window menu, tab bars, and drag-drop all consume this registry.
 */
import React from 'react';
import {
  MonitorPlay, Folder as FolderIcon, Clock, Activity, Sliders,
  Wand2, Camera, AlignCenterHorizontal, Info, FileVideo, Type,
  Gauge, Wrench, Radio,
} from 'lucide-react';

export interface PanelDefinition {
  type: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  /** Lazy-loaded component */
  component: React.LazyExoticComponent<React.ComponentType<any>>;
  /** If true, panel can appear in Window menu but shouldn't be closed easily */
  essential?: boolean;
}

// Lazy imports — panels only mount when their tab is active
const ViewportPanel     = React.lazy(() => import('../panels/viewport/ViewportPanel'));
const ProjectPanel      = React.lazy(() => import('../panels/project/ProjectBrowserPanel'));
const TimelinePanel     = React.lazy(() => import('../panels/timeline/TimelinePanel'));
const GraphEditorPanel  = React.lazy(() => import('../panels/grapheditor/GraphEditorPanel'));
const PropertiesPanel   = React.lazy(() =>
  import('../panels/properties/PropertiesPanel').then((m) => ({ default: m.PropertiesPanel })),
);
const EffectsPanel      = React.lazy(() =>
  import('../panels/properties/EffectsPanelWrapper').then((m) => ({ default: m.default })),
);
const EffectsHubPanel   = React.lazy(() =>
  import('../panels/effects/EffectsHubPanel').then((m) => ({ default: m.default })),
);
const CameraPanel       = React.lazy(() =>
  import('../panels/camera/CameraPanel').then((m) => ({ default: m.CameraPanel })),
);
const AlignPanel        = React.lazy(() =>
  import('../panels/align/AlignPanel').then((m) => ({ default: m.default })),
);
const InfoPanel         = React.lazy(() =>
  import('../panels/info/InfoPanel').then((m) => ({ default: m.default })),
);
const RenderPanel       = React.lazy(() =>
  import('../panels/render/RenderPanel').then((m) => ({ default: m.default })),
);
const CharacterPanel    = React.lazy(() =>
  import('../panels/character/CharacterPanel').then((m) => ({ default: m.default })),
);
const PerformancePanel  = React.lazy(() =>
  import('../panels/performance/PerformancePanel').then((m) => ({ default: m.default })),
);
const AudioSceneMap     = React.lazy(() =>
  import('../panels/properties/audio/AudioSceneMap').then((m) => ({ default: m.default })),
);
const ToolbarPanel      = React.lazy(() =>
  import('../toolbar/Toolbar').then((m) => ({ default: m.Toolbar })),
);

export const PANEL_REGISTRY: Record<string, PanelDefinition> = {
  viewport: {
    type: 'viewport', label: 'Viewport', icon: MonitorPlay,
    component: ViewportPanel, essential: true,
  },
  project: {
    type: 'project', label: 'Project', icon: FolderIcon,
    component: ProjectPanel,
  },
  timeline: {
    type: 'timeline', label: 'Timeline', icon: Clock,
    component: TimelinePanel,
  },
  graph: {
    type: 'graph', label: 'Graph Editor', icon: Activity,
    component: GraphEditorPanel,
  },
  properties: {
    type: 'properties', label: 'Properties', icon: Sliders,
    component: PropertiesPanel,
  },
  effects: {
    type: 'effects', label: 'Effects', icon: Wand2,
    component: EffectsPanel,
  },
  effectsHub: {
    type: 'effectsHub', label: 'Effect Library', icon: Wand2,
    component: EffectsHubPanel,
  },
  camera: {
    type: 'camera', label: 'Camera', icon: Camera,
    component: CameraPanel,
  },
  align: {
    type: 'align', label: 'Align', icon: AlignCenterHorizontal,
    component: AlignPanel,
  },
  info: {
    type: 'info', label: 'Info', icon: Info,
    component: InfoPanel,
  },
  render: {
    type: 'render', label: 'Render', icon: FileVideo,
    component: RenderPanel,
  },
  character: {
    type: 'character', label: 'Character', icon: Type,
    component: CharacterPanel,
  },
  audioScene: {
    type: 'audioScene', label: 'Audio Scene', icon: Radio,
    component: AudioSceneMap,
  },
  performance: {
    type: 'performance', label: 'Performance', icon: Gauge,
    component: PerformancePanel,
  },
  toolbar: {
    type: 'toolbar', label: 'Tools', icon: Wrench,
    component: ToolbarPanel, essential: true,
  },
};

export function getPanelDef(type: string): PanelDefinition | null {
  return PANEL_REGISTRY[type] ?? null;
}

export function getAllPanelDefs(): PanelDefinition[] {
  return Object.values(PANEL_REGISTRY);
}