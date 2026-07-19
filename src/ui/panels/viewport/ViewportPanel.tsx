import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useRenderer } from './hooks/useRenderer';
import { useViewportInput } from './hooks/useViewportInput';
import { useViewportSize } from './hooks/useViewportSize';
import { useCursor } from './hooks/useCursor';
import { ViewportHUD } from './ViewportHUD';
import { TransformHUD } from './TransformHUD';
import { Rulers } from './Rulers';
import { Guides } from './Guides';
import { AxisGizmo } from './AxisGizmo';
import { useCompositionStore } from '../../../state/compositionStore';
import { useViewportStore } from '../../../state/viewportStore';
import { useSelectionStore } from '../../../state/selectionStore';
import { ContextMenu } from '../../common/ContextMenu';
import { useContextMenu } from '../../common/useContextMenu';
import { buildViewportContextMenu, buildInsertKeyframeMenu } from './contextMenus';
import { Breadcrumb } from './Breadcrumb';
import { GradientOverlay } from './GradientOverlay';
import { CompBoundsCSS } from './CompBoundsCSS';
import { OnionSkinOverlay } from './OnionSkinOverlay';
import { MotionPathOverlay } from './MotionPathOverlay';
import { PenToolOverlay } from './PenToolOverlay';
import { ShapeDrawOverlay } from './ShapeDrawOverlay';
import { ShapeContextToolbar } from './ShapeContextToolbar';
import { assetManager } from '../../../storage/AssetManager';
import { createLayerInstance } from '../../../utils/createLayerInstance';
import { useNotificationStore } from '../../../state/notificationStore';

