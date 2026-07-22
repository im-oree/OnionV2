import React from 'react';
import { ChevronDown, ChevronRight, Code2, Copy, ClipboardPaste } from 'lucide-react';
import { useKeyframeStore } from '../../../state/keyframeStore';
import { useExpressionStore } from '../../../state/expressionStore';
import { ExpressionEditor } from './ExpressionEditor';
import { useContextMenu } from '../../common/useContextMenu';
import { ContextMenu } from '../../common/ContextMenu';
import { useCompositionStore } from '../../../state/compositionStore';
import { buildPropertyContextMenu } from './propertyContextMenu';
import type { Layer } from '../../../types/layer';
import type { Keyframe } from '../../../types/keyframe';

/** Module-level clipboard for animation copy/paste */
interface AnimationClipboard {
  keyframes: Keyframe[];
  sourceProperty: string;
  isArray: boolean; // true if keyframe values are number[]
  relativeTimes: number[]; // times relative to first keyframe
}

let _animClipboard: AnimationClipboard | null = null;

function copyAnimation(keyframes: Keyframe[], property: string): void {
  if (keyframes.length === 0) return;
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  const minTime = sorted[0].time;
  
  // Detect if values are arrays (vector2) or numbers
  const firstVal = sorted[0].value;
  const isArray = Array.isArray(firstVal);
  
  _animClipboard = {
    keyframes: sorted.map(kf => ({ ...kf })),
    sourceProperty: property,
    isArray,
    relativeTimes: sorted.map(kf => kf.time - minTime),
  };
}

function getClipboard(): AnimationClipboard | null {
  return _animClipboard;
}

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
        className="flex items-center w-full gap-2 border-0 cursor-pointer transition-colors"
        style={{
          height: 30,
          padding: '0 12px',
          background: 'transparent',
          borderBottom: '1px solid var(--color-divider)',
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--font-size-xs)',
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
        onMouseEnter={(e)=>{ (e.currentTarget as HTMLElement).style.color='var(--color-text-primary)'; }}
        onMouseLeave={(e)=>{ (e.currentTarget as HTMLElement).style.color='var(--color-text-secondary)'; }}
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDown size={12} strokeWidth={2} /> : <ChevronRight size={12} strokeWidth={2} />}
        <span>{label}</span>
      </button>
      {open && <div style={{ padding: '8px 12px' }} className="space-y-1.5">{children}</div>}
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
  /** If true, show copy/paste animation buttons on hover */
  showAnimClipboard?: boolean;
  /** Property path for lock support — shows a lock icon next to the label */
  lockPath?: string;
  /** Hide the keyframe diamond button (used when per-axis mode provides its own diamonds) */
  hideDiamond?: boolean;
  /** Hide the stopwatch button (used when per-axis mode provides its own stopwatches) */
  hideStopwatch?: boolean;
}

