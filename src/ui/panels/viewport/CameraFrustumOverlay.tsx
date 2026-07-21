import React, { useState, useEffect } from 'react';
import { useCompositionStore } from '../../../state/compositionStore';
import { onCameraChange } from '../../../renderer/utils/CameraEvents';
import type { CameraManager } from '../../../renderer/CameraManager';

interface Props {
  cameraManager: CameraManager | null;
  viewportSize: { width: number; height: number };
}

/**
 * CameraFrustumOverlay — renders a proper 3D camera frustum pyramid in Free View.
 * Computes near/far plane corners in world space using the scene camera's
 * forward/right/up vectors, then projects all 8 points through the free-view camera.
 *
 * The pyramid shows what the composition camera sees:
 *   - Front face (near plane)
 *   - Back face (far plane)
 *   - Connecting edges
 *   - Draggable camera icon at the apex
 */
export const CameraFrustumOverlay: React.FC<Props> = ({ cameraManager, viewportSize }) => {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const handler = () => forceUpdate(n => n + 1);
    document.addEventListener('viewport:viewmode', handler);
    const unsub = onCameraChange(handler);
    return () => {
      document.removeEventListener('viewport:viewmode', handler);
      unsub();
    };
  }, []);

  const comp = useCompositionStore(s =>
    s.activeCompositionId
      ? s.compositions.find(c => c.id === s.activeCompositionId) ?? null
      : null
  );

  if (!cameraManager || !comp?.perspective3D) return null;

  const isFree = !!(window as any).__freeViewMode;
  if (!isFree) return null;

  // ── Scene camera world-space properties ──
  const camZ = comp.cameraPositionZ ?? 1000;
  const rotX = comp.cameraRotationX ?? 0;    // pitch in radians
  const rotY = comp.cameraRotationY ?? 0;    // yaw in radians
  const panX = comp.cameraPositionX ?? 0;
  const panY = comp.cameraPositionY ?? 0;
  const fov = comp.cameraFOV ?? 50;

  // Camera position in world space (matches Renderer.ts math)
  const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
  const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
  const cx = camZ * sinY * cosX + panX;
  const cy = -camZ * sinX + panY;
  const cz = camZ * cosY * cosX;

  // Look-at target
  const tx = panX, ty = panY, tz = 0;

  // Forward direction (camera → look-at)
  const fx = tx - cx, fy = ty - cy, fz = tz - cz;
  const fLen = Math.hypot(fx, fy, fz) || 1;
  const fdx = fx / fLen, fdy = fy / fLen, fdz = fz / fLen;

  // Right vector (unit length: cos²Y + sin²Y = 1)
  const rdx = cosY, rdy = 0, rdz = -sinY;

  // Up vector = cross(right, forward), then normalize separately
  const ux = rdy * fdz - rdz * fdy;
  const uy = rdz * fdx - rdx * fdz;
  const uz = rdx * fdy - rdy * fdx;
  const uLen = Math.hypot(ux, uy, uz) || 1;
  const udx = ux / uLen, udy = uy / uLen, udz = uz / uLen;

  // Frustum dimensions at near and far planes
  const halfFovRad = (fov / 2) * Math.PI / 180;
  const nearDist = 50;
  const farDist = Math.max(200, Math.min(camZ * 1.5, 3000));
  const aspect = viewportSize.width / viewportSize.height || 1;

  const nearHalfH = Math.tan(halfFovRad) * nearDist;
  const nearHalfW = nearHalfH * aspect;
  const farHalfH = Math.tan(halfFovRad) * farDist;
  const farHalfW = farHalfH * aspect;

  // Generate frustum corner in world space
  // Forward contributes depth (dist), right contributes horizontal offset, up contributes vertical offset
  const corner = (dist: number, hw: number, hh: number, sx: number, sy: number) => ({
    x: cx + fdx * dist + rdx * hw * sx + udx * hh * sy,
    y: cy + fdy * dist + rdy * hw * sx + udy * hh * sy,
    z: cz + fdz * dist + rdz * hw * sx + udz * hh * sy,
  });

  // Near plane corners (TL, TR, BR, BL)
  const nearTL = corner(nearDist, nearHalfW, nearHalfH, -1, 1);
  const nearTR = corner(nearDist, nearHalfW, nearHalfH, 1, 1);
  const nearBR = corner(nearDist, nearHalfW, nearHalfH, 1, -1);
  const nearBL = corner(nearDist, nearHalfW, nearHalfH, -1, -1);

  // Far plane corners
  const farTL = corner(farDist, farHalfW, farHalfH, -1, 1);
  const farTR = corner(farDist, farHalfW, farHalfH, 1, 1);
  const farBR = corner(farDist, farHalfW, farHalfH, 1, -1);
  const farBL = corner(farDist, farHalfW, farHalfH, -1, -1);

  // ── Project world corners to screen via the free-view camera ──
  const toScreen = (p: { x: number; y: number; z: number }) =>
    cameraManager.worldToScreen(p.x, p.y, p.z);

  const nTLs = toScreen(nearTL), nTRs = toScreen(nearTR);
  const nBRs = toScreen(nearBR), nBLs = toScreen(nearBL);
  const fTLs = toScreen(farTL), fTRs = toScreen(farTR);
  const fBRs = toScreen(farBR), fBLs = toScreen(farBL);

  // Camera apex screen position
  const camScreen = toScreen({ x: cx, y: cy, z: cz });

  // Frustum line segments — all 16 edges of the frustum wireframe
  const lines: [typeof nTLs, typeof nTLs][] = [
    // Near rectangle
    [nTLs, nTRs], [nTRs, nBRs], [nBRs, nBLs], [nBLs, nTLs],
    // Far rectangle
    [fTLs, fTRs], [fTRs, fBRs], [fBRs, fBLs], [fBLs, fTLs],
    // Connecting edges (near → far)
    [nTLs, fTLs], [nTRs, fTRs], [nBRs, fBRs], [nBLs, fBLs],
    // Cone lines from camera apex to near corners
    [camScreen, nTLs], [camScreen, nTRs], [camScreen, nBRs], [camScreen, nBLs],
  ];

  // Drag handler: orbit the scene camera in Free View
  const cs = useCompositionStore.getState();
  const compId = cs.activeCompositionId;

  const handleDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX, startY = e.clientY;
    // Read fresh from store to avoid stale closure
    const liveComp = useCompositionStore.getState().compositions.find(c => c.id === compId);
    const startOY = liveComp?.cameraRotationY ?? 0;
    const startOX = liveComp?.cameraRotationX ?? 0;

    const onMove = (ev: MouseEvent) => {
      if (!compId) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      useCompositionStore.getState().updateComposition(compId, {
        cameraRotationY: startOY + dx * 0.003,
        cameraRotationX: Math.max(-1.2, Math.min(1.2, startOX + dy * 0.003)),
      });
      forceUpdate(n => n + 1);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return (
    <svg
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 26 }}
      width={viewportSize.width}
      height={viewportSize.height}
    >
      {/* Frustum wireframe: all 16 edges */}
      {lines.map(([a, b], i) => (
        <line
          key={i}
          x1={a.x} y1={a.y} x2={b.x} y2={b.y}
          stroke="#4A90E2"
          strokeWidth={i < 16 ? 1 : 0.8}
          opacity={i < 12 ? 0.5 : 0.35}
          strokeDasharray={i < 8 ? "4 2" : i < 12 ? "3 3" : "5 3"}
        />
      ))}

      {/* Near plane semi-transparent face */}
      <polygon
        points={`${nTLs.x},${nTLs.y} ${nTRs.x},${nTRs.y} ${nBRs.x},${nBRs.y} ${nBLs.x},${nBLs.y}`}
        fill="rgba(74,144,226,0.06)"
        stroke="none"
      />

      {/* Far plane semi-transparent face */}
      <polygon
        points={`${fTLs.x},${fTLs.y} ${fTRs.x},${fTRs.y} ${fBRs.x},${fBRs.y} ${fBLs.x},${fBLs.y}`}
        fill="rgba(74,144,226,0.04)"
        stroke="none"
      />

      {/* Camera icon — draggable */}
      <g
        style={{
          pointerEvents: 'all',
          cursor: 'move',
          filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))',
        }}
        onMouseDown={handleDrag}
      >
        {/* Outer glow ring */}
        <circle cx={camScreen.x} cy={camScreen.y} r={10}
          fill="rgba(74,144,226,0.15)" stroke="#4A90E2" strokeWidth={1.5} />
        {/* Camera body */}
        <rect x={camScreen.x - 7} y={camScreen.y - 5} width={14} height={10} rx={2}
          fill="#4A90E2" opacity={0.9} />
        {/* Lens */}
        <circle cx={camScreen.x + 7} cy={camScreen.y} r={4}
          fill="rgba(0,0,0,0.4)" stroke="#4A90E2" strokeWidth={1} />
        <circle cx={camScreen.x + 7} cy={camScreen.y} r={2}
          fill="rgba(255,255,255,0.3)" />
      </g>

      {/* CAM label */}
      <text x={camScreen.x} y={camScreen.y - 16}
        fill="#4A90E2" fontSize={9} fontWeight="bold" fontFamily="monospace"
        textAnchor="middle" style={{ pointerEvents: 'none' }}>
        CAM
      </text>
    </svg>
  );
};
