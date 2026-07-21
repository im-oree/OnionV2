import React, { useRef } from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { useToolStore } from '../../../state/toolStore';
import type { CameraManager } from '../../../renderer/CameraManager';
import type { SplinePoint } from '../../../types/spline';

export const SplineOverlay: React.FC<{ cameraManager: CameraManager | null, viewportSize: any }> = ({ cameraManager, viewportSize }) => {
  const tool = useToolStore(s => s.activeTool);
  const comp = useCompositionStore(s => s.getActiveComposition());
  const dragRef = useRef<{ layerId: string, ptIdx: number, type: 'point' | 'in' | 'out' } | null>(null);

  if (!comp || !cameraManager) return null;

  const splineLayers = comp.layers.filter(l => l.type === 'spline');

  const handleMouseDown = (layerId: string, ptIdx: number, type: 'point' | 'in' | 'out', e: React.MouseEvent) => {
    e.stopPropagation();
    dragRef.current = { layerId, ptIdx, type };
    
    const onMove = (moveEv: MouseEvent) => {
      const rect = document.querySelector('canvas')?.getBoundingClientRect();
      if (!rect) return;
      const world = cameraManager.screenToWorld(moveEv.clientX - rect.left, moveEv.clientY - rect.top);
      
      const layer = comp.layers.find(l => l.id === layerId);
      const data = { ...layer?.data };
      const pt = data.points[ptIdx];

      if (type === 'point') {
        pt.x = world.x - layer!.transform.position.x;
        pt.y = world.y - layer!.transform.position.y;
      } else if (type === 'in') {
        pt.inHandle.x = (world.x - layer!.transform.position.x) - pt.x;
        pt.inHandle.y = (world.y - layer!.transform.position.y) - pt.y;
      } else {
        pt.outHandle.x = (world.x - layer!.transform.position.x) - pt.x;
        pt.outHandle.y = (world.y - layer!.transform.position.y) - pt.y;
      }

      useCompositionStore.getState().updateLayer(comp.id, layerId, { data });
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <svg className="absolute inset-0 pointer-events-none" style={{zIndex: 30}}>
      {splineLayers.map(layer => (
        <g key={layer.id} transform={`translate(${layer.transform.position.x}, ${layer.transform.position.y})`}>
          {layer.data.points.map((pt: SplinePoint, i: number) => {
            const s = cameraManager.worldToScreen(layer.transform.position.x + pt.x, layer.transform.position.y + pt.y);
            const sin = cameraManager.worldToScreen(layer.transform.position.x + pt.x + pt.inHandle.x, layer.transform.position.y + pt.y + pt.inHandle.y);
            const sout = cameraManager.worldToScreen(layer.transform.position.x + pt.x + pt.outHandle.x, layer.transform.position.y + pt.y + pt.outHandle.y);
            
            return (
              <g key={i} className="pointer-events-auto">
                <line x1={s.x} y1={s.y} x2={sin.x} y2={sin.y} stroke="gray" />
                <line x1={s.x} y1={s.y} x2={sout.x} y2={sout.y} stroke="gray" />
                <circle cx={s.x} cy={s.y} r={5} fill="white" stroke="blue" onMouseDown={(e) => handleMouseDown(layer.id, i, 'point', e)} />
                <circle cx={sin.x} cy={sin.y} r={3} fill="blue" onMouseDown={(e) => handleMouseDown(layer.id, i, 'in', e)} />
                <circle cx={sout.x} cy={sout.y} r={3} fill="blue" onMouseDown={(e) => handleMouseDown(layer.id, i, 'out', e)} />
              </g>
            );
          })}
        </g>
      ))}
    </svg>
  );
};