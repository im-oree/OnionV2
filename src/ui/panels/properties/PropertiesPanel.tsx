import React from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useSelectionStore } from '../../../state/selectionStore';
import { TransformSection } from './TransformSection';
import { LayerSection } from './LayerSection';
import { SolidSection } from './SolidSection';
import { ShapeSection } from './ShapeSection';
import { TextSection } from './TextSection';
import { CompSection } from './CompSection';
import { EffectsSection } from './EffectsSection';
import { VideoSection } from './VideoSection';
import { AudioSection } from './AudioSection';
import { ChartSection } from './ChartSection';
import { MaskSection } from './MaskSection';
import { SplineSection } from './SplineSection';
import { ModifierSection } from './ModifierSection';
import { TextAnimatorSection } from './TextAnimatorSection';
import { ModelSection } from './ModelSection';
import { MaterialSection } from './MaterialSection';

type TabId = 'transform' | 'object' | 'audio' | 'modifiers';

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const LAYER_TYPE_ICONS: Record<string, React.ReactNode> = {
  solid: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    </svg>
  ),
  shape: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12,3 3,21 21,21" />
    </svg>
  ),
  text: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="4,7 4,4 20,4 20,7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  ),
  image: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21,15 16,10 5,21" />
    </svg>
  ),
  video: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
      <line x1="7" y1="2" x2="7" y2="22" />
      <line x1="17" y1="2" x2="17" y2="22" />
      <line x1="2" y1="12" x2="22" y2="12" />
    </svg>
  ),
  audio: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  ),
  comp: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
};

const AUDIO_ICON = LAYER_TYPE_ICONS.audio;

function buildTabs(layerType: string | undefined): TabDef[] {
  const tabs: TabDef[] = [
    {
      id: 'transform',
      label: 'Transform',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12,5 19,12 12,19" />
        </svg>
      ),
    },
  ];

  if (layerType) {
    tabs.push({
      id: 'object',
      label: 'Object Data',
      icon: LAYER_TYPE_ICONS[layerType] ?? LAYER_TYPE_ICONS.solid,
    });
  }

  // Audio tab — shown for audio AND video layers
  if (layerType === 'audio' || layerType === 'video') {
    tabs.push({
      id: 'audio',
      label: 'Audio',
      icon: AUDIO_ICON,
    });
  }

  tabs.push({
    id: 'modifiers',
    label: 'Modifiers',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  });

  return tabs;
}

const TabButton: React.FC<{
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}> = ({ active, label, icon, onClick }) => (
  <button
    onClick={onClick}
    title={label}
    className="relative flex items-center justify-center w-[30px] h-[30px] border-0 cursor-pointer transition-colors"
    style={{
      background: active ? 'var(--color-panel-active)' : 'transparent',
      color: active ? 'var(--color-accent)' : 'var(--color-text-disabled)',
      borderRadius: 'var(--radius-sm)',
    }}
    onMouseEnter={(e) => {
      if (!active) {
        e.currentTarget.style.background = 'var(--color-panel-hover)';
        e.currentTarget.style.color = 'var(--color-text-secondary)';
      }
    }}
    onMouseLeave={(e) => {
      if (!active) {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'var(--color-text-disabled)';
      }
    }}
  >
    {active && (
      <div
        className="absolute left-0 top-1 bottom-1 w-[2px] rounded-r-sm"
        style={{ background: 'var(--color-accent)' }}
      />
    )}
    {icon}
  </button>
);

const Placeholder: React.FC<{ text: string }> = ({ text }) => (
  <div className="p-4">
    <div
      className="text-center py-8"
      style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-disabled)', fontStyle: 'italic' }}
    >
      {text}
    </div>
  </div>
);

export const PropertiesPanel: React.FC = () => {
  const comp = useCompositionStore((s) => s.activeCompositionId ? s.compositions.find((c) => c.id === s.activeCompositionId) ?? null : null);
  const selectedIds = useSelectionStore((s) => s.selected.filter((x) => x.type === 'layer').map((x) => x.id));
  const [activeTab, setActiveTab] = React.useState<TabId>('transform');

  const layers = comp?.layers ?? [];
  const selectedLayers = layers.filter((l) => selectedIds.includes(l.id));
  const single = selectedLayers.length === 1 ? selectedLayers[0] : null;

  const tabs = React.useMemo(() => buildTabs(single?.type), [single?.type]);

  React.useEffect(() => {
    if (!tabs.some(t => t.id === activeTab) && tabs.length > 0) {
      setActiveTab(tabs[0].id);
    }
  }, [tabs, activeTab]);

  if (!comp) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 text-center" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-disabled)', fontStyle: 'italic' }}>
          No composition
        </div>
      </div>
    );
  }

  if (selectedLayers.length === 0) {
    return (
      <div className="flex flex-col h-full overflow-auto">
        <CompSection />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* Left rail — vertical tab bar */}
      <div
        className="flex flex-col items-center gap-1 py-2 shrink-0"
        style={{
          width: 36,
          background: 'var(--color-surface-alt)',
          borderRight: '1px solid var(--color-border)',
        }}
      >
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            active={activeTab === tab.id}
            label={tab.label}
            icon={tab.icon}
            onClick={() => setActiveTab(tab.id)}
          />
        ))}
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Layer name header */}
        {single && (
          <div
            className="flex items-center px-3 gap-2"
            style={{ height: 36, borderBottom: '1px solid var(--color-border)' }}
          >
            <input
              type="text"
              value={single.name}
              onChange={(e) => useCompositionStore.getState().updateLayer(comp.id, single.id, { name: e.target.value })}
              className="flex-1 outline-none"
              style={{
                height: 24, padding: '0 6px',
                background: 'transparent', border: '1px solid transparent',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 500,
              }}
              onFocus={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--color-input-bg)'}
              onBlur={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            />
            <span style={{
              fontSize: '9px', color: 'var(--color-text-tertiary)',
              textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600,
            }}>
              {single.type}
            </span>
          </div>
        )}

        {selectedLayers.length > 1 && (
          <div
            className="flex items-center px-3"
            style={{ height: 36, borderBottom: '1px solid var(--color-border)' }}
          >
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
              {selectedLayers.length} layers selected
            </span>
          </div>
        )}

        <div className="py-1">
          {activeTab === 'transform' && single && (
            <TransformSection layer={single} compId={comp.id} />
          )}
          {activeTab === 'transform' && selectedLayers.length > 1 && (
            <Placeholder text="Multi-layer transform editing coming soon" />
          )}

          {activeTab === 'object' && single && (
            <>
              <LayerSection layer={single} compId={comp.id} />
              {single.type === 'solid' && <SolidSection layer={single} compId={comp.id} />}
              {single.type === 'shape' && <ShapeSection layer={single} compId={comp.id} />}
              {single.type === 'text' && <TextSection layer={single} compId={comp.id} />}
              {single.type === 'text' && (single.data as any)?.animators?.map((anim: any) => (
                <TextAnimatorSection key={anim.id} anim={anim} compId={comp.id} layerId={single.id} />
              ))}
              {single.type === 'video' && <VideoSection layer={single} compId={comp.id} />}
              {single.type === 'chart' && <ChartSection layer={single} compId={comp.id} />}
              {single.type === 'spline' && <SplineSection layer={single} compId={comp.id} />}
              {single.type === 'model3d' && <ModelSection layer={single} compId={comp.id} />}
              {(single.type === 'model3d' || (single.type === 'shape' && single.is3D)) && (
                <MaterialSection layer={single} compId={comp.id} />
              )}
            </>
          )}
          {activeTab === 'object' && selectedLayers.length > 1 && (
            <Placeholder text="Multi-layer object editing coming soon" />
          )}

          {/* AUDIO TAB */}
          {activeTab === 'audio' && single && (
            <AudioSection layer={single} compId={comp.id} />
          )}
          {activeTab === 'audio' && selectedLayers.length > 1 && (
            <Placeholder text="Multi-layer audio editing coming soon" />
          )}

          {activeTab === 'modifiers' && single && (
            <>
              <EffectsSection layer={single} compId={comp.id} />
              <MaskSection layerId={single.id} />
              <ModifierSection layer={single} compId={comp.id} />
            </>
          )}
          {activeTab === 'modifiers' && selectedLayers.length > 1 && (
            <Placeholder text="Multi-layer effect editing coming soon" />
          )}
        </div>
      </div>
    </div>
  );
};

export default PropertiesPanel;