export const PropRow: React.FC<PropRowProps> = ({
  label, children, animatable, layer, currentFrame = 0, compId, showAnimClipboard = true, lockPath, hideDiamond = false, hideStopwatch = false,
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
      const val = getCurrentPropertyValue(animatable, layer);
      store.addKeyframe(layer.id, {
        id: `kf_${Date.now()}`, property: animatable, layerId: layer.id,
        time: currentFrame, value: typeof val === 'number' || Array.isArray(val) ? val : 0,
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
      const val = getCurrentPropertyValue(animatable, layer);
      store.addKeyframe(layer.id, {
        id: `kf_${Date.now()}`, property: animatable, layerId: layer.id,
        time: currentFrame, value: typeof val === 'number' || Array.isArray(val) ? val : 0,
        interpolation: 'linear',
      });
    }
  };

  const handleCopyAnimation = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!animatable || !layer) return;
    const kfs = useKeyframeStore.getState().engine.getKeyframesForProperty(layer.id, animatable);
    if (kfs.length === 0) return;
    copyAnimation(kfs, animatable);
  };

  const handlePasteAnimation = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!animatable || !layer || !compId) return;
    const clip = getClipboard();
    if (!clip) return;
    
    // Ensure target property is animated
    const store = useKeyframeStore.getState();
    if (!store.isPropertyAnimated(layer.id, animatable)) {
      store.toggleAnimatedProperty(layer.id, animatable);
    }
    
    // Get existing keyframes at target property
    const existingKfs = store.engine.getKeyframesForProperty(layer.id, animatable);
    
    // Paste keyframes starting at current frame with relative timing
    const baseTime = currentFrame;
    for (let i = 0; i < clip.keyframes.length; i++) {
      const srcKf = clip.keyframes[i];
      const targetTime = baseTime + clip.relativeTimes[i];
      
      // Check if there's already a keyframe at this time
      const existing = existingKfs.find(k => k.time === targetTime);
      if (existing) {
        store.updateKeyframe(existing.id, { value: srcKf.value, interpolation: srcKf.interpolation });
      } else {
        store.addKeyframe(layer.id, {
          id: `kf_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          property: animatable,
          layerId: layer.id,
          time: targetTime,
          value: srcKf.value,
          interpolation: srcKf.interpolation,
          inTangent: srcKf.inTangent ? { ...srcKf.inTangent } : undefined,
          outTangent: srcKf.outTangent ? { ...srcKf.outTangent } : undefined,
        });
      }
    }
  };

  const handleContext = (e: React.MouseEvent) => {
    if (!animatable || !layer || !compId) return;
    const baseItems = buildPropertyContextMenu({
      layer, compId, basePath: animatable,
      getValue: () => getCurrentPropertyValue(animatable, layer) as number | number[],
      applyReset: (val) => applyValueToLayer(compId, layer.id, animatable, val),
    });
    const hasExpr = useExpressionStore.getState().getExpression(layer.id, animatable);
    const exprItems = hasExpr
      ? [{ id: 'expr.remove', label: 'Remove Expression',
          onClick: () => useExpressionStore.getState().removeExpression(layer.id, animatable) }]
      : [{ id: 'expr.add', label: 'Add Expression', shortcut: 'Alt+E',
          onClick: () => useExpressionStore.getState().setExpression(layer.id, animatable, 'value') }];
    ctxMenu.open(e, [
      ...baseItems,
      { id: 'sep.expr', label: '', divider: true, onClick: () => {} },
      ...exprItems,
    ]);
  };

  const clip = getClipboard();
  // Check if property is array-type by last segment name
  // (position, scale, anchorPoint are always arrays; position.x is scalar)
  const lastSegment = animatable?.split('.').pop() ?? '';
  const targetIsArray = ['position', 'scale', 'anchorPoint'].includes(lastSegment);
  const canPaste = clip && animatable && clip.isArray === targetIsArray;

  const isLocked = layer && lockPath ? !!(layer.lockedProperties ?? {})[lockPath] : false;

  const toggleLock = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!layer || !lockPath || !compId) return;
    const current = layer.lockedProperties ?? {};
    useCompositionStore.getState().updateLayer(compId, layer.id, {
      lockedProperties: { ...current, [lockPath]: !current[lockPath] },
    });
  };

  const rowBg = hasKfAtFrame
    ? 'rgba(88, 101, 255, 0.12)'
    : isAnimated
      ? 'rgba(88, 101, 255, 0.05)'
      : 'transparent';

  return (
    <div
      className="flex items-center justify-between group"
      style={{
        minHeight: 24,
        borderRadius: 'var(--radius-sm)',
        padding: '2px 4px',
        background: rowBg,
        transition: 'background var(--dur-fast) var(--ease-out)',
        opacity: isLocked ? 0.6 : 1,
      }}
      onContextMenu={handleContext}
    >
      <div className="flex items-center gap-1.5 shrink-0" style={{ width: 88 }}>
        {lockPath && layer && (
          <button
            className="flex items-center justify-center border-0 bg-transparent cursor-pointer transition-colors"
            style={{
              width: 14, height: 14, padding: 0,
              color: isLocked ? 'var(--color-accent)' : 'var(--color-text-disabled)',
              opacity: isLocked ? 1 : 0.4,
            }}
            onClick={toggleLock}
            title={isLocked ? 'Unlock property' : 'Lock property (prevent editing)'}
          >
            {isLocked ? (
              <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4 7V5a4 4 0 118 0v2h1a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1h1zm2 0h4V5a2 2 0 10-4 0v2z"/>
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4 7V5a4 4 0 118 0v2h1a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1h1zm2 0h4V5a2 2 0 11-4 0v2z" opacity="0.5"/>
              </svg>
            )}
          </button>
        )}
        {animatable && layer && useExpressionStore.getState().hasExpression(layer.id, animatable) && (
          <Code2 size={11} strokeWidth={2} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
        )}
        {animatable && layer && !hideStopwatch && (
          <button
            className="flex items-center justify-center border-0 bg-transparent cursor-pointer transition-colors"
            style={{
              width: 14, height: 14,
              color: isAnimated ? 'var(--color-accent)' : 'var(--color-text-disabled)',
              opacity: isAnimated ? 1 : 0.45,
            }}
            onMouseEnter={(e)=>{ if(!isAnimated)(e.currentTarget as HTMLElement).style.opacity='1'; }}
            onMouseLeave={(e)=>{ if(!isAnimated)(e.currentTarget as HTMLElement).style.opacity='0.45'; }}
            onClick={handleStopwatch}
            title={isAnimated ? 'Disable animation' : 'Enable animation'}
          >
            <svg width="11" height="11" viewBox="0 0 11 11">
              <circle cx="5.5" cy="5.5" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <line x1="5.5" y1="2.5" x2="5.5" y2="5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="5.5" y1="5.5" x2="7.5" y2="6.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
            </svg>
          </button>
        )}
        <span
          className="truncate"
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {label}
        </span>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
      {showAnimClipboard && animatable && layer && (
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {isAnimated && (
            <button
              className="flex items-center justify-center border-0 bg-transparent cursor-pointer"
              style={{ width: 14, height: 14, color: 'var(--color-text-disabled)' }}
              onClick={handleCopyAnimation}
              title="Copy animation from this property"
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)'}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--color-text-disabled)'}
            >
              <Copy size={10} />
            </button>
          )}
          {canPaste && (
            <button
              className="flex items-center justify-center border-0 bg-transparent cursor-pointer"
              style={{ width: 14, height: 14, color: 'var(--color-text-disabled)' }}
              onClick={handlePasteAnimation}
              title={`Paste animation (copied from ${clip!.sourceProperty})`}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--color-accent)'}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--color-text-disabled)'}
            >
              <ClipboardPaste size={10} />
            </button>
          )}
        </div>
      )}
      {animatable && isAnimated && !hideDiamond && (
        <button
          className="flex items-center justify-center border-0 bg-transparent cursor-pointer shrink-0 ml-2 transition-colors"
          style={{
            width: 14, height: 14,
            color: hasKfAtFrame ? 'var(--color-accent)' : 'var(--color-text-disabled)',
          }}
          onClick={handleDiamond}
          title={hasKfAtFrame ? 'Remove keyframe' : 'Add keyframe'}
        >
          <svg width="9" height="9" viewBox="0 0 8 8" fill="currentColor">
            {hasKfAtFrame
              ? <polygon points="4,0 8,4 4,8 0,4" />
              : <polygon points="4,0 8,4 4,8 0,4" fill="none" stroke="currentColor" strokeWidth="1" />}
          </svg>
        </button>
      )}
      {ctxMenu.menu && <ContextMenu items={ctxMenu.menu.items} position={ctxMenu.menu.position} onClose={ctxMenu.close} />}
      {animatable && layer && useExpressionStore.getState().getExpression(layer.id, animatable) && (
        <div style={{ width: '100%', marginTop: 4 }}>
          <ExpressionEditor layerId={layer.id} property={animatable} />
        </div>
      )}
    </div>
  );
};

function getCurrentPropertyValue(path: string, layer: Layer): number | number[] | string | boolean {
  if (path === 'opacity') return layer.opacity;
  if (path === 'blendMode') return (layer as any).blendMode ?? 'normal';
  if (path === 'visible') return layer.visible;
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
  if (path.startsWith('transform3D.')) {
    const field = path.slice('transform3D.'.length);
    const t3d = (layer as any).transform3D;
    if (!t3d) return 0;
    if (field === 'position.z') return t3d.position?.z ?? 0;
    if (field === 'scale.z') return t3d.scale?.z ?? 100;
    if (field === 'rotationX') return t3d.rotationX ?? 0;
    if (field === 'rotationY') return t3d.rotationY ?? 0;
    if (field === 'rotationZ') return t3d.rotationZ ?? 0;
    if (field === 'anchorPoint.z') return t3d.anchorPoint?.z ?? 0;
    return 0;
  }
  if (path.startsWith('data.')) {
    const parts = path.slice('data.'.length).split('.');
    let cur: any = (layer as any).data;
    for (const p of parts) {
      if (cur == null) return 0;
      cur = cur[p];
    }
    return cur ?? 0;
  }
  if (path.startsWith('camera.')) {
    const field = path.slice('camera.'.length);
    const comp = (layer as any);  // layer is actually a Composition
    if (field === 'fov') return comp.cameraFOV ?? 50;
    if (field === 'positionZ') return comp.cameraPositionZ ?? 1000;
    if (field === 'orbitX') return comp.cameraOrbitX ?? 0;
    if (field === 'orbitY') return comp.cameraOrbitY ?? 0;
    if (field === 'panX') return comp.cameraPanX ?? 0;
    if (field === 'panY') return comp.cameraPanY ?? 0;
    if (field === 'dof') return comp.cameraDOF ?? false;
    if (field === 'focusDistance') return comp.cameraFocusDistance ?? 500;
    if (field === 'aperture') return comp.cameraAperture ?? 5;
    if (field === 'exposure') return comp.cameraExposure ?? 0;
    return 0;
  }
  return 0;
}

function deepSetImmutable(obj: any, parts: string[], value: any): any {
  if (parts.length === 0) return value;
  const [head, ...rest] = parts;
  const child = obj?.[head];
  return {
    ...(obj ?? {}),
    [head]: rest.length === 0 ? value : deepSetImmutable(child, rest, value),
  };
}

function applyValueToLayer(compId: string, layerId: string, path: string, value: number | number[] | string | boolean): void {
  const cs = useCompositionStore.getState();
  const comp = cs.compositions.find(c => c.id === compId);
  if (!comp) return;
  const layer = comp.layers.find(l => l.id === layerId);
  if (!layer) return;

  if (path === 'opacity' && typeof value === 'number') {
    cs.updateLayer(compId, layerId, { opacity: value });
    return;
  }
  if (path === 'blendMode' && typeof value === 'string') {
    cs.updateLayer(compId, layerId, { blendMode: value as any });
    return;
  }
  if (path === 'visible' && typeof value === 'boolean') {
    cs.updateLayer(compId, layerId, { visible: value });
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
    return;
  }
  if (path.startsWith('transform3D.')) {
    const field = path.slice('transform3D.'.length);
    const layerData = cs.compositions.find(c=>c.id===compId)?.layers.find(l=>l.id===layerId);
    if (!layerData?.transform3D) return;
    const t3d = { ...layerData.transform3D };
    if (field === 'position.z' && typeof value === 'number') t3d.position = { ...t3d.position, z: value };
    else if (field === 'scale.z' && typeof value === 'number') t3d.scale = { ...t3d.scale, z: value };
    else if (field === 'rotationX' && typeof value === 'number') t3d.rotationX = value;
    else if (field === 'rotationY' && typeof value === 'number') t3d.rotationY = value;
    else if (field === 'rotationZ' && typeof value === 'number') t3d.rotationZ = value;
    else if (field === 'anchorPoint.z' && typeof value === 'number') t3d.anchorPoint = { ...t3d.anchorPoint, z: value };
    cs.updateLayer(compId, layerId, { transform3D: t3d });
    return;
  }
  if (path.startsWith('data.')) {
    const parts = path.slice('data.'.length).split('.');
    const currentData: any = (layer as any).data ?? {};
    const newData: any = deepSetImmutable(currentData, parts, value);
    cs.updateLayer(compId, layerId, { data: newData });
  }
  if (path.startsWith('camera.')) {
    const field = path.slice('camera.'.length);
    const comp2 = cs.compositions.find(c => c.id === compId);
    if (!comp2) return;
    if (field === 'fov' && typeof value === 'number') cs.updateComposition(compId, { cameraFOV: value });
    else if (field === 'positionZ' && typeof value === 'number') cs.updateComposition(compId, { cameraPositionZ: value });
    else if (field === 'orbitX' && typeof value === 'number') cs.updateComposition(compId, { cameraOrbitX: value });
    else if (field === 'orbitY' && typeof value === 'number') cs.updateComposition(compId, { cameraOrbitY: value });
    else if (field === 'panX' && typeof value === 'number') cs.updateComposition(compId, { cameraPanX: value });
    else if (field === 'panY' && typeof value === 'number') cs.updateComposition(compId, { cameraPanY: value });
    else if (field === 'dof' && typeof value === 'boolean') cs.updateComposition(compId, { cameraDOF: value });
    else if (field === 'focusDistance' && typeof value === 'number') cs.updateComposition(compId, { cameraFocusDistance: value });
    else if (field === 'aperture' && typeof value === 'number') cs.updateComposition(compId, { cameraAperture: value });
    else if (field === 'exposure' && typeof value === 'number') cs.updateComposition(compId, { cameraExposure: value });
    return;
  }
}