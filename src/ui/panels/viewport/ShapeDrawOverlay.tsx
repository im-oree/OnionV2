import React from 'react';
import { useShapeDrawStore } from '../../../state/shapeDrawStore';
import type { CameraManager } from '../../../renderer/CameraManager';

interface Props { cameraManager: CameraManager|null; viewportSize:{width:number;height:number}; }

export const ShapeDrawOverlay: React.FC<Props> = ({ cameraManager, viewportSize }) => {
  const phase = useShapeDrawStore(s=>s.phase);
  const startW = useShapeDrawStore(s=>s.startWorld);
  const currW = useShapeDrawStore(s=>s.currentWorld);

  if (phase!=='drawing'||!startW||!currW||!cameraManager) return null;
  const s1=cameraManager.worldToScreen(startW.x,startW.y);
  const s2=cameraManager.worldToScreen(currW.x,currW.y);
  const x=Math.min(s1.x,s2.x), y=Math.min(s1.y,s2.y);
  const w=Math.abs(s2.x-s1.x), h=Math.abs(s2.y-s1.y);

  return (
    <svg style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:25}} width={viewportSize.width} height={viewportSize.height}>
      <rect x={x} y={y} width={w} height={h}
        fill="var(--color-accent)" fillOpacity={0.08}
        stroke="var(--color-accent)" strokeWidth={1.5} strokeDasharray="5 3"/>
      <text x={s2.x+6} y={s2.y} fill="var(--color-accent)" fontSize={10} fontFamily="monospace">
        {Math.round(Math.abs(currW.x-startW.x))} × {Math.round(Math.abs(currW.y-startW.y))}
      </text>
    </svg>
  );
};