export const ViewportPanel: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isHovering = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const [dropHighlight, setDropHighlight] = useState(false);

  const viewportSize = useViewportSize(containerRef as React.RefObject<HTMLElement|null>);
  const { state, viewportState, renderer } = useRenderer(containerRef.current);

  useCursor(renderer?.canvas ?? null);

  const comp = useCompositionStore(s=>{
    const id=s.activeCompositionId;
    return id?s.compositions.find(c=>c.id===id)??null:null;
  });

  const showRulers = useViewportStore(s=>s.settings.showRulers);
  const showGuides = useViewportStore(s=>s.settings.showGuides);
  const ctxMenu = useContextMenu();

  useViewportInput({
    canvas: renderer?.canvas??null,
    cameraManager: renderer?.cameraManager??null,
    hitTester: renderer?.hitTester??null,
    modalTransform: renderer?.modalTransform??null,
    requestRender: renderer?()=>renderer.renderLoop.requestRender():undefined,
  });

  // Handle asset drop from project panel
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDropHighlight(false);

    const assetId = e.dataTransfer.getData('application/onion-asset');
    if (!assetId) return;

    const state = useCompositionStore.getState();
    const compId = state.activeCompositionId;
    if (!compId) return;
    const comp = state.compositions.find(c => c.id === compId);
    if (!comp) return;

    const asset = assetManager.getAsset(assetId);
    if (!asset) return;
    if (asset.type === 'audio') {
      useNotificationStore.getState().addNotification({ type: 'warning', message: 'Audio files cannot be placed as layers. Use them via expressions or the audio API.', autoDismiss: 3000 });
      return;
    }

    // Get drop position in world space
    let worldX = comp.width / 2;
    let worldY = comp.height / 2;
    if (renderer?.cameraManager && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const world = renderer.cameraManager.screenToWorld(mx, my);
      worldX = world.x;
      worldY = world.y;
    }

    const type = asset.type === 'video' ? 'video' : 'image';
    const layer = createLayerInstance(type, comp, {
      name: asset.name,
      zIndex: comp.layers.length + 1,
      transform: {
        position: { x: worldX, y: worldY },
        scale: { x: 100, y: 100 },
        rotation: 0,
        anchorPoint: { x: 0, y: 0 },
      },
      data: type === 'video'
        ? { assetId: asset.id, naturalWidth: asset.naturalWidth, naturalHeight: asset.naturalHeight, duration: asset.duration ?? 10, muted: false, volume: 1, playbackRate: 1 }
        : { assetId: asset.id, naturalWidth: asset.naturalWidth, naturalHeight: asset.naturalHeight },
    });
    state.addLayer(compId, layer);
    useSelectionStore.getState().select({ type: 'layer', id: layer.id, compositionId: compId });
    renderer?.renderLoop?.requestRender();
  }, [renderer]);

  useEffect(()=>{
    const el=containerRef.current; if(!el)return;
    const enter=()=>{isHovering.current=true;};
    const leave=()=>{isHovering.current=false;};
    const move=(e:MouseEvent)=>{lastMouse.current={x:e.clientX,y:e.clientY};};
    el.addEventListener('mouseenter',enter);
    el.addEventListener('mouseleave',leave);
    el.addEventListener('mousemove',move);
    return ()=>{el.removeEventListener('mouseenter',enter);el.removeEventListener('mouseleave',leave);el.removeEventListener('mousemove',move);};
  },[]);

  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{
      if(e.key!=='i'&&e.key!=='I')return;
      if(e.ctrlKey||e.shiftKey||e.altKey||e.metaKey)return;
      if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement)return;
      if(!isHovering.current)return;
      const items=buildInsertKeyframeMenu();
      if(items.length===0)return;
      e.preventDefault();
      ctxMenu.open({clientX:lastMouse.current.x,clientY:lastMouse.current.y},items);
    };
    document.addEventListener('keydown',onKey);
    return ()=>document.removeEventListener('keydown',onKey);
  },[ctxMenu]);

  const handleCtx=useCallback((e:React.MouseEvent)=>{
    if(renderer?.modalTransform?.active)return;
    ctxMenu.open(e,buildViewportContextMenu());
  },[renderer,ctxMenu]);

  return (
    <div className="w-full h-full relative overflow-hidden" style={{background:'var(--color-app-bg)'}}>
      {comp&&(
        <CompBoundsCSS comp={comp} viewportSize={viewportSize} cameraManager={renderer?.cameraManager??null} zoom={state.zoom}/>
      )}

      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{zIndex:1, outline: dropHighlight ? '2px dashed var(--color-accent)' : 'none', outlineOffset: -4}}
        onContextMenu={handleCtx}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes('application/onion-asset')) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            setDropHighlight(true);
          }
        }}
        onDragLeave={() => setDropHighlight(false)}
        onDrop={handleDrop}
      />

      {comp&&<Breadcrumb/>}

      {comp&&(
        <div className="absolute inset-0 z-20 pointer-events-none">
          {showRulers&&viewportSize.width>0&&(
            <Rulers zoom={state.zoom} viewportSize={viewportSize} cameraManager={renderer?.cameraManager??null}/>
          )}
          {showGuides&&<Guides viewportSize={viewportSize}/>}
        </div>
      )}

      {comp&&<GradientOverlay cameraManager={renderer?.cameraManager??null} viewportSize={viewportSize}/>}
      {comp&&<PenToolOverlay cameraManager={renderer?.cameraManager??null} viewportSize={viewportSize}/>}
      {comp&&<ShapeDrawOverlay cameraManager={renderer?.cameraManager??null} viewportSize={viewportSize}/>}
      {comp&&<MotionPathOverlay cameraManager={renderer?.cameraManager??null} viewportSize={viewportSize}/>}
      {comp&&<OnionSkinOverlay cameraManager={renderer?.cameraManager??null} viewportSize={viewportSize}/>}

      {/* Shape/Text context toolbar — floats above viewport */}
      {comp&&<ShapeContextToolbar/>}

      {comp&&<AxisGizmo/>}
      {comp&&<TransformHUD modalTransform={renderer?.modalTransform??null} cameraManager={renderer?.cameraManager??null}/>}

      {comp&&comp.layers.length===0&&(
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <p className="text-[12px] text-text-disabled opacity-50">Add a layer from the Add menu, or drag assets here</p>
        </div>
      )}

      {comp&&(
        <ViewportHUD
          fps={state.fps} zoom={state.zoom} viewportSize={viewportSize}
          selectedLayerIds={viewportState.selectedLayerIds}
          transformMode={viewportState.transformMode}
          onZoomChange={z=>{if(renderer){renderer.cameraManager.setZoom(z);renderer.renderLoop.requestRender();}}}
          onFitToViewport={()=>{if(renderer)renderer.cameraManager.fitToComposition();}}
        />
      )}

      {dropHighlight && (
        <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
          <div style={{background:'rgba(71,114,179,0.15)', border:'2px dashed var(--color-accent)', borderRadius:8, padding:'16px 32px', color:'var(--color-accent)', fontSize:'var(--font-size-sm)', fontWeight:500}}>
            Drop to add layer
          </div>
        </div>
      )}

      {ctxMenu.menu&&(
        <ContextMenu items={ctxMenu.menu.items} position={ctxMenu.menu.position} onClose={ctxMenu.close}/>
      )}
    </div>
  );
};

export default ViewportPanel;
