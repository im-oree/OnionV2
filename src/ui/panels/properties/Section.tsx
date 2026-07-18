import React from 'react';
import { useKeyframeStore } from '../../../state/keyframeStore';
import { useContextMenu } from '../../common/useContextMenu';
import { ContextMenu } from '../../common/ContextMenu';
import { useCompositionStore } from '../../../state/compositionStore';
import { buildPropertyContextMenu } from './propertyContextMenu';
import type { Layer } from '../../../types/layer';

interface SectionProps {
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export const Section: React.FC<SectionProps> = ({ label, defaultOpen = true, children }) => {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div>
      <button
        className="flex items-center w-full h-panel-header px-2 gap-1 border-0 cursor-pointer text-ui-xs font-medium text-text-secondary uppercase tracking-wider bg-panel-header hover:bg-panel-hover"
        onClick={() => setOpen(!open)}
      >
        <span className="text-text-disabled text-[8px] w-3">{open ? '▼' : '▸'}</span>
        <span>{label}</span>
      </button>
      {open && <div className="py-1 px-2 space-y-1">{children}</div>}
    </div>
  );
};

interface PropRowProps {
  label: string;
  children: React.ReactNode;
  animatable?: string;
  layer?: Layer;
  currentFrame?: number;
  compId?: string;
}

export const PropRow: React.FC<PropRowProps> = ({
  label, children, animatable, layer, currentFrame = 0, compId,
}) => {
  const revision = useKeyframeStore(s => s.revision);
  const ctxMenu = useContextMenu();

  const isAnimated = React.useMemo(() => {
    if (!animatable || !layer) return false;
    void revision;
    return useKeyframeStore.getState().isPropertyAnimated(layer.id, animatable);
  }, [animatable, layer, revision]);

  const hasKfAtFrame = React.useMemo(() => {
    if (!animatable || !layer || !isAnimated) return false;
    const kfs = useKeyframeStore.getState().engine.getKeyframesForProperty(layer.id, animatable);
    return kfs.some(k => k.time === currentFrame);
  }, [animatable, layer, currentFrame, isAnimated, revision]);

  const handleStopwatch = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!animatable || !layer) return;
    const store = useKeyframeStore.getState();
    store.toggleAnimatedProperty(layer.id, animatable);
    if (!isAnimated) {
      store.addKeyframe(layer.id, {
        id: `kf_${Date.now()}`, property: animatable, layerId: layer.id,
        time: currentFrame, value: getCurrentPropertyValue(animatable, layer),
        interpolation: 'linear',
      });
    }
  };

  const handleDiamond = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!animatable || !layer) return;
    const store = useKeyframeStore.getState();
    if (hasKfAtFrame) {
      const existing = store.engine.getKeyframesForProperty(layer.id, animatable).find(k => k.time === currentFrame);
      if (existing) store.removeKeyframe(existing.id);
    } else {
      store.addKeyframe(layer.id, {
        id: `kf_${Date.now()}`, property: animatable, layerId: layer.id,
        time: currentFrame, value: getCurrentPropertyValue(animatable, layer),
        interpolation: 'linear',
      });
    }
  };

  const handleContext = (e: React.MouseEvent) => {
    if (!animatable || !layer || !compId) return;
    ctxMenu.open(e, buildPropertyContextMenu({
      layer, compId, basePath: animatable,
      getValue: () => getCurrentPropertyValue(animatable, layer),
      applyReset: (val) => applyValueToLayer(compId, layer.id, animatable, val),
    }));
  };

  // Background tint when animated
  const bgClass = hasKfAtFrame
    ? 'bg-yellow-500/15'
    : isAnimated
      ? 'bg-yellow-500/[0.06]'
      : '';

  return (
    <div
      className={`flex items-center justify-between min-h-[20px] group rounded-sm ${bgClass}`}
      onContextMenu={handleContext}
    >
      <div className="flex items-center gap-0.5 shrink-0" style={{ width: 70 }}>
        {animatable && layer && (
          <button
            className={`w-3 h-3 flex items-center justify-center border-0 bg-transparent cursor-pointer rounded-sm transition-colors
              ${isAnimated ? 'text-accent' : 'text-text-disabled opacity-0 group-hover:opacity-40 hover:opacity-100'}`}
            onClick={handleStopwatch}
            title={isAnimated ? 'Disable animation' : 'Enable animation'}
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <line x1="5" y1="2" x2="5" y2="5" stroke="currentColor" strokeWidth="1.2" />
              <line x1="5" y1="5" x2="7" y2="6" stroke="currentColor" strokeWidth="0.8" />
            </svg>
          </button>
        )}
        <span className="text-ui-xs text-text-secondary truncate">{label}</span>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
      {animatable && isAnimated && (
        <button
          className={`w-3 h-3 flex items-center justify-center border-0 bg-transparent cursor-pointer shrink-0 ml-1 transition-colors
            ${hasKfAtFrame ? 'text-yellow-400' : 'text-text-disabled'}`}
          onClick={handleDiamond}
          title={hasKfAtFrame ? 'Remove keyframe' : 'Add keyframe'}
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
            {hasKfAtFrame
              ? <polygon points="4,0 8,4 4,8 0,4" />
              : <polygon points="4,0 8,4 4,8 0,4" fill="none" stroke="currentColor" strokeWidth="0.8" />}
          </svg>
        </button>
      )}
      {ctxMenu.menu && <ContextMenu items={ctxMenu.menu.items} position={ctxMenu.menu.position} onClose={ctxMenu.close} />}
    </div>
  );
};

