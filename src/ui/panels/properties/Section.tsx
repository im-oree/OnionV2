import React from 'react';
import { useKeyframeStore } from '../../../state/keyframeStore';
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
  /** Property path for animation (e.g. "transform.position.x"). If provided, shows stopwatch + diamond. */
  animatable?: string;
  /** The layer this property belongs to (needed for stopwatch/keyframe logic) */
  layer?: Layer;
  /** Current frame in the composition */
  currentFrame?: number;
  /** Composition ID */
  compId?: string;
}

export const PropRow: React.FC<PropRowProps> = ({
  label,
  children,
  animatable,
  layer,
  currentFrame = 0,
  compId: _compId,
}) => {
  const [isAnimated, setIsAnimated] = React.useState(false);
  const [hasKeyframeAtFrame, setHasKeyframeAtFrame] = React.useState(false);

  React.useEffect(() => {
    if (!animatable || !layer) return;
    const store = useKeyframeStore.getState();
    const animated = store.isPropertyAnimated(layer.id, animatable);
    setIsAnimated(animated);

    if (animated) {
      const kfs = store.engine.getKeyframesForProperty(layer.id, animatable);
      setHasKeyframeAtFrame(kfs.some((k) => k.time === currentFrame));
    } else {
      setHasKeyframeAtFrame(false);
    }
  }, [animatable, layer, currentFrame]);

  const handleStopwatchClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!animatable || !layer) return;
    const store = useKeyframeStore.getState();
    store.toggleAnimatedProperty(layer.id, animatable);

    // If enabling animation, add a keyframe at current frame
    if (!isAnimated) {
      const value = getCurrentPropertyValue(animatable, layer);
      store.addKeyframe(layer.id, {
        id: `kf_${Date.now()}`,
        property: animatable,
        layerId: layer.id,
        time: currentFrame,
        value,
        interpolation: 'linear',
      });
    }
  };

  const handleDiamondClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!animatable || !layer) return;
    const store = useKeyframeStore.getState();
    if (hasKeyframeAtFrame) {
      const kfs = store.engine.getKeyframesForProperty(layer.id, animatable);
      const existing = kfs.find((k) => k.time === currentFrame);
      if (existing) store.removeKeyframe(existing.id);
    } else {
      const value = getCurrentPropertyValue(animatable, layer);
      store.addKeyframe(layer.id, {
        id: `kf_${Date.now()}`,
        property: animatable,
        layerId: layer.id,
        time: currentFrame,
        value,
        interpolation: 'linear',
      });
    }
    setHasKeyframeAtFrame(!hasKeyframeAtFrame);
  };

  return (
    <div className="flex items-center justify-between min-h-[20px] group">
      <div className="flex items-center gap-0.5 shrink-0" style={{ width: 70 }}>
        {/* Stopwatch icon */}
        {animatable && layer && (
          <button
            className={`w-3 h-3 flex items-center justify-center border-0 bg-transparent cursor-pointer rounded-sm transition-colors
              ${isAnimated ? 'text-accent' : 'text-text-disabled opacity-0 group-hover:opacity-40 hover:opacity-100'}`}
            onClick={handleStopwatchClick}
            title={isAnimated ? 'Disable animation' : 'Enable animation'}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <line x1="5" y1="2" x2="5" y2="5" stroke="currentColor" strokeWidth="1.2" />
              <line x1="5" y1="5" x2="7" y2="6" stroke="currentColor" strokeWidth="0.8" />
            </svg>
          </button>
        )}
        {/* Label */}
        <span className="text-ui-xs text-text-secondary truncate">{label}</span>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
      {/* Keyframe diamond indicator */}
      {animatable && isAnimated && (
        <button
          className={`w-3 h-3 flex items-center justify-center border-0 bg-transparent cursor-pointer shrink-0 ml-1 transition-colors
            ${hasKeyframeAtFrame ? 'text-accent' : 'text-text-disabled'}`}
          onClick={handleDiamondClick}
          title={hasKeyframeAtFrame ? 'Remove keyframe' : 'Add keyframe'}
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
            {hasKeyframeAtFrame ? (
              <polygon points="4,0 8,4 4,8 0,4" />
            ) : (
              <polygon points="4,0 8,4 4,8 0,4" fill="none" stroke="currentColor" strokeWidth="0.8" />
            )}
          </svg>
        </button>
      )}
    </div>
  );
};

/** Extract the current value for a property path from the layer */
function getCurrentPropertyValue(path: string, layer: Layer): number | number[] {
  if (path === 'opacity') return layer.opacity;
  if (path.startsWith('transform.')) {
    const field = path.slice('transform.'.length);
    if (field === 'rotation') return layer.transform.rotation;
    if (field === 'position') return [layer.transform.position.x, layer.transform.position.y];
    if (field === 'position.x') return layer.transform.position.x;
    if (field === 'position.y') return layer.transform.position.y;
    if (field === 'scale') return [layer.transform.scale.x, layer.transform.scale.y];
    if (field === 'scale.x') return layer.transform.scale.x;
    if (field === 'scale.y') return layer.transform.scale.y;
    if (field === 'anchorPoint') return [layer.transform.anchorPoint.x, layer.transform.anchorPoint.y];
    if (field === 'anchorPoint.x') return layer.transform.anchorPoint.x;
    if (field === 'anchorPoint.y') return layer.transform.anchorPoint.y;
  }
  return 0;
}