function getCurrentPropertyValue(path: string, layer: Layer): number | number[] {
  if (path === 'opacity') return layer.opacity;
  if (path.startsWith('transform.')) {
    const field = path.slice('transform.'.length);
    const t = layer.transform;
    if (field === 'rotation') return t.rotation;
    if (field === 'position') return [t.position.x, t.position.y];
    if (field === 'position.x') return t.position.x;
    if (field === 'position.y') return t.position.y;
    if (field === 'scale') return [t.scale.x, t.scale.y];
    if (field === 'scale.x') return t.scale.x;
    if (field === 'scale.y') return t.scale.y;
    if (field === 'anchorPoint') return [t.anchorPoint.x, t.anchorPoint.y];
    if (field === 'anchorPoint.x') return t.anchorPoint.x;
    if (field === 'anchorPoint.y') return t.anchorPoint.y;
  }
  return 0;
}

function applyValueToLayer(compId: string, layerId: string, path: string, value: number | number[]): void {
  const cs = useCompositionStore.getState();
  const comp = cs.compositions.find(c => c.id === compId);
  if (!comp) return;
  const layer = comp.layers.find(l => l.id === layerId);
  if (!layer) return;

  if (path === 'opacity' && typeof value === 'number') {
    cs.updateLayer(compId, layerId, { opacity: value });
    return;
  }
  if (path.startsWith('transform.')) {
    const field = path.slice('transform.'.length);
    const t = { ...layer.transform };
    if (field === 'position' && Array.isArray(value)) t.position = { x: value[0], y: value[1] };
    else if (field === 'position.x' && typeof value === 'number') t.position = { ...t.position, x: value };
    else if (field === 'position.y' && typeof value === 'number') t.position = { ...t.position, y: value };
    else if (field === 'scale' && Array.isArray(value)) t.scale = { x: value[0], y: value[1] };
    else if (field === 'scale.x' && typeof value === 'number') t.scale = { ...t.scale, x: value };
    else if (field === 'scale.y' && typeof value === 'number') t.scale = { ...t.scale, y: value };
    else if (field === 'rotation' && typeof value === 'number') t.rotation = value;
    else if (field === 'anchorPoint' && Array.isArray(value)) t.anchorPoint = { x: value[0], y: value[1] };
    else if (field === 'anchorPoint.x' && typeof value === 'number') t.anchorPoint = { ...t.anchorPoint, x: value };
    else if (field === 'anchorPoint.y' && typeof value === 'number') t.anchorPoint = { ...t.anchorPoint, y: value };
    cs.updateLayer(compId, layerId, { transform: t });
  }